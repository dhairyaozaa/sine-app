"""
nlp/notes_gen.py — Note generation using real extracted content
- Extractive summarization (TF-IDF sentence ranking)
- Flashcard generation from real questions
- Formula detection with regex
- Viva Q&A from question bank
"""
import re
import logging
from typing import List, Dict, Any

log = logging.getLogger(__name__)

FORMULA_RE = re.compile(
    r"(?:O\([^)]+\)|[A-Za-z_]\s*=\s*[^,\n]{4,60}|"
    r"\b(?:time|space)\s+complexity\b.{0,40})",
    re.IGNORECASE,
)


def generate_summary(text: str, questions: List[Dict], topics: List[Dict]) -> Dict:
    from nlp.preprocessor import Preprocessor
    prep      = Preprocessor()
    sentences = prep.summarize_extractive(text, n=10)
    kw        = prep.keywords(text, n=12)
    return {"sentences": sentences, "keywords": kw}


def generate_flashcards(questions: List[Dict], text: str) -> List[Dict]:
    if not questions:
        return []
    cards = []
    for q in questions[:15]:
        qt = q.get("text", "").strip()
        if len(qt) < 15:
            continue
        # Try to find an answer sentence in the text
        answer = _find_answer(set(re.findall(r"\b\w{5,}\b", qt.lower())), text)
        cards.append({
            "question": qt,
            "answer":   answer or f"Topics: {', '.join(q.get('topics', []))}. Review your notes for a full answer.",
            "marks":    q.get("marks", 0),
        })
    return cards


def generate_formula_sheet(text: str) -> List[Dict]:
    formulas = []
    seen     = set()
    for line in text.split("\n"):
        m = FORMULA_RE.search(line)
        if m:
            f = m.group().strip()
            if f and f not in seen and 3 < len(f) < 120:
                seen.add(f)
                context = line.strip()[:100]
                formulas.append({"formula": f, "context": context})
    return formulas[:30]


def generate_viva(questions: List[Dict], text: str) -> List[Dict]:
    if not questions:
        return []
    viva = []
    for q in questions[:10]:
        qt = q.get("text", "").strip()
        if len(qt) < 15:
            continue
        words  = set(re.findall(r"\b\w{5,}\b", qt.lower()))
        answer = _find_answer(words, text)
        viva.append({
            "question": f"Q: {qt}",
            "answer":   f"A: {answer}" if answer else
                        f"A: Address definition, working principle, example, and application. Key topics: {', '.join(q.get('topics', []))}.",
        })
    return viva


def _find_answer(keywords: set, text: str) -> str:
    for sent in re.split(r"(?<=[.!?])\s+", text):
        words_in = set(re.findall(r"\b\w{5,}\b", sent.lower()))
        if len(keywords & words_in) >= 2 and len(sent) > 40:
            return sent.strip()[:300]
    return ""
