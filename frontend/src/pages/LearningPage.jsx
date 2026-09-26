import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { ExamplesCard, LearnCard } from '../components/LessonContent.jsx'
import StepByStepLesson from '../components/StepByStepLesson.jsx'
import GuidedExamples from '../components/GuidedExamples.jsx'
import ActivityCard from '../components/ActivityCard.jsx'
import AdaptivePanel from '../components/AdaptivePanel.jsx'
import TutorChat from '../components/TutorChat.jsx'
import Celebration from '../components/Celebration.jsx'

const TABS = [
  { id: 'learn', label: 'Learn', icon: '📘' },
  { id: 'examples', label: 'Examples', icon: '✏️' },
  { id: 'practice', label: 'Practice', icon: '🎯' },
]
const DEFAULT_CHIPS = ['Explain this chapter', 'Give me an example', 'Give me a hint', 'Ask me a question']

export default function LearningPage({ student }) {
  const { chapterId } = useParams()
  const [lesson, setLesson] = useState(null)
  const [activity, setActivity] = useState(null)
  const [progress, setProgress] = useState(null)
  const [completion, setCompletion] = useState(null)
  const [learning, setLearning] = useState(null)
  const [messages, setMessages] = useState([])
  const [chips, setChips] = useState(DEFAULT_CHIPS)
  const [turn, setTurn] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('learn')
  const [celebrate, setCelebrate] = useState(null)

  const say = (text, from = 'tutor') => setMessages((m) => [...m, { from, text }])
  const firstName = student.name.split(' ')[0]
  const profile = lesson?.profile
  // One section at a time for learners who benefit from focus / predictable structure.
  const tabbed = !!(profile?.focusMode || profile?.structuredFlow)

  const nextActivity = useCallback(async () => {
    setBusy(true)
    try {
      const a = await api.nextActivity(student.id, chapterId)
      setActivity(a)
      setProgress(a.progress)
      setTab('practice')
      say(a.decision.resumed ? `Welcome back, ${firstName}! Let's finish the question you were on.` : a.tutorMessage)
      document.getElementById('practice')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [student.id, chapterId, firstName])

  useEffect(() => {
    setActivity(null)
    setLearning(null)
    setTab('learn')
    api.lesson(student.id, chapterId)
      .then((l) => {
        setLesson(l)
        setProgress(l.progress)
        setCompletion(l.completion)
        const started = l.progress.questionsAttempted > 0
        const intro = l.profile.structuredFlow
          ? `Hi ${firstName}! Today we learn "${l.chapterName}". We will do 3 steps: 1. Learn, 2. Examples, 3. Practice. Start with step 1. Ask me anything at any time.`
          : started
            ? `Welcome back, ${firstName}! You're ${l.completion.percent}% through "${l.chapterName}". Let's keep going!`
            : `Hi ${firstName}! Let's learn "${l.chapterName}" together. Read the lesson, then start practice — or ask me anything.`
        setMessages([{ from: 'tutor', text: intro }])
        // Continue exactly where the student left off.
        if (l.hasPendingActivity) nextActivity()
      })
      .catch((e) => setError(e.message))
  }, [chapterId, student, firstName]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitAnswer = async (answer) => {
    setBusy(true)
    try {
      const r = await api.submitAnswer(student.id, chapterId, answer)
      setProgress(r.progress)
      setCompletion(r.completion)
      if (r.learning) setLearning(r.learning)
      say(r.tutorMessage)
      if (r.chapterJustCompleted) setCelebrate('chapter')
      else if (r.correct && profile?.celebrations) setCelebrate('correct')
      return r
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const sendChat = async (message) => {
    say(message, 'student')
    setBusy(true)
    try {
      const reply = await api.chat(student.id, { chapterId: Number(chapterId), questionId: activity?.question.id ?? null, message, turn })
      setTurn(turn + 1)
      say(reply.text)
      setChips(reply.suggestions?.length ? reply.suggestions : DEFAULT_CHIPS)
      if (reply.suggestedAction === 'NEXT_ACTIVITY' && !activity) await nextActivity()
    } catch (e) {
      say(`Sorry, I couldn't answer that just now (${e.message}).`)
    } finally {
      setBusy(false)
    }
  }

  const endCelebration = useCallback(() => setCelebrate(null), [])

  if (error && !lesson) {
    return (
      <div className="page narrow">
        <div className="alert">{error}</div>
        <Link to="/home">← Back to my learning</Link>
      </div>
    )
  }
  if (!lesson) return <div className="center-screen">Loading lesson…</div>

  const show = (id) => !tabbed || tab === id
  const goTab = (id) => { setTab(id); window.scrollTo({ top: 0 }) }

  const practice = activity ? (
    <ActivityCard activity={activity} profile={profile} onSubmit={submitAnswer} onNext={nextActivity} busy={busy}
                  attempted={progress?.questionsAttempted ?? 0} />
  ) : (
    <section className="card center">
      <h2>🎯 Ready to practise?</h2>
      <p className="muted">Your tutor will pick a question that matches your pace.</p>
      <button className="btn-primary big" onClick={nextActivity} disabled={busy}>Start practice</button>
    </section>
  )

  return (
    <div className="learn-page">
      {celebrate && <Celebration kind={celebrate} onDone={endCelebration} />}

      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/home">My learning</Link>
        <span aria-hidden> / </span>
        <span>{lesson.subjectName}</span>
        <span aria-hidden> / </span>
        <b>{lesson.chapterName}</b>
      </nav>

      <header className="topbar">
        <div>
          <Link to="/home" className="back">← My learning</Link>
          <h1>{lesson.chapterName}</h1>
          <p className="muted">Grade {lesson.grade} · {lesson.subjectName}</p>
        </div>
        {completion && (
          <div className="chapter-progress" aria-label={`Chapter ${completion.percent}% complete`}>
            <span className="cp-label">
              {completion.status === 'COMPLETED' ? 'Chapter complete 🏆' : `Chapter progress: ${completion.percent}%`}
            </span>
            <span className="bar"><span style={{ width: `${completion.percent}%` }} /></span>
            <span className="muted small">
              {Math.min(completion.distinctCorrect, completion.target)}/{completion.target} correct · Hard question {completion.hardSolved ? '✓' : '—'}
            </span>
          </div>
        )}
      </header>

      {tabbed && (
        <nav className="steps tabs" aria-label="Lesson sections">
          {TABS.map((t, i) => (
            <button key={t.id} className={`${tab === t.id ? 'current' : ''} ${TABS.findIndex((x) => x.id === tab) > i ? 'done' : ''}`}
                    onClick={() => goTab(t.id)} aria-current={tab === t.id ? 'step' : undefined}>
              <span>{i + 1}</span> {t.icon} {t.label}
            </button>
          ))}
        </nav>
      )}

      {error && <div className="alert" role="alert">{error} <button className="btn-link" onClick={() => setError('')}>dismiss</button></div>}

      <div className="learn-grid">
        <main className="learn-main">
          {show('learn') && (profile.stepByStep && lesson.steps.length
            ? <StepByStepLesson steps={lesson.steps} profile={profile} onFinish={() => goTab('examples')} />
            : <LearnCard lesson={lesson} />)}
          {show('learn') && tabbed && !profile.stepByStep && (
            <button className="btn-primary" onClick={() => goTab('examples')}>Next: Examples →</button>
          )}

          {show('examples') && lesson.guidedExamples.length > 0 && (
            <GuidedExamples examples={lesson.guidedExamples} profile={profile} onFinish={() => { goTab('practice'); if (!activity) nextActivity() }} />
          )}
          {show('examples') && <ExamplesCard lesson={lesson} />}
          {show('examples') && tabbed && (
            <button className="btn-primary" onClick={() => { goTab('practice'); if (!activity) nextActivity() }}>Next: Practice →</button>
          )}

          {show('practice') && <div id="practice">{practice}</div>}
        </main>

        <aside className="learn-side">
          <TutorChat messages={messages} suggestions={chips} onSend={sendChat} readAloud={profile.readAloud} busy={busy} />
          <AdaptivePanel progress={progress} decision={activity?.decision} learning={learning} />
        </aside>
      </div>
    </div>
  )
}
