'use client';

import { useId, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

export type QuizOption = { text?: string | null; correct?: boolean | null };
export type QuizQuestion = {
  question?: string | null;
  options?: QuizOption[] | null;
  explanation?: string | null;
};

// A short quiz sewn on as a patch (see .quiz in globals.css): one question at
// a time, the reader picks an answer, it is marked right or wrong straight
// away (with the writer's optional explanation under it), then "Next". The
// last step shows the score and lets the reader start over. Each run asks
// `count` questions drawn at random from the whole list, chosen when the
// reader presses Start (never during the prerender, so server and browser
// markup agree) and again on every "Try again". Plain state in the browser;
// nothing is sent anywhere, so it works in the static export.
function draw<T>(list: T[], count: number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function Quiz({
  title,
  count = 10,
  questions = [],
}: {
  title?: string | null;
  count?: number | null;
  questions?: QuizQuestion[];
}) {
  const pool = questions.filter((q) => q.question && (q.options ?? []).some((o) => o.text));
  const perRun = Math.max(1, Math.min(count || 10, pool.length));
  const [items, setItems] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const headingId = useId();
  const stepRef = useRef<HTMLDivElement>(null);

  if (pool.length === 0) return null;

  const started = items !== null;
  const run = items ?? [];
  const current = started ? run[index] : null;
  const options = (current?.options ?? []).filter((o) => o.text);

  function answer(choice: number) {
    if (picked !== null) return;
    setPicked(choice);
    if (options[choice].correct) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setIndex((i) => i + 1);
    stepRef.current?.focus({ preventScroll: true });
  }

  function start() {
    setItems(draw(pool, perRun));
    setPicked(null);
    setScore(0);
    setIndex(0);
    stepRef.current?.focus({ preventScroll: true });
  }

  return (
    <section className="quiz" aria-labelledby={title ? headingId : undefined} aria-label={title ? undefined : 'Quiz'}>
      {title ? (
        <p className="quiz__title" id={headingId}>
          {title}
        </p>
      ) : null}
      <div className="quiz__step" ref={stepRef} tabIndex={-1}>
        {!started ? (
          <>
            <p className="quiz__question">
              {perRun} questions about PMOS and AnTigone, picked at random each time.
            </p>
            <button type="button" className="quiz__next" onClick={start}>
              Start quiz
            </button>
          </>
        ) : current ? (
          <>
            <p className="quiz__progress">
              Question {index + 1} of {run.length}
            </p>
            <div
              className="quiz__bar"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={run.length}
              aria-valuenow={index + (picked !== null ? 1 : 0)}
            >
              <span
                className="quiz__bar-fill"
                style={{ width: `${((index + (picked !== null ? 1 : 0)) / run.length) * 100}%` }}
              />
            </div>
            <p className="quiz__question">{current.question}</p>
            <ul className="quiz__options">
              {options.map((option, i) => {
                const isPicked = picked === i;
                const state =
                  picked === null ? undefined : option.correct ? 'correct' : isPicked ? 'wrong' : 'idle';
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className="quiz__option"
                      data-state={state}
                      aria-disabled={picked !== null}
                      onClick={() => answer(i)}
                    >
                      <span>{option.text}</span>
                      {state === 'correct' ? (
                        <Check className="quiz__mark" aria-label="Correct answer" size={20} />
                      ) : state === 'wrong' ? (
                        <X className="quiz__mark" aria-label="Your answer, incorrect" size={20} />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div aria-live="polite">
              {picked !== null ? (
                <>
                  <p className="quiz__feedback">
                    {options[picked].correct ? 'Correct!' : 'Not quite.'}
                    {current.explanation ? ` ${current.explanation}` : ''}
                  </p>
                  <button type="button" className="quiz__next" onClick={next}>
                    {index + 1 < run.length ? 'Next question' : 'See my score'}
                  </button>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div aria-live="polite">
            <p className="quiz__progress">Finished</p>
            <p className="quiz__score">
              You got {score} of {run.length} right.
            </p>
            <button type="button" className="quiz__next" onClick={start}>
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
