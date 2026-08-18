import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Loader2, Volume2, User, Bot } from 'lucide-react'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const chatContainerRef = useRef(null)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => setError(err.message))
  }, [])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, isProcessing])

  const startRecording = async () => {
    setUploadStatus(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        audioChunksRef.current = [] 
        uploadAudio(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setError("Microphone access denied.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const uploadAudio = async (blob) => {
    setIsProcessing(true)
    setUploadStatus("Analyzing your speech...")
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    formData.append('history', JSON.stringify(history))
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/conversation/turn', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      if (response.ok) {
        setUploadStatus(null)
        if (result.transcript && result.response_text) {
          setHistory(prev => [
            ...prev,
            { role: 'user', content: result.transcript },
            { role: 'tutor', content: result.response_text, audio: result.audio_base64 }
          ])
        }
        if (result.audio_base64) {
          const audio = new Audio("data:audio/mp3;base64," + result.audio_base64);
          audio.play();
        }
      } else {
        setUploadStatus(`Error: ${result.detail || 'Failed to upload'}`)
      }
    } catch (err) {
      setUploadStatus(`Connection error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const playAudio = (base64) => {
    if (base64) {
      const audio = new Audio("data:audio/mp3;base64," + base64);
      audio.play();
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
          Fluento AI
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            background: health ? '#10b981' : (error ? '#ef4444' : '#f59e0b'),
            boxShadow: health ? '0 0 8px #10b981' : 'none',
            transition: 'all 0.3s ease'
          }} />
          {health ? 'Connected' : (error ? 'Disconnected' : 'Connecting...')}
        </div>
      </header>

      {/* Chat Area */}
      <main ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {history.length === 0 && !isProcessing && (
          <div className="animate-fade-in-up" style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', maxWidth: '400px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid var(--glass-border)' }}>
              <Bot size={40} color="var(--text-main)" />
            </div>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '0.75rem', fontWeight: 600 }}>Ready when you are.</h2>
            <p style={{ lineHeight: 1.6 }}>Tap the microphone below and start speaking in English. The AI tutor will analyze your grammar and respond naturally.</p>
          </div>
        )}

        {history.map((msg, idx) => (
          <div key={idx} className="animate-fade-in-up" style={{ 
            display: 'flex', 
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            gap: '1rem',
            alignItems: 'flex-end',
            animationDelay: `${idx * 0.05}s`
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: msg.role === 'user' ? 'var(--primary-gradient)' : 'var(--glass-bg)',
              border: msg.role === 'tutor' ? '1px solid var(--glass-border)' : 'none',
              boxShadow: msg.role === 'user' ? '0 4px 10px rgba(139, 92, 246, 0.3)' : 'none'
            }}>
              {msg.role === 'user' ? <User size={18} color="white" /> : <Bot size={18} color="white" />}
            </div>
            
            <div style={{
              maxWidth: '75%',
              padding: '1rem 1.25rem',
              borderRadius: '20px',
              borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
              borderBottomLeftRadius: msg.role === 'tutor' ? '4px' : '20px',
              background: msg.role === 'user' ? 'var(--primary-gradient)' : 'var(--glass-bg)',
              backdropFilter: msg.role === 'tutor' ? 'blur(12px)' : 'none',
              WebkitBackdropFilter: msg.role === 'tutor' ? 'blur(12px)' : 'none',
              border: msg.role === 'tutor' ? '1px solid var(--glass-border)' : 'none',
              color: 'white',
              lineHeight: 1.6,
              position: 'relative',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              {msg.content}
              {msg.role === 'tutor' && msg.audio && (
                <button 
                  onClick={() => playAudio(msg.audio)}
                  className="icon-btn"
                  style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '-45px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', color: 'var(--text-main)' }}
                  title="Replay Audio"
                >
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="animate-fade-in-up" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
             <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="white" />
             </div>
             <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '20px', borderBottomLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{uploadStatus}</span>
             </div>
          </div>
        )}
      </main>

      {/* Control Bar */}
      <footer className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
        
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isRecording && (
             <div className="animate-pulse-ring" style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)' }} />
          )}
          <button 
            className="icon-btn"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !health}
            style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: isRecording ? '#ef4444' : 'var(--primary-gradient)',
              color: 'white',
              position: 'relative',
              zIndex: 2,
              opacity: (isProcessing || !health) ? 0.5 : 1,
              boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 10px 25px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isRecording ? <Square fill="currentColor" size={28} /> : <Mic size={32} />}
          </button>
        </div>
        
        {isRecording && (
          <div style={{ position: 'absolute', bottom: '1.25rem', color: '#ef4444', fontSize: '0.875rem', fontWeight: 600, animation: 'pulse 2s infinite', letterSpacing: '0.5px' }}>
            Listening...
          </div>
        )}
      </footer>
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}

export default App
