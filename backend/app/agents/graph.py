import os
from typing import TypedDict, List, Dict, Any, Optional, Sequence
import json
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage, ToolMessage
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from app.schemas.schemas import TranscriptAnalysis, Lesson
from app.database.database import SessionLocal
from app.models.models import Mistake

# Initialize the LLM using Gemini
llm_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip(" '\"")
api_key = os.getenv("GOOGLE_API_KEY", "").strip(" '\"")

llm = ChatGoogleGenerativeAI(
    model=llm_model,
    google_api_key=api_key
)

@tool
def analyze_and_log_mistakes(transcript: str, user_id: int = 1) -> str:
    """Analyzes the user's transcript for grammar mistakes, logs them, and identifies recurring issues. MUST be called on every user input."""
    analyzer_llm = llm.with_structured_output(TranscriptAnalysis)
    prompt = f"""
Analyze the following transcript from an English language learner. Identify any grammatical, vocabulary, or pronunciation errors.

CRITICAL INSTRUCTIONS FOR CATEGORIZATION:
Do NOT use broad categories like "Grammar", "Vocabulary", or "Syntax". 
You must pinpoint the exact linguistic rule that was broken. 
Examples of acceptable categories:
- "Subject-Verb Agreement"
- "Past Perfect Tense"
- "Definite vs. Indefinite Articles"
- "Prepositions of Time"
- "Countable vs. Uncountable Nouns"
- "False Friends (Vocabulary)"

Transcript: {transcript}
"""
    
    try:
        analysis = analyzer_llm.invoke(prompt)
        mistakes = [m.model_dump() for m in analysis.mistakes]
    except Exception as e:
        print("Analysis tool failed:", e)
        mistakes = []
        
    db = SessionLocal()
    recurring_mistakes = []
    try:
        for m in mistakes:
            existing = db.query(Mistake).filter(
                Mistake.user_id == user_id, 
                Mistake.category == m["category"]
            ).first()
            if existing:
                existing.count += 1
                existing.error_text = m["error_text"]
                existing.correction = m["correction"]
                if existing.count >= 3:
                    recurring_mistakes.append(f"'{existing.category}' (made {existing.count} times)")
            else:
                new_mistake = Mistake(
                    user_id=user_id,
                    error_text=m["error_text"],
                    correction=m["correction"],
                    category=m["category"]
                )
                db.add(new_mistake)
        db.commit()
    except Exception as e:
        print("DB Update failed:", e)
    finally:
        db.close()
        
    result = f"Mistakes found in this turn: {json.dumps(mistakes)}\n"
    if recurring_mistakes:
        result += f"CRITICAL: The user has made these mistakes 3 or more times: {', '.join(recurring_mistakes)}. You MUST call design_lesson for the most critical topic!"
    else:
        result += "No recurring mistakes found. No lesson needed right now."
        
    return result

@tool
def design_lesson(topic: str) -> str:
    """Designs a dynamic 5-question MCQ lesson for a specific grammar or vocabulary topic. Call this when the user has recurring mistakes."""
    lesson_llm = llm.with_structured_output(Lesson)
    prompt = f"Design a short English language lesson and a 5-question multiple choice quiz on the topic: {topic}"
    try:
        lesson_obj = lesson_llm.invoke(prompt)
        return json.dumps(lesson_obj.model_dump())
    except Exception as e:
        print("Lesson generation failed:", e)
        return json.dumps({"error": "Failed to generate lesson."})

tools = [analyze_and_log_mistakes, design_lesson]

system_prompt = """You are an intelligent, friendly English Tutor functioning as a ReAct Agent.
When the user speaks to you, follow these steps:
1. ALWAYS call the `analyze_and_log_mistakes` tool first with their transcript to check for errors.
2. If the tool reports that there is a CRITICAL recurring mistake (made 3 or more times), you MUST call the `design_lesson` tool with the appropriate topic.
3. Finally, formulate a friendly conversational response to the user. If a lesson was designed, tell them you noticed a recurring mistake and have prepared a quick lesson for them. **CRITICAL: DO NOT output any of the lesson text, explanations, or MCQs in your conversational response.** The frontend will render the lesson. **Instead, you MUST end your chat response by deliberately asking a question that forces the user to practice that specific grammar rule in their next reply!** If no lesson was needed, just continue the conversation naturally. Do not over-correct minor mistakes."""

# Create the true ReAct Agent
tutor_graph = create_react_agent(llm, tools=tools, prompt=system_prompt)
