from fastapi import FastAPI, File, UploadFile, HTTPException, Form
import json
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from openai import OpenAI
from dotenv import load_dotenv

from dotenv import load_dotenv

load_dotenv()

from app.database.database import engine, Base, SessionLocal
from app.models.models import User
from app.agents.graph import tutor_graph

# Initialize DB
Base.metadata.create_all(bind=engine)
# Seed default user
db = SessionLocal()
if not db.query(User).filter(User.id == 1).first():
    db.add(User(name="Student"))
    db.commit()
db.close()

app = FastAPI(title="Agentic English Improver API")

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sanitize environment variables to prevent space/quote issues
api_key = os.getenv("API_KEY", "").strip(" '\"")
base_url = os.getenv("BASE_URL", "https://api.groq.com/openai/v1").strip(" '\"")

client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is running successfully"}

@app.post("/api/conversation/turn")
async def conversation_turn(
    audio: UploadFile = File(...),
    history: str = Form("[]")
):
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Temporary storage to save the audio before sending to STT API
    temp_dir = "temp_audio"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, audio.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
            
        # Call Speech-to-Text API
        with open(file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model=os.getenv("STT_MODEL", "whisper-large-v3"), 
                file=audio_file,
                response_format="text"
            )
            
        # Parse history
        try:
            conversation_history = json.loads(history)
        except:
            conversation_history = []
            
        # Call LangGraph workflow
        initial_state = {
            "transcript": transcription,
            "user_id": 1,
            "conversation_history": conversation_history,
            "mistakes_detected": [],
            "tutor_instruction": "",
            "tutor_response": ""
        }
        
        result = tutor_graph.invoke(initial_state)
        response_text = result["tutor_response"]
            
        # Generate Text-to-Speech audio
        from gtts import gTTS
        import base64
        tts = gTTS(text=response_text, lang='en')
        tts_file = os.path.join(temp_dir, f"tts_{audio.filename}.mp3")
        tts.save(tts_file)
        
        with open(tts_file, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')
            
        return {
            "status": "success",
            "transcript": transcription,
            "response_text": response_text,
            "audio_base64": audio_base64,
            "message": "Processed successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary files
        if os.path.exists(file_path):
            os.remove(file_path)
        if 'tts_file' in locals() and os.path.exists(tts_file):
            os.remove(tts_file)
