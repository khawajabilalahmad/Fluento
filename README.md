# Fluento AI 🗣️
*A voice-first Agentic English Tutor that tracks recurring grammatical mistakes and dynamically generates personalized micro-lessons.*

---

## Why This Exists

### The Problem
English learners often know grammar rules but struggle to apply them during spontaneous conversation. They may repeatedly make the same mistakes, while existing tools often treat each mistake independently.

Most solutions either:

Over-correct and interrupt natural conversation.
Under-correct and ignore important mistakes.
Provide corrections without tracking recurring weaknesses.
Separate conversation practice from targeted learning.

### The Solution
Fluento AI combines natural voice conversation with adaptive learning.

The system analyzes spoken conversations, tracks grammatical mistakes across sessions, identifies recurring weaknesses, and uses an Agentic ReAct workflow to decide when targeted intervention is needed.

When a recurring weakness reaches a defined threshold, Fluento generates a personalized micro-lesson and integrates it into the conversation.

---

## Features
- 🎙️ **Voice-First Conversations:** Speak naturally using Whisper (STT) and listen to near-instant audio responses (Edge-TTS).
- 🧠 **Agentic Reasoning (ReAct):** Powered by LangGraph, the AI acts as a true agent—using tools to analyze transcripts, query databases, and generate curricula on the fly.
- 📊 **Smart Mistake Tracking:** Mistakes are mapped to core grammatical categories (e.g., "Third-Person Singular") rather than exact phrasing, allowing the system to track true conceptual gaps across sessions.
- 🎓 **Dynamic Micro-Lessons:** When a recurring mistake is detected, the AI generates a customized, interactive 5-question multiple-choice quiz directly inside the chat UI.
- 📈 **Daily Report Cards:** End your conversation to receive a beautiful summary of your recent struggles and corrections.

---

## Tech Stack
- **Frontend:** React + Vite, styled with modern Glassmorphism UI and `lucide-react` icons.
- **Backend:** FastAPI (Python) handling REST endpoints, file uploads, and SQLite database transactions.
- **Agentic Engine:** LangGraph (`create_react_agent`) managing the tool-calling loop.
- **AI Models:** 
  - LLM: Google Gemini (gemini-3.5-flash-lite) via `langchain-google-genai`
  - STT: Groq Whisper API (`whisper-large-v3`)
  - TTS: Microsoft Edge-TTS (async)

## Architecture

  User Voice

    ↓

Whisper STT

    ↓

Conversation Transcript

    ↓

LangGraph ReAct Agent

    ├── Analyze Mistakes

    ├── Query Learner History

    ├── Evaluate Recurring Weakness

    └── Generate Lesson

    ↓

Adaptive Response

    ↓

Edge-TTS

    ↓

User

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/khawajabilalahmad/Fluento.git
cd fluento-ai
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```
Create a `.env` file in the `backend` directory:
```env
GOOGLE_API_KEY="your_google_gemini_key"
API_KEY="your_groq_api_key"
BASE_URL="https://api.groq.com/openai/v1"
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## Usage
Start the backend server (from the `backend` directory):
```bash
uvicorn app.main:app --reload
```
Start the frontend development server (from the `frontend` directory):
```bash
npm run dev
```
Open your browser to `http://localhost:5173` and start speaking!

---

## Example
1. **Input:** The user speaks into the microphone: *"I has been working all day."*
2. **Analysis:** The ReAct agent calls the `analyze_and_log_mistakes` tool. The LLM identifies a "Present Perfect" error and logs it to the database.
3. **Trigger:** If the user makes this same category of mistake 3 times, the tool returns a CRITICAL warning.
4. **Action:** The ReAct agent autonomously calls the `design_lesson` tool to generate an interactive JSON lesson on "Present Perfect" and serves it to the frontend.
5. **Practice:** The agent deliberately ends its conversational response by forcing the user to practice the new rule in their next reply.

---

## Roadmap
- [ ] Implement a full User Profile Page tracking CEFR fluency levels (A1-C2).
- [ ] Add support for multiple languages (Spanish, French, German).
- [ ] Implement spaced repetition (SRS) for vocabulary tracking.
- [ ] Expand UI gamification elements.

---

## Contributing
Contributions are welcome! If you'd like to improve the ReAct agent's prompt, add new tools, or enhance the React UI, please fork the repository and submit a pull request. 