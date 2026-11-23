import { useEffect, useState } from 'react';
import { MessageSquarePlus, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchUserFeedbackAdmin,
  updateUserFeedbackAdmin,
} from '../../services/firestoreService';
import { StatusBadge } from '../../components/ui/UIComponents';
import type { UserFeedbackRecord } from '../../types';

export function AdminFeedbackPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserFeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    fetchUserFeedbackAdmin()
      .then((list) => {
        setItems(list);
        const notes: Record<string, string> = {};
        list.forEach((f) => {
          notes[f.id] = f.adminNote || '';
        });
        setNoteEdits(notes);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white flex items-center gap-2">
          <MessageSquarePlus className="w-6 h-6 text-[#0D9488]" />
          <span>User Product Feedback Moderation</span>
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Review candidate feedback submitted across AI Tools, Mock Tests, Job Accuracy, and Feature Ideas.
        </p>
      </div>

      {loading ? (
        <div className="h-40 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center text-sm text-[#64748B]">
          No user feedback submitted yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((fb) => (
            <div
              key={fb.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#14243A] dark:text-white">{fb.name}</span>
                    <span className="text-[#0D9488] font-semibold">· {fb.category}</span>
                    <span className="inline-flex items-center gap-0.5 text-[#F59E0B] font-mono-num">
                      <Star className="w-3.5 h-3.5 fill-current" /> {fb.rating}/5
                    </span>
                    <StatusBadge
                      label={fb.status}
                      tone={
                        fb.status === 'resolved'
                          ? 'verified'
                          : fb.status === 'reviewed'
                            ? 'info'
                            : 'warning'
                      }
                    />
                  </div>
                  <p className="text-[#64748B] dark:text-slate-400">{fb.email}</p>
                </div>

                <select
                  value={fb.status}
                  onChange={async (e) => {
                    if (!user) return;
                    await updateUserFeedbackAdmin(
                      user.uid,
                      user.email || '',
                      fb.id,
                      e.target.value as UserFeedbackRecord['status'],
                      noteEdits[fb.id]
                    );
                    load();
                  }}
                  aria-label="Feedback status"
                  className="px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  <option value="open">Open</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <p className="text-sm text-[#172033] dark:text-slate-200 leading-relaxed">{fb.message}</p>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Optional admin moderation note..."
                  value={noteEdits[fb.id] || ''}
                  onChange={(e) => setNoteEdits((prev) => ({ ...prev, [fb.id]: e.target.value }))}
                  className="flex-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;
                    await updateUserFeedbackAdmin(
                      user.uid,
                      user.email || '',
                      fb.id,
                      fb.status,
                      noteEdits[fb.id]
                    );
                    load();
                  }}
                  className="px-3 py-1.5 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                >
                  Save Note
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
