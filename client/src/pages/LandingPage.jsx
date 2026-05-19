// LandingPage.jsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Upload, Target, BookOpen, Calendar, ArrowRight } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06080f] text-[#e8edf3]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1e2d3d]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed)'}}>
            <Zap size={15} className="text-white"/>
          </div>
          <span className="font-bold text-base" style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Sine</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"    className="text-sm text-[#8a96a8] hover:text-white transition-colors">Sign in</Link>
          <Link to="/register" className="btn btn-primary text-sm px-5 py-2.5">Get started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-28 text-center"
        style={{background:'radial-gradient(ellipse 800px 500px at 50% -5%,rgba(79,142,247,.08) 0%,transparent 70%)'}}>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.1}}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-medium mb-8"
            style={{borderColor:'rgba(79,142,247,.3)',background:'rgba(79,142,247,.07)',color:'#4f8ef7'}}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7] animate-pulse"/>
            100% Local AI · No Cloud Costs · Your Data
          </div>
        </motion.div>

        <motion.h1 initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:.25}}
          className="font-bold leading-tight tracking-tight mb-6"
          style={{fontSize:'clamp(40px,6vw,76px)',letterSpacing:'-2px'}}>
          Predict your exam.<br/>
          <span style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed,#06d6a0)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            Ace it with AI.
          </span>
        </motion.h1>

        <motion.p initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.4}}
          className="text-[#8a96a8] text-lg leading-relaxed max-w-xl mx-auto mb-10 font-light">
          Upload past papers. Our local NLP extracts real questions, clusters topics, and builds your study plan — zero cloud AI, zero costs.
        </motion.p>

        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.55}}
          className="flex gap-3 justify-center flex-wrap">
          <Link to="/register" className="btn btn-primary flex items-center gap-2 text-base px-7 py-3.5">
            Start free <ArrowRight size={15}/>
          </Link>
          <Link to="/login" className="btn btn-ghost text-base px-7 py-3.5">Sign in</Link>
        </motion.div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon:Upload,   color:'#4f8ef7', title:'Upload Papers',     desc:'PDF, image, PPTX. Real text extraction.' },
            { icon:Target,   color:'#7c3aed', title:'Topic Predictions', desc:'TF-IDF ranked predictions from your papers.' },
            { icon:BookOpen, color:'#06d6a0', title:'Generate Notes',    desc:'Flashcards, summaries, formula sheets.' },
            { icon:Calendar, color:'#f97316', title:'Study Planner',     desc:'Custom schedule with your own subjects.' },
          ].map((f,i) => (
            <motion.div key={f.title} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.7+i*.08}}
              className="card group hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{background:`${f.color}15`,border:`1px solid ${f.color}25`}}>
                <f.icon size={18} style={{color:f.color}}/>
              </div>
              <p className="font-semibold text-sm mb-1.5">{f.title}</p>
              <p className="text-xs text-[#566173] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Auth shell
function AuthShell({ title, sub, children }) {
  return (
    <div className="min-h-screen bg-[#06080f] flex items-center justify-center p-6"
      style={{background:'radial-gradient(ellipse 700px 500px at 50% -10%,rgba(79,142,247,.07) 0%,transparent 70%),#06080f'}}>
      <motion.div initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed)'}}>
            <Zap size={17} className="text-white"/>
          </div>
          <span className="font-bold text-lg" style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Sine</span>
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-bold mb-1">{title}</h1>
          <p className="text-sm text-[#566173] mb-7">{sub}</p>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

// LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [form, setForm] = useState({ email:'', password:'' })
  const [show, setShow] = useState(false)
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    const res = await login(form.email, form.password)
    if (res.ok) { toast.success('Welcome back!'); navigate('/app') }
    else toast.error(res.error)
  }

  return (
    <AuthShell title="Welcome back" sub="Sign in to your Sine account">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" placeholder="you@example.com" required
            value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input className="input pr-10" type={show?'text':'password'} placeholder="••••••••" required
              value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
            <button type="button" onClick={()=>setShow(s=>!s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#566173] hover:text-white transition-colors">
              {show?<EyeOff size={15}/>:<Eye size={15}/>}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full flex items-center justify-center gap-2">
          {loading?<><Loader2 size={14} className="animate-spin"/>Signing in…</>:'Sign in'}
        </button>
      </form>
      <p className="text-center text-sm text-[#566173] mt-6">
        No account? <Link to="/register" className="text-[#4f8ef7] hover:underline">Create one →</Link>
      </p>
    </AuthShell>
  )
}

// RegisterPage.jsx
export function RegisterPage() {
  const [form, setForm] = useState({ name:'', email:'', password:'' })
  const [show, setShow] = useState(false)
  const { register, loading } = useAuthStore()
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password min 6 characters')
    const res = await register(form.name, form.email, form.password)
    if (res.ok) { toast.success('Account created!'); navigate('/app') }
    else toast.error(res.error)
  }

  return (
    <AuthShell title="Create account" sub="Start predicting exam topics for free">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" type="text" placeholder="Your name" required
            value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" placeholder="you@example.com" required
            value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input className="input pr-10" type={show?'text':'password'} placeholder="Min 6 characters" required
              value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
            <button type="button" onClick={()=>setShow(s=>!s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#566173] hover:text-white transition-colors">
              {show?<EyeOff size={15}/>:<Eye size={15}/>}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full flex items-center justify-center gap-2">
          {loading?<><Loader2 size={14} className="animate-spin"/>Creating…</>:'Create account →'}
        </button>
      </form>
      <p className="text-center text-sm text-[#566173] mt-6">
        Have an account? <Link to="/login" className="text-[#4f8ef7] hover:underline">Sign in →</Link>
      </p>
    </AuthShell>
  )
}

export default LandingPage
