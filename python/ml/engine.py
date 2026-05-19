"""
ml/engine.py — Local ML pipeline
- sentence-transformers embeddings (offline after first download)
- K-Means semantic clustering
- Cosine similarity question deduplication
- Prediction scoring (TF-IDF + frequency + recency)
"""
import logging
import numpy as np
from typing import List, Dict, Any

log = logging.getLogger(__name__)

# Lazy singletons
_embedder = None
_km_cache = {}


def get_embedder():
    global _embedder
    if _embedder is None:
        log.info("Loading sentence-transformers model…")
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        log.info("Model loaded.")
    return _embedder


def embed(texts: List[str]) -> np.ndarray:
    if not texts:
        return np.array([])
    return get_embedder().encode(texts, batch_size=32, show_progress_bar=False)


def cluster_topics(sentences: List[str], embeddings: np.ndarray, k: int = None) -> List[Dict]:
    """K-Means semantic clustering → topic labels"""
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import normalize

    if len(sentences) < 4:
        return []
    k = k or max(2, min(8, len(sentences) // 5))

    try:
        vecs   = normalize(embeddings)
        km     = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(vecs)

        clusters = []
        for cid in range(k):
            idx = np.where(labels == cid)[0]
            if not len(idx):
                continue
            centroid = km.cluster_centers_[cid]
            dists    = np.linalg.norm(vecs[idx] - centroid, axis=1)
            rep_sent = sentences[idx[dists.argmin()]]
            label    = " ".join(w for w in rep_sent.split()[:5] if len(w) > 3)[:50]
            clusters.append({"label": label, "size": len(idx), "representative": rep_sent})

        return sorted(clusters, key=lambda x: -x["size"])
    except Exception as e:
        log.warning(f"Clustering failed: {e}")
        return []


def deduplicate_questions(questions: List[Dict], threshold: float = 0.88) -> List[Dict]:
    """Remove semantically near-duplicate questions using cosine similarity"""
    if len(questions) < 2:
        return questions

    texts = [q["text"] for q in questions]
    try:
        vecs = embed(texts)
        from sklearn.preprocessing import normalize
        vecs = normalize(vecs)

        keep = [0]
        for i in range(1, len(vecs)):
            sims = vecs[keep] @ vecs[i]
            if sims.max() < threshold:
                keep.append(i)
        return [questions[i] for i in keep]
    except Exception as e:
        log.warning(f"Dedup failed: {e}")
        return questions


def score_predictions(papers: List[Dict]) -> List[Dict]:
    """
    Multi-signal prediction scoring:
    - TF-IDF score from extracted topics
    - Frequency across papers
    - Recency weighting (newer papers weighted higher)
    - Semantic cluster size bonus
    """
    if not papers:
        return []

    topic_map: Dict[str, Dict] = {}

    for idx, paper in enumerate(papers):
        # Recency weight: more recent = higher weight
        recency = 1.0 + (idx / max(len(papers), 1)) * 0.4

        for t in paper.get("topics", []):
            name = t.get("name", "").strip()
            if not name or len(name) < 3:
                continue
            key = name.lower()
            if key not in topic_map:
                topic_map[key] = {"name": name, "freq": 0, "tfidf": 0, "count": 0, "marks": 0}

            topic_map[key]["freq"]  += t.get("frequency", 1) * recency
            topic_map[key]["tfidf"] += t.get("tfidf", 0)    * recency
            topic_map[key]["count"] += 1

        for q in paper.get("questions", []):
            for t in q.get("topics", []):
                key = t.lower()
                if key in topic_map:
                    topic_map[key]["marks"] += q.get("marks", 0)

    total  = max(len(papers), 1)
    max_f  = max((v["freq"] for v in topic_map.values()), default=1)

    scored = []
    for key, d in topic_map.items():
        freq_s   = (d["freq"] / max_f) * 55
        tfidf_s  = min(d["tfidf"] * 15, 25)
        appear_s = min((d["count"] / total) * 20, 20)
        conf     = min(round(freq_s + tfidf_s + appear_s), 99)
        scored.append({
            "topic":       d["name"],
            "confidence":  conf,
            "level":       "hi" if conf >= 75 else "md" if conf >= 50 else "lo",
            "appearances": d["count"],
            "lastYear":    d["count"] >= max(1, total // 2),
            "marks":       d["marks"],
        })

    scored.sort(key=lambda x: -x["confidence"])
    return [{"rank": i + 1, **s} for i, s in enumerate(scored[:12])]
