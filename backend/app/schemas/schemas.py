from pydantic import BaseModel, Field
from typing import List, Optional

class MistakeAnalysis(BaseModel):
    error_text: str = Field(description="The exact incorrect phrase or sentence the user said.")
    correction: str = Field(description="The corrected phrase or sentence.")
    category: str = Field(description="Category of the mistake, e.g., 'Grammar', 'Vocabulary', 'Pronunciation'.")
    explanation: str = Field(description="A brief explanation of why it was wrong.")

class TranscriptAnalysis(BaseModel):
    mistakes: List[MistakeAnalysis] = Field(description="A list of mistakes found in the transcript. Empty list if no mistakes.")
    general_feedback: str = Field(description="Overall fluency feedback or encouragement.")

class TutorInstruction(BaseModel):
    instruction: str = Field(description="Specific instructions for the tutor on how to respond to the user based on their mistakes.")
    should_correct_now: bool = Field(description="Whether the tutor should correct the user in this turn.")
