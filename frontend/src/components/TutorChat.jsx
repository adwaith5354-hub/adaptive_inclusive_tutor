import { useEffect, useRef, useState } from 'react'
import SpeakButton from './SpeakButton.jsx'

/** Conversational tutor panel. Messages are owned by the parent so answer feedback can appear here too. */
export default function TutorChat({ messages, suggestions, onSend, readAloud, busy }) {
  const [text, setText] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  const send = (msg) => {
    const m = (msg ?? text).trim()
    if (!m) return
    setText('')
    onSend(m)
  }

  return (
    <section className="card chat" aria-label="AI tutor chat">
      <h2>💬 Chat with AI</h2>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            <p>{m.text}</p>
            {readAloud && m.from === 'tutor' && <SpeakButton text={m.text} label="" />}
          </div>
        ))}
        {busy && <div className="msg tutor typing">…</div>}
        <div ref={endRef} />
      </div>
      <div className="chips">
        {suggestions.map((s) => (
          <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>
        ))}
      </div>
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask your tutor anything…" aria-label="Message" />
        <button className="btn-primary" disabled={busy || !text.trim()}>Send</button>
      </form>
    </section>
  )
}
