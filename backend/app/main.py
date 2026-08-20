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
from app.models.models import User, Mistake
from sqlalchemy import desc
from app.agents.graph import tutor_graph, design_lesson

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

@app.get("/api/lesson/pending")
def check_pending_lesson():
    db = SessionLocal()
    # Check if there's any mistake that reached the threshold (e.g., >= 3)
    pending = db.query(Mistake).filter(Mistake.user_id == 1, Mistake.count >= 3).order_by(desc(Mistake.count)).first()
    db.close()
    if pending:
        return {"status": "success", "has_pending": True, "topic": pending.category}
    return {"status": "success", "has_pending": False}

@app.get("/api/lesson/suggest")
def suggest_lesson():
    db = SessionLocal()
    # Find most frequent mistake
    top_mistake = db.query(Mistake).filter(Mistake.user_id == 1).order_by(desc(Mistake.count)).first()
    db.close()
    
    topic = "Present Simple vs Present Continuous"
    if top_mistake and top_mistake.count >= 2:
        topic = top_mistake.error_text
        
    # generate lesson directly via tool
    lesson_json_str = design_lesson.invoke({"topic": topic})
    try:
        lesson_data = json.loads(lesson_json_str)
        return {"status": "success", "lesson": lesson_data}
    except Exception as e:
        return {"status": "error", "message": "Failed to generate lesson.", "details": str(e)}

from typing import Optional
from datetime import datetime

@app.get("/api/conversation/summary")
def get_summary(since: Optional[str] = None):
    db = SessionLocal()
    query = db.query(Mistake).filter(Mistake.user_id == 1)
    
    if since:
        try:
            # Parse JS ISO string, replacing 'Z' with +00:00 for python 3.10 compatibility
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            query = query.filter(Mistake.last_seen >= since_dt)
        except Exception as e:
            print("Failed to parse since datetime:", e)
            
    recent_mistakes = query.order_by(desc(Mistake.last_seen)).limit(10).all()
    
    mistakes_list = []
    for m in recent_mistakes:
        mistakes_list.append({
            "error_text": m.error_text,
            "correction": m.correction,
            "category": m.category,
            "count": m.count,
            "last_seen": m.last_seen.isoformat() if m.last_seen else None
        })
    db.close()
    
    return {"status": "success", "mistakes": mistakes_list}

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
                response_format="text",
                language="en"
            )
            
        # Parse history
        try:
            conversation_history = json.loads(history)
        except:
            conversation_history = []
            
        # Prepare history for ReAct agent
        from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
        messages = []
        for msg in conversation_history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content")))
            else:
                messages.append(AIMessage(content=msg.get("content")))
        messages.append(HumanMessage(content=transcription))
        
        initial_state = {"messages": messages}
        
        result = await tutor_graph.ainvoke(initial_state)
        response_content = result["messages"][-1].content
        
        # Gemini sometimes returns content as a list of blocks instead of a string
        if isinstance(response_content, list):
            parts = []
            for block in response_content:
                if isinstance(block, dict) and "text" in block:
                    parts.append(block["text"])
                elif isinstance(block, str):
                    parts.append(block)
                else:
                    parts.append(str(block))
            response_text = " ".join(parts).strip()
        else:
            response_text = str(response_content).strip()
            
        if not response_text:
            response_text = "I'm sorry, I encountered an error and couldn't formulate a response."
        
        # Extract lesson if the design_lesson tool was called
        lesson_data = None
        for msg in result["messages"]:
            if isinstance(msg, ToolMessage) and msg.name == "design_lesson":
                try:
                    lesson_data = json.loads(msg.content)
                except:
                    pass
            
        # Generate Text-to-Speech audio
        import base64
        import edge_tts
        tts_file = os.path.join(temp_dir, f"tts_{audio.filename}.mp3")
        
        communicate = edge_tts.Communicate(response_text, "en-US-AriaNeural")
        await communicate.save(tts_file)
        
        with open(tts_file, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')
            
        return {
            "status": "success",
            "transcript": transcription,
            "response_text": response_text,
            "audio_base64": audio_base64,
            "lesson": lesson_data,
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
