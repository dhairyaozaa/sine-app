const jwt = require('jsonwebtoken')
const db  = require('../db/database')

module.exports = (req, res, next) => {
  try {
    const h = req.headers.authorization
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' })
    const decoded = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET)
    const user = db.get('users').find({ id: decoded.id }).value()
    if (!user) return res.status(401).json({ message: 'User not found' })
    const { password: _, ...safe } = user
    req.user = safe
    next()
  } catch { res.status(401).json({ message: 'Invalid token' }) }
}
