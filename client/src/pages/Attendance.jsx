import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, CheckCircle, XCircle, Save, Loader2 } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const pct  = (a, t) => t === 0 ? 0 : Math.round((a / t) * 100)
const safe = (a, t, min) => Math.max(0, Math.floor((a * 100 / min) - t))
const need = (a, t, min) => pct(a,t) >= min ? 0 : Math.ceil((min * t - 100 * a) / (100 - min))

const COLORS = ['#06d6a0','#4f8ef7','#7c3aed','#f97316','#ec4899','#06d6a0','#f97316']

export default function Attendance() {
  const [subjects, setSubjects] = useState([])
  const [minPct,   setMinPct]   = useState(75)
  const [newName,  setNewName]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  useEffect(() => {
    api.get('/attendance').then(r => {
      setSubjects(r.data.subjects || [])
      setMinPct(r.data.minPct || 75)
      setLoaded(true)
    })
  }, [])

  const addSubject = () => {
    const n = newName.trim()
    if (!n) return
    if (subjects.find(s => s.name === n)) return toast.error('Subject already exists')
    setSubjects(prev => [...prev, { name:n, attended:0, total:0, color:COLORS[prev.length%COLORS.length] }])
    setNewName('')
  }

  const update = (name, field, delta) => {
    setSubjects(prev => prev.map(s => {
      if (s.name !== name) return s
      const val = Math.max(0, s[field] + delta)
      if (field === 'attended' && val > s.total) return s
      return { ...s, [field]: val }
    }))
  }

  const markClass = (name, present) => {
    setSubjects(prev => prev.map(s =>
      s.name !== name ? s :
      { ...s, total: s.total + 1, attended: present ? s.attended + 1 : s.attended }
    ))
  }

  const removeSubject = name => setSubjects(prev => prev.filter(s => s.name !== name))

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/attendance', { subjects, minPct })
      toast.success('Saved!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (!loaded) return <div className="p-8 text-[#566173] text-sm">Loading…</div>

  const overall = subjects.length
    ? Math.round(subjects.reduce((a, s) => a + pct(s.attended, s.total), 0) / subjects.length)
    : 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold mb-0.5">Attendance Tracker</h1>
          <p className="text-sm text-[#566173]">Track your classes, log attendance, and see bunk predictions.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
          {saving ? <><Loader2 size={13} className="animate-spin"/>Saving…</> : <><Save size={13}/>Save Changes</>}
        </button>
      </div>

      {/* Summary + settings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center group"><p className="text-2xl font-bold text-[#4f8ef7]">{overall}%</p><p className="text-xs text-[#566173]">Overall</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-red-400">{subjects.filter(s=>pct(s.attended,s.total)<minPct).length}</p><p className="text-xs text-[#566173]">At Risk</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-green-400">{subjects.filter(s=>pct(s.attended,s.total)>=minPct).length}</p><p className="text-xs text-[#566173]">Safe</p></div>
        <div className="card">
          <label className="label">Min % required</label>
          <input type="number" min="50" max="100" value={minPct} onChange={e=>setMinPct(+e.target.value)}
            className="input text-center text-lg font-bold text-[#4f8ef7]"/>
        </div>
      </div>

      {/* Add subject */}
      <div className="card mb-6 p-4">
        <div className="flex gap-2">
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&addSubject()}
            className="input flex-1 text-sm" placeholder="Add subject (e.g. Mathematics)"/>
          <button onClick={addSubject} className="btn btn-primary flex items-center gap-2 px-4">
            <Plus size={15}/>Add
          </button>
        </div>
      </div>

      {/* Subject list */}
      {subjects.length === 0 ? (
        <div className="empty-state card">
          <p className="text-[#566173] text-sm">No subjects yet — add one above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map((s, i) => {
            const p     = pct(s.attended, s.total)
            const bunks = safe(s.attended, s.total, minPct)
            const needs = need(s.attended, s.total, minPct)
            const status = p >= minPct + 5 ? 'safe' : p >= minPct ? 'warn' : 'danger'
            const statusColor = { safe:'#06d6a0', warn:'#f97316', danger:'#ef4444' }[status]

            return (
              <motion.div key={s.name} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}
                className="card group">
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:s.color}}/>
                    <h3 className="font-semibold text-sm">{s.name}</h3>
                    <span className="text-xs text-[#566173]">{s.attended}/{s.total} classes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{color:statusColor}}>{p}%</span>
                    <button onClick={()=>removeSubject(s.name)} className="text-[#566173] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-[#111827] mb-3 overflow-hidden">
                  <motion.div className="h-full rounded-full" initial={{width:0}}
                    animate={{width:`${p}%`}} transition={{duration:.8}}
                    style={{background:statusColor}}/>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3 mb-3 flex-wrap text-xs">
                  {status !== 'danger'
                    ? <span className="px-3 py-1.5 rounded-lg" style={{background:'rgba(6,214,160,.08)',color:'#06d6a0'}}>✓ Can skip {bunks} more class{bunks!==1?'es':''}</span>
                    : <span className="px-3 py-1.5 rounded-lg" style={{background:'rgba(239,68,68,.08)',color:'#ef4444'}}>⚠️ Attend {needs} more to avoid shortage</span>
                  }
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={()=>markClass(s.name,true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-green-400/20 text-green-400 hover:bg-green-400/8 transition-colors">
                    <CheckCircle size={12}/>Present
                  </button>
                  <button onClick={()=>markClass(s.name,false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-red-400/20 text-red-400 hover:bg-red-400/8 transition-colors">
                    <XCircle size={12}/>Absent
                  </button>
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={()=>update(s.name,'attended',-1)} className="w-7 h-7 rounded-lg border border-[#1e2d3d] text-[#566173] hover:text-white hover:border-[#243040] transition-colors text-sm">−</button>
                    <span className="text-xs text-[#566173] px-1">attended</span>
                    <button onClick={()=>update(s.name,'attended',1)} className="w-7 h-7 rounded-lg border border-[#1e2d3d] text-[#566173] hover:text-white hover:border-[#243040] transition-colors text-sm">+</button>
                    <span className="text-xs text-[#566173] px-1 ml-2">total</span>
                    <button onClick={()=>update(s.name,'total',1)} className="w-7 h-7 rounded-lg border border-[#1e2d3d] text-[#566173] hover:text-white hover:border-[#243040] transition-colors text-sm">+</button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
