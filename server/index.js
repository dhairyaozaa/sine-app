require('dotenv').config()
const express     = require('express')
const path        = require('path')
const fs          = require('fs')
const helmet      = require('helmet')
const compression = require('compression')

const { predRouter, notesRouter, plannerRouter, analyticsRouter, attendanceRouter } = require('./routes/other')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(compression())
app.use(helmet({ contentSecurityPolicy: false }))

// ── CORS — allow all origins ──────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,ngrok-skip-browser-warning')
  res.header('ngrok-skip-browser-warning', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',        require('./routes/auth'))
app.use('/api/papers',      require('./routes/papers'))
app.use('/api/predictions', predRouter)
app.use('/api/notes',       notesRouter)
app.use('/api/planner',     plannerRouter)
app.use('/api/analytics',   analyticsRouter)
app.use('/api/attendance',  attendanceRouter)
app.use('/uploads',         express.static(path.join(__dirname, 'uploads')))

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// Serve local React build
const DIST = path.join(__dirname, '../client/dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(DIST, 'index.html'))
  })
} else {
  app.get('/', (_, res) => res.send('<h2>✅ Sine backend running</h2>'))
}

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message })
})

app.listen(PORT, () => console.log(`\n✅  Sine backend → http://localhost:${PORT}\n`))
