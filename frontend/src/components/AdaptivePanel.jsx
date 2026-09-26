const ACTION_LABEL = {
  REVIEW_EASIER: 'Review + easier',
  WORKED_EXAMPLE: 'Worked example',
  PRACTICE: 'Practice same level',
  LEVEL_UP: 'Level up',
}

/**
 * Makes the RL loop visible: state -> action -> reward -> updated Q-value.
 */
export default function AdaptivePanel({ progress, decision, learning }) {
  const [difficulty, performance, pace] = (progress?.learningState || 'EASY|STEADY|ON_TRACK').split('|')
  const q = decision?.qValues || {}
  const values = Object.values(q)
  const max = Math.max(0.01, ...values.map(Math.abs))

  return (
    <section className="card adaptive">
      <h2>✨ AI Insights</h2>
      <p className="ai-sub">How your tutor is adapting to you.</p>

      <div className="stats">
        <Stat label="Attempted" value={progress?.questionsAttempted ?? 0} />
        <Stat label="Correct" value={progress?.correctAnswers ?? 0} />
        <Stat label="Incorrect" value={progress?.incorrectAnswers ?? 0} />
        <Stat label="Avg time" value={`${progress?.avgTimeSeconds ?? 0}s`} />
        <Stat label="Streak" value={progress?.correctStreak ?? 0} />
      </div>

      <div className="state-row">
        <span className="pill">Level: {difficulty}</span>
        <span className="pill">Performance: {performance}</span>
        <span className="pill">Pace: {pace?.replace('_', ' ')}</span>
      </div>

      {decision && (
        <>
          <h3>Last decision {decision.resumed && <span className="muted small">(resumed)</span>}</h3>
          <p className="small">
            From state <code>{decision.state}</code> the engine chose <strong>{ACTION_LABEL[decision.action]}</strong>.
          </p>
          <ul className="qbars">
            {Object.entries(q).map(([a, v]) => {
              const allowed = decision.allowedActions.includes(a)
              return (
                <li key={a} className={`${a === decision.action ? 'chosen' : ''} ${allowed ? '' : 'blocked'}`}>
                  <span className="qlabel">{ACTION_LABEL[a]}{!allowed && ' 🔒'}</span>
                  <span className="qbar"><span style={{ width: `${Math.max(0, v) / max * 100}%` }} /></span>
                  <span className="qval">{v.toFixed(2)}</span>
                </li>
              )
            })}
          </ul>
          <p className="muted small">🔒 = not allowed yet (e.g. needs more correct answers in a row before levelling up).</p>
        </>
      )}

      {learning && (
        <>
          <h3>Last update</h3>
          <p className="small">
            Reward <strong className={learning.reward >= 0 ? 'pos' : 'neg'}>{learning.reward > 0 ? '+' : ''}{learning.reward}</strong>
            {' '}for <em>{ACTION_LABEL[learning.action]}</em> → Q {learning.oldQ.toFixed(2)} → <strong>{learning.newQ.toFixed(2)}</strong>
            <br />New state: <code>{learning.nextState}</code>
          </p>
        </>
      )}
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
