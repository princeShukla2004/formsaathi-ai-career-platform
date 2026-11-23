import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  History,
  Info,
  Mic,
  Play,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  deleteMockInterviewSession,
  fetchMockInterviews,
  logAIUsage,
  saveMockInterviewSession,
} from '../../services/firestoreService';
import type { MockInterviewMessage, MockInterviewSession } from '../../types';

const ROLE_PRESETS = [
  'Software Engineer (Fresher / 0–2 Yrs)',
  'Data Analyst (SQL, Excel, Power BI)',
  'Frontend Developer (React & TypeScript)',
  'Business Analyst',
  'Banking / IBPS PO Personal Interview',
  'UPSC / State PSC Civil Services Personality Test',
  'SSC / Railway Technical & Document Interview',
  'Campus Placement HR & Behavioral Round',
];

export function MockInterviewPage() {
  const { user, profile } = useAuth();

  const [roleTitle, setRoleTitle] = useState(ROLE_PRESETS[0]);
  const [customRole, setCustomRole] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [questionCount, setQuestionCount] = useState(5);

  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<MockInterviewMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'in_progress' | 'completed'>('idle');
  const [finalSummary, setFinalSummary] = useState('');
  const [overallScore, setOverallScore] = useState(0);

  const [answerInput, setAnswerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pastSessions, setPastSessions] = useState<MockInterviewSession[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchMockInterviews(user.uid).then(setPastSessions).catch(() => {});
  }, [user]);

  const effectiveRole = customRole.trim() || roleTitle;

  const computeAvgScore = (msgs: MockInterviewMessage[]) => {
    const evals = msgs.filter((m) => m.evaluation).map((m) => m.evaluation!);
    if (!evals.length) return 0;
    const totals = evals.map(
      (ev) =>
        (ev.relevanceScore + ev.clarityScore + ev.structureScore + ev.completenessScore) / 4
    );
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  };

  const persistSession = async (
    nextMessages: MockInterviewMessage[],
    nextStatus: 'in_progress' | 'completed',
    nextScore: number,
    summaryText?: string,
    overrideId?: string
  ) => {
    if (!user || !user.emailVerified) return overrideId;
    const savedId = await saveMockInterviewSession(user.uid, {
      id: overrideId ?? activeSessionId,
      roleTitle: effectiveRole,
      difficulty,
      durationMinutes: questionCount * 3,
      questionCount,
      status: nextStatus,
      overallScore: nextScore,
      messages: nextMessages,
      finalFeedback: summaryText
        ? {
            summary: summaryText,
            topStrengths: nextMessages
              .flatMap((m) => m.evaluation?.strengths || [])
              .slice(0, 4),
            priorityImprovements: nextMessages
              .flatMap((m) => m.evaluation?.improvements || [])
              .slice(0, 4),
            disclaimer:
              'Text-mode interview evaluation reviews written relevance, clarity, structure, and completeness only.',
          }
        : undefined,
    });
    setActiveSessionId(savedId);
    fetchMockInterviews(user.uid).then(setPastSessions).catch(() => {});
    return savedId;
  };

  const handleStartInterview = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const resp = await fetch('/api/ai/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          roleTitle: effectiveRole,
          difficulty,
          questionCount,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Could not start mock interview.');

      const firstMsgs: MockInterviewMessage[] = [
        {
          role: 'interviewer',
          content: `${data.welcomeNote}\n\nQuestion 1 of ${questionCount}: ${data.question}`,
          questionIndex: 1,
          timestamp: new Date().toISOString(),
        },
      ];
      setActiveSessionId(undefined);
      setMessages(firstMsgs);
      setCurrentQuestion(data.question);
      setQuestionIndex(1);
      setSessionStatus('in_progress');
      setFinalSummary('');
      setOverallScore(0);

      if (user && user.emailVerified) {
        await logAIUsage(user.uid, 'mock_interview', profile?.preferredLanguage || 'en');
        await persistSession(firstMsgs, 'in_progress', 0, undefined, undefined);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start interview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || loading || sessionStatus !== 'in_progress') return;
    setErrorMsg('');
    setLoading(true);

    const candidateText = answerInput.trim();
    const userMsg: MockInterviewMessage = {
      role: 'candidate',
      content: candidateText,
      questionIndex,
      timestamp: new Date().toISOString(),
    };
    const interimMessages = [...messages, userMsg];
    setMessages(interimMessages);
    setAnswerInput('');

    try {
      const resp = await fetch('/api/ai/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_answer',
          roleTitle: effectiveRole,
          difficulty,
          questionCount,
          questionIndex,
          currentQuestion,
          answer: candidateText,
          history: interimMessages.slice(-6),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Evaluation failed.');

      const evalMsg: MockInterviewMessage = {
        role: 'interviewer',
        content:
          questionIndex >= questionCount
            ? `Final Evaluation Summary:\n${data.finalSummary}`
            : `Question ${questionIndex + 1} of ${questionCount}: ${data.nextQuestion}`,
        questionIndex: questionIndex >= questionCount ? undefined : questionIndex + 1,
        evaluation: data.evaluation,
        timestamp: new Date().toISOString(),
      };

      const nextMessages = [...interimMessages, evalMsg];
      const nextScore = computeAvgScore(nextMessages);
      const completed = questionIndex >= questionCount || !data.nextQuestion;

      setMessages(nextMessages);
      setOverallScore(nextScore);

      if (completed) {
        setSessionStatus('completed');
        setFinalSummary(data.finalSummary || '');
        setCurrentQuestion('');
        await persistSession(nextMessages, 'completed', nextScore, data.finalSummary);
      } else {
        setQuestionIndex((q) => q + 1);
        setCurrentQuestion(data.nextQuestion);
        await persistSession(nextMessages, 'in_progress', nextScore);
      }

      if (user && user.emailVerified) {
        await logAIUsage(user.uid, 'mock_interview', profile?.preferredLanguage || 'en');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to evaluate answer.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPastSession = (sess: MockInterviewSession) => {
    setActiveSessionId(sess.id);
    setRoleTitle(sess.roleTitle);
    setCustomRole('');
    setDifficulty(sess.difficulty);
    setQuestionCount(sess.questionCount);
    setMessages(sess.messages);
    setOverallScore(sess.overallScore);
    setSessionStatus(sess.status === 'completed' ? 'completed' : 'in_progress');
    setFinalSummary(sess.finalFeedback?.summary || '');
  };

  const handleDeleteSession = async (id: string) => {
    if (!user) return;
    await deleteMockInterviewSession(user.uid, id);
    setPastSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setSessionStatus('idle');
      setMessages([]);
      setActiveSessionId(undefined);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
          Structured Interview Practice
        </p>
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
          AI Mock Interview Studio
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-3xl">
          Practice realistic one-question-at-a-time text interviews tailored to Indian technical, corporate, banking, and government personality rounds.
        </p>
      </div>

      {/* Honest Capability Note */}
      <div className="bg-teal-50/70 dark:bg-teal-950/20 border border-[#CCFBF1] dark:border-teal-900 rounded-xl p-4 flex items-start gap-3 text-xs text-[#172033] dark:text-slate-200">
        <Info className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
        <span>
          <strong>Text-Mode Evaluation Scope:</strong> Answers are scored strictly on written Relevance, Clarity, Structure, and Completeness. Spoken pronunciation, voice tone, and camera body language are not recorded or scored.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Setup & History */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#14243A] dark:text-white">
              Interview Configuration
            </h2>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Role / Exam Round</label>
              <select
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                aria-label="Interview role preset"
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                {ROLE_PRESETS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Or Custom Target Role (Optional)
              </label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g. Junior Cloud Support Engineer"
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')
                  }
                  aria-label="Difficulty level"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Questions</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  aria-label="Question count"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  <option value={3}>3 Questions (~10m)</option>
                  <option value={5}>5 Questions (~15m)</option>
                  <option value={7}>7 Questions (~20m)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartInterview}
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sessionStatus === 'in_progress' ? (
                <RotateCcw className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>
                {loading
                  ? 'Preparing Interview...'
                  : sessionStatus === 'in_progress'
                    ? 'Restart New Session'
                    : 'Start Mock Interview'}
              </span>
            </button>
          </div>

          {/* Past Sessions */}
          {user && pastSessions.length > 0 && (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                <History className="w-4 h-4 text-[#0D9488]" />
                <span>Saved Sessions ({pastSessions.length})</span>
              </div>
              <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {pastSessions.slice(0, 6).map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadPastSession(s)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs font-semibold truncate hover:text-[#0D9488]">
                        {s.roleTitle}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono-num">
                        {s.difficulty} · Score {s.overallScore}% · {s.status}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id)}
                      aria-label="Delete session"
                      className="p-1.5 text-[#64748B] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Interview Workspace */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden min-h-[540px]">
          <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-[#0B1320]">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-[#0D9488]" />
              <div>
                <p className="text-sm font-bold text-[#14243A] dark:text-white">{effectiveRole}</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono-num">
                  {sessionStatus === 'idle'
                    ? 'Ready to begin'
                    : sessionStatus === 'completed'
                      ? `Completed · Overall Average ${overallScore}%`
                      : `Question ${questionIndex} of ${questionCount}`}
                </p>
              </div>
            </div>
            {overallScore > 0 && (
              <span className="text-xs font-mono-num font-bold text-[#0D9488] dark:text-teal-300">
                Current Avg: {overallScore}/100
              </span>
            )}
          </div>

          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[520px]">
            {messages.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Mic className="w-10 h-10 text-[#14B8A6] mx-auto" />
                <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
                  Configure your target role and press Start
                </h2>
                <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
                  The AI interviewer asks one question at a time, evaluates your written response with rubric scores, and gives concise improvement tips.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={`${msg.timestamp}_${idx}`} className="space-y-3">
                  {msg.evaluation && (
                    <div className="bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        {[
                          { label: 'Relevance', val: msg.evaluation.relevanceScore },
                          { label: 'Clarity', val: msg.evaluation.clarityScore },
                          { label: 'Structure', val: msg.evaluation.structureScore },
                          { label: 'Completeness', val: msg.evaluation.completenessScore },
                        ].map((sc) => (
                          <div key={sc.label} className="p-2 rounded-lg bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800">
                            <p className="text-[11px] text-[#64748B] dark:text-slate-400">{sc.label}</p>
                            <p className="text-base font-bold font-mono-num text-[#14243A] dark:text-teal-300">
                              {sc.val}%
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-[#16A34A] dark:text-emerald-400 mb-1">Strengths</p>
                          <ul className="list-disc pl-4 space-y-1 text-[#64748B] dark:text-slate-300">
                            {msg.evaluation.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-[#F59E0B] dark:text-amber-300 mb-1">Improvements</p>
                          <ul className="list-disc pl-4 space-y-1 text-[#64748B] dark:text-slate-300">
                            {msg.evaluation.improvements.map((imp, i) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {msg.evaluation.modelAnswerTip && (
                        <p className="text-xs text-[#172033] dark:text-slate-200 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                          <strong>Model Tip:</strong> {msg.evaluation.modelAnswerTip}
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-xl text-sm whitespace-pre-line leading-relaxed ${
                      msg.role === 'candidate'
                        ? 'bg-[#14243A] text-white ml-auto max-w-[85%]'
                        : 'bg-slate-50 dark:bg-slate-800/70 text-[#172033] dark:text-slate-100 max-w-[90%]'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {sessionStatus === 'completed' && finalSummary && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-[#16A34A] dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Interview Session Completed · Average Score: {overallScore}/100</p>
                  <p className="mt-1 text-[#172033] dark:text-slate-200">{finalSummary}</p>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="px-6 py-2 text-xs text-[#DC2626] bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900">
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={handleSubmitAnswer}
            className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1320] flex flex-col sm:flex-row gap-3"
          >
            <textarea
              rows={3}
              disabled={sessionStatus !== 'in_progress' || loading}
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder={
                sessionStatus === 'in_progress'
                  ? 'Write a clear, structured answer (STAR method works great for behavioral questions)...'
                  : 'Start a session to answer questions...'
              }
              className="flex-1 p-3 text-sm bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sessionStatus !== 'in_progress' || loading || answerInput.trim().length < 5}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-50 sm:self-end"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Scoring...' : 'Submit Answer'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
