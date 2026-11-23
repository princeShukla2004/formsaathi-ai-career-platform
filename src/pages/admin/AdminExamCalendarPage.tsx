import React, { useEffect, useState } from 'react';
import { CalendarDays, Database, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_EXAM_EVENTS } from '../../data/platformDatasets';
import {
  deleteExamEventAdmin,
  fetchExamEvents,
  upsertExamEventAdmin,
} from '../../services/firestoreService';
import { ConfirmDialog, StatusBadge } from '../../components/ui/UIComponents';
import type { ExamCategoryType, ExamEvent } from '../../types';

const CATEGORIES: ExamCategoryType[] = [
  'UPSC',
  'SSC',
  'Banking',
  'Railway',
  'Engineering',
  'State Govt',
  'Defence',
  'Teaching',
];

export function AdminExamCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<ExamCategoryType>('SSC');
  const [notificationStatus, setNotificationStatus] = useState<ExamEvent['notificationStatus']>('Upcoming Cycle');
  const [applicationStartDate, setApplicationStartDate] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [examDate, setExamDate] = useState('');
  const [officialURL, setOfficialURL] = useState('https://');
  const [notes, setNotes] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const load = () => {
    setLoading(true);
    fetchExamEvents(true)
      .then(setEvents)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    setMsg('');
    try {
      let imported = 0;
      for (const ev of OFFICIAL_EXAM_EVENTS) {
        await upsertExamEventAdmin(user.uid, user.email || '', ev);
        imported += 1;
      }
      setMsg(`Synced ${imported} starter exam calendar records into Firestore.`);
      load();
    } finally {
      setSeeding(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await upsertExamEventAdmin(user.uid, user.email || '', {
      title,
      organization,
      category,
      notificationStatus,
      applicationStartDate,
      lastDate,
      examDate,
      officialURL,
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
      notes,
      isPublished,
    });
    setTitle('');
    setOrganization('');
    setApplicationStartDate('');
    setLastDate('');
    setExamDate('');
    setNotes('');
    setMsg('Exam event saved.');
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
            Exam Calendar Management
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Publish and update verified national &amp; state competitive exam dates and official links.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg"
        >
          <Database className="w-4 h-4" />
          <span>{seeding ? 'Syncing...' : 'Seed Official Exam Cycles'}</span>
        </button>
      </div>

      {msg && <p className="text-xs font-semibold text-[#16A34A]">{msg}</p>}

      <form
        onSubmit={handleCreate}
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-base font-bold flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#0D9488]" />
          <span>Add Exam Calendar Event</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <input
            type="text"
            required
            placeholder="Exam Title (e.g. SSC CGL 2026)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <input
            type="text"
            required
            placeholder="Conducting Organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExamCategoryType)}
            aria-label="Exam category"
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={notificationStatus}
            onChange={(e) => setNotificationStatus(e.target.value as ExamEvent['notificationStatus'])}
            aria-label="Notification status"
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <option value="Upcoming Cycle">Upcoming Cycle</option>
            <option value="Active">Active</option>
            <option value="Official Calendar Reference">Official Calendar Reference</option>
            <option value="Closed">Closed</option>
          </select>

          <input
            type="text"
            placeholder="Application Start (YYYY-MM-DD or window)"
            value={applicationStartDate}
            onChange={(e) => setApplicationStartDate(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <input
            type="text"
            placeholder="Last Date / Exam Date (YYYY-MM-DD)"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <input
            type="text"
            placeholder="Last Application Date"
            value={lastDate}
            onChange={(e) => setLastDate(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <input
            type="url"
            required
            placeholder="Official URL (https://...)"
            value={officialURL}
            onChange={(e) => setOfficialURL(e.target.value)}
            className="md:col-span-2 px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>
        <textarea
          rows={2}
          placeholder="Notes or official cycle disclaimer..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2.5 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        />
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-slate-300 text-[#14B8A6]"
            />
            <span>Publish immediately</span>
          </label>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            Save Exam Event
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#0D9488]" />
          <span>Firestore Exam Events ({events.length})</span>
        </h2>
        {loading ? (
          <div className="h-32 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
        ) : events.length === 0 ? (
          <p className="text-xs text-[#64748B]">
            No exam events in Firestore yet. Click "Seed Official Exam Cycles" above to import the starter calendar.
          </p>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{ev.title}</span>
                  <StatusBadge
                    label={ev.isPublished ? 'Active' : 'Draft'}
                    tone={ev.isPublished ? 'verified' : 'neutral'}
                  />
                </div>
                <p className="text-[#64748B] dark:text-slate-400 mt-0.5">
                  {ev.organization} · {ev.category} · Exam: {ev.examDate || ev.lastDate || 'TBD'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteId(ev.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[#DC2626] border border-red-200 dark:border-red-900 rounded-lg self-start sm:self-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Exam Event?"
        message="This removes the exam calendar entry from Firestore immediately."
        destructive
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (user && deleteId) {
            await deleteExamEventAdmin(user.uid, user.email || '', deleteId);
            setDeleteId(null);
            load();
          }
        }}
      />
    </div>
  );
}
