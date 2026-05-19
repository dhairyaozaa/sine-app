import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LayoutDashboard, Upload, Target, Calendar, BookOpen, CheckSquare, BarChart3, LogOut, Zap, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const NAV = [
  { to:'/app',            icon:LayoutDashboard, label:'Dashboard',     end:true },
  { to:'/app/upload',     icon:Upload,           label:'Upload Papers' },
  { to:'/app/predict',    icon:Target,           label:'Predictions'   },
  { to:'/app/planner',    icon:Calendar,         label:'Study Planner' },
  { to:'/app/notes',      icon:BookOpen,         label:'Notes'         },
  { to:'/app/attend',     icon:CheckSquare,      label:'Attendance'    },
  { to:'/app/analytics',  icon:BarChart3,        label:'Analytics'     },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#06080f]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-[#0d1117] border-r border-[#1e2d3d] transition-transform duration-300 lg:relative lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d3d]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed)'}}>
              <Zap size={15} className="text-white"/>
            </div>
            <span className="font-bold text-base grad">Sine</span>
          </div>
          <button className="lg:hidden text-[#566173]" onClick={()=>setOpen(false)}><X size={18}/></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({to,icon:Icon,label,end})=>(
            <NavLink key={to} to={to} end={end} onClick={()=>setOpen(false)}
              className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isActive?'text-white':'text-[#8a96a8] hover:text-white hover:bg-[#111827]'}`}
              style={({isActive})=>isActive?{background:'rgba(79,142,247,.12)',borderLeft:'2px solid #4f8ef7',paddingLeft:'10px'}:{}}>
              <Icon size={17}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-[#1e2d3d]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{background:'linear-gradient(135deg,#4f8ef7,#7c3aed)'}}>
              {user?.name?.[0]?.toUpperCase()||'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-[#566173] truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={()=>{logout();navigate('/')}} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[#566173] hover:text-red-400 hover:bg-red-400/5 transition-colors">
            <LogOut size={15}/>Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={()=>setOpen(false)}/>}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center px-5 py-3.5 border-b border-[#1e2d3d] bg-[#0d1117]/80 backdrop-blur-sm">
          <button className="lg:hidden mr-3 text-[#566173]" onClick={()=>setOpen(true)}><Menu size={20}/></button>
          <span className="text-sm text-[#566173] ml-auto">👋 {user?.name?.split(' ')[0]}</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}} className="h-full">
              <Outlet/>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
