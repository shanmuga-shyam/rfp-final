from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, UnstructuredExcelLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import google.generativeai as genai
import json
from fastapi import HTTPException
import os
import traceback

# Document processing functions

def process_document(file_path):
    print("hello3")
    """Extract text and metadata from uploaded documents (PDF, DOCX or XLSX)"""
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
        documents = loader.load()
    elif file_path.endswith('.docx'):
        loader = Docx2txtLoader(file_path)
        documents = loader.load()
    elif file_path.endswith('.xlsx'):
        loader = UnstructuredExcelLoader(file_path)
        documents = loader.load()
    else:
        raise ValueError("Unsupported file format. Only PDF, DOCX and XLSX are supported.")

    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    return text_splitter.split_documents(documents)

def extract_rfp_structure(file_path):
    """Extract RFP structure and generate structured JSON data

    This function attempts to use a configured Gemini model (GEMINI_MODEL env var).
    If the model is not configured or the call fails it falls back to a simple
    deterministic extractor which returns the document chunks as sections so the
    upload endpoint can continue to work.
    """
    print("hello2")
    chunks = process_document(file_path)
    combined_text = " ".join([chunk.page_content for chunk in chunks])

    # Attempt to use a configured Gemini model (set GEMINI_MODEL in env).
    MODEL_NAME = os.getenv("GEMINI_MODEL", "")
    response = None

    if MODEL_NAME:
        try:
            llm = genai.GenerativeModel(MODEL_NAME)
            print("calling LLM", MODEL_NAME)
            response = llm.generate_content(combined_text)
            print("hello by llm")
        except Exception as e:
            print(f"LLM call failed: {e}")
            traceback.print_exc()
            response = None

    # If we got a response from LLM, try to parse JSON out of it.
    if response is not None:
        try:
            import re
            # Safely get the content from the response
            if hasattr(response, "candidates"):
                content = response.candidates[0].content.parts[0].text
            elif hasattr(response, "content"):
                content = response.content
            else:
                content = str(response)

            # Try to extract a JSON block fenced as ```json { ... } ```
            if match := re.search(r"```json\s*(\{.*\})\s*```", content, re.DOTALL):
                json_str = match.group(1)
            else:
                # Fallback: extract from first '{' to last '}'
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start == -1 or json_end == 0:
                    raise ValueError("No JSON object found in LLM response.")
                json_str = content[json_start:json_end]

            return json.loads(json_str)
        except Exception as e:
            print(f"Error extracting JSON: {e}")
            print(f"Response content: {getattr(response, 'content', str(response))}")
            traceback.print_exc()
            # Fall through to deterministic fallback

    # Fallback deterministic extractor: convert chunks into simple sections
    try:
        sections = []
        sections.extend(
            {
                "id": str(i + 1),
                "title": f"Section {i + 1}",
                "parent_id": None,
                "content": chunk.page_content,
                "level": 1,
            }
            for i, chunk in enumerate(chunks)
        )
        return {
            "metadata": {
                "title": os.path.basename(file_path),
                "issuer": None,
                "issue_date": None,
                "due_date": None,
                "contact_info": {"name": None, "email": None, "phone": None},
                "submission_requirements": [],
            },
            "sections": sections,
            "questions": [],
            "requirements": [],
        }
    except Exception as e:
        print(f"Fallback extraction failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to extract RFP structure: {str(e)}")