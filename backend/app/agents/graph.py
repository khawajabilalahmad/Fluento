import os
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from app.schemas.schemas import TranscriptAnalysis, TutorInstruction
from app.database.database import SessionLocal
from app.models.models import Mistake

class AgentState(TypedDict):
    transcript: str
    user_id: int
    conversation_history: List[Dict[str, str]]
    mistakes_detected: List[Dict[str, Any]]
    tutor_instruction: str
    tutor_response: str

# Initialize the LLM using the same Groq proxy environment
llm_model = os.getenv("LLM_MODEL", "qwen/qwen3.6-27b").strip(" '\"")
api_key = os.getenv("API_KEY", "").strip(" '\"")
base_url = os.getenv("BASE_URL", "https://api.groq.com/openai/v1").strip(" '\"")

llm = ChatOpenAI(
    model=llm_model,
    api_key=api_key,
    base_url=base_url,
    temperature=0.7
)

def analyzer_node(state: AgentState):
    """Analyzes the transcript for language mistakes and updates the database."""
    transcript = state["transcript"]
    user_id = state["user_id"]
    
    from langchain_core.output_parsers import PydanticOutputParser
    
    parser = PydanticOutputParser(pydantic_object=TranscriptAnalysis)
    prompt = f"Analyze the following transcript from an English language learner. Identify any grammatical, vocabulary, or pronunciation errors.\n\n{parser.get_format_instructions()}\n\nTranscript: {transcript}"
    
    try:
        response = llm.invoke(prompt)
        
        # Clean up <think> blocks before parsing JSON
        import re
        content = re.sub(r'<think>.*?(?:</think>|$)', '', response.content, flags=re.DOTALL).strip()
        # Ensure it starts with JSON
        if content.startswith("```json"):
            content = content[7:-3]
        
        analysis = parser.invoke(content)
        mistakes = [m.model_dump() for m in analysis.mistakes]
    except Exception as e:
        print("Analysis failed:", e)
        mistakes = []
    
    # Update DB
    db = SessionLocal()
    try:
        for m in mistakes:
            existing = db.query(Mistake).filter(
                Mistake.user_id == user_id, 
                Mistake.error_text == m["error_text"]
            ).first()
            if existing:
                existing.count += 1
                existing.correction = m["correction"]
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
        
    return {"mistakes_detected": mistakes}

def planner_node(state: AgentState):
    """Decides on the tutoring strategy based on mistakes and history."""
    mistakes = state.get("mistakes_detected", [])
    user_id = state["user_id"]
    
    # Get recurring mistakes from DB
    db = SessionLocal()
    try:
        recurring = db.query(Mistake).filter(
            Mistake.user_id == user_id,
            Mistake.count > 1
        ).order_by(Mistake.count.desc()).limit(3).all()
        recurring_texts = [f"'{r.error_text}' (made {r.count} times)" for r in recurring]
    finally:
        db.close()
        
    from langchain_core.output_parsers import PydanticOutputParser
    
    parser = PydanticOutputParser(pydantic_object=TutorInstruction)
    
    context = f"Current Mistakes: {mistakes}\n"
    if recurring_texts:
        context += f"Recurring Past Mistakes: {', '.join(recurring_texts)}\n"
        
    prompt = f"""You are the Planning Agent for an English Tutor. 
Look at the user's current mistakes and past recurring mistakes.
Decide how the tutor should respond. 
If there is a recurring mistake, instruct the tutor to gently correct it. 
If the mistakes are minor, instruct the tutor to ignore them to keep the conversation flowing naturally.

{parser.get_format_instructions()}

Context:\n{context}"""

    try:
        response = llm.invoke(prompt)
        
        # Clean up <think> blocks before parsing JSON
        import re
        content = re.sub(r'<think>.*?(?:</think>|$)', '', response.content, flags=re.DOTALL).strip()
        if content.startswith("```json"):
            content = content[7:-3]
            
        instruction = parser.invoke(content)
        tutor_instruction = instruction.instruction
    except Exception as e:
        print("Planner failed:", e)
        tutor_instruction = "Just respond naturally and friendly."
        
    return {"tutor_instruction": tutor_instruction}

def tutor_node(state: AgentState):
    """Generates the final conversational response."""
    transcript = state["transcript"]
    tutor_instruction = state.get("tutor_instruction", "")
    history = state.get("conversation_history", [])
    
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    
    messages = [
        SystemMessage(content=f"You are a helpful, friendly English tutor. Keep your responses conversational and relatively short. Do not over-correct every small mistake, just keep the conversation flowing naturally. Follow this specific instruction from the planner: {tutor_instruction}")
    ]
    
    # Add history
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
            
    # Add current transcript
    messages.append(HumanMessage(content=transcript))
    
    response = llm.invoke(messages)
    
    # Clean up <think> blocks if present
    import re
    response_text = re.sub(r'<think>.*?(?:</think>|$)', '', response.content, flags=re.DOTALL).strip()
    if not response_text:
        response_text = "I'm sorry, I was thinking too hard and forgot to answer!"
        
    return {"tutor_response": response_text}

# Compile the graph
workflow = StateGraph(AgentState)
workflow.add_node("analyzer", analyzer_node)
workflow.add_node("planner", planner_node)
workflow.add_node("tutor", tutor_node)

workflow.set_entry_point("analyzer")
workflow.add_edge("analyzer", "planner")
workflow.add_edge("planner", "tutor")
workflow.add_edge("tutor", END)

tutor_graph = workflow.compile()
