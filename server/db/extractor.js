'use strict'
/**
 * File text extractor.
 * - PDF: uses pdf-parse (pure JS, no native deps)
 * - Images: reads filename + asks user to paste text (OCR needs Python)
 * - PPT: extracts embedded XML text
 */
const fs   = require('fs')
const path = require('path')

async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase()

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse')
      const buffer   = fs.readFileSync(filePath)
      const data     = await pdfParse(buffer)
      return data.text || ''
    } catch (e) {
      return `[PDF parse error: ${e.message}]`
    }
  }

  // ── Plain text ────────────────────────────────────────────────────────────
  if (['.txt','.md','.csv'].includes(ext)) {
    return fs.readFileSync(filePath, 'utf8')
  }

  // ── PowerPoint (basic XML extraction) ────────────────────────────────────
  if (ext === '.pptx' || mimeType?.includes('presentationml')) {
    try {
      const AdmZip = require('adm-zip')
      const zip    = new AdmZip(filePath)
      const slides = zip.getEntries().filter(e => e.entryName.match(/ppt\/slides\/slide\d+\.xml/))
      const texts  = slides.map(slide => {
        const xml = slide.getData().toString('utf8')
        return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      })
      return texts.join('\n\n')
    } catch {
      return ''
    }
  }

  // ── Images — return placeholder; user pastes text via UI ─────────────────
  if (mimeType?.startsWith('image/')) {
    return '' // frontend will prompt user to paste text
  }

  return ''
}

module.exports = { extractText }
