import React, { useEffect, useState } from 'react';
import { BookOpen, Database, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { STARTER_LEARNING_PATHS } from '../../data/platformDatasets';
import {
  deleteLearningPathAdmin,
  fetchLearningPaths,
  upsertLearningPathAdmin,
} from '../../services/firestoreService';
import { ConfirmDialog, StatusBadge } from '../../components/ui/UIComponents';
import type { LearningCategoryType, LearningPath } from '../../types';

const LEARNING_CATS: LearningCategoryType[] = [
  'Advanced Excel',
  'SQL',
  'Power BI',
  'Tableau',
  'Data Visualization',
  'Business Analytics',
  'Communication Skills',
  'Interview Preparation',
  'Resume Writing',
];

export function AdminLearningHubPage() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LearningCategoryType>('Advanced Excel');
  const [level, setLevel] = useState<LearningPath['level']>('Beginner');
  const [description, setDescription] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [practicePrompt, setPracticePrompt] = useState('');

  const load = () => {
    setLoading(true);
    fetchLearningPaths(true)
      .then(setPaths)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSeed = async () => {
    if (!user) return;
    for (const lp of STARTER_LEARNING_PATHS) {
      await upsertLearningPathAdmin(user.uid, user.email || '', lp);
    }
    setMsg(`Synced ${STARTER_LEARNING_PATHS.length} starter learning paths into Firestore.`);
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await upsertLearningPathAdmin(user.uid, user.email || '', {
      title,
      category,
      level,
      description,
      estimatedHours: 3,
      isPublished: true,
      lessons: [
        {
          id: `ls_${Date.now()}`,
          title: lessonTitle || 'Core Foundations',
          durationMinutes: 20,
          summary: lessonSummary || description,
          keyTakeaways: ['Apply core concept directly to portfolio projects'],
          practicePrompt: practicePrompt || 'Complete a short practical exercise using sample data.',
        },
      ],
    });
    setTitle('');
    setDescription('');
    setLessonTitle('');
    setLessonSummary('');
    setPracticePrompt('');
    setMsg('Learning path published.');
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
            Learning Hub Content Management
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Publish structured career skill lessons across analytics, communication, and interview prep.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg"
        >
          <Database className="w-4 h-4" />
          <span>Seed 9 Starter Skill Paths</span>
        </button>
      </div>

      {msg && <p className="text-xs font-semibold text-[#16A34A]">{msg}</p>}

      <form
        onSubmit={handleCreate}
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs"
      >
        <h2 className="text-base font-bold flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#0D9488]" />
          <span>Add Learning Track</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Track Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LearningCategoryType)}
            aria-label="Learning category"
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            {LEARNING_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LearningPath['level'])}
            aria-label="Track level"
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
          placeholder="Track description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2.5 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="First Lesson Title"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <input
            type="text"
            placeholder="Practice Prompt"
            value={practicePrompt}
            onChange={(e) => setPracticePrompt(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>
        <textarea
          rows={2}
          placeholder="First Lesson Summary..."
          value={lessonSummary}
          onChange={(e) => setLessonSummary(e.target.value)}
          className="w-full p-2.5 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        />
        <button
          type="submit"
          className="px-4 py-2 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          Publish Learning Path
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="h-32 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
        ) : (
          paths.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#0D9488]" />
                  <span className="text-sm font-bold">{p.title}</span>
                  <StatusBadge
                    label={p.isPublished ? 'Active' : 'Draft'}
                    tone={p.isPublished ? 'verified' : 'neutral'}
                  />
                </div>
                <p className="text-[#64748B] dark:text-slate-400 mt-0.5">
                  {p.category} · {p.level} · {p.lessons.length} lessons
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteId(p.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[#DC2626] border border-red-200 dark:border-red-900 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Learning Path?"
        message="Removes this learning path from Firestore."
        destructive
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (user && deleteId) {
            await deleteLearningPathAdmin(user.uid, user.email || '', deleteId);
            setDeleteId(null);
            load();
          }
        }}
      />
    </div>
  );
}
