import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './styles/globals.css'

// Use /sine-app basename only on GitHub Pages
const isGhPages = window.location.hostname.includes('github.io')
const basename  = isGhPages ? '/sine-app' : '/'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={basename}>
    <App />
    <Toaster position="top-right" toastOptions={{
      style: { background:'#0d1117', color:'#e8edf3', border:'1px solid #1e2d3d', borderRadius:'10px', fontSize:'14px' },
      success: { iconTheme: { primary:'#06d6a0', secondary:'#0d1117' } },
      error:   { iconTheme: { primary:'#ef4444',  secondary:'#0d1117' } },
    }}/>
  </BrowserRouter>
)
