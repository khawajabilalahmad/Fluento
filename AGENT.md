# Agent Architecture: Fluento AI

This document details the core Agentic AI logic implemented in `backend/app/agents/graph.py`.

## Core Agent
- **Framework:** LangGraph (`create_react_agent`)
- **LLM:** Google Gemini (`gemini-3.5-flash-lite`) via `ChatGoogleGenerativeAI`
- **Paradigm:** ReAct (Reasoning and Acting) loop

## System Prompt Workflow
The agent operates under a strict 3-step systemic prompt:
1. **Analyze:** It MUST call the `analyze_and_log_mistakes` tool on every turn to process the user's transcript.
2. **Evaluate & Act:** If the analysis tool reports a recurring mistake (made 3 or more times), the agent MUST call the `design_lesson` tool.
3. **Respond & Enforce:** The agent formulates a conversational response. 
   - If a lesson was generated, it strictly avoids outputting the lesson text (leaving rendering to the frontend). 
   - Instead, it deliberately ends the conversation turn with a question that forces the user to practice the specific grammar rule they struggled with.

## Tools

### 1. `analyze_and_log_mistakes`
- **Purpose:** Identifies grammatical, vocabulary, or pronunciation errors in the transcript.
- **Structured Output:** Forces the LLM to return data adhering to the `TranscriptAnalysis` Pydantic schema.
- **Categorization Constraint:** Explicitly instructed to avoid broad categories (like "Grammar") and instead identify precise linguistic rules (e.g., "Subject-Verb Agreement", "Past Perfect Tense").
- **State Management (SQLite):**
  - Queries the database for existing mistakes matching the user and the exact `category`.
  - Increments the `count` if a match is found, and overwrites the `error_text` and `correction` with the most recent occurrence.
  - Inserts a new row if no match is found.
- **Trigger:** Returns a `CRITICAL` string flag to the agent if any mistake hits a count of 3 or more.

### 2. `design_lesson`
- **Purpose:** Generates personalized educational content on the fly.
- **Structured Output:** Forces the LLM to return data adhering to the `Lesson` Pydantic schema.
- **Payload:** Generates a short explanation of the rule and exactly 5 multiple-choice questions (MCQs) on the provided topic.
- **Return:** Returns a JSON string payload that is passed back to the ReAct agent (and eventually intercepted by `main.py` to be served to the frontend UI).
