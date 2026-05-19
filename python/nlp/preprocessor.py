"""
nlp/preprocessor.py — spaCy NLP pipeline
- Tokenisation, lemmatisation, NER
- Question extraction with regex + POS tagging
- TF-IDF topic extraction
"""
import re
import logging
from typing import List, Dict, Any

import spacy
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

log = logging.getLogger(__name__)

# Load model (downloaded in setup.bat)
try:
    nlp = spacy.load("en_core_web_sm")
    log.info("spaCy model loaded")
except OSError:
    log.warning("spaCy model not found, using blank")
    nlp = spacy.blank("en")

STOP = nlp.Defaults.stop_words

Q_STARTERS = re.compile(
    r"^(explain|define|describe|state|derive|prove|find|calculate|write|list|"
    r"discuss|what|why|how|compare|differentiate|enumerate|illustrate|evaluate|"
    r"analyse|analyze|determine|compute|solve|show|give|mention|outline)",
    re.IGNORECASE,
)
Q_NUM    = re.compile(r"^(\d+[\.\):]|[a-zA-Z][\.\):])\s+\w")
MARKS_RE = re.compile(r"\[(\d+)\s*(?:marks?|m)\]|\((\d+)\s*(?:marks?|m)\)", re.IGNORECASE)


class Preprocessor:
    def __init__(self):
        self.tfidf = TfidfVectorizer(
            max_features=60,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
        )

    def extract_questions(self, text: str) -> List[Dict[str, Any]]:
        lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 15]
        questions, seen = [], set()

        for line in lines:
            is_q = Q_NUM.match(line) or Q_STARTERS.match(line) or line.rstrip().endswith("?")
            if not is_q:
                continue
            key = line.lower()[:80]
            if key in seen:
                continue
            seen.add(key)
            m     = MARKS_RE.search(line)
            marks = int(m.group(1) or m.group(2)) if m else 0
            clean = MARKS_RE.sub("", line).strip()
            topics = self._quick_topics(clean)
            questions.append({"text": clean[:400], "marks": marks, "topics": topics})

        return questions[:80]

    def extract_topics_tfidf(self, text: str) -> List[Dict[str, Any]]:
        if not text or len(text) < 50:
            return []
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", text) if len(s.strip()) > 15]
        if len(sentences) < 2:
            return []
        try:
            mat    = self.tfidf.fit_transform(sentences)
            scores = np.asarray(mat.sum(axis=0)).flatten()
            names  = self.tfidf.get_feature_names_out()
            top    = scores.argsort()[::-1][:20]
            topics = []
            for i in top:
                name = names[i]
                if len(name) < 3 or name.isdigit():
                    continue
                topics.append({
                    "name":      name.title(),
                    "frequency": int(scores[i] * 10),
                    "tfidf":     round(float(scores[i]), 4),
                })
            return topics
        except Exception as e:
            log.warning(f"TF-IDF failed: {e}")
            return []

    def extract_entities(self, text: str) -> List[Dict[str, str]]:
        """Named entity recognition — persons, orgs, concepts"""
        doc = nlp(text[:50_000])
        return [{"text": ent.text, "label": ent.label_} for ent in doc.ents
                if ent.label_ in {"ORG", "PERSON", "GPE", "WORK_OF_ART", "EVENT", "PRODUCT"}]

    def summarize_extractive(self, text: str, n: int = 8) -> List[str]:
        """TF-IDF extractive summarization — top N sentences"""
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 40]
        if len(sentences) <= n:
            return sentences
        try:
            tv   = TfidfVectorizer(stop_words="english", sublinear_tf=True)
            mat  = tv.fit_transform(sentences)
            sc   = np.asarray(mat.sum(axis=1)).flatten()
            top  = sorted(sc.argsort()[::-1][:n])
            return [sentences[i] for i in top]
        except Exception:
            return sentences[:n]

    def keywords(self, text: str, n: int = 12) -> List[str]:
        try:
            tv = TfidfVectorizer(stop_words="english", max_features=n, ngram_range=(1, 2))
            tv.fit_transform([text])
            return list(tv.get_feature_names_out())
        except Exception:
            return []

    def _quick_topics(self, text: str) -> List[str]:
        doc = nlp(text[:500])
        return list({chunk.root.lemma_.lower() for chunk in doc.noun_chunks
                     if not chunk.root.is_stop and len(chunk.root.text) > 3})[:5]
