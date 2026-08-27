import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Loader2, Volume2, User, Bot, BookOpen, MessageCircle, XCircle } from 'lucide-react'

const LessonCard = ({ lesson, onComplete }) => {
  const [step, setStep] = useState('explanation'); 
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);

  if (!lesson || !lesson.mcqs || lesson.mcqs.length === 0) return null;

  if (step === 'explanation') {
    return (
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '16px', marginTop: '1.5rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <h3 style={{ color: '#a78bfa', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📚 Mini-Lesson: {lesson.topic}
        </h3>
        <p style={{ lineHeight: 1.6 }}>{lesson.explanation}</p>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Examples:</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lesson.examples.map((ex, i) => <li key={i}>{ex}</li>)}
          </ul>
        </div>
        <button 
          onClick={() => setStep('quiz')}
          style={{ background: 'var(--primary-gradient)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, width: '100%', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}
        >
          Start Practice Quiz
        </button>
      </div>
    );
  }

  if (step === 'quiz') {
    const q = lesson.mcqs[currentQ];
    return (
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '16px', marginTop: '1.5rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: 0 }}>Question {currentQ + 1} of {lesson.mcqs.length}</h4>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem' }}>Score: {score}</span>
        </div>
        <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1.5rem' }}>{q.question}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {q.options.map((opt, i) => {
            let bg = 'rgba(255,255,255,0.05)';
            let border = '1px solid var(--glass-border)';
            if (selectedOpt) {
              if (opt === q.correct_answer) {
                bg = 'rgba(16, 185, 129, 0.2)'; // green
                border = '1px solid #10b981';
              } else if (opt === selectedOpt) {
                bg = 'rgba(239, 68, 68, 0.2)'; // red
                border = '1px solid #ef4444';
              }
            }
            return (
              <button
                key={i}
                disabled={!!selectedOpt}
                onClick={() => {
                  setSelectedOpt(opt);
                  if (opt === q.correct_answer) setScore(s => s + 1);
                  setTimeout(() => {
                    setSelectedOpt(null);
                    if (currentQ < lesson.mcqs.length - 1) setCurrentQ(c => c + 1);
                    else setStep('result');
                  }, 1500);
                }}
                style={{
                  background: bg,
                  border: border,
                  padding: '1rem',
                  borderRadius: '8px',
                  color: 'white',
                  textAlign: 'left',
                  cursor: selectedOpt ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.95rem'
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #10b981', padding: '2rem', borderRadius: '16px', marginTop: '1.5rem', textAlign: 'center', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
        <h2 style={{ margin: 0, fontSize: '2rem' }}>🎉</h2>
      </div>
      <h3 style={{ color: '#10b981', marginTop: 0, marginBottom: '0.5rem' }}>Quiz Complete!</h3>
      <p style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0' }}>You scored <strong>{score}</strong> out of {lesson.mcqs.length}</p>
      
      {onComplete ? (
        <button 
          onClick={onComplete}
          style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Continue to Chat
        </button>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tap the microphone below to continue our conversation.</p>
      )}
    </div>
  );
};

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  
  const [appMode, setAppMode] = useState('select'); // 'select', 'lesson', 'chat', 'summary'
  const [suggestedLesson, setSuggestedLesson] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [pendingLesson, setPendingLesson] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);

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
      
    fetch('http://127.0.0.1:8000/api/lesson/pending')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.has_pending) {
          setPendingLesson(data.topic);
        }
      })
      .catch(err => console.error("Error fetching pending lessons:", err))
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, isProcessing, appMode])

  const startLessonMode = async () => {
    setAppMode('lesson');
    setUploadStatus("Fetching your personalized lesson...");
    try {
      const res = await fetch('http://127.0.0.1:8000/api/lesson/suggest');
      const data = await res.json();
      if (data.status === 'success') {
        setSuggestedLesson(data.lesson);
      }
    } catch (err) {
      console.error(err);
    }
    setUploadStatus(null);
  };

  const startChatMode = () => {
    setSessionStart(new Date().toISOString());
    setAppMode('chat');
  };

  const endConversation = async () => {
    setAppMode('summary');
    setUploadStatus("Generating your report card...");
    try {
      const url = sessionStart ? `http://127.0.0.1:8000/api/conversation/summary?since=${encodeURIComponent(sessionStart)}` : 'http://127.0.0.1:8000/api/conversation/summary';
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setSummaryData(data.mistakes);
      }
    } catch (err) {
      console.error(err);
    }
    setUploadStatus(null);
  };

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
    formData.append('history', JSON.stringify(history.map(m => ({role: m.role, content: m.content}))))
    
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
            { role: 'tutor', content: result.response_text, audio: result.audio_base64, lesson: result.lesson }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {appMode === 'chat' && history.length > 0 && (
            <button 
              onClick={endConversation}
              className="glass-panel"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent' }}
            >
              <XCircle size={16} /> End Conversation
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            <div style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              background: health ? '#10b981' : (error ? '#ef4444' : '#f59e0b'),
              boxShadow: health ? '0 0 8px #10b981' : 'none',
              transition: 'all 0.3s ease'
            }} />
            {health ? 'Connected' : (error ? 'Disconnected' : 'Connecting...')}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* MODE: Select */}
        {appMode === 'select' && (
          <div className="animate-fade-in-up" style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', color: 'white' }}>Welcome back.</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>What would you like to do today?</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={startLessonMode}
                className="glass-panel" 
                style={{ position: 'relative', padding: '2rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '220px', cursor: 'pointer', transition: 'all 0.3s', border: '1px solid rgba(139, 92, 246, 0.3)' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--glass-bg)' }}
              >
                {pendingLesson && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '999px', boxShadow: '0 4px 6px rgba(239,68,68,0.4)', animation: 'pulse 2s infinite' }}>
                    1 Pending!
                  </div>
                )}
                <div style={{ background: 'var(--primary-gradient)', padding: '1rem', borderRadius: '50%' }}>
                  <BookOpen size={32} color="white" />
                </div>
                <h3 style={{ margin: 0, color: 'white' }}>Learn a Lesson</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                  {pendingLesson ? `Topic: ${pendingLesson}` : 'Review your past mistakes'}
                </p>
              </button>
              
              <button 
                onClick={startChatMode}
                className="glass-panel" 
                style={{ padding: '2rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '220px', cursor: 'pointer', transition: 'all 0.3s', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--glass-bg)' }}
              >
                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '1rem', borderRadius: '50%' }}>
                  <MessageCircle size={32} color="white" />
                </div>
                <h3 style={{ margin: 0, color: 'white' }}>Practice Speaking</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Free-flowing conversation</p>
              </button>
            </div>
          </div>
        )}

        {/* MODE: Lesson (Pre-Chat) */}
        {appMode === 'lesson' && (
          <div className="animate-fade-in-up" style={{ margin: 'auto', width: '100%', maxWidth: '600px' }}>
            {uploadStatus && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <Loader2 className="animate-spin" size={24} /> {uploadStatus}
              </div>
            )}
            {suggestedLesson && (
              <LessonCard lesson={suggestedLesson} onComplete={startChatMode} />
            )}
          </div>
        )}

        {/* MODE: Chat */}
        {appMode === 'chat' && (
          <>
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
                alignItems: msg.role === 'tutor' && msg.lesson ? 'flex-start' : 'flex-end',
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
                  maxWidth: msg.lesson ? '90%' : '75%',
                  padding: '1rem 1.25rem',
                  borderRadius: '20px',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
                  borderBottomLeftRadius: msg.role === 'tutor' ? '4px' : '20px',
                  background: msg.role === 'user' ? 'var(--primary-gradient)' : 'var(--glass-bg)',
                  backdropFilter: msg.role === 'tutor' ? 'blur(12px)' : 'none',
                  border: msg.role === 'tutor' ? '1px solid var(--glass-border)' : 'none',
                  color: 'white',
                  lineHeight: 1.6,
                  position: 'relative'
                }}>
                  {msg.content}
                  
                  {msg.role === 'tutor' && msg.lesson && (
                    <LessonCard lesson={msg.lesson} />
                  )}
                  
                  {msg.role === 'tutor' && msg.audio && (
                    <button 
                      onClick={() => playAudio(msg.audio)}
                      className="icon-btn"
                      style={{ position: 'absolute', top: msg.lesson ? '1rem' : '50%', transform: msg.lesson ? 'none' : 'translateY(-50%)', right: '-45px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', color: 'var(--text-main)' }}
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
                    <Loader2 className="animate-spin" size={20} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{uploadStatus}</span>
                 </div>
              </div>
            )}
          </>
        )}

        {/* MODE: Summary */}
        {appMode === 'summary' && (
          <div className="animate-fade-in-up" style={{ margin: 'auto', width: '100%', maxWidth: '700px' }}>
            <h2 style={{ textAlign: 'center', color: 'white', fontSize: '2rem', marginBottom: '2rem' }}>Daily Report Card</h2>
            
            {!summaryData ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" size={24} /> Generating summary...</div>
            ) : summaryData.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px' }}>
                <h3 style={{ color: '#10b981', margin: '0 0 1rem 0' }}>Perfect Score! 🎉</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>We didn't detect any recurring mistakes today. Keep up the amazing work!</p>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Here are the areas you struggled with recently. Keep practicing!</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {summaryData.map((m, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase' }}>{m.category}</span>
                        <span style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>Repeated {m.count} times</span>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: '#ef4444', textDecoration: 'line-through', marginRight: '0.5rem' }}>"{m.error_text}"</span>
                      </div>
                      <div>
                        <span style={{ color: '#10b981', fontWeight: 500 }}>Correct: "{m.correction}"</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setAppMode('select')}
                  style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, width: '100%', marginTop: '2rem' }}
                >
                  Return to Home
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Control Bar (Only show in chat mode) */}
      {appMode === 'chat' && (
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
      )}
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 50% { opacity: 0.5; } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}

export default App
