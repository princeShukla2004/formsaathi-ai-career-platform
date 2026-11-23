import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flag,
  History,
  Info,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMockTestAttempts,
  fetchMockTests,
  saveMockTestAttempt,
} from '../../services/firestoreService';
import { ConfirmDialog, StatusBadge } from '../../components/ui/UIComponents';
import type { MockTest, MockTestAttempt } from '../../types';

const TEST_CATEGORIES: Array<'All' | MockTest['examCategory']> = [
  'All',
  'SSC',
  'Railway',
  'Banking',
  'UPSC',
  'State Govt',
  'General',
];

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MockTestsPage() {
  const { user } = useAuth();

  const [tests, setTests] = useState<MockTest[]>([]);
  const [attempts, setAttempts] = useState<MockTestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'All' | MockTest['examCategory']>('All');

  // Active exam state
  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedReview, setMarkedReview] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  // Result / Review state
  const [reviewAttempt, setReviewAttempt] = useState<{
    test: MockTest;
    attempt: MockTestAttempt;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchMockTests(false)
      .then(setTests)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMockTestAttempts(user.uid).then(setAttempts).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!activeTest) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizeAttempt(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTest]);

  const filteredTests = useMemo(() => {
    if (categoryFilter === 'All') return tests;
    return tests.filter((t) => t.examCategory === categoryFilter);
  }, [tests, categoryFilter]);

  const startTest = (test: MockTest) => {
    setActiveTest(test);
    setReviewAttempt(null);
    setCurrentIdx(0);
    setAnswers({});
    setMarkedReview({});
    setSecondsLeft(Math.max(1, test.durationMinutes) * 60);
    setSubmitConfirmOpen(false);
  };

  const finalizeAttempt = async (_autoExpired = false) => {
    if (!activeTest) return;
    const qs = activeTest.questions;
    const marksPerQ = qs.length > 0 ? activeTest.totalMarks / qs.length : 1;
    const neg = Number(activeTest.negativeMarking || 0);

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const q of qs) {
      const sel = answers[q.id];
      if (sel === undefined) {
        unansweredCount += 1;
      } else if (sel === q.correctIndex) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    const rawScore = correctCount * marksPerQ - wrongCount * neg;
    const score = Number(Math.max(0, rawScore).toFixed(2));
    const attemptedCount = correctCount + wrongCount;
    const accuracyPercent =
      attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const totalTime = Math.max(1, activeTest.durationMinutes) * 60;
    const timeSpentSeconds = Math.max(1, totalTime - secondsLeft);

    const payload: Omit<MockTestAttempt, 'id' | 'userId' | 'createdAt'> = {
      testId: activeTest.id,
      testTitle: activeTest.title,
      examCategory: activeTest.examCategory,
      score,
      totalMarks: activeTest.totalMarks,
      correctCount,
      wrongCount,
      unansweredCount,
      accuracyPercent,
      timeSpentSeconds,
      answers,
    };

    let createdId = `local_${Date.now()}`;
    if (user && user.emailVerified) {
      createdId = await saveMockTestAttempt(user.uid, payload);
      fetchMockTestAttempts(user.uid).then(setAttempts).catch(() => {});
    }

    setReviewAttempt({
      test: activeTest,
      attempt: {
        id: createdId,
        userId: user?.uid || 'guest',
        ...payload,
        createdAt: new Date().toISOString(),
      },
    });
    setActiveTest(null);
    setSubmitConfirmOpen(false);
  };

  // Exam Runner View
  if (activeTest) {
    const questions = activeTest.questions;
    const currentQ = questions[currentIdx];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0D9488] dark:text-teal-300">
              {activeTest.examCategory} · Unofficial Practice Test
            </p>
            <h1 className="text-lg font-bold text-[#14243A] dark:text-white">{activeTest.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 font-mono-num text-sm font-bold text-[#14243A] dark:text-teal-300">
              <Clock className="w-4 h-4 text-[#0D9488]" />
              <span>{formatTimer(secondsLeft)}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitConfirmOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              Submit Test
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Question Card */}
          <div className="lg:col-span-8 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-6 flex flex-col justify-between">
            {currentQ && (
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
                  <span className="font-mono-num font-semibold">
                    Question {currentIdx + 1} of {questions.length} · {currentQ.topic}
                  </span>
                  <span>{activeTest.difficulty}</span>
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-[#172033] dark:text-white leading-relaxed">
                  {currentQ.questionText}
                </h2>

                <div className="space-y-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const selected = answers[currentQ.id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: idx }))}
                        className={`w-full text-left p-3.5 rounded-xl border text-sm transition-colors flex items-center gap-3 ${
                          selected
                            ? 'border-[#14B8A6] bg-[#CCFBF1]/40 dark:bg-teal-950/30 font-semibold text-[#14243A] dark:text-white'
                            : 'border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-mono-num shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-5 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    currentQ &&
                    setMarkedReview((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  <Flag className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>
                    {currentQ && markedReview[currentQ.id] ? 'Unmark Review' : 'Mark for Review'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentQ) return;
                    setAnswers((prev) => {
                      const next = { ...prev };
                      delete next[currentQ.id];
                      return next;
                    });
                  }}
                  className="px-3 py-2 text-xs font-medium text-[#64748B] hover:text-[#172033] dark:hover:text-white"
                >
                  Clear Response
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                  className="px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSubmitConfirmOpen(true)}
                    className="px-4 py-2 text-xs font-semibold bg-[#16A34A] text-white rounded-lg"
                  >
                    Review &amp; Submit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Palette */}
          <aside className="lg:col-span-4 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#14243A] dark:text-white">Question Palette</h2>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isFlagged = markedReview[q.id];
                const isCurrent = idx === currentIdx;
                let cls = 'border-[#E2E8F0] dark:border-slate-700 text-[#64748B]';
                if (isFlagged) cls = 'border-[#F59E0B] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300';
                else if (isAnswered) cls = 'border-[#16A34A] bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-300';
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`py-2 rounded-lg border text-xs font-mono-num font-bold ${cls} ${
                      isCurrent ? 'ring-2 ring-[#14243A] dark:ring-[#14B8A6]' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 text-[11px] text-[#64748B] dark:text-slate-400 space-y-1">
              <p>Answered: {Object.keys(answers).length} / {questions.length}</p>
              <p>Marked for Review: {Object.values(markedReview).filter(Boolean).length}</p>
              <p>Negative Marking: {activeTest.negativeMarking} per wrong answer</p>
            </div>
          </aside>
        </div>

        <ConfirmDialog
          open={submitConfirmOpen}
          title="Submit Mock Test?"
          message={`You have answered ${Object.keys(answers).length} out of ${questions.length} questions. Once submitted, your score and detailed explanations will be generated.`}
          confirmLabel="Submit Test Now"
          onCancel={() => setSubmitConfirmOpen(false)}
          onConfirm={() => finalizeAttempt(false)}
        />
      </div>
    );
  }

  // Review Results View
  if (reviewAttempt) {
    const { test, attempt } = reviewAttempt;
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0D9488] dark:text-teal-300">
              Unofficial Practice Result · {test.examCategory}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#14243A] dark:text-white mt-1">
              {test.title}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startTest(test)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Test</span>
            </button>
            <button
              type="button"
              onClick={() => setReviewAttempt(null)}
              className="px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              All Mock Tests
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Score', value: `${attempt.score} / ${attempt.totalMarks}` },
            { label: 'Accuracy', value: `${attempt.accuracyPercent}%` },
            { label: 'Correct / Wrong', value: `${attempt.correctCount} / ${attempt.wrongCount}` },
            { label: 'Time Spent', value: formatTimer(attempt.timeSpentSeconds) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5"
            >
              <p className="text-xs text-[#64748B] dark:text-slate-400">{stat.label}</p>
              <p className="text-xl font-bold font-mono-num text-[#14243A] dark:text-white mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
            Answer Key &amp; Explanations
          </h2>
          {test.questions.map((q, idx) => {
            const chosen = attempt.answers[q.id];
            const isCorrect = chosen === q.correctIndex;
            return (
              <div
                key={q.id}
                className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono-num font-semibold text-[#64748B] dark:text-slate-400">
                    Q{idx + 1} · {q.topic}
                  </span>
                  <StatusBadge
                    label={
                      chosen === undefined
                        ? 'Unanswered'
                        : isCorrect
                          ? 'Correct'
                          : 'Incorrect'
                    }
                    tone={
                      chosen === undefined
                        ? 'warning'
                        : isCorrect
                          ? 'verified'
                          : 'danger'
                    }
                  />
                </div>
                <p className="text-sm font-semibold text-[#172033] dark:text-white">{q.questionText}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, optIdx) => {
                    const isAns = optIdx === q.correctIndex;
                    const isUser = optIdx === chosen;
                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-lg border ${
                          isAns
                            ? 'border-[#16A34A] bg-emerald-50 dark:bg-emerald-950/30 text-[#16A34A] dark:text-emerald-300 font-semibold'
                            : isUser
                              ? 'border-[#DC2626] bg-red-50 dark:bg-red-950/30 text-[#DC2626] dark:text-red-300'
                              : 'border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}. {opt}
                        {isAns && ' (Correct)'}
                        {isUser && !isAns && ' (Your Answer)'}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <p className="text-xs text-[#64748B] dark:text-slate-300 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Catalog + History View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
          Timed Practice &amp; Self-Assessment
        </p>
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
          Competitive Exam Mock Tests
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-3xl">
          Practice timed MCQ sets across SSC, Banking, Railway RRB, and UPSC General Studies with automatic negative-marking scoring and detailed explanations.
        </p>
      </div>

      <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
        <Info className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
        <span>
          <strong>Unofficial Practice Tests:</strong> These practice modules are built for concept drills and speed improvement. They are not official UPSC/SSC/IBPS/RRB exam papers and do not award official certificates.
        </span>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {TEST_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              categoryFilter === cat
                ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] dark:border-[#14B8A6]'
                : 'bg-white dark:bg-[#131E30] border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTests.map((test) => (
            <article
              key={test.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#0D9488] dark:text-teal-300">
                    {test.examCategory} · {test.difficulty}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-300">
                    Unofficial Practice
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#14243A] dark:text-white">{test.title}</h2>
                <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {test.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono-num text-[#64748B] dark:text-slate-400">
                  {test.questions.length} Qs · {test.durationMinutes} min · {test.totalMarks} Marks (-{test.negativeMarking})
                </div>
                <button
                  type="button"
                  onClick={() => startTest(test)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Test</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Attempt History */}
      {user && attempts.length > 0 && (
        <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#0D9488]" />
            <h2 className="text-base font-bold text-[#14243A] dark:text-white">
              Your Recent Practice Attempts
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-400">
                  <th className="py-2 pr-4">Test Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Accuracy</th>
                  <th className="py-2">Correct / Wrong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {attempts.slice(0, 10).map((att) => (
                  <tr key={att.id}>
                    <td className="py-2.5 pr-4 font-semibold">{att.testTitle}</td>
                    <td className="py-2.5 pr-4">{att.examCategory}</td>
                    <td className="py-2.5 pr-4 font-mono-num font-bold text-[#0D9488]">
                      {att.score} / {att.totalMarks}
                    </td>
                    <td className="py-2.5 pr-4 font-mono-num">{att.accuracyPercent}%</td>
                    <td className="py-2.5 font-mono-num">
                      {att.correctCount} / {att.wrongCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
