'use strict'
/**
 * python-bridge.js
 * Tries to call the Python ML service (localhost:8000).
 * If Python is not running, falls back to the pure-JS NLP.
 */
const axios = require('axios')
const fs    = require('fs')
const FormData = require('form-data')

const PY_URL = process.env.PYTHON_ML_URL || 'http://localhost:8000'
let _pythonAvailable = null   // null = unknown, true/false = checked

async function isPythonUp() {
  if (_pythonAvailable !== null) return _pythonAvailable
  try {
    await axios.get(`${PY_URL}/health`, { timeout: 2000 })
    _pythonAvailable = true
    console.log('🐍  Python ML service detected — using enhanced NLP')
  } catch {
    _pythonAvailable = false
    console.log('📦  Python ML service not running — using JS NLP fallback')
  }
  // Re-check every 30 seconds so it picks up Python if started later
  setTimeout(() => { _pythonAvailable = null }, 30000)
  return _pythonAvailable
}

async function processFile(filePath, mimeType) {
  if (!(await isPythonUp())) return null
  try {
    const form = new FormData()
    form.append('file', fs.createReadStream(filePath))
    form.append('mime_type', mimeType)
    const { data } = await axios.post(`${PY_URL}/process-file`, form, {
      headers: form.getHeaders(),
      timeout: 120_000,
      maxContentLength: Infinity,
    })
    return data
  } catch (e) {
    console.warn('Python process-file failed, falling back to JS:', e.message)
    return null
  }
}

async function predict(papers) {
  if (!(await isPythonUp())) return null
  try {
    const { data } = await axios.post(`${PY_URL}/predict`, { papers }, { timeout: 30_000 })
    return data.predictions
  } catch (e) {
    console.warn('Python predict failed:', e.message)
    return null
  }
}

async function generateNotes(type, paper) {
  if (!(await isPythonUp())) return null
  try {
    const { data } = await axios.post(`${PY_URL}/generate-notes`, {
      raw_text:  paper.rawText  || '',
      questions: paper.questions || [],
      topics:    paper.topics   || [],
      type,
    }, { timeout: 30_000 })
    return data.content
  } catch (e) {
    console.warn('Python generate-notes failed:', e.message)
    return null
  }
}

async function semanticSearch(query, questions) {
  if (!(await isPythonUp())) return null
  try {
    const { data } = await axios.post(`${PY_URL}/search`, { query, questions, top_k: 8 }, { timeout: 15_000 })
    return data.results
  } catch (e) {
    return null
  }
}

module.exports = { processFile, predict, generateNotes, semanticSearch, isPythonUp }
