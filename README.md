# Sine — AI Exam Prep

## Quick Start (Node only)
```cmd
npm run setup && npm start
```
Open → http://localhost:3000

## With Python ML (enhanced)

Install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki

```cmd
cd python && setup.bat   # one-time
cd python && start.bat   # second terminal
npm start                # first terminal
```
App auto-detects Python. Falls back to JS if not running.

## GitHub
```cmd
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOU/sine-app.git
git branch -M main && git push -u origin main
```

## Python ML adds
- pdfplumber (better PDF extraction)
- Tesseract OCR (real image text extraction)
- spaCy NLP (accurate question detection)
- sentence-transformers (semantic clustering)
- Cosine similarity question deduplication
- Multi-signal prediction scoring
