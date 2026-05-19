import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Loader2, Zap, Plus, Trash2, Clock } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const COLORS = { hi:'#ef4444', md:'#f97316', lo:'#4f8ef7' }

export default function PlannerPage() {
  const [schedule, setSchedule] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState(false)
  const [form, setForm] = useState({ examDate:'', hoursPerDay:4, syllabusPercent:60, mode:'normal', subjects:[] })
  const [subInput, setSubInput] = useState('')

  useEffect(() => {
    api.get('/planner').then(r => { if (r.data) setSchedule(r.data) }).finally(() => setLoading(false))
  }, [])

  const addSubject = () => {
    const s = subInput.trim()
    if (!s) return
    if (form.subjects.includes(s)) return toast.error('Already added')
    setForm(f => ({ ...f, subjects: [...f.subjects, s] }))
    setSubInput('')
  }

  const removeSubject = s => setForm(f => ({ ...f, subjects: f.subjects.filter(x => x !== s) }))

  const generate = async () => {
    if (!form.examDate) return toast.error('Set your exam date')
    if (form.subjects.length === 0) return toast.error('Add at least one subject')
    setBusy(true)
    try {
      const { data } = await api.post('/planner/generate', form)
      setSchedule(data)
      toast.success('Schedule generated!')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setBusy(false) }
  }

  const clear = async () => {
    await api.delete('/planner')
    setSchedule(null)
    toast.success('Schedule cleared')
  }

  if (loading) return <div className="p-8 text-[#566173] text-sm">Loading…</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Study Planner</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#566173] mb-5">Configure</h2>

            <label className="label">Exam Date *</label>
            <input type="date" className="input mb-4" value={form.examDate}
              onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}/>

            <label className="label">Hours per day: <span className="text-[#4f8ef7] font-semibold">{form.hoursPerDay}h</span></label>
            <input type="range" min="1" max="12" value={form.hoursPerDay} className="w-full mb-4"
              onChange={e => setForm(f => ({ ...f, hoursPerDay: +e.target.value }))}/>

            <label className="label">Syllabus completed: <span className="text-[#4f8ef7] font-semibold">{form.syllabusPercent}%</span></label>
            <input type="range" min="0" max="100" value={form.syllabusPercent} className="w-full mb-4"
              onChange={e => setForm(f => ({ ...f, syllabusPercent: +e.target.value }))}/>

            <label className="label">Mode</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[['normal','Normal 📚'],['intense','Intense 🔥'],['emergency','Emergency ⚡']].map(([v,l]) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, mode: v }))}
                  className={`p-2 rounded-xl text-xs font-medium border transition-all ${form.mode===v ? 'border-[#4f8ef7] text-[#4f8ef7] bg-[#4f8ef7]/10' : 'border-[#1e2d3d] text-[#566173] hover:border-[#243040]'}`}>
                  {l}
                </button>
              ))}
            </div>

            <label className="label">Subjects *</label>
            <div className="flex gap-2 mb-2">
              <input value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addSubject()}
                className="input flex-1 text-sm" placeholder="e.g. Data Structures"/>
              <button onClick={addSubject} className="btn btn-ghost px-3"><Plus size={16}/></button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4 min-h-6">
              {form.subjects.map(s => (
                <span key={s} className="flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-[#243040] text-[#8a96a8]">
                  {s}
                  <button onClick={() => removeSubject(s)} className="hover:text-red-400 transition-colors ml-0.5"><Trash2 size={10}/></button>
                </span>
              ))}
            </div>

            <button onClick={generate} disabled={busy} className="btn btn-primary w-full flex items-center justify-center gap-2">
              {busy ? <><Loader2 size={14} className="animate-spin"/>Generating…</> : <><Zap size={14}/>Generate Schedule</>}
            </button>
          </div>
        </div>

        {/* Schedule */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {!schedule ? (
              <div className="empty-state card h-full min-h-80">
                <Calendar size={40} className="text-[#243040]"/>
                <p className="font-semibold">No schedule yet</p>
                <p className="text-sm text-[#566173]">Fill in the form and hit Generate Schedule</p>
              </div>
            ) : (
              <motion.div key="schedule" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold">Your Schedule</p>
                    <p className="text-xs text-[#566173]">Exam: {schedule.examDate} · {schedule.mode} mode · {schedule.hoursPerDay}h/day</p>
                  </div>
                  <button onClick={clear} className="btn btn-ghost text-xs px-3 py-2 text-red-400 border-red-400/20 hover:border-red-400/40">Clear</button>
                </div>
                <div className="space-y-3">
                  {schedule.days?.map((day, i) => (
                    <motion.div key={day.day+day.date} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}
                      className="card p-4 hover:-translate-y-0.5 group">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-semibold text-sm group-hover:text-[#4f8ef7] transition-colors">{day.day}</span>
                          <span className="text-xs text-[#566173] ml-2">{day.date}</span>
                        </div>
                        <span className="text-xs text-[#566173] flex items-center gap-1">
                          <Clock size={11}/>{day.slots.reduce((a,s)=>a+s.hours,0).toFixed(1)}h
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {day.slots.map((slot,j) => (
                          <span key={j} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border"
                            style={{background:`${COLORS[slot.priority]}10`,borderColor:`${COLORS[slot.priority]}25`,color:COLORS[slot.priority]}}>
                            {slot.subject} · {slot.hours}h
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
