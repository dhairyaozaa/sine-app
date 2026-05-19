import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../utils/api'
import { Upload, Target, FileText, Calendar, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/summary').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-[#566173] text-sm">Loading…</div>

  // Empty state — no papers uploaded yet
  if (!data?.hasData) return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Welcome to Sine 👋</h1>
      <p className="text-[#8a96a8] mb-10">Upload your first past paper to get started. Everything here will be based on your real data.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { icon:Upload,  label:'Upload Past Papers',  to:'/app/upload',  desc:'PDF, image, PPTX — we extract everything', color:'#4f8ef7' },
          { icon:Target,  label:'View Predictions',    to:'/app/predict', desc:'See likely exam topics once papers are uploaded', color:'#7c3aed' },
          { icon:Calendar,label:'Build Study Plan',    to:'/app/planner', desc:'Set your exam date and get a schedule', color:'#06d6a0' },
          { icon:FileText,label:'Generate Notes',      to:'/app/notes',   desc:'Summaries, flashcards, formula sheets', color:'#f97316' },
        ].map(c => (
          <Link key={c.to} to={c.to}>
            <motion.div whileHover={{y:-3}} className="card cursor-pointer group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{background:`${c.color}15`,border:`1px solid ${c.color}25`}}>
                <c.icon size={18} style={{color:c.color}}/>
              </div>
              <p className="font-semibold text-sm mb-1">{c.label}</p>
              <p className="text-xs text-[#566173]">{c.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )

  // Real dashboard
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Papers Uploaded', value:data.papers,                    color:'#4f8ef7' },
          { label:'Readiness Score', value:`${data.readiness||0}%`,        color:'#7c3aed' },
          { label:'Notes Generated', value:data.notes,                     color:'#06d6a0' },
          { label:'Days to Exam',    value:data.daysLeft ?? '—',           color:'#f97316' },
        ].map(s => (
          <div key={s.label} className="card group">
            <p className="text-2xl font-bold mb-1" style={{color:s.color}}>{s.value}</p>
            <p className="text-xs text-[#566173]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Topic mastery */}
      {data.topics?.length > 0 && (
        <div className="card mb-4">
          <h2 className="text-sm font-semibold text-[#8a96a8] uppercase tracking-wider mb-5">Topic Frequency (from your papers)</h2>
          <div className="space-y-4">
            {data.topics.map(t => (
              <div key={t.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#8a96a8]">{t.name}</span>
                  <span className="text-[#4f8ef7] font-medium">{t.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#111827] overflow-hidden">
                  <motion.div className="h-full rounded-full" initial={{width:0}}
                    animate={{width:`${t.pct}%`}} transition={{duration:1,delay:.2}}
                    style={{background:t.color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link to="/app/upload"  className="btn btn-primary flex items-center gap-2"><Upload size={14}/> Upload More Papers</Link>
        <Link to="/app/predict" className="btn btn-ghost flex items-center gap-2"><Target size={14}/> See Predictions <ArrowRight size={14}/></Link>
      </div>
    </div>
  )
}
