"""
Sine Python ML Service — FastAPI
Runs on http://localhost:8000
Called by the Node.js backend automatically when available.
"""
import logging
import asyncio
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import tempfile, os, shutil

from ocr.pipeline     import extract_text
from nlp.preprocessor import Preprocessor
from ml.engine        import cluster_topics, score_predictions, deduplicate_questions, embed
from nlp.notes_gen    import generate_summary, generate_flashcards, generate_formula_sheet, generate_viva

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="Sine ML Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Lazy-init preprocessor
_prep: Optional[Preprocessor] = None
def prep() -> Preprocessor:
    global _prep
    if _prep is None:
        _prep = Preprocessor()
    return _prep


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "sine-ml"}


# ── Process file (upload + extract + NLP) ─────────────────────────────────────
@app.post("/process-file")
async def process_file(
    file: UploadFile = File(...),
    mime_type: str   = Form(...),
):
    """
    Full pipeline:
    1. Save uploaded file temporarily
    2. OCR / text extraction
    3. spaCy NLP: questions + TF-IDF topics
    4. Embedding + clustering for semantic topics
    5. Question deduplication
    Return everything to Node.js
    """
    tmp_path = None
    try:
        # Save to temp file
        suffix   = os.path.splitext(file.filename)[1]
        tmp      = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        shutil.copyfileobj(file.file, tmp)
        tmp.close()

        log.info(f"Processing: {file.filename} ({mime_type})")

        # 1. Extract text
        extraction = extract_text(tmp_path, mime_type)
        raw_text   = extraction["text"]
        warning    = extraction.get("warning")

        if not raw_text.strip():
            return {
                "raw_text": "", "questions": [], "topics": [],
                "clusters": [], "warning": warning or "No text extracted",
            }

        # 2. Questions
        questions = prep().extract_questions(raw_text)

        # 3. TF-IDF topics
        topics = prep().extract_topics_tfidf(raw_text)

        # 4. Semantic clustering on sentences
        sentences = [s.strip() for s in raw_text.split("\n") if len(s.strip()) > 20][:200]
        clusters  = []
        if len(sentences) >= 5:
            try:
                vecs     = embed(sentences)
                clusters = cluster_topics(sentences, vecs)
                # Merge cluster topics into topic list
                for c in clusters:
                    label_lower = c["label"].lower()
                    if not any(label_lower in t["name"].lower() for t in topics):
                        topics.append({
                            "name":      c["label"].title(),
                            "frequency": c["size"],
                            "tfidf":     0.0,
                        })
            except Exception as e:
                log.warning(f"Clustering skipped: {e}")

        # 5. Deduplicate questions
        questions = deduplicate_questions(questions, threshold=0.88)

        return {
            "raw_text":  raw_text[:80000],
            "pages":     extraction.get("pages", 1),
            "method":    extraction.get("method", "unknown"),
            "questions": questions[:80],
            "topics":    sorted(topics, key=lambda t: -t["tfidf"])[:20],
            "clusters":  clusters[:8],
            "warning":   warning,
        }

    except Exception as e:
        log.error(f"process-file error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── Predict topics across papers ──────────────────────────────────────────────
class PaperIn(BaseModel):
    id:        str
    topics:    List[dict] = []
    questions: List[dict] = []

class PredictRequest(BaseModel):
    papers: List[PaperIn]

@app.post("/predict")
def predict(req: PredictRequest):
    try:
        predictions = score_predictions([p.dict() for p in req.papers])
        return {"predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Generate notes ────────────────────────────────────────────────────────────
class NotesRequest(BaseModel):
    raw_text:  str
    questions: List[dict] = []
    topics:    List[dict] = []
    type:      str = "summary"   # summary | flashcard | formula | viva

@app.post("/generate-notes")
def generate_notes(req: NotesRequest):
    try:
        t = req.type
        if t == "summary":
            content = generate_summary(req.raw_text, req.questions, req.topics)
        elif t == "flashcard":
            content = generate_flashcards(req.questions, req.raw_text)
        elif t == "formula":
            content = generate_formula_sheet(req.raw_text)
        elif t == "viva":
            content = generate_viva(req.questions, req.raw_text)
        else:
            raise HTTPException(status_code=400, detail="Unknown type")

        if not content or (isinstance(content, list) and len(content) == 0) or \
           (isinstance(content, dict) and not content.get("sentences")):
            raise HTTPException(status_code=422, detail="Not enough content to generate notes from this paper.")

        return {"type": t, "content": content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Semantic search across question bank ─────────────────────────────────────
class SearchRequest(BaseModel):
    query:     str
    questions: List[dict]
    top_k:     int = 5

@app.post("/search")
def semantic_search(req: SearchRequest):
    if not req.questions:
        return {"results": []}
    try:
        texts      = [q["text"] for q in req.questions]
        all_texts  = [req.query] + texts
        vecs       = embed(all_texts)
        from sklearn.preprocessing import normalize
        vecs       = normalize(vecs)
        query_vec  = vecs[0]
        doc_vecs   = vecs[1:]
        sims       = doc_vecs @ query_vec
        top_idx    = sims.argsort()[::-1][:req.top_k]
        results    = [{"question": req.questions[i], "score": float(sims[i])} for i in top_idx if sims[i] > 0.3]
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
