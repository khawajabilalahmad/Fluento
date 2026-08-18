import { useState, useEffect, useRef } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [history, setHistory] = useState([])
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    // Note: The frontend will attempt to connect to the FastAPI backend running locally on port 8000
    fetch('http://127.0.0.1:8000/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => setError(err.message))
  }, [])

  const startRecording = async () => {
    setUploadStatus(null)
    setAudioUrl(null)
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
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        audioChunksRef.current = [] // reset for next time
        
        // Send to backend
        uploadAudio(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setError("Microphone access denied or not available.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const uploadAudio = async (blob) => {
    setUploadStatus("Uploading...")
    const formData = new FormData()
    // Append the audio file and history
    formData.append('audio', blob, 'recording.webm')
    formData.append('history', JSON.stringify(history))
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/conversation/turn', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      if (response.ok) {
        setUploadStatus(`Success: ${result.message}`)
        
        // Add the new turn to the history
        if (result.transcript && result.response_text) {
          setHistory(prev => [
            ...prev,
            { role: 'user', content: result.transcript },
            { role: 'tutor', content: result.response_text }
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
      setUploadStatus(`Upload failed: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Voice-First Agentic English Improver</h1>
      
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Backend Connection Status</h2>
        {error && !health ? (
          <p style={{ color: 'red' }}>❌ Error connecting to backend: {error}</p>
        ) : health ? (
          <p style={{ color: 'green' }}>✅ Backend is connected: {health.message}</p>
        ) : (
          <p>⏳ Checking backend status...</p>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Conversation</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          {!isRecording ? (
            <button 
              onClick={startRecording}
              style={{ padding: '0.5rem 1rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
            >
              🎤 Start Recording
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              style={{ padding: '0.5rem 1rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
            >
              ⏹ Stop Recording
            </button>
          )}
          {isRecording && <span style={{ color: 'red', fontWeight: 'bold' }}>Recording...</span>}
        </div>

        {audioUrl && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ marginBottom: '0.5rem' }}>Your Recording:</p>
            <audio src={audioUrl} controls style={{ width: '100%' }} />
          </div>
        )}

        {uploadStatus && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px' }}>
            <strong>Upload Status:</strong> <br/>
            {uploadStatus}
          </div>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>Chat History</h3>
            {history.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#e3f2fd' : '#f1f8e9',
                border: `1px solid ${msg.role === 'user' ? '#bbdefb' : '#c5e1a5'}`,
                padding: '1rem', 
                borderRadius: '8px',
                maxWidth: '80%'
              }}>
                <strong>{msg.role === 'user' ? 'You' : 'Tutor'}:</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
