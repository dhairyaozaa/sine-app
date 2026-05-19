import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Target, RefreshCw, Upload, AlertCircle } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function Predictions() {
  const [preds,   setPreds]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/predictions')
      setPreds(data)
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to load predictions'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? preds : preds.filter(p => p.level === filter)

  const levelStyle = {
    hi: { bg:'rgba(6,214,160,.1)',  color:'#06d6a0', label:'Very High' },
    md: { bg:'rgba(249,115,22,.1)', color:'#f97316', label:'High'      },
    lo: { bg:'rgba(239,68,68,.08)', color:'#ef4444', label:'Medium'    },
  }

  if (loading) return (
    <div className="p-8 space-y-3 max-w-4xl mx-auto">
      {Array(5).fill(0).map((_,i) => <div key={i} className="h-20 rounded-2xl bg-[#0d1117] animate-pulse"/>)}
    </div>
  )

  if (error) return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="card border-red-400/20 bg-red-400/5">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0"/>
          <p className="font-semibold text-red-400">Predictions unavailable</p>
        </div>
        <p className="text-sm text-[#8a96a8] mb-5">{error}</p>
        <div className="flex gap-3">
          <button onClick={load} className="btn btn-ghost text-sm flex items-center gap-2">
            <RefreshCw size={13}/> Try again
          </button>
          <Link to="/app/upload" className="btn btn-primary text-sm flex items-center gap-2">
            <Upload size={13}/> Upload Papers
          </Link>
        </div>
      </div>
    </div>
  )

  if (preds.length === 0) return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="empty-state card">
        <Target size={40} className="text-[#243040]"/>
        <p className="font-semibold text-lg">No predictions yet</p>
        <p className="text-sm text-[#566173]">Upload at least one past paper — predictions are generated from your real papers.</p>
        <Link to="/app/upload" className="btn btn-primary flex items-center gap-2 mt-2">
          <Upload size={14}/> Upload Papers
        </Link>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold mb-0.5">Topic Predictions</h1>
          <p className="text-sm text-[#566173]">Ranked by frequency, TF-IDF score, and recency across your uploaded papers.</p>
        </div>
        <button onClick={load} className="btn btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={13} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[['all','All'],['hi','🔥 Very High'],['md','⚡ High'],['lo','📌 Medium']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 rounded-xl text-sm transition-all border
              ${filter===v ? 'text-white border-transparent' : 'border-[#1e2d3d] text-[#8a96a8] hover:border-[#243040]'}`}
            style={filter===v ? {background:'linear-gradient(135deg,#4f8ef7,#7c3aed)'} : {}}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((p, i) => {
          const ls = levelStyle[p.level] || levelStyle.lo
          return (
            <motion.div key={p.rank}
              initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}
              className="card flex items-center gap-5 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,.4)] group">
              <span className="font-bold text-2xl text-[#243040] w-8 text-center flex-shrink-0 group-hover:text-[#4f8ef7] transition-colors">
                {p.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1 group-hover:text-[#4f8ef7] transition-colors">{p.topic}</p>
                <div className="flex items-center gap-3 text-xs text-[#566173]">
                  <span>📄 Appeared {p.appearances}x</span>
                  {p.lastYear && (
                    <span className="px-2 py-0.5 rounded-full"
                      style={{background:'rgba(124,58,237,.1)',color:'#7c3aed'}}>
                      Last year
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1 rounded-full bg-[#111827] w-40 overflow-hidden">
                  <motion.div className="h-full rounded-full" initial={{width:0}}
                    animate={{width:`${p.confidence}%`}} transition={{duration:1,delay:i*.05+.3}}
                    style={{background:ls.color}}/>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{background:ls.bg,color:ls.color}}>{ls.label}</span>
                <span className="font-bold text-lg" style={{color:ls.color}}>{p.confidence}%</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
