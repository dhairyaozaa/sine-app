const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { v4: uuid } = require('uuid')
const db   = require('../db/database')
const auth = require('../middleware/auth')
const router = express.Router()

const sign = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: 'All fields required' })
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    if (db.get('users').find({ email: email.toLowerCase() }).value())
      return res.status(409).json({ message: 'Email already registered' })
    const user = { id: uuid(), name: name.trim(), email: email.toLowerCase(),
      password: await bcrypt.hash(password, 12), streak: 0, xp: 0, level: 1,
      createdAt: new Date().toISOString() }
    db.get('users').push(user).write()
    const { password: _, ...safe } = user
    res.status(201).json({ token: sign(user.id), user: safe })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
    const user = db.get('users').find({ email: email.toLowerCase() }).value()
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' })
    const { password: _, ...safe } = user
    res.json({ token: sign(user.id), user: safe })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/me', auth, (req, res) => res.json(req.user))

module.exports = router
