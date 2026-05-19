const express = require('express')
const { v4: uuid } = require('uuid')
const fs   = require('fs')
const db   = require('../db/database')
const auth = require('../middleware/auth')
const upload = require('../middleware/upload')
const { extractTopics, extractQuestions } = require('../db/nlp')
const py = require('../db/python-bridge')
const router = express.Router()

// List papers
router.get('/', auth, (req, res) => {
  const papers = db.get('papers')
    .filter({ userId: req.user.id })
    .map(p => ({ id:p.id, originalName:p.originalName, fileSize:p.fileSize,
      status:p.status, questionsFound:p.questionsFound, topicsFound:p.topicsFound,
      subject:p.subject, year:p.year, createdAt:p.createdAt, mimeType:p.mimeType,
      extractionMethod:p.extractionMethod }))
    .orderBy(['createdAt'],['desc']).value()
  res.json(papers)
})

// Get single paper
router.get('/:id', auth, (req, res) => {
  const paper = db.get('papers').find({ id: req.params.id, userId: req.user.id }).value()
  if (!paper) return res.status(404).json({ message: 'Not found' })
  res.json(paper)
})

// Upload + process
router.post('/upload', auth, upload.single('paper'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file or unsupported type (PDF, JPG, PNG, PPTX, TXT)' })
  try {
    let rawText = '', questions = [], topics = [], method = 'js', warning = null, pages = 1

    // Try Python ML first (superior extraction)
    const pyResult = await py.processFile(req.file.path, req.file.mimetype)

    if (pyResult && pyResult.raw_text) {
      rawText   = pyResult.raw_text
      questions = pyResult.questions || []
      topics    = pyResult.topics    || []
      method    = `python:${pyResult.method}`
      warning   = pyResult.warning
      pages     = pyResult.pages || 1
    } else {
      // JS fallback
      const { extractText } = require('../db/extractor')
      rawText = await extractText(req.file.path, req.file.mimetype)
      if (!rawText.trim() && req.body.pastedText) rawText = req.body.pastedText
      topics    = extractTopics(rawText)
      questions = extractQuestions(rawText)
    }

    const paper = {
      id: uuid(), userId: req.user.id,
      originalName: req.file.originalname, filename: req.file.filename,
      filePath: req.file.path, fileSize: req.file.size, mimeType: req.file.mimetype,
      status: rawText.trim() ? 'done' : 'needs_text',
      rawText: rawText.slice(0, 100000),
      questionsFound: questions.length, topicsFound: topics.length,
      questions, topics, pages,
      extractionMethod: method,
      warning,
      subject: req.body.subject || '', year: req.body.year || '',
      createdAt: new Date().toISOString(),
    }
    db.get('papers').push(paper).write()
    res.status(201).json(paper)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// Patch pasted text (for images when no Python)
router.patch('/:id/text', auth, async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ message: 'Text required' })

    let topics = [], questions = [], method = 'js'

    const pyResult = await py.processFile(null, 'text/plain').catch(() => null)
    // Just use JS for pasted text
    topics    = extractTopics(text)
    questions = extractQuestions(text)

    db.get('papers').find({ id: req.params.id, userId: req.user.id }).assign({
      rawText: text.slice(0, 100000), topics, questions,
      questionsFound: questions.length, topicsFound: topics.length,
      status: 'done', extractionMethod: method,
    }).write()
    res.json(db.get('papers').find({ id: req.params.id }).value())
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// Delete
router.delete('/:id', auth, (req, res) => {
  const paper = db.get('papers').find({ id: req.params.id, userId: req.user.id }).value()
  if (!paper) return res.status(404).json({ message: 'Not found' })
  if (fs.existsSync(paper.filePath)) try { fs.unlinkSync(paper.filePath) } catch {}
  db.get('papers').remove({ id: req.params.id }).write()
  res.json({ message: 'Deleted' })
})

module.exports = router
