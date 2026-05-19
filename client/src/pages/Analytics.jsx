import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { Upload } from 'lucide-react'
import api from '../utils/api'

const tip = ({ active, payload }) => active && payload?.length
  ? <div className="px-3 py-2 rounded-xl text-xs" style={{background:'#0d1117',border:'1px solid #1e2d3d',color:'#e8edf3'}}>{payload[0].value}%</div>
  : null

export default function Analytics() {
  const [data,    setData]    = useState(null)
  const [papers,  setPapers]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/analytics/summary'), api.get('/papers')])
      .then(([a, p]) => { setData(a.data); setPapers(p.data.filter(x => x.status==='done')) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-[#566173] text-sm">Loading…</div>

  if (!data?.hasData) return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="empty-state card">
        <p className="font-semibold text-lg">No data yet</p>
        <p className="text-sm text-[#566173]">Upload past papers to see your analytics — all charts are built from your real data.</p>
        <Link to="/app/upload" className="btn btn-primary flex items-center gap-2 mt-2"><Upload size={14}/> Upload Papers</Link>
      </div>
    </div>
  )

  const radarData = data.topics?.map(t => ({ subject: t.name.slice(0,12), A: t.pct })) || []

  // Build trend from papers (by createdAt order)
  const trendData = papers.map((p, i) => ({
    label: `Paper ${i+1}`,
    score: Math.min(99, 40 + (p.questionsFound || 0) * 2 + (p.topicsFound || 0) * 3),
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Analytics</h1>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Papers Analysed', value:data.papers,         color:'#4f8ef7' },
          { label:'Readiness Score', value:`${data.readiness}%`,color:'#7c3aed' },
          { label:'Notes Generated', value:data.notes,          color:'#06d6a0' },
          { label:'Days to Exam',    value:data.daysLeft ?? '—',color:'#f97316' },
        ].map(s => (
          <div key={s.label} className="card group">
            <p className="text-2xl font-bold mb-1" style={{color:s.color}}>{s.value}</p>
            <p className="text-xs text-[#566173]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Trend chart */}
        {trendData.length >= 2 && (
          <div className="card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#566173] mb-5">Content per Paper</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{top:4,right:4,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={.3}/>
                    <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d"/>
                <XAxis dataKey="label" tick={{fill:'#566173',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#566173',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={tip}/>
                <Area type="monotone" dataKey="score" stroke="#4f8ef7" strokeWidth={2} fill="url(#ag)" dot={{fill:'#4f8ef7',r:3}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Radar */}
        {radarData.length >= 3 && (
          <div className="card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#566173] mb-5">Topic Distribution Radar</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e2d3d"/>
                <PolarAngleAxis dataKey="subject" tick={{fill:'#566173',fontSize:10}}/>
                <Radar dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={.2} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Topic breakdown */}
      {data.topics?.length > 0 && (
        <div className="card mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#566173] mb-5">Topic Frequency (from your papers)</h3>
          <div className="space-y-4">
            {data.topics.map(t => (
              <div key={t.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#8a96a8]">{t.name}</span>
                  <span className="text-[#4f8ef7] font-medium">{t.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#111827] overflow-hidden">
                  <motion.div className="h-full rounded-full" initial={{width:0}}
                    animate={{width:`${t.pct}%`}} transition={{duration:1}}
                    style={{background:t.color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-paper breakdown */}
      {papers.length > 0 && (
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#566173] mb-4">Uploaded Papers</h3>
          <div className="space-y-2">
            {papers.map(p => (
              <div key={p.id} className="flex items-center gap-4 py-2.5 border-b border-[#111827] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.originalName}</p>
                  <p className="text-xs text-[#566173]">{p.subject || 'No subject'} {p.year ? `· ${p.year}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-[#4f8ef7] font-medium">{p.questionsFound} questions</p>
                  <p className="text-xs text-[#566173]">{p.topicsFound} topics</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
