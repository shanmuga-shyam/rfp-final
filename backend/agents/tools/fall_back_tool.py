from langchain.tools import Tool
import google.generativeai as genai
import os
import logging

# Safe, lazy model initialization using GEMINI_MODEL env var.
# Do NOT instantiate a model at import time to avoid crashes when the model name
# is not available or supported in the current API account.
model_name = os.getenv("GEMINI_MODEL")
llm = None
if model_name:
    try:
        llm = genai.GenerativeModel(model_name)
    except Exception:
        logging.exception("Failed to initialize Gemini model '%s'", model_name)


def _fallback_generate(prompt: str) -> str:
    """Call the configured LLM if available, otherwise return a helpful message.

    This avoids raising exceptions at import time or when the model is unavailable.
    """
    if llm is None:
        return (
            "LLM not configured or unavailable. Set the GEMINI_MODEL environment variable to "
            "a supported model name (and ensure API key/permissions are correct)."
        )
    try:
        resp = llm.generate_content(prompt)
        return getattr(resp, "text", str(resp))
    except Exception:
        logging.exception("LLM generate_content failed")
        return "LLM call failed; check server logs for details."


FallbackLLMTool = Tool(
    name="FallbackLLMTool",
    func=_fallback_generate,
    description=(
        "Use this if no tools return useful information. It generates an answer using LLM's "
        "general reasoning. If the LLM is not configured this returns a helpful message."
    ),
)