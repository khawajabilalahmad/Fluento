# System Testing: Fluento AI

This document outlines the testing scenarios and results for the Fluento Agentic English Tutor system. It covers expected behaviors across normal operations, edge cases, system failures, and LLM-specific risks.

---

## Test 01: Normal Input
**Scenario:** A user speaks a normal sentence containing a common grammatical error.
**Input:** "I has been working all day."
**Expected:** The Speech-to-Text API accurately transcribes the text. The ReAct agent calls `analyze_and_log_mistakes`. The LLM identifies a "Present Perfect" or "Subject-Verb Agreement" error and logs it to the database with a count of 1. The agent responds conversationally with a natural correction.
**Actual:** Whisper transcribes accurately. Tool successfully logs the mistake. Agent responds: "You've been working hard! Just remember to say 'I have been' instead of 'I has been'."
**Status:** **PASS**

---

## Test 02: Invalid Input (No Audio)
**Scenario:** The client attempts to hit the `/api/conversation/turn` endpoint without providing a valid audio file in the form data.
**Input:** POST request with empty or missing `audio` field.
**Expected:** The FastAPI backend should catch the missing file before invoking any expensive LLM or STT calls and fail gracefully.
**Actual:** FastAPI immediately throws a `400 Bad Request` with the detail: `"No audio file provided"`. The frontend catches this and displays a connection error without crashing.
**Status:** **PASS**

---

## Test 03: Unexpected Input (Silence / Background Noise)
**Scenario:** The user submits an audio file consisting entirely of silence or heavy background noise.
**Input:** 5 seconds of static noise.
**Expected:** The STT model (forced to `language="en"`) should return an empty string or a confused transcription. The ReAct agent should handle the nonsensical text gracefully and ask the user to clarify.
**Actual:** STT returns an empty string or generic noise text. The ReAct agent responds: "I'm sorry, I didn't quite catch that. Could you repeat yourself?"
**Status:** **PASS**

---

## Test 04: LLM Failure (Malformed JSON output)
**Scenario:** The LLM fails to adhere to the requested Pydantic schema when calling the structured output for `MistakeAnalysis` or `Lesson`.
**Input:** LLM returns raw text instead of a JSON object during the `analyze_and_log_mistakes` tool call.
**Expected:** The system must not crash. The error should be caught, logging should be skipped for this turn, and the conversation should proceed.
**Actual:** LangChain throws a validation error. The `try/except` block inside `analyze_and_log_mistakes` catches the exception, prints `"Analysis tool failed"`, and returns an empty list. The agent proceeds to formulate a conversational response as if no mistakes were found.
**Status:** **PASS**

---

## Test 05: Tool Failure (Database connection error)
**Scenario:** The SQLite database is temporarily locked or inaccessible when the agent tries to log a mistake.
**Input:** File permission denied on `fluento.db`.
**Expected:** The application must catch the database error without bringing down the FastAPI server or breaking the ReAct loop.
**Actual:** The `try/except` block inside the database transaction catches the `Exception`, prints the failure, and returns an empty list of recurring mistakes. The user still receives their chat response without interruption.
**Status:** **PASS**

---

## Test 06: Repeated Execution (Lesson Trigger)
**Scenario:** The user repeats a mistake in the same grammatical category (e.g., "Third-Person Singular") for the 3rd time. Does the system remain stable and execute the dynamic lesson flow?
**Input:** User says "He go to the store" (3rd time making a Third-Person error).
**Expected:** The `analyze_and_log_mistakes` tool detects the count hit 3 and returns a CRITICAL warning. The ReAct agent reasons that it must call `design_lesson`. It calls the tool, receives the JSON lesson payload, and formulates a conversational response ending with a follow-up question. The frontend renders the lesson card.
**Actual:** Tool logs the 3rd mistake. ReAct loop calls `design_lesson`. The agent generates a 5-MCQ lesson. The frontend successfully parses the payload, mounts the interactive quiz, and waits for user completion before returning to chat.
**Status:** **PASS**

---

## Test 07: Hallucination
**Scenario:** The user asks the agent a highly ambiguous or nonsensical English grammar question to see if it produces unsupported/fake grammar rules.
**Input:** "Is it grammatically correct to say 'I are happying' in the future past tense?"
**Expected:** The agent should not hallucinate a fake "future past tense" rule. It should correctly identify that the sentence is nonsensical and explain the actual rules of English tenses.
**Actual:** The ReAct agent responds: "There is no such thing as the 'future past tense' in English, and 'I are happying' is incorrect. You would just say 'I will be happy' for the future, or 'I was happy' for the past!"
**Status:** **PASS**
