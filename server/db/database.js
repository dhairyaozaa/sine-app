const low      = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const path     = require('path')
const fs       = require('fs')

const DATA_DIR = path.join(__dirname, '../../data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = low(new FileSync(path.join(DATA_DIR, 'sine.json')))
db.defaults({ users:[], papers:[], notes:[], schedules:[], attendance:[] }).write()
module.exports = db
