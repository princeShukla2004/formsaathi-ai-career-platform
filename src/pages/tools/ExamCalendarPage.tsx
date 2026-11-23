import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  List,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchExamEvents,
  fetchSavedExams,
  removeSavedExamReminder,
  saveExamReminder,
} from '../../services/firestoreService';
import { StatusBadge } from '../../components/ui/UIComponents';
import type { ExamCategoryType, ExamEvent, SavedExamReminder } from '../../types';

const EXAM_CATEGORIES: Array<'All' | ExamCategoryType> = [
  'All',
  'UPSC',
  'SSC',
  'Banking',
  'Railway',
  'Engineering',
  'State Govt',
  'Defence',
  'Teaching',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseDateIfISO(str?: string): Date | null {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
    const d = new Date(`${str.trim()}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function ExamCalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [savedExams, setSavedExams] = useState<SavedExamReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'month'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ExamCategoryType>('All');
  const [statusMessage, setStatusMessage] = useState('');

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());

  useEffect(() => {
    setLoading(true);
    fetchExamEvents(false)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSavedExams(user.uid).then(setSavedExams).catch(() => {});
  }, [user]);

  const savedSet = useMemo(() => new Set(savedExams.map((s) => s.examId)), [savedExams]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (categoryFilter !== 'All' && ev.category !== categoryFilter) return false;
      if (q) {
        const hay = `${ev.title} ${ev.organization} ${ev.category} ${ev.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, searchQuery, categoryFilter]);

  const toggleSaveReminder = async (ev: ExamEvent) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!user.emailVerified) {
      navigate('/dashboard/security');
      return;
    }
    const safeId = ev.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
    if (savedSet.has(safeId)) {
      await removeSavedExamReminder(user.uid, ev.id);
      setSavedExams((prev) => prev.filter((s) => s.examId !== safeId));
      setStatusMessage(`Removed "${ev.title}" from your saved exam reminders.`);
    } else {
      await saveExamReminder(user.uid, ev);
      const refreshed = await fetchSavedExams(user.uid);
      setSavedExams(refreshed);
      setStatusMessage(`Saved "${ev.title}" and added an exam reminder notification.`);
    }
  };

  // Monthly grid computation
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarCells = Array.from({ length: firstDayOfWeek + daysInMonth }, (_, i) =>
    i < firstDayOfWeek ? null : i - firstDayOfWeek + 1
  );

  const monthDatedEvents = useMemo(() => {
    return filteredEvents.filter((ev) => {
      const d = parseDateIfISO(ev.examDate) || parseDateIfISO(ev.lastDate);
      return d && d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
    });
  }, [filteredEvents, calendarYear, calendarMonth]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
            Official Calendar Reference
          </p>
          <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
            Government Exam Calendar
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-2xl">
            Track verified UPSC, SSC, IBPS Banking, Railway RRB, ISRO/GATE, NDA/CDS, and State PSC notification windows, official schedules, and reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border ${
              viewMode === 'list'
                ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] dark:border-[#14B8A6]'
                : 'border-[#E2E8F0] dark:border-slate-700'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Schedule List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border ${
              viewMode === 'month'
                ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] dark:border-[#14B8A6]'
                : 'border-[#E2E8F0] dark:border-slate-700'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Month Grid</span>
          </button>
        </div>
      </div>

      {/* Transparency Banner */}
      <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
        <Info className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
        <span>
          <strong>Official Calendar Reference:</strong> Recruiting commissions periodically revise exam dates or application deadlines. Always confirm final dates directly on the official portal linked on each card before submitting fees.
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UPSC, SSC CGL, IBPS PO, Railway, GATE..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'All' | ExamCategoryType)}
            aria-label="Exam category filter"
            className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            {EXAM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Exam Categories' : c}
              </option>
            ))}
          </select>
        </div>

        {statusMessage && (
          <p className="text-xs font-medium text-[#16A34A] dark:text-emerald-400">{statusMessage}</p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'month' ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
              {MONTHS[calendarMonth]} {calendarYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (calendarMonth === 0) {
                    setCalendarMonth(11);
                    setCalendarYear((y) => y - 1);
                  } else {
                    setCalendarMonth((m) => m - 1);
                  }
                }}
                aria-label="Previous month"
                className="p-2 border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (calendarMonth === 11) {
                    setCalendarMonth(0);
                    setCalendarYear((y) => y + 1);
                  } else {
                    setCalendarMonth((m) => m + 1);
                  }
                }}
                aria-label="Next month"
                className="p-2 border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[#64748B] dark:text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <div key={`empty_${idx}`} className="min-h-[78px] rounded-lg bg-slate-50/40 dark:bg-slate-900/20" />;
              }
              const dayEvents = monthDatedEvents.filter((ev) => {
                const d = parseDateIfISO(ev.examDate) || parseDateIfISO(ev.lastDate);
                return d?.getDate() === day;
              });
              return (
                <div
                  key={day}
                  className="min-h-[78px] p-2 rounded-lg border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1320] flex flex-col justify-between"
                >
                  <span className="text-xs font-mono-num font-semibold text-[#64748B] dark:text-slate-400">
                    {day}
                  </span>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => (
                      <a
                        key={ev.id}
                        href={ev.officialURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#14243A] truncate"
                        title={ev.title}
                      >
                        {ev.category}: {ev.title}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Showing exact ISO-dated exams for {MONTHS[calendarMonth]} {calendarYear}. Switch to Schedule List to view all annual calendar cycles and tentative official notices.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((ev) => {
            const safeId = ev.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
            const isSaved = savedSet.has(safeId);
            return (
              <article
                key={ev.id}
                className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#0D9488] dark:text-teal-300">
                      {ev.category} · Official Calendar Reference
                    </span>
                    <StatusBadge
                      label={ev.notificationStatus}
                      tone={
                        ev.notificationStatus === 'Active'
                          ? 'verified'
                          : ev.notificationStatus === 'Closed'
                            ? 'danger'
                            : ev.notificationStatus === 'Upcoming Cycle'
                              ? 'warning'
                              : 'info'
                      }
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-[#14243A] dark:text-white leading-snug">
                      {ev.title}
                    </h2>
                    <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mt-0.5">
                      {ev.organization}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                    <div>
                      <dt className="text-[#64748B] dark:text-slate-400">Application Window</dt>
                      <dd className="font-medium text-[#172033] dark:text-slate-200 mt-0.5">
                        {ev.applicationStartDate || 'See annual calendar'}
                        {ev.lastDate ? ` — ${ev.lastDate}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#64748B] dark:text-slate-400">Exam / Schedule</dt>
                      <dd className="font-medium text-[#172033] dark:text-slate-200 mt-0.5 font-mono-num">
                        {ev.examDate || 'Official notice pending'}
                      </dd>
                    </div>
                  </dl>

                  {ev.notes && (
                    <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed">
                      {ev.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 text-xs">
                  <span className="text-[#64748B] dark:text-slate-400 font-mono-num">
                    Checked: {ev.lastVerifiedAt}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSaveReminder(ev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg border transition-colors ${
                        isSaved
                          ? 'bg-[#CCFBF1] text-[#14243A] border-[#14B8A6]'
                          : 'border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isSaved ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                      <span>{isSaved ? 'Reminder Saved' : 'Save Reminder'}</span>
                    </button>
                    <a
                      href={ev.officialURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                    >
                      <span>Official Site</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
