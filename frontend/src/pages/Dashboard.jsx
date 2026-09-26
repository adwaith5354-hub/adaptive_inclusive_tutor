import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import ProgressRing from '../components/ProgressRing.jsx'

const NEED_LABELS = { DYSLEXIA: 'Dyslexia', ADHD: 'ADHD', AUTISM: 'Autism', DOWN_SYNDROME: 'Down Syndrome', OTHER: 'Other' }
const DIFF_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TINTS = ['tint-pink', 'tint-purple', 'tint-sky', 'tint-mint']

function pctTone(p) {
  return p >= 75 ? 'p-high' : p >= 40 ? 'p-mid' : 'p-low'
}

function statusOf(c) {
  if (c.status === 'COMPLETED') return { cls: 'st-done', label: 'Completed' }
  if (c.status === 'IN_PROGRESS') return { cls: 'st-doing', label: 'In progress' }
  return { cls: 'st-todo', label: 'Not started' }
}

function actionOf(c) {
  if (c.status === 'COMPLETED') return 'Review →'
  if (c.status === 'IN_PROGRESS') return 'Continue →'
  return 'Start →'
}

const STATUS_RANK = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2 }

export default function Dashboard({ student }) {
  const [subjects, setSubjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [chapters, setChapters] = useState([])
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.subjects(student.id).then((s) => {
      setSubjects(s)
      if (s.length) setSelected(s[0])
    }).catch((e) => setError(e.message))
    api.progress(student.id).then(setOverview).catch(() => {})
  }, [student.id])

  useEffect(() => {
    if (!selected) return
    api.chapters(student.id, selected.id).then(setChapters).catch((e) => setError(e.message))
  }, [selected, student.id])

  const first = student.name.split(' ')[0]
  const needs = student.specialNeeds?.map((n) => (n === 'OTHER' && student.otherNeeds ? `Other: ${student.otherNeeds}` : NEED_LABELS[n])) ?? []

  const overall = overview?.overall
  const done = overall?.completed ?? 0
  const doing = overall?.inProgress ?? 0
  const total = overall?.totalChapters ?? 0
  const percent = overall?.percent ?? 0
  const cont = overview?.continueLearning ?? null
  const recent = overview?.chapters ?? []
  const byName = new Map(recent.map((r) => [r.chapterName, r]))
  const struggles = (overview?.struggles ?? []).slice(0, 3).map((name) => ({ name, rec: byName.get(name) }))
  const strengths = (overview?.strengths ?? []).slice(0, 2).map((name) => ({ name, rec: byName.get(name) }))
  const hasInsights = struggles.length > 0 || strengths.length > 0

  // Up-next rail: unfinished chapters of the selected subject first (skip the featured continue card).
  const upcoming = [...chapters]
    .filter((c) => !cont || c.id !== cont.chapterId)
    .sort((a, b) => (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3))
    .slice(0, 3)

  const subjectProgress = overview?.subjects.find((s) => s.subjectId === selected?.id)
  // Weekly dots are a momentum meter until the backend exposes a real study streak.
  const litDots = Math.min(Math.max(done, doing > 0 ? 1 : 0), 7)

  return (
    <div className="home">
      <h1>Hello, {first}!</h1>
      <p className="muted home-sub">Grade {student.grade} · {student.board}</p>

      {error && <div className="alert">{error}</div>}

      <div className="home-grid">
        <div className="home-main">
          {/* Stat cards */}
          <div className="stat3">
            <section className="stat-card" aria-label="Activity">
              <div className="stat-top">
                <span className="stat-name">⚡ Activity</span>
                <span className="streak-pill">🔥 {overview ? `${done} done!` : '…'}</span>
              </div>
              <div className="day-row" aria-hidden>
                {DAYS.map((d, i) => (
                  <span key={d} className={`day ${i < litDots ? 'on' : ''}`}><i>⚡</i><small>{d}</small></span>
                ))}
              </div>
              <p className="stat-sub">{overview ? `${doing} in progress` : 'Loading…'}</p>
            </section>

            <section className="stat-card" aria-label="Practice progress">
              <div className="stat-top">
                <span className="stat-name">📝 Practice</span>
                {overview && <ProgressRing percent={percent} size={52} stroke={7} />}
              </div>
              <div className="stat-big">{overview ? <>{done}<small>/{total}</small></> : '…'}</div>
              <p className="stat-sub">chapters complete</p>
            </section>

            <section className="stat-card" aria-label="Level">
              <div className="stat-top">
                <span className="stat-name">🎚 Level</span>
              </div>
              <div className="stat-big">Grade {student.grade}</div>
              <p className="stat-sub">{student.board} · {total} chapters</p>
              {cont && (
                <Link to={`/learn/${cont.chapterId}`} className="btn-secondary btn-sm level-btn" style={{ textDecoration: 'none' }}>
                  {cont.resume ? 'Continue →' : 'Start next →'}
                </Link>
              )}
            </section>
          </div>

          {/* AI insights */}
          <section className="ai-panel" aria-labelledby="ai-h">
            <h2 id="ai-h">✨ AI Insights</h2>
            <p className="ai-sub">Your tutor prepared these recommendations for you</p>
            <div className="ai-rows">
              {struggles.map(({ name, rec }) => (
                <div className="ai-row" key={`g-${name}`}>
                  <div className="ai-row-main">
                    <h3>Keep practising “{name}”</h3>
                    <p className="ai-meta">
                      {rec
                        ? `🎯 ${Math.round(rec.accuracy * 100)}% accuracy · 📝 ${rec.questionsAttempted} answered`
                        : 'Picked for you by your tutor'}
                    </p>
                  </div>
                  <div className="ai-side">
                    {(rec ?? cont) && (
                      <Link className="btn-start" to={`/learn/${rec ? rec.chapterId : cont.chapterId}`}>Practice</Link>
                    )}
                  </div>
                </div>
              ))}
              {strengths.map(({ name, rec }) => (
                <div className="ai-row" key={`s-${name}`}>
                  <div className="ai-row-main">
                    <h3>Strong in “{name}” <span className="complete-badge">✓ Strong</span></h3>
                    <p className="ai-meta">Keep it up — a quick review locks it in.</p>
                  </div>
                  <div className="ai-side">
                    {rec && <span className="ai-score">{Math.round(rec.accuracy * 100)}<small>%</small></span>}
                    {(rec ?? cont) && (
                      <Link className="btn-start" to={`/learn/${rec ? rec.chapterId : cont.chapterId}`}>Review</Link>
                    )}
                  </div>
                </div>
              ))}
              {!hasInsights && (
                <div className="ai-row">
                  <div className="ai-row-main">
                    <h3>{cont ? `Start with “${cont.chapterName}”` : 'Answer a few questions to unlock insights'}</h3>
                    <p className="ai-meta">Your tutor will adapt to your pace as you practise.</p>
                  </div>
                  <div className="ai-side">
                    {cont && <Link className="btn-start" to={`/learn/${cont.chapterId}`}>Start</Link>}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Subjects table */}
          <h2 className="section-title">Your Grade {student.grade} subjects</h2>
          <div className="ctable" role="listbox" aria-label="Subjects">
            <div className="ctable-head" aria-hidden>
              <span>Subject</span><span>Focus</span><span>Progress</span>
            </div>
            {subjects.map((s) => {
              const sp = overview?.subjects.find((x) => x.subjectId === s.id)
              const p = sp?.percent ?? 0
              const left = sp ? sp.totalChapters - sp.completed : s.chapterCount
              return (
                <button key={s.id} role="option" aria-selected={selected?.id === s.id}
                        className={`ctrow ${selected?.id === s.id ? 'active' : ''}`} onClick={() => setSelected(s)}>
                  <span className="ct-course">
                    <span className="ct-icon" aria-hidden>{s.icon}</span>
                    <span>{s.name}</span>
                  </span>
                  <span className="ct-tags">
                    <span className="tag t-blue">Grade {student.grade}</span>
                    <span className="tag t-purple">{sp ? `${sp.completed}/${sp.totalChapters} done` : `${s.chapterCount} chapters`}</span>
                    {sp && left === 0 && <span className="tag t-green">Complete</span>}
                    {sp && left > 0 && sp.completed > 0 && <span className="tag t-amber">In progress</span>}
                    {sp && sp.completed === 0 && <span className="tag t-pink">Not started</span>}
                  </span>
                  <span className="ct-prog">
                    <span className="ct-count">{sp ? `${sp.completed}/${sp.totalChapters}` : `0/${s.chapterCount}`}</span>
                    <span className={`pct ${pctTone(p)}`}>{p}%</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Chapters of the selected subject */}
          {selected && (
            <section className="card" aria-labelledby="ch-h">
              <div className="card-head">
                <h2 id="ch-h">{selected.icon} {selected.name} — Chapters</h2>
                {subjectProgress && (
                  <span className="muted small">
                    {subjectProgress.completed} completed · {subjectProgress.totalChapters - subjectProgress.completed} left
                  </span>
                )}
              </div>
              <ol className="chapter-list">
                {chapters.map((c) => {
                  const st = statusOf(c)
                  return (
                    <li key={c.id}>
                      <Link to={`/learn/${c.id}`} className={`chapter-link status-${c.status.toLowerCase()}`}>
                        <span className="chapter-no">{c.status === 'COMPLETED' ? '✓' : c.order}</span>
                        <span className="chapter-main">
                          <span className="chapter-name">Chapter {c.order}: {c.name}</span>
                          {c.status !== 'NOT_STARTED' && (
                            <span className="bar thin" aria-hidden><span style={{ width: `${c.percent}%` }} /></span>
                          )}
                        </span>
                        {c.status === 'COMPLETED' && <span className="badge">Completed 🏆</span>}
                        {c.status === 'IN_PROGRESS' && (
                          <span className="badge doing-badge">{c.percent}% · {DIFF_LABEL[c.currentDifficulty]}</span>
                        )}
                        {c.status === 'NOT_STARTED' && <span className="badge muted-badge">Not started</span>}
                        <span className="go-action">{actionOf(c)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </div>

        {/* Right rail: up next */}
        <aside className="task-rail" aria-label="Up next">
          <h2 className="rail-title">Up next</h2>

          {cont && (
            <Link to={`/learn/${cont.chapterId}`} className="task">
              <div className="task-head tint-pink">
                <span>{cont.subjectName}</span>
                <span>{cont.resume ? 'Continue learning' : 'Start next'}</span>
              </div>
              <div className="task-body">
                <h3 className="task-title">{cont.subjectIcon} {cont.chapterName}</h3>
                <p className="task-desc">
                  {cont.resume
                    ? `Pick up where you left off — ${cont.percent}% done.`
                    : 'A brand-new chapter, picked for your grade.'}
                </p>
                <div className="task-foot">
                  <span className={`status ${cont.resume ? 'st-doing' : 'st-todo'}`}>
                    {cont.resume ? 'In progress' : 'Not started'}
                  </span>
                  <span className="btn-primary btn-sm">{cont.resume ? 'Continue →' : 'Start →'}</span>
                </div>
              </div>
            </Link>
          )}

          {upcoming.map((c, i) => {
            const st = statusOf(c)
            return (
              <Link key={c.id} to={`/learn/${c.id}`} className="task">
                <div className={`task-head ${TINTS[(cont ? i + 1 : i) % TINTS.length]}`}>
                  <span>{selected?.name ?? 'Chapter'}</span>
                  <span>{c.status === 'IN_PROGRESS' ? `${c.percent}% done` : c.status === 'COMPLETED' ? 'Done' : 'New'}</span>
                </div>
                <div className="task-body">
                  <h3 className="task-title">Chapter {c.order}: {c.name}</h3>
                  <p className="task-desc">
                    {c.status === 'IN_PROGRESS'
                      ? `Keep going — ${DIFF_LABEL[c.currentDifficulty]} level.`
                      : c.status === 'COMPLETED'
                        ? 'Completed — open it any time to review.'
                        : 'Not started yet — give it a try.'}
                  </p>
                  <div className="task-foot">
                    <span className={`status ${st.cls}`}>{st.label}</span>
                    <span className="btn-secondary btn-sm">{actionOf(c)}</span>
                  </div>
                </div>
              </Link>
            )
          })}

          <section className="card rail-card" aria-labelledby="prof-h">
            <h2 id="prof-h">Your learning profile</h2>
            <p className="muted small">
              {student.learnerType === 'NORMAL' ? 'Standard learner' : `Additional learning needs: ${needs.join(', ')}`}
            </p>
            <ul className="ticks">
              {student.profile.summary.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <p className="note small">
              🔒 This only personalises <strong>how you learn</strong> (pace, text style, practice).
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
