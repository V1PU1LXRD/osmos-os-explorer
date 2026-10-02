import { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { QUIZ_QUESTIONS, QUIZ_PASS_RATIO } from '../data/quiz.js';

/**
 * Knowledge Check — five questions drawn from the six zones.
 * Instant feedback per question, a scored summary, and restart.
 */
export default function KnowledgeCheck({ onClose }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null); // option index for current question
  const [answers, setAnswers] = useState([]); // { questionId, picked, correct }
  const [finished, setFinished] = useState(false);

  const question = QUIZ_QUESTIONS[index];

  const choose = (optionIndex) => {
    if (picked !== null) return; // locked after first pick
    setPicked(optionIndex);
    setAnswers((list) => [
      ...list,
      { questionId: question.id, picked: optionIndex, correct: optionIndex === question.answer }
    ]);
  };

  const next = () => {
    if (index + 1 >= QUIZ_QUESTIONS.length) {
      setFinished(true);
    } else {
      setIndex((value) => value + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setAnswers([]);
    setFinished(false);
  };

  const score = answers.filter((entry) => entry.correct).length;
  const total = QUIZ_QUESTIONS.length;
  const passed = score / total >= QUIZ_PASS_RATIO;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Knowledge check" onClick={onClose}>
      <div className="overlay-card" onClick={(event) => event.stopPropagation()}>
        <header className="overlay-head">
          <div>
            <span className="overlay-kicker">Knowledge check</span>
            <h2>Did the machine leave a mark?</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="overlay-body">
          {!finished ? (
            <>
              <div className="quiz-progress" aria-hidden>
                {QUIZ_QUESTIONS.map((entry, i) => {
                  const record = answers[i];
                  return (
                    <i
                      key={entry.id}
                      className={record ? (record.correct ? 'is-right' : 'is-wrong') : i === index ? 'is-done' : ''}
                    />
                  );
                })}
              </div>

              <p className="muted mono" style={{ fontSize: 'var(--fs-10)' }}>
                Question {index + 1} / {total} · from {question.zoneLabel}
              </p>

              <h3 style={{ fontSize: 'var(--fs-13)', color: 'var(--text-hi)', lineHeight: 1.55 }}>
                {question.prompt}
              </h3>

              <div style={{ display: 'grid', gap: 8 }}>
                {question.options.map((option, optionIndex) => {
                  const isPicked = picked === optionIndex;
                  const isAnswer = optionIndex === question.answer;
                  const showState = picked !== null;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={[
                        'quiz-option',
                        showState && isAnswer && 'is-correct',
                        showState && isPicked && !isAnswer && 'is-wrong'
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => choose(optionIndex)}
                      disabled={picked !== null}
                    >
                      <span className="opt-key">{String.fromCharCode(65 + optionIndex)}</span>
                      <span style={{ flex: 1 }}>
                        {option}
                        {showState && isAnswer && <CheckCircle2 size={14} aria-hidden style={{ marginLeft: 8, verticalAlign: -2, color: 'var(--green)' }} />}
                        {showState && isPicked && !isAnswer && <XCircle size={14} aria-hidden style={{ marginLeft: 8, verticalAlign: -2, color: 'var(--magenta)' }} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className={`note ${picked === question.answer ? 'is-ok' : 'is-danger'}`}>
                  <span className="note-title">{picked === question.answer ? 'Correct' : 'Not quite'}</span>
                  {question.explanation}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
                <div
                  className="stat-value"
                  style={{ fontSize: 'var(--fs-22)', color: passed ? 'var(--green)' : 'var(--amber)' }}
                >
                  {score} / {total}
                </div>
                <p className="muted" style={{ marginTop: 6 }}>
                  {passed
                    ? 'Solid — the concepts stuck. The kernel is proud of you.'
                    : 'Worth another orbit: revisit the zones behind the questions you missed, then try again.'}
                </p>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {QUIZ_QUESTIONS.map((entry, i) => {
                  const record = answers[i];
                  const chosen = record ? entry.options[record.picked] : '—';
                  return (
                    <div key={entry.id} className="stat" style={{ padding: '10px 12px' }}>
                      <div className="stat-label">
                        {record?.correct ? '✓' : '✕'} {entry.zoneLabel}
                      </div>
                      <div className="muted" style={{ fontSize: 'var(--fs-10)' }}>
                        You chose: <b style={{ color: record?.correct ? 'var(--green)' : 'var(--magenta)' }}>{chosen}</b>
                        {!record?.correct && (
                          <>
                            {' '}· correct: <b style={{ color: 'var(--green)' }}>{entry.options[entry.answer]}</b>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <footer className="overlay-foot">
          {finished ? (
            <button type="button" className="btn btn-accent" onClick={restart}>
              <RotateCcw size={13} aria-hidden /> Restart quiz
            </button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={next} disabled={picked === null}>
              {index + 1 >= total ? 'See results' : 'Next question'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
