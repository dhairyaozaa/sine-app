'use strict'
/**
 * Pure-JS NLP: TF-IDF topic extraction + question detection.
 * Works on real text extracted from PDF/images.
 */

const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of',
  'with','by','from','is','are','was','were','be','been','have','has','had','do',
  'does','did','will','would','could','should','may','might','this','that','these',
  'those','it','its','we','you','he','she','they','their','our','your','what','which',
  'who','how','when','where','why','if','then','also','as','not','no','can','each'])

const QUESTION_MARKERS = /^(explain|define|describe|state|derive|prove|find|calculate|write|list|discuss|what|why|how|compare|differentiate|enumerate|illustrate|evaluate|analyse|analyze|determine|compute|solve|show|give|mention|outline)/i
const QUESTION_NUM     = /^(\d+[\.\):]|[a-z][\.\):])\s+\w/i
const MARKS_RE         = /\[(\d+)\s*(?:marks?|m)\]|\((\d+)\s*(?:marks?|m)\)/i

function tokenize(text) {
  return (text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).filter(w => !STOP.has(w))
}

function extractTopics(text, n = 12) {
  if (!text || text.length < 30) return []
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10)
  if (sentences.length === 0) return []

  // TF across full text
  const tf = {}
  const tokens = tokenize(text)
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1 })

  // Bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = `${tokens[i]} ${tokens[i+1]}`
    tf[bg] = (tf[bg] || 0) + 1
  }

  // IDF: penalise terms in every sentence
  const idf = {}
  Object.keys(tf).forEach(term => {
    const df = sentences.filter(s => s.toLowerCase().includes(term)).length
    idf[term] = Math.log((sentences.length + 1) / (df + 1)) + 1
  })

  const scored = Object.entries(tf)
    .map(([term, freq]) => ({ name: term, score: freq * (idf[term] || 1), frequency: freq }))
    .filter(t => t.name.length > 3 && !t.name.match(/^\d+$/))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)

  return scored.map(t => ({
    name: t.name.replace(/\b\w/g, c => c.toUpperCase()),
    frequency: t.frequency,
    tfidf: parseFloat(t.score.toFixed(3)),
  }))
}

function extractQuestions(text) {
  if (!text) return []
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 15)
  const questions = []
  const seen = new Set()

  lines.forEach(line => {
    const isQ = QUESTION_NUM.test(line) || QUESTION_MARKERS.test(line) || line.endsWith('?')
    if (!isQ || seen.has(line.toLowerCase().slice(0, 60))) return
    seen.add(line.toLowerCase().slice(0, 60))
    const marksM = MARKS_RE.exec(line)
    const marks  = marksM ? parseInt(marksM[1] || marksM[2]) : 0
    questions.push({
      text:   line.replace(MARKS_RE, '').trim().slice(0, 400),
      marks,
      topics: extractTopics(line, 3).map(t => t.name),
    })
  })
  return questions.slice(0, 80)
}

function generatePredictions(papers) {
  if (!papers || papers.length === 0) return []
  const map = {}
  papers.forEach((p, idx) => {
    const recency = 1 + (idx / Math.max(papers.length, 1)) * 0.3
    ;(p.topics || []).forEach(t => {
      const k = t.name.toLowerCase()
      if (!map[k]) map[k] = { name: t.name, freq: 0, tfidf: 0, count: 0 }
      map[k].freq  += (t.frequency || 1) * recency
      map[k].tfidf += (t.tfidf    || 1) * recency
      map[k].count += 1
    })
  })
  const total  = papers.length
  const maxF   = Math.max(...Object.values(map).map(t => t.freq), 1)
  return Object.values(map)
    .map(t => {
      const conf = Math.round(Math.min((t.freq/maxF)*60 + Math.min(t.tfidf*2,20) + Math.min((t.count/total)*20,20), 99))
      return { topic: t.name, confidence: conf, level: conf>=75?'hi':conf>=50?'md':'lo', appearances: t.count, lastYear: t.count >= Math.ceil(total/2), marks: 10 }
    })
    .sort((a,b) => b.confidence - a.confidence)
    .slice(0, 10)
    .map((p, i) => ({ rank: i+1, ...p }))
}

function generateNotes(type, paper) {
  const topics    = paper?.topics    || []
  const questions = paper?.questions || []
  const text      = paper?.rawText   || ''

  if (type === 'flashcard') {
    if (questions.length === 0) return []
    return questions.slice(0, 10).map(q => ({
      question: q.text,
      answer: q.topics?.length
        ? `This covers: ${q.topics.join(', ')}. Write a detailed answer covering definitions, examples, and applications.`
        : 'Review your syllabus notes for a complete answer.',
      marks: q.marks || 0,
    }))
  }

  if (type === 'formula') {
    // Extract lines that look like formulas from real text
    const formulas = []
    text.split('\n').forEach(line => {
      if (/[=+\-*/^]/.test(line) && /[A-Za-z]/.test(line) && line.trim().length > 4 && line.trim().length < 120) {
        formulas.push({ formula: line.trim(), context: '' })
      }
    })
    return formulas.slice(0, 20)
  }

  if (type === 'viva') {
    if (questions.length === 0) return []
    return questions.slice(0, 8).map(q => ({
      question: `Q: ${q.text}`,
      answer: `A: Cover the following aspects: definition, working principle, example, and practical application. Topics involved: ${q.topics?.join(', ') || 'refer to syllabus'}.`,
    }))
  }

  // summary
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 40)
  const topN = sentences.slice(0, 8)
  return {
    sentences: topN,
    keywords: topics.slice(0, 10).map(t => t.name),
  }
}

module.exports = { extractTopics, extractQuestions, generatePredictions, generateNotes }
