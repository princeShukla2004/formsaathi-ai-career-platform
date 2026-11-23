import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  Info,
  Square,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchLearningPaths,
  fetchLearningProgress,
  saveLearningProgress,
} from '../../services/firestoreService';
import type { LearningCategoryType, LearningPath, LearningProgressRecord } from '../../types';

const LEARNING_CATEGORIES: Array<'All' | LearningCategoryType> = [
  'All',
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

export function LearningHubPage() {
  const { user } = useAuth();

  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [progressRecords, setProgressRecords] = useState<LearningProgressRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'All' | LearningCategoryType>('All');
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLearningPaths(false)
      .then((list) => {
        setPaths(list);
        if (list.length > 0) setActivePath(list[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchLearningProgress(user.uid).then(setProgressRecords).catch(() => {});
  }, [user]);

  const filteredPaths = useMemo(() => {
    if (selectedCategory === 'All') return paths;
    return paths.filter((p) => p.category === selectedCategory);
  }, [paths, selectedCategory]);

  const getCompletedSet = (pathId: string) => {
    const rec = progressRecords.find((r) => r.pathId === pathId);
    return new Set(rec?.completedLessonIds || []);
  };

  const toggleLessonComplete = async (path: LearningPath, lessonId: string) => {
    const existingSet = getCompletedSet(path.id);
    const nextIds = existingSet.has(lessonId)
      ? Array.from(existingSet).filter((id) => id !== lessonId)
      : [...Array.from(existingSet), lessonId];

    setProgressRecords((prev) => {
      const idx = prev.findIndex((r) => r.pathId === path.id);
      const updated: LearningProgressRecord = {
        id: path.id,
        userId: user?.uid || 'guest',
        pathId: path.id,
        pathTitle: path.title,
        completedLessonIds: nextIds,
        updatedAt: new Date().toISOString(),
      };
      if (idx === -1) return [...prev, updated];
      return prev.map((r) => (r.pathId === path.id ? updated : r));
    });

    if (user && user.emailVerified) {
      await saveLearningProgress(user.uid, path.id, path.title, nextIds);
    }
  };

  const activeLesson = activePath?.lessons?.[activeLessonIdx];
  const activeCompletedSet = activePath ? getCompletedSet(activePath.id) : new Set<string>();
  const activePct =
    activePath && activePath.lessons.length > 0
      ? Math.round((activeCompletedSet.size / activePath.lessons.length) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
          Structured Skill Guides &amp; Lesson Progress
        </p>
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
          Skills &amp; Career Learning Hub
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-3xl">
          Focused, practical lessons across Excel, SQL, Power BI, Tableau, Data Visualization, Business Analytics, Communication, Interview Prep, and Resume Writing.
        </p>
      </div>

      <div className="bg-teal-50/70 dark:bg-teal-950/20 border border-[#CCFBF1] dark:border-teal-900 rounded-xl p-4 flex items-start gap-3 text-xs text-[#172033] dark:text-slate-200">
        <Info className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
        <span>
          <strong>Educational Practice Resource:</strong> Modules combine concise written walkthroughs, hands-on practice prompts, and verified official documentation links for personal study tracking (no fake certificates).
        </span>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {LEARNING_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setSelectedCategory(cat);
              const firstMatch =
                cat === 'All' ? paths[0] : paths.find((p) => p.category === cat);
              if (firstMatch) {
                setActivePath(firstMatch);
                setActiveLessonIdx(0);
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              selectedCategory === cat
                ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] dark:border-[#14B8A6]'
                : 'bg-white dark:bg-[#131E30] border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Course Tracks List */}
          <div className="lg:col-span-4 space-y-3">
            {filteredPaths.map((path) => {
              const completed = getCompletedSet(path.id).size;
              const total = path.lessons.length;
              const isSelected = activePath?.id === path.id;
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => {
                    setActivePath(path);
                    setActiveLessonIdx(0);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#131E30] dark:border-[#14B8A6]'
                      : 'bg-white dark:bg-[#131E30] border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className={isSelected ? 'text-[#CCFBF1]' : 'text-[#0D9488] dark:text-teal-300 font-semibold'}>
                      {path.category} · {path.level}
                    </span>
                    <span className="font-mono-num opacity-80">
                      {completed}/{total} done
                    </span>
                  </div>
                  <h2 className="text-sm font-bold leading-snug">{path.title}</h2>
                  <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-slate-200' : 'text-[#64748B] dark:text-slate-400'}`}>
                    {path.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Interactive Lesson Reader */}
          <div className="lg:col-span-8">
            {activePath ? (
              <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-slate-800">
                  <div>
                    <p className="text-xs font-semibold text-[#0D9488] dark:text-teal-300">
                      {activePath.category} · {activePath.level} · ~{activePath.estimatedHours} hrs
                    </p>
                    <h2 className="text-2xl font-bold text-[#14243A] dark:text-white mt-0.5">
                      {activePath.title}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-num text-base font-bold text-[#0D9488]">
                      {activePct}% Complete
                    </span>
                  </div>
                </div>

                {/* Lesson Tabs */}
                <div className="flex flex-wrap gap-2">
                  {activePath.lessons.map((lesson, idx) => {
                    const done = activeCompletedSet.has(lesson.id);
                    const active = idx === activeLessonIdx;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setActiveLessonIdx(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                          active
                            ? 'border-[#14B8A6] bg-[#CCFBF1]/40 text-[#14243A] dark:text-teal-300'
                            : 'border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300'
                        }`}
                      >
                        {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />}
                        <span>
                          Lesson {idx + 1}: {lesson.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeLesson && (
                  <div className="space-y-5 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-[#172033] dark:text-white">
                        {activeLesson.title}
                      </h3>
                      <span className="text-xs font-mono-num text-[#64748B] dark:text-slate-400">
                        {activeLesson.durationMinutes} min read/practice
                      </span>
                    </div>

                    <p className="text-sm text-[#172033] dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {activeLesson.summary}
                    </p>

                    <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
                        Key Takeaways
                      </p>
                      <ul className="list-disc pl-5 text-xs text-[#64748B] dark:text-slate-300 space-y-1">
                        {activeLesson.keyTakeaways.map((kt, i) => (
                          <li key={i}>{kt}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-[#CCFBF1] dark:border-teal-900 space-y-1.5">
                      <p className="text-xs font-bold text-[#14243A] dark:text-teal-300">
                        Hands-On Practice Prompt
                      </p>
                      <p className="text-xs text-[#172033] dark:text-slate-200 leading-relaxed">
                        {activeLesson.practicePrompt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleLessonComplete(activePath, activeLesson.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border ${
                          activeCompletedSet.has(activeLesson.id)
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-[#16A34A] text-[#16A34A] dark:text-emerald-300'
                            : 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
                        }`}
                      >
                        {activeCompletedSet.has(activeLesson.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span>
                          {activeCompletedSet.has(activeLesson.id)
                            ? 'Completed (Click to Undo)'
                            : 'Mark Lesson Complete'}
                        </span>
                      </button>

                      {activeLesson.externalResourceURL && (
                        <a
                          href={activeLesson.externalResourceURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D9488] dark:text-teal-300 hover:underline"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{activeLesson.externalResourceLabel || 'Official Reference Docs'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-12 text-center">
                <p className="text-sm text-[#64748B] dark:text-slate-400">
                  Select a skill path to start learning.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
