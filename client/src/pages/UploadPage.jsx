import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle, XCircle, Loader2, Trash2, AlertCircle } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function UploadPage() {
  const [queue, setQueue]       = useState([])
  const [busy, setBusy]         = useState(false)
  const [pasteId, setPasteId]   = useState(null)  // paper needing text paste
  const [pastedText, setPasted] = useState('')

  const onDrop = useCallback(files => {
    const items = files.map(f => ({ file:f, id:Math.random().toString(36).slice(2), status:'pending', progress:0, result:null, subject:'', year:'' }))
    setQueue(q => [...q, ...items])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple:true,
    accept:{ 'application/pdf':['.pdf'], 'image/*':['.jpg','.jpeg','.png'], 'text/plain':['.txt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':['.pptx'] },
  })

  const setField = (id, field, val) => setQueue(q => q.map(x => x.id===id ? {...x,[field]:val} : x))
  const remove   = id => setQueue(q => q.filter(x => x.id!==id))

  const uploadAll = async () => {
    setBusy(true)
    for (const item of queue.filter(x => x.status==='pending')) {
      setField(item.id, 'status', 'uploading')
      const fd = new FormData()
      fd.append('paper', item.file)
      fd.append('subject', item.subject)
      fd.append('year', item.year)
      try {
        const { data } = await api.post('/papers/upload', fd, {
          headers:{'Content-Type':'multipart/form-data'},
          onUploadProgress: e => setField(item.id, 'progress', Math.round(e.loaded*100/e.total)),
        })
        setField(item.id, 'status', data.status === 'needs_text' ? 'needs_text' : 'done')
        setField(item.id, 'result', data)
        if (data.status === 'needs_text') {
          setPasteId(data.id)
          toast('📸 Image uploaded — paste the text content below so we can extract questions', {duration:6000})
        } else {
          toast.success(`${item.file.name}: ${data.questionsFound} questions, ${data.topicsFound} topics extracted`)
        }
      } catch (e) {
        setField(item.id, 'status', 'error')
        setField(item.id, 'result', e.response?.data?.message || 'Upload failed')
        toast.error(`${item.file.name} failed`)
      }
    }
    setBusy(false)
  }

  const submitPaste = async () => {
    if (!pastedText.trim()) return toast.error('Please paste some text first')
    try {
      await api.patch(`/papers/${pasteId}/text`, { text: pastedText })
      toast.success('Text saved and processed!')
      setPasteId(null); setPasted('')
      setQueue(q => q.map(x => x.result?.id===pasteId ? {...x, status:'done'} : x))
    } catch { toast.error('Failed to save text') }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Upload Past Papers</h1>
      <p className="text-sm text-[#566173] mb-6">Supports PDF, JPG, PNG, PPTX, TXT. We extract questions and topics automatically from PDFs. For images, paste the text manually.</p>

      {/* Drop zone */}
      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group mb-6
        ${isDragActive ? 'border-[#4f8ef7] bg-[#4f8ef7]/5' : 'border-[#1e2d3d] hover:border-[#243040]'}`}>
        <input {...getInputProps()}/>
        <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${isDragActive?'scale-110':''}`}
          style={{background:'rgba(79,142,247,.1)',border:'1px solid rgba(79,142,247,.2)'}}>
          <Upload size={24} style={{color:'#4f8ef7'}}/>
        </div>
        <p className="font-semibold mb-1">{isDragActive ? 'Drop here…' : 'Drag & drop past papers'}</p>
        <p className="text-sm text-[#566173]">PDF · JPG · PNG · PPTX · TXT</p>
      </div>

      {/* Paste text modal for images */}
      <AnimatePresence>
        {pasteId && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="card border-[#4f8ef7]/30 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} style={{color:'#4f8ef7'}}/>
              <p className="text-sm font-medium">Image uploaded — paste the text content</p>
            </div>
            <p className="text-xs text-[#566173] mb-3">Since we can't do OCR without Python, paste the text from your image manually (you can use Google Lens or any OCR tool to copy the text).</p>
            <textarea value={pastedText} onChange={e=>setPasted(e.target.value)}
              className="input h-40 resize-none font-mono text-xs mb-3" placeholder="Paste extracted text here…"/>
            <div className="flex gap-2">
              <button onClick={submitPaste} className="btn btn-primary text-sm">Save & Extract Questions</button>
              <button onClick={()=>{setPasteId(null);setPasted('')}} className="btn btn-ghost text-sm">Skip</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue */}
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#8a96a8] uppercase tracking-wider">Queue ({queue.length})</p>
              <button onClick={uploadAll} disabled={busy||queue.every(x=>x.status!=='pending')}
                className="btn btn-primary text-sm flex items-center gap-2">
                {busy ? <><Loader2 size={13} className="animate-spin"/>Processing…</> : <><Upload size={13}/>Upload All</>}
              </button>
            </div>

            <div className="space-y-3">
              {queue.map(item => (
                <motion.div key={item.id} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:12}}
                  className="card p-4">
                  <div className="flex items-start gap-3">
                    <FileText size={18} className="text-[#4f8ef7] flex-shrink-0 mt-0.5"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file.name}</p>
                      <p className="text-xs text-[#566173] mb-2">{(item.file.size/1024/1024).toFixed(2)} MB</p>

                      {/* Subject / Year inputs */}
                      {item.status === 'pending' && (
                        <div className="flex gap-2 mb-2">
                          <input value={item.subject} onChange={e=>setField(item.id,'subject',e.target.value)}
                            className="input text-xs py-1.5 px-2" placeholder="Subject (optional)"/>
                          <input value={item.year} onChange={e=>setField(item.id,'year',e.target.value)}
                            className="input text-xs py-1.5 px-2 w-28" placeholder="Year (e.g. 2023)"/>
                        </div>
                      )}

                      {item.status==='uploading' && (
                        <div className="h-1 rounded-full bg-[#111827] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{width:`${item.progress}%`,background:'linear-gradient(90deg,#4f8ef7,#7c3aed)'}}/>
                        </div>
                      )}
                      {item.status==='done' && item.result && (
                        <p className="text-xs text-green-400">✓ {item.result.questionsFound} questions · {item.result.topicsFound} topics extracted</p>
                      )}
                      {item.status==='needs_text' && (
                        <p className="text-xs text-[#f97316]">📸 Image — paste text above to extract questions</p>
                      )}
                      {item.status==='error' && (
                        <p className="text-xs text-red-400">✗ {typeof item.result==='string'?item.result:'Upload failed'}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status==='pending'   && <span className="text-xs text-[#566173]">Pending</span>}
                      {item.status==='uploading' && <Loader2 size={15} className="animate-spin text-[#4f8ef7]"/>}
                      {item.status==='done'      && <CheckCircle size={16} className="text-green-400"/>}
                      {item.status==='error'     && <XCircle    size={16} className="text-red-400"/>}
                      <button onClick={()=>remove(item.id)} className="text-[#566173] hover:text-red-400 transition-colors p-1">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
