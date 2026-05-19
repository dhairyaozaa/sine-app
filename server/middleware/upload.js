const multer = require('multer')
const path   = require('path')
const { v4: uuid } = require('uuid')
const fs = require('fs')

const DIR = path.join(__dirname, '../uploads')
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })

module.exports = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIR),
    filename:    (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf','image/jpeg','image/png','image/jpg',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'].includes(file.mimetype)
    cb(null, ok)
  },
})
