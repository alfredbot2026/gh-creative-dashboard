"""
Mission Control Research Backend
FastAPI server wrapping notebooklm-py for autonomous research.
Run: cd backend && python main.py
"""

import os
import json
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

# Load environment variables from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("research-agent")

app = FastAPI(
    title="Mission Control Research Agent",
    description="Local backend for NotebookLM-powered research",
    version="1.1.0",
)

# Allow requests from Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase config from .env.local
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")


# ============================================================
# Request / Response Models
# ============================================================

class ResearchQuery(BaseModel):
    """Request body for running a research query."""
    notebook_id: Optional[str] = None
    query: str


class ImportSource(BaseModel):
    """Request body for importing a source into a notebook."""
    notebook_id: str
    url: str
    source_type: str = "url"


class ExtractRequest(BaseModel):
    """Request body for extracting insights from a notebook."""
    notebook_id: str
    topic: str = "general"


# ============================================================
# NotebookLM Client Helper — with auto-refresh
# ============================================================

async def get_nlm_client():
    """
    Create a NotebookLMClient from saved auth.
    If auth fails, try refresh_auth() once before giving up.
    """
    try:
        from notebooklm.client import NotebookLMClient
        client = await NotebookLMClient.from_storage()
        return client
    except ValueError as e:
        # Auth expired — try refresh before giving up
        logger.warning(f"Auth expired, attempting refresh: {e}")
        try:
            from notebooklm.client import NotebookLMClient
            client = await NotebookLMClient.from_storage()
            await client.refresh_auth()
            logger.info("Auth refreshed successfully")
            return client
        except Exception as refresh_err:
            raise HTTPException(
                status_code=503,
                detail=f"NotebookLM auth expired. Run: notebooklm login (refresh also failed: {refresh_err})"
            )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="notebooklm-py not installed. Run: pip install notebooklm-py"
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"NotebookLM auth failed: {str(e)}. Run: notebooklm login"
        )


def extract_answer(response) -> str:
    """
    Extract clean answer text from NotebookLM AskResult.
    The AskResult object has .answer, not .text.
    Falls back gracefully if the attribute doesn't exist.
    """
    # Try .answer first (this is what AskResult uses)
    if hasattr(response, 'answer'):
        return response.answer

    # Try .text as fallback
    if hasattr(response, 'text'):
        return response.text

    # Last resort — convert to string, but clean it up
    raw = str(response)
    # Strip the AskResult(...) wrapper if present
    if raw.startswith("AskResult(answer='"):
        raw = raw[len("AskResult(answer='"):]
        if raw.endswith("')"):
            raw = raw[:-2]
    return raw


# ============================================================
# Supabase Helper
# ============================================================

async def push_to_supabase(table: str, data: dict) -> dict:
    """Push data to Supabase via REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            json=data,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Supabase error: {response.text}"
            )
        return response.json()


# ============================================================
# API Routes
# ============================================================

@app.get("/")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "Mission Control Research Agent"}


@app.get("/notebooks")
async def list_notebooks():
    """List all NotebookLM notebooks."""
    client = await get_nlm_client()

    async with client:
        notebooks = await client.notebooks.list()
        return {
            "notebooks": [
                {
                    "id": nb.id,
                    "title": getattr(nb, "title", "Untitled"),
                }
                for nb in notebooks
            ],
            "count": len(notebooks),
        }


@app.get("/notebooks/{notebook_id}/sources")
async def list_sources(notebook_id: str):
    """List sources in a specific notebook."""
    client = await get_nlm_client()

    async with client:
        sources = await client.sources.list(notebook_id)
        return {
            "sources": [
                {
                    "id": src.id,
                    "title": getattr(src, "title", "Untitled"),
                    "type": getattr(src, "source_type", "unknown"),
                }
                for src in sources
            ],
            "count": len(sources),
        }


@app.post("/notebooks/{notebook_id}/import")
async def import_source(notebook_id: str, body: ImportSource):
    """Import a new source (URL, YouTube, etc.) into a notebook."""
    client = await get_nlm_client()

    async with client:
        source = await client.sources.add(notebook_id, body.url)

        # Track in Supabase
        await push_to_supabase("research_sources", {
            "source_type": body.source_type,
            "url": body.url,
            "title": getattr(source, "title", body.url),
            "platform": _detect_platform(body.url),
        })

        return {
            "success": True,
            "source_id": source.id,
            "title": getattr(source, "title", body.url),
        }


@app.post("/research/query")
async def research_query(body: ResearchQuery):
    """Run a research query against a notebook via chat."""
    client = await get_nlm_client()

    async with client:
        notebooks = await client.notebooks.list()
        if not notebooks:
            raise HTTPException(status_code=404, detail="No notebooks found")

        # Resolve notebook: could be an ID (UUID) or a title/name
        notebook_id = None

        if body.notebook_id:
            # Check if it's a valid UUID by direct match
            for nb in notebooks:
                if nb.id == body.notebook_id:
                    notebook_id = nb.id
                    break

            # If not found by ID, search by title (case-insensitive partial match)
            if not notebook_id:
                search_term = body.notebook_id.lower()
                for nb in notebooks:
                    title = getattr(nb, "title", "").lower()
                    if search_term in title or title in search_term:
                        notebook_id = nb.id
                        break

            if not notebook_id:
                available = [getattr(nb, "title", nb.id) for nb in notebooks]
                raise HTTPException(
                    status_code=404,
                    detail=f"Notebook '{body.notebook_id}' not found. Available: {available}"
                )
        else:
            # Default to first notebook
            notebook_id = notebooks[0].id

        # Ask the notebook a question via chat
        response = await client.chat.ask(notebook_id, body.query)

        # Extract clean answer text (not raw AskResult repr)
        answer = extract_answer(response)

        return {
            "query": body.query,
            "notebook_id": notebook_id,
            "response": answer,
        }


@app.post("/research/extract")
async def extract_insights(body: ExtractRequest):
    """Extract structured insights from a notebook and push to Supabase."""
    client = await get_nlm_client()

    async with client:
        # Extraction prompt
        extraction_prompt = (
            f"Based on all sources in this notebook, extract the top 5 most actionable insights "
            f"about '{body.topic}'. For each insight, provide: "
            f"1) A clear title, 2) A detailed explanation, 3) 2-3 actionable takeaways. "
            f"Format as JSON array with keys: title, content, actionable_takeaways."
        )
        response = await client.chat.ask(body.notebook_id, extraction_prompt)

        # Extract clean answer text
        response_text = extract_answer(response)

        # Try to parse as JSON
        try:
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            insights = json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            # If not valid JSON, create a single insight from the response
            insights = [{
                "title": f"Research on {body.topic}",
                "content": response_text[:500],
                "actionable_takeaways": [response_text[:200]],
            }]

        # Push each insight to Supabase
        saved = 0
        for insight in insights:
            await push_to_supabase("research_insights", {
                "topic": body.topic,
                "title": insight.get("title", f"Insight on {body.topic}"),
                "content": insight.get("content", ""),
                "actionable_takeaways": insight.get("actionable_takeaways", []),
            })
            saved += 1

        return {
            "success": True,
            "insights_saved": saved,
            "topic": body.topic,
        }


# ============================================================
# Utility
# ============================================================

def _detect_platform(url: str) -> str:
    """Detect platform from URL for categorization."""
    url_lower = url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    if "instagram.com" in url_lower:
        return "instagram"
    if "tiktok.com" in url_lower:
        return "tiktok"
    if "facebook.com" in url_lower:
        return "facebook"
    return "web"


# ============================================================
# Entry Point
# ============================================================

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Mission Control Research Agent...")
    print("   Local: http://localhost:8000")
    print("   Docs:  http://localhost:8000/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
