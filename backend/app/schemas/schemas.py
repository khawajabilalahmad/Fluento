from pydantic import BaseModel, Field
from typing import List, Optional

class MistakeAnalysis(BaseModel):
    error_text: str = Field(description="A direct, verbatim substring from the transcript containing the error. Do not modify or paraphrase the user's original words.")
    correction: str = Field(description="The grammatically correct, natural-sounding version of the error_text. Keep the original meaning intact.")
    category: str = Field(description="The highly specific linguistic rule violated (e.g., 'Subject-Verb Agreement', 'Past Perfect Tense', 'Countable Nouns', 'Prepositions of Time'). DO NOT use broad terms like 'Grammar' or 'Vocabulary'.")
    explanation: str = Field(description="A concise, 1-2 sentence explanation of the rule. Use simple vocabulary (B1 English level) so the learner can easily understand why they were wrong.")

class TranscriptAnalysis(BaseModel):
    mistakes: List[MistakeAnalysis] = Field(description="List of genuine language errors. Ignore conversational filler (um, uh) and informal slang if used correctly. Return an empty list if the transcript is error-free.")
    general_feedback: str = Field(description="A brief, encouraging 1-2 sentence assessment of the user's overall fluency, effort, or a specific positive thing they did.")

class TutorInstruction(BaseModel):
    instruction: str = Field(description="Pedagogical directive for the tutor's next response. (e.g., 'Praise their vocabulary, then gently correct the preposition using the sandwich feedback method').")
    should_correct_now: bool = Field(description="Set to True if the mistake impedes meaning or is a critical recurring error. Set to False if mistakes are minor and you want to prioritize conversation flow.")

class MCQ(BaseModel):
    question: str = Field(description="A clear fill-in-the-blank or direct question testing the specific concept. Avoid ambiguous phrasing or trick questions.")
    options: List[str] = Field(description="Exactly 4 options: 1 definitively correct answer, and 3 plausible distractors based on common ESL learner mistakes.", 
        min_items=4, 
        max_items=4
    )
    correct_answer: str = Field(description="The exact verbatim string from the 'options' list that is correct. Must perfectly match one of the items in 'options'.")

class Lesson(BaseModel):
    topic: str = Field(description="The specific grammar or vocabulary topic being taught (e.g., 'Using In, On, and At for Time' instead of just 'Prepositions').")
    explanation: str = Field(description="A warm, encouraging 2-3 sentence explanation of the rule. Avoid overly dense academic linguistic jargon.")
    examples: List[str] = Field(description="2-3 practical, everyday conversational examples demonstrating the correct usage of the rule.",
        min_items=2,
        max_items=3
    )
    mcqs: List[MCQ] = Field(description="Exactly 5 multiple choice questions testing the lesson topic progressing from easy to slightly challenging.", 
        min_items=5, 
        max_items=5
    )