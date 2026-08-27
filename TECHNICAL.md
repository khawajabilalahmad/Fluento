# Technical Documentation: Fluento AI

## 1. System Overview
Fluento AI is a voice-first, agentic English language tutor. The system moves beyond traditional static chatbots by utilizing an autonomous ReAct (Reason + Act) agent that maintains persistent memory of a user's grammatical mistakes across sessions. When a user repeatedly makes the same category of mistake, the agent autonomously interrupts the conversation to generate and deliver a personalized interactive micro-lesson, closing the learning loop.

## 2. Technology Stack
- **Frontend:** React + Vite. Selected for rapid UI development, component-based architecture (critical for the interactive Lesson Card), and efficient hot-reloading.
- **Backend:** FastAPI (Python). Selected for its native asynchronous support, auto-generated OpenAPI documentation, and seamless integration with Python-based AI libraries.
- **Agent Framework:** LangGraph. Selected to provide a fault-tolerant, state-machine-based execution loop for the ReAct architecture, ensuring reliable tool-calling and memory checkpointing.
- **LLM:** Google Gemini (`gemini-3.5-flash-lite`). Selected for its low-latency reasoning and robust adherence to structured JSON outputs via LangChain.
- **STT (Speech-to-Text):** Groq Whisper API (`whisper-large-v3`). Selected for high accuracy in transcribing accented or non-native English speech.
- **TTS (Text-to-Speech):** Microsoft Edge-TTS. Selected as a fast, free, and asynchronous text-to-speech engine to provide immediate vocal responses.
- **Database:** SQLite (via SQLAlchemy ORM). Selected for lightweight, zero-configuration persistent storage suitable for an MVP.

## 3. System Architecture
### Data Flow
1. **Client Layer:** The user records audio via the React frontend.
2. **Transport:** The audio `.webm` file and chat history are POSTed to the FastAPI backend.
3. **Perception:** The backend sends the audio to the STT service to get a transcript.
4. **Cognition (Agent):** The transcript is fed to the LangGraph ReAct Agent, which executes a loop of reasoning and tool calling.
5. **Action:** The agent queries/updates the SQLite database. If thresholds are met, it generates a lesson.
6. **Synthesis:** The agent's final text response is synthesized into an `.mp3` via Edge-TTS.
7. **Delivery:** The backend returns a JSON payload containing the text, base64 audio, and optional lesson data to the frontend for rendering.

## 4. Voice Processing Pipeline
- **Audio Recording:** Captured via the browser's `MediaRecorder` API in chunks.
- **Speech-to-Text:** The `.webm` file is sent to the Groq Whisper API. The parameter `language="en"` is strictly enforced to prevent the model from hallucinating or switching languages due to user accents.
- **Agent Processing:** Text is injected into the LangGraph loop.
- **Text-to-Speech:** The final response string is passed to `edge_tts.Communicate()`. The generated `.mp3` is base64-encoded and sent to the client.

## 5. Agent Architecture
- **Framework:** `create_react_agent` from LangGraph.
- **Paradigm:** ReAct (Reasoning and Acting).
- **System Prompt Strategy:** The prompt uses a strict, numbered execution order:
  1. *ALWAYS* analyze the transcript using the analysis tool.
  2. *CONDITIONAL:* If the tool reports a CRITICAL warning, call the lesson generation tool.
  3. *CONSTRAINT:* Formulate a conversational response. Do *not* output lesson MCQs in the chat text.
  4. *ENFORCEMENT:* End the response with a question that forces the user to practice the targeted grammar rule.

## 6. Agent Tools
### `analyze_and_log_mistakes`
- **Purpose:** To evaluate the transcript for linguistic errors, categorize them, and track their frequency.
- **Input:** `transcript` (string), `user_id` (int).
- **Processing:** Uses Gemini with `with_structured_output` to extract an array of mistakes. The prompt explicitly forbids broad categories (like "Grammar") and forces precise linguistic rules (e.g., "Third-Person Singular"). It queries the SQLite database, matching by `user_id` and `category`. It increments the count and updates the `error_text`.
- **Output:** A string summarizing the mistakes found. If any mistake reaches a count of >= 3, it appends a "CRITICAL" warning string instructing the ReAct loop to trigger a lesson.

### `design_lesson`
- **Purpose:** To generate personalized educational interventions on the fly.
- **Input:** `topic` (string).
- **Processing:** Instructs Gemini via `with_structured_output` to design an explanation and exactly 5 multiple-choice questions on the topic.
- **Output:** A JSON string payload representing the `Lesson` schema, which is eventually passed to the frontend to mount the interactive `<LessonCard>`.

## 7. Memory & Database Design
- **Concept:** The system utilizes *Episodic Memory* via a persistent SQLite database.
- **Schema:** `Mistake` table containing: `id`, `user_id`, `error_text`, `correction`, `category`, `count`, `last_seen`.
- **Categorization & Counting:** Instead of tracking exact flawed sentences, the system tracks the abstract `category` (e.g., "Present Perfect"). When a user makes a mistake in an existing category, the `count` increments, and `last_seen` updates. This allows the system to recognize systemic weaknesses across multiple disconnected conversations.

## 8. Intervention Logic
```text
User speaks
      ↓
STT Transcript
      ↓
Tool: analyze_and_log_mistakes
      ↓
Store/update mistake by Category
      ↓
Check frequency
      ↓
Count >= 3?
   ↙       ↘
 No        Yes
 ↓          ↓
Continue   Return CRITICAL warning to ReAct Agent
conversation          ↓
                      Agent calls `design_lesson` tool
                      ↓
                      Generate 5 MCQs and explanation
                      ↓
                      Agent ends response with forced practice question
```

## 9. LLM Integration
- **Structured Outputs:** The system heavily utilizes LangChain's `with_structured_output` bound to Pydantic schemas (`TranscriptAnalysis`, `Lesson`).
- **Why?** This guarantees that the LLM returns safely typed, machine-readable JSON rather than raw text. It entirely eliminates the risk of parsing errors and neutralizes certain types of prompt injection.
- **Reasoning:** An LLM is strictly required for this project because traditional deterministic algorithms cannot reliably convert a flawed English sentence into an abstract grammatical category, nor can they generate personalized, context-aware curricula on demand.

## 10. API Design
### `POST /api/conversation/turn`
- **Input:** `audio` (File), `history` (JSON string of previous messages).
- **Processing:** Runs the Voice and Agent pipelines.
- **Response:** `{ transcript, response_text, audio_base64, lesson }`
- **Error Cases:** Returns `400 Bad Request` if audio is missing.

### `GET /api/conversation/summary`
- **Input:** `since` (Optional ISO datetime string).
- **Processing:** Queries the database for mistakes where `last_seen >= since`.
- **Response:** A list of the user's recent mistakes for the Daily Report Card.

## 11. Frontend Architecture
- **State Management:** React `useState` tracks `appMode` ('select', 'lesson', 'chat', 'summary'), `sessionStart`, and the `history` array.
- **Audio Handling:** `MediaRecorder` API captures audio chunks and converts them to `.webm` blobs for transport.
- **Lesson Rendering:** When the backend returns a `lesson` object in the payload, the chat UI conditionally renders a dedicated `<LessonCard>` component, pausing the conversation until the user completes the 5 MCQs.

## 12. Error Handling
- **Database Failures:** DB transactions in `graph.py` are wrapped in generic `try...except Exception` blocks. If the DB locks, it logs the error but safely returns an empty mistake list so the conversation can continue uninterrupted.
- **File Cleanup:** The `conversation/turn` endpoint uses a strict `try...finally` block containing `os.remove()` to guarantee that temporary audio files are deleted from the server, preventing disk exhaustion even if the API crashes.

## 13. Security
- **SQL Injection:** Utilizing SQLAlchemy ORM enforces parameterized queries, neutralizing SQL injection risks.
- **CORS:** FastAPI is configured to only allow cross-origin requests from specific local frontend ports (`localhost:5173`).
- **Secrets Management:** Keys are loaded via `os.getenv()` from a `.env` file explicitly ignored by `.gitignore`.

## 14. Testing & Evaluation
- **Methodology:** The system was evaluated via manual edge-case testing (documented in `TESTING.md`).
- **Scope:** Tested for missing audio (graceful 400), background noise (STT returns empty string, Agent asks for clarification), LLM schema failures (caught safely, skips logging), and hallucination resistance.
- **Trade-off:** As an MVP, the system does not currently feature automated CI/CD unit testing or a standardized golden dataset for evaluation. 

## 15. Technical Decisions & Trade-offs
| Decision | Choice | Why | Alternative Considered |
|---|---|---|---|
| **Database** | SQLite | Zero-config, perfectly suitable for a local MVP. | PostgreSQL (Overkill for MVP) |
| **Agent** | LangGraph | Handles the ReAct cycle reliably; future-proof for multi-agent expansion. | Custom Python `while` loop (Brittle, error-prone) |
| **STT** | Groq Whisper | Best-in-class accuracy for diverse accents with low API latency. | Web Speech API (Inconsistent across browsers) |
| **Memory** | Database | Required for *Episodic Memory* to track progress across sessions. | In-memory array (Wiped on restart) |

## 16. Performance & Cost
- **Latency Bottleneck:** The current architecture requires sequential processing: STT -> Agent Reasoning -> Tool LLM Call (Analysis) -> Tool LLM Call (Lesson, optional) -> TTS. This results in noticeable latency (several seconds) between user input and audio response.
- **Cost:** Each turn uses minimal STT compute, but up to 3 LLM inference passes (ReAct + Analysis + Lesson). Using a highly optimized, smaller model like `gemini-3.5-flash-lite` keeps token costs exceptionally low while maintaining reasoning capabilities.

## 17. Limitations
- **Latency:** The HTTP POST architecture prevents real-time, low-latency conversational interruptions.
- **Hardcoded State:** Authentication is not implemented; all data is logged to `user_id = 1`.
- **Language Lock:** The system is explicitly forced into English transcription and synthesis, preventing multi-language support.

## 18. Future Technical Improvements
- **Agentic Evaluator:** A secondary background agent to scan historical data and assign a CEFR level.
- **WebSockets:** Migrating from HTTP REST to a WebSocket stream to allow for real-time audio chunk processing and true conversational interruptions.
- **Spaced Repetition (SRS):** An algorithm to proactively test users on old mistakes days or weeks after the initial lesson.
