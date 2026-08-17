from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Agentic English Improver API")

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
async def conversation_turn(audio: UploadFile = File(...)):
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
            
        # Call LLM Conversation
        llm_model = os.getenv("LLM_MODEL", "qwen/qwen3.6-27b").strip(" '\"")
        completion = client.chat.completions.create(
            model=llm_model,
            messages=[
                {"role": "system", "content": "You are a helpful, friendly English tutor. Keep your responses conversational and relatively short. Do not over-correct every small mistake, just keep the conversation flowing naturally."},
                {"role": "user", "content": transcription}
            ],
            temperature=0.7,
            max_tokens=1024
        )
        import re
        raw_response = completion.choices[0].message.content
        # Remove <think>...</think> blocks, even if unclosed
        response_text = re.sub(r'<think>.*?(?:</think>|$)', '', raw_response, flags=re.DOTALL).strip()
        
        # If the model used all its tokens thinking and didn't output an answer
        if not response_text:
            response_text = "I'm sorry, I was thinking too hard and forgot to actually answer!"
            
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
