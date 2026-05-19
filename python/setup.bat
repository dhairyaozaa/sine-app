@echo off
echo === Sine Python ML Service Setup ===
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment...
python -m venv .venv

echo [2/4] Installing dependencies...
call .venv\Scripts\activate.bat
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

echo [3/4] Downloading spaCy model...
python -m spacy download en_core_web_sm

echo [4/4] Pre-downloading sentence-transformers model...
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); print('Model cached.')"

echo.
echo === Setup complete! ===
echo Run: start.bat
pause
