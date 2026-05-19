const express = require('express')
const { v4: uuid } = require('uuid')
const db   = require('../db/database')
const auth = require('../middleware/auth')
const { generatePredictions, generateNotes } = require('../db/nlp')
const py   = require('../db/python-bridge')

// ── Predictions ───────────────────────────────────────────────────────────────
const predRouter = express.Router()

predRouter.get('/', auth, async (req, res) => {
  try {
    const papers = db.get('papers').filter({ userId: req.user.id, status: 'done' }).value()
    if (!papers || papers.length === 0)
      return res.status(400).json({ message: 'No processed papers found. Upload a paper first.' })

    // Try Python ML scoring first, fallback to JS
    let predictions = null
    try {
      predictions = await py.predict(papers.map(p => ({
        id: p.id, topics: p.topics || [], questions: p.questions || []
      })))
    } catch (e) {
      // Python unavailable, use JS
    }

    if (!predictions || predictions.length === 0) {
      predictions = generatePredictions(papers)
    }

    if (!predictions || predictions.length === 0)
      return res.status(400).json({ message: 'Not enough topic data extracted from your papers yet.' })

    res.json(predictions)
  } catch (e) {
    console.error('Predictions error:', e)
    res.status(500).json({ message: e.message })
  }
})

// ── Notes ─────────────────────────────────────────────────────────────────────
const notesRouter = express.Router()

notesRouter.get('/', auth, (req, res) => {
  try {
    const notes = db.get('notes').filter({ userId: req.user.id })
      .map(n => ({ id:n.id, type:n.type, title:n.title, paperId:n.paperId, createdAt:n.createdAt }))
      .orderBy(['createdAt'],['desc']).value()
    res.json(notes)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

notesRouter.post('/generate', auth, async (req, res) => {
  try {
    const { type = 'summary', paperId } = req.body
    let paper
    if (paperId)
      paper = db.get('papers').find({ id: paperId, userId: req.user.id, status: 'done' }).value()
    else
      paper = db.get('papers').filter({ userId: req.user.id, status: 'done' })
        .orderBy(['createdAt'],['desc']).first().value()

    if (!paper)
      return res.status(400).json({ message: 'No processed paper found. Upload a paper first.' })

    let content = null
    try { content = await py.generateNotes(type, paper) } catch {}
    if (!content) content = generateNotes(type, paper)

    const isEmpty = !content ||
      (Array.isArray(content) && content.length === 0) ||
      (content.sentences && content.sentences.length === 0)

    if (isEmpty)
      return res.status(400).json({ message: 'Not enough content in this paper to generate notes.' })

    const titles = { summary:'Summary', flashcard:'Flashcards', formula:'Formula Sheet', viva:'Viva Q&A' }
    const note = {
      id: uuid(), userId: req.user.id, paperId: paper.id, type,
      title: `${titles[type] || 'Notes'} — ${paper.originalName}`,
      content, createdAt: new Date().toISOString()
    }
    db.get('notes').push(note).write()
    res.status(201).json(note)
  } catch (e) {
    console.error('Notes error:', e)
    res.status(500).json({ message: e.message })
  }
})

notesRouter.get('/:id', auth, (req, res) => {
  try {
    const note = db.get('notes').find({ id: req.params.id, userId: req.user.id }).value()
    if (!note) return res.status(404).json({ message: 'Not found' })
    res.json(note)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

notesRouter.delete('/:id', auth, (req, res) => {
  try {
    db.get('notes').remove({ id: req.params.id, userId: req.user.id }).write()
    res.json({ message: 'Deleted' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── Planner ───────────────────────────────────────────────────────────────────
const plannerRouter = express.Router()

plannerRouter.get('/', auth, (req, res) => {
  try {
    const row = db.get('schedules').find({ userId: req.user.id }).value()
    res.json(row || null)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

plannerRouter.post('/generate', auth, (req, res) => {
  try {
    const { examDate, hoursPerDay = 4, syllabusPercent = 60, mode = 'normal', subjects = [] } = req.body
    if (!examDate) return res.status(400).json({ message: 'examDate is required' })
    if (!subjects.length) return res.status(400).json({ message: 'Add at least one subject' })

    const DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const today = new Date(), exam = new Date(examDate)
    const daysLeft = Math.max(1, Math.ceil((exam - today) / 86400000))
    const mult = mode==='emergency'?1.5:mode==='intense'?1.2:1

    const days = []
    for (let d = 0; d < Math.min(daysLeft, 14); d++) {
      const date = new Date(today); date.setDate(today.getDate() + d)
      let remaining = hoursPerDay * mult
      const slots = []
      const shuffled = [...subjects].sort(() => Math.random() - 0.5)
      for (const subj of shuffled) {
        if (remaining <= 0) break
        const hrs = parseFloat(Math.min(remaining, 2).toFixed(1))
        slots.push({ subject: subj, hours: hrs, priority: hrs >= 2 ? 'hi' : 'md' })
        remaining -= hrs
      }
      if (mode !== 'emergency' && d % 3 === 2)
        slots.push({ subject: 'Revision', hours: 1, priority: 'hi' })
      days.push({ day: DAYS[date.getDay()], date: date.toISOString().split('T')[0], slots })
    }

    const schedule = {
      id: uuid(), userId: req.user.id, examDate, mode,
      hoursPerDay, syllabusPercent, subjects, days,
      createdAt: new Date().toISOString()
    }
    const ex = db.get('schedules').find({ userId: req.user.id }).value()
    if (ex)
      db.get('schedules').find({ userId: req.user.id })
        .assign({ examDate, mode, hoursPerDay, syllabusPercent, subjects, days }).write()
    else
      db.get('schedules').push(schedule).write()
    res.json(schedule)
  } catch (e) {
    console.error('Planner error:', e)
    res.status(500).json({ message: e.message })
  }
})

plannerRouter.delete('/', auth, (req, res) => {
  try {
    db.get('schedules').remove({ userId: req.user.id }).write()
    res.json({ message: 'Deleted' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── Analytics ─────────────────────────────────────────────────────────────────
const analyticsRouter = express.Router()

analyticsRouter.get('/summary', auth, (req, res) => {
  try {
    const papers   = db.get('papers').filter({ userId: req.user.id, status: 'done' }).value()
    const notes    = db.get('notes').filter({ userId: req.user.id }).value().length
    const schedule = db.get('schedules').find({ userId: req.user.id }).value()
    const daysLeft = schedule?.examDate
      ? Math.max(0, Math.ceil((new Date(schedule.examDate) - new Date()) / 86400000))
      : null

    const topicMap = {}
    papers.forEach(p => {
      ;(p.topics || []).forEach(t => {
        topicMap[t.name] = (topicMap[t.name] || 0) + (t.frequency || 1)
      })
    })

    const COLORS = [
      'linear-gradient(90deg,#4f8ef7,#7c3aed)',
      'linear-gradient(90deg,#7c3aed,#ec4899)',
      'linear-gradient(90deg,#06d6a0,#4f8ef7)',
      'linear-gradient(90deg,#f97316,#ec4899)',
      'linear-gradient(90deg,#4f8ef7,#06d6a0)',
    ]
    const maxFreq = Math.max(...Object.values(topicMap), 1)
    const topics  = Object.entries(topicMap)
      .sort((a,b) => b[1]-a[1]).slice(0,5)
      .map(([name, freq], i) => ({
        name, pct: Math.round((freq/maxFreq)*100), color: COLORS[i%COLORS.length]
      }))

    const readiness = topics.length
      ? Math.round(topics.reduce((a,t) => a+t.pct, 0) / topics.length)
      : 0

    res.json({
      papers: papers.length, notes, readiness, topics, daysLeft,
      streak: req.user.streak || 0, xp: req.user.xp || 0,
      hasData: papers.length > 0
    })
  } catch (e) {
    console.error('Analytics error:', e)
    res.status(500).json({ message: e.message })
  }
})

// ── Attendance ────────────────────────────────────────────────────────────────
const attendanceRouter = express.Router()

attendanceRouter.get('/', auth, (req, res) => {
  try {
    const row = db.get('attendance').find({ userId: req.user.id }).value()
    res.json(row || { subjects: [], minPct: 75 })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

attendanceRouter.put('/', auth, (req, res) => {
  try {
    const { subjects, minPct = 75 } = req.body
    const ex = db.get('attendance').find({ userId: req.user.id }).value()
    if (ex)
      db.get('attendance').find({ userId: req.user.id }).assign({ subjects, minPct }).write()
    else
      db.get('attendance').push({
        id: uuid(), userId: req.user.id, subjects, minPct,
        createdAt: new Date().toISOString()
      }).write()
    res.json({ subjects, minPct })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

attendanceRouter.patch('/subjects/:name', auth, (req, res) => {
  try {
    const { status } = req.body
    const row = db.get('attendance').find({ userId: req.user.id }).value()
    if (!row) return res.status(404).json({ message: 'Setup attendance first' })
    const subjects = row.subjects.map(s =>
      s.name !== req.params.name ? s :
      { ...s, total: s.total+1, attended: status==='present' ? s.attended+1 : s.attended }
    )
    db.get('attendance').find({ userId: req.user.id }).assign({ subjects }).write()
    res.json({ subjects })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = { predRouter, notesRouter, plannerRouter, analyticsRouter, attendanceRouter }
