import os, sys
from dotenv import load_dotenv
load_dotenv('d:/AgenticAI_Project/Fluento/backend/.env')
sys.path.append('d:/AgenticAI_Project/Fluento/backend')
from app.agents.graph import llm
from langchain_core.output_parsers import PydanticOutputParser
from app.schemas.schemas import TranscriptAnalysis

parser = PydanticOutputParser(pydantic_object=TranscriptAnalysis)
prompt = f"Analyze the following transcript from an English language learner. Identify any grammatical, vocabulary, or pronunciation errors.\n\n{parser.get_format_instructions()}\n\nTranscript: I goes to the store yesterday."
response = llm.invoke(prompt)

with open('raw_response.txt', 'w', encoding='utf-8') as f:
    f.write(response.content)
