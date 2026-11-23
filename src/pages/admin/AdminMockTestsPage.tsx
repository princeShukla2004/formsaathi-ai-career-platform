import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Database, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { STARTER_MOCK_TESTS, STARTER_QUESTION_BANK } from '../../data/platformDatasets';
import {
  deleteMockTestAdmin,
  deleteQuestionBankAdmin,
  fetchMockTests,
  fetchQuestionBank,
  upsertMockTestAdmin,
  upsertQuestionBankAdmin,
} from '../../services/firestoreService';
import { ConfirmDialog, StatusBadge } from '../../components/ui/UIComponents';
import type { MockTest, QuestionBankItem } from '../../types';

const EXAM_CATS: MockTest['examCategory'][] = ['SSC', 'Railway', 'Banking', 'UPSC', 'State Govt', 'General'];

export function AdminMockTestsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'tests' | 'questions'>('tests');
  const [tests, setTests] = useState<MockTest[]>([]);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'test' | 'q'; id: string } | null>(null);

  // Quick Question Form
  const [qCat, setQCat] = useState<MockTest['examCategory']>('SSC');
  const [qTopic, setQTopic] = useState('Quantitative Aptitude');
  const [qDiff, setQDiff] = useState<QuestionBankItem['difficulty']>('Intermediate');
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIndex, setCorrectIndex] = useState(0);
  const [qExp, setQExp] = useState('');

  // Quick Test Form
  const [testTitle, setTestTitle] = useState('');
  const [testCat, setTestCat] = useState<MockTest['examCategory']>('SSC');
  const [testDiff, setTestDiff] = useState<MockTest['difficulty']>('Intermediate');
  const [testMinutes, setTestMinutes] = useState(15);
  const [testNeg, setTestNeg] = useState(0.25);

  const load = () => {
    setLoading(true);
    Promise.all([fetchMockTests(true), fetchQuestionBank(true)])
      .then(([t, q]) => {
        setTests(t);
        setQuestions(q);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSeedAll = async () => {
    if (!user) return;
    setMsg('');
    for (const q of STARTER_QUESTION_BANK) {
      await upsertQuestionBankAdmin(user.uid, user.email || '', q);
    }
    for (const t of STARTER_MOCK_TESTS) {
      await upsertMockTestAdmin(user.uid, user.email || '', t);
    }
    setMsg(`Seeded ${STARTER_QUESTION_BANK.length} questions and ${STARTER_MOCK_TESTS.length} mock tests into Firestore.`);
    load();
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await upsertQuestionBankAdmin(user.uid, user.email || '', {
      examCategory: qCat,
      topic: qTopic,
      difficulty: qDiff,
      questionText: qText,
      options: [optA, optB, optC, optD],
      correctIndex,
      explanation: qExp,
      isActive: true,
    });
    setQText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setQExp('');
    setMsg('Question added to Question Bank.');
    load();
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const pool = (questions.length > 0 ? questions : STARTER_QUESTION_BANK)
      .filter((q) => q.examCategory === testCat || q.isActive)
      .slice(0, 5)
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        topic: q.topic,
      }));
    await upsertMockTestAdmin(user.uid, user.email || '', {
      title: testTitle,
      examCategory: testCat,
      difficulty: testDiff,
      durationMinutes: testMinutes,
      totalMarks: pool.length * 2,
      negativeMarking: testNeg,
      isUnofficialPractice: true,
      status: 'published',
      questions: pool,
      description: `Unofficial practice set for ${testCat} built from active question bank items.`,
    });
    setTestTitle('');
    setMsg('Mock test published using category question bank items.');
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
            Mock Tests &amp; Question Bank
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Manage practice MCQ banks, timed exam sets, negative marking, and publication status.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSeedAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg"
        >
          <Database className="w-4 h-4" />
          <span>Seed Starter Tests &amp; Question Bank</span>
        </button>
      </div>

      {msg && <p className="text-xs font-semibold text-[#16A34A]">{msg}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('tests')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
            tab === 'tests'
              ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
              : 'border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          Mock Tests ({tests.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('questions')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
            tab === 'questions'
              ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
              : 'border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          Question Bank ({questions.length})
        </button>
      </div>

      {tab === 'tests' ? (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateTest}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs"
          >
            <h2 className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0D9488]" />
              <span>Create Quick Mock Test (from Question Bank)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="text"
                required
                placeholder="Test Title"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="md:col-span-2 px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
              <select
                value={testCat}
                onChange={(e) => setTestCat(e.target.value as MockTest['examCategory'])}
                aria-label="Test category"
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                {EXAM_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={testDiff}
                onChange={(e) => setTestDiff(e.target.value as MockTest['difficulty'])}
                aria-label="Test difficulty"
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
              >
                Publish Test
              </button>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <span>Duration (min):</span>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={testMinutes}
                  onChange={(e) => setTestMinutes(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Negative Mark:</span>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={2}
                  value={testNeg}
                  onChange={(e) => setTestNeg(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded"
                />
              </label>
            </div>
          </form>

          {loading ? (
            <div className="h-32 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-3">
              {tests.map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-[#0D9488]" />
                      <span className="text-sm font-bold">{t.title}</span>
                      <StatusBadge
                        label={t.status}
                        tone={t.status === 'published' ? 'verified' : 'neutral'}
                      />
                    </div>
                    <p className="text-[#64748B] dark:text-slate-400 mt-0.5 font-mono-num">
                      {t.examCategory} · {t.questions.length} Qs · {t.durationMinutes} min · {t.totalMarks} marks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: 'test', id: t.id })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[#DC2626] border border-red-200 dark:border-red-900 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateQuestion}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs"
          >
            <h2 className="text-base font-bold">Add Question Bank Item</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={qCat}
                onChange={(e) => setQCat(e.target.value as MockTest['examCategory'])}
                aria-label="Question exam category"
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                {EXAM_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="text"
                required
                placeholder="Topic"
                value={qTopic}
                onChange={(e) => setQTopic(e.target.value)}
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
              <select
                value={qDiff}
                onChange={(e) => setQDiff(e.target.value as QuestionBankItem['difficulty'])}
                aria-label="Question difficulty"
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <textarea
              rows={2}
              required
              placeholder="Question stem..."
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="w-full p-2.5 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" required placeholder="Option A" value={optA} onChange={(e) => setOptA(e.target.value)} className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg" />
              <input type="text" required placeholder="Option B" value={optB} onChange={(e) => setOptB(e.target.value)} className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg" />
              <input type="text" required placeholder="Option C" value={optC} onChange={(e) => setOptC(e.target.value)} className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg" />
              <input type="text" required placeholder="Option D" value={optD} onChange={(e) => setOptD(e.target.value)} className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={correctIndex}
                onChange={(e) => setCorrectIndex(Number(e.target.value))}
                aria-label="Correct option"
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <option value={0}>Correct: Option A</option>
                <option value={1}>Correct: Option B</option>
                <option value={2}>Correct: Option C</option>
                <option value={3}>Correct: Option D</option>
              </select>
              <input
                type="text"
                required
                placeholder="Explanation"
                value={qExp}
                onChange={(e) => setQExp(e.target.value)}
                className="sm:col-span-2 px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <button type="submit" className="px-4 py-2 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg">
              Save Question
            </button>
          </form>

          <div className="space-y-3">
            {questions.map((q) => (
              <div
                key={q.id}
                className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <p className="text-[#0D9488] font-semibold">{q.examCategory} · {q.topic} · {q.difficulty}</p>
                  <p className="font-semibold text-sm mt-1">{q.questionText}</p>
                  <p className="text-[#64748B] mt-1">Answer: {q.options[q.correctIndex]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: 'q', id: q.id })}
                  className="p-2 text-[#DC2626]"
                  aria-label="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirm Deletion"
        message="This action permanently deletes the selected record from Firestore."
        destructive
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!user || !deleteTarget) return;
          if (deleteTarget.type === 'test') {
            await deleteMockTestAdmin(user.uid, user.email || '', deleteTarget.id);
          } else {
            await deleteQuestionBankAdmin(user.uid, user.email || '', deleteTarget.id);
          }
          setDeleteTarget(null);
          load();
        }}
      />
    </div>
  );
}
