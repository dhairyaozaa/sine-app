import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Layers, HelpCircle, FileText, Loader2, ChevronLeft, ChevronRight, Trash2, Upload } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const TYPES = [
  { id:'summary',   label:'Summary',       icon:FileText,   color:'#4f8ef7' },
  { id:'flashcard', label:'Flashcards',     icon:Layers,     color:'#7c3aed' },
  { id:'formula',   label:'Formula Sheet',  icon:BookOpen,   color:'#06d6a0' },
  { id:'viva',      label:'Viva Q&A',       icon:HelpCircle, color:'#f97316' },
]

export default function NotesPage() {
  const [papers, setPapers]   = useState([])
  const [notes,  setNotes]    = useState([])
  const [selPaper, setSelPaper] = useState('')
  const [selType,  setSelType]  = useState('summary')
  const [active,   setActive]   = useState(null)   // displayed note
  const [busy,     setBusy]     = useState(false)
  const [cardIdx,  setCardIdx]  = useState(0)
  const [flipped,  setFlipped]  = useState(false)

  useEffect(() => {
    api.get('/papers').then(r => { setPapers(r.data.filter(p => p.status==='done')); if (r.data[0]) setSelPaper(r.data[0].id) })
    api.get('/notes').then(r => setNotes(r.data))
  }, [])

  const generate = async () => {
    if (!selPaper) return toast.error('Select a paper first')
    setBusy(true)
    try {
      const { data } = await api.post('/notes/generate', { type: selType, paperId: selPaper })
      setNotes(n => [data, ...n])
      setActive(data)
      setCardIdx(0); setFlipped(false)
      toast.success('Notes generated!')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setBusy(false) }
  }

  const loadNote = async (id) => {
    try { const { data } = await api.get(`/notes/${id}`); setActive(data); setCardIdx(0); setFlipped(false) }
    catch { toast.error('Failed to load note') }
  }

  const deleteNote = async (id) => {
    await api.delete(`/notes/${id}`)
    setNotes(n => n.filter(x => x.id !== id))
    if (active?.id === id) setActive(null)
    toast.success('Deleted')
  }

  if (papers.length === 0) return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="empty-state card">
        <BookOpen size={40} className="text-[#243040]"/>
        <p className="font-semibold text-lg">No processed papers yet</p>
        <p className="text-sm text-[#566173]">Upload and process past papers first — notes are generated from your real content.</p>
        <Link to="/app/upload" className="btn btn-primary flex items-center gap-2 mt-2"><Upload size={14}/> Upload Papers</Link>
      </div>
    </div>
  )

  const cards = active?.content
  const card  = Array.isArray(cards) ? cards[cardIdx] : null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Notes & Flashcards</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator panel */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#566173] mb-4">Generate New</h2>

            <label className="label">Select Paper</label>
            <select value={selPaper} onChange={e => setSelPaper(e.target.value)} className="input mb-4">
              {papers.map(p => <option key={p.id} value={p.id}>{p.originalName} {p.year ? `(${p.year})` : ''}</option>)}
            </select>

            <label className="label">Note Type</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setSelType(t.id)}
                  className={`p-3 rounded-xl text-xs font-medium border transition-all text-left flex items-center gap-2
                    ${selType===t.id ? 'border-transparent' : 'border-[#1e2d3d] text-[#566173] hover:border-[#243040]'}`}
                  style={selType===t.id ? {background:`${t.color}12`,border:`1px solid ${t.color}30`,color:t.color} : {}}>
                  <t.icon size={13}/>{t.label}
                </button>
              ))}
            </div>

            <button onClick={generate} disabled={busy} className="btn btn-primary w-full flex items-center justify-center gap-2">
              {busy ? <><Loader2 size={14} className="animate-spin"/>Generating…</> : <><BookOpen size={14}/>Generate</>}
            </button>
          </div>

          {/* Past notes */}
          {notes.length > 0 && (
            <div className="card">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#566173] mb-3">Saved Notes</h2>
              <div className="space-y-1.5">
                {notes.map(n => (
                  <div key={n.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-[#111827] group cursor-pointer"
                    onClick={() => loadNote(n.id)}>
                    <span className="text-xs flex-1 truncate text-[#8a96a8] group-hover:text-white transition-colors">{n.title}</span>
                    <button onClick={e => { e.stopPropagation(); deleteNote(n.id) }}
                      className="opacity-0 group-hover:opacity-100 text-[#566173] hover:text-red-400 transition-all p-1">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Note viewer */}
        <div className="lg:col-span-2">
          {!active ? (
            <div className="empty-state card h-full min-h-64">
              <BookOpen size={36} className="text-[#243040]"/>
              <p className="text-[#566173] text-sm">Generate a note or select one from the left</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={active.id + selType} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>

                {/* Flashcard viewer */}
                {active.type === 'flashcard' && Array.isArray(active.content) && active.content.length > 0 && (
                  <div className="card">
                    <h3 className="text-sm font-semibold mb-4">{active.title}</h3>
                    <div className="relative h-56 cursor-pointer mb-4" onClick={() => setFlipped(f => !f)}>
                      <motion.div className="absolute inset-0" style={{transformStyle:'preserve-3d'}}
                        animate={{rotateY: flipped ? 180 : 0}} transition={{duration:.5,ease:[.22,1,.36,1]}}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl border border-[#1e2d3d] bg-[#111827]"
                          style={{backfaceVisibility:'hidden'}}>
                          <p className="text-xs text-[#566173] mb-3 uppercase tracking-wider">Q {cardIdx+1}/{active.content.length}</p>
                          <p className="font-semibold text-center leading-relaxed">{card?.question}</p>
                          <p className="text-xs text-[#566173] mt-4">Click to flip</p>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl border border-[#4f8ef7]/20 bg-[#111827]"
                          style={{backfaceVisibility:'hidden',transform:'rotateY(180deg)'}}>
                          <p className="text-xs text-[#4f8ef7] mb-3 uppercase tracking-wider">Answer</p>
                          <p className="text-sm text-center leading-relaxed text-[#8a96a8]">{card?.answer}</p>
                          {card?.marks > 0 && <p className="text-xs text-[#566173] mt-3">{card.marks} marks</p>}
                        </div>
                      </motion.div>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <button onClick={() => { setCardIdx(i => (i-1+active.content.length)%active.content.length); setFlipped(false) }}
                        className="btn btn-ghost p-2"><ChevronLeft size={16}/></button>
                      <div className="flex gap-1.5">
                        {active.content.map((_,i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                            style={{background:i===cardIdx?'#4f8ef7':'#1e2d3d',transform:i===cardIdx?'scale(1.3)':'scale(1)'}}/>
                        ))}
                      </div>
                      <button onClick={() => { setCardIdx(i => (i+1)%active.content.length); setFlipped(false) }}
                        className="btn btn-ghost p-2"><ChevronRight size={16}/></button>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {active.type === 'summary' && (
                  <div className="card">
                    <h3 className="text-sm font-semibold mb-4">{active.title}</h3>
                    {active.content?.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {active.content.keywords.map(k => (
                          <span key={k} className="text-xs px-2.5 py-1 rounded-full border border-[#1e2d3d] text-[#566173]">{k}</span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-3">
                      {active.content?.sentences?.length > 0
                        ? active.content.sentences.map((s,i) => (
                            <p key={i} className="text-sm text-[#8a96a8] leading-relaxed border-l-2 border-[#1e2d3d] pl-3">{s}</p>
                          ))
                        : <p className="text-sm text-[#566173]">Not enough content extracted from this paper. Try uploading a more text-rich PDF.</p>
                      }
                    </div>
                  </div>
                )}

                {/* Formula sheet */}
                {active.type === 'formula' && (
                  <div className="card">
                    <h3 className="text-sm font-semibold mb-4">{active.title}</h3>
                    {Array.isArray(active.content) && active.content.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {active.content.map((f,i) => (
                          <div key={i} className="px-4 py-3 rounded-xl bg-[#111827] border border-[#1e2d3d] hover:border-[#243040] transition-colors group">
                            <p className="font-mono text-sm text-[#4f8ef7] font-semibold">{f.formula}</p>
                            {f.context && <p className="text-xs text-[#566173] mt-1 truncate">{f.context}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#566173]">No formulas detected in this paper. Formula extraction works best on maths/engineering PDFs with equations.</p>
                    )}
                  </div>
                )}

                {/* Viva */}
                {active.type === 'viva' && (
                  <div className="card">
                    <h3 className="text-sm font-semibold mb-4">{active.title}</h3>
                    {Array.isArray(active.content) && active.content.length > 0 ? (
                      <div className="space-y-3">
                        {active.content.map((v,i) => (
                          <div key={i} className="p-4 rounded-xl border border-[#1e2d3d] bg-[#111827] hover:border-[#243040] transition-colors group">
                            <p className="text-sm font-medium mb-1.5 group-hover:text-[#4f8ef7] transition-colors">{v.question}</p>
                            <p className="text-sm text-[#566173] leading-relaxed">{v.answer}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#566173]">No questions found in this paper. Make sure questions are clearly formatted in your PDF.</p>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
