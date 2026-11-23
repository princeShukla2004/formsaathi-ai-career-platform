import React, { useEffect, useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createUserNotification,
  fetchAllUsersAdmin,
  logAdminAction,
} from '../../services/firestoreService';
import type { NotificationItem, UserProfile } from '../../types';

export function AdminNotificationsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [targetMode, setTargetMode] = useState<'single' | 'all_active'>('single');
  const [targetUid, setTargetUid] = useState('');
  const [type, setType] = useState<NotificationItem['type']>('matching_job');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('/jobs');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchAllUsersAdmin()
      .then((list) => {
        setUsers(list);
        if (list.length > 0) setTargetUid(list[0].uid);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !message.trim()) return;
    setSending(true);
    setFeedback('');

    try {
      const recipients =
        targetMode === 'all_active'
          ? users.filter((u) => u.status === 'active')
          : users.filter((u) => u.uid === targetUid);

      if (recipients.length === 0) {
        setFeedback('No eligible recipients found.');
        return;
      }

      let sentCount = 0;
      for (const recipient of recipients) {
        await createUserNotification(recipient.uid, {
          type,
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || '/dashboard/notifications',
        });
        sentCount += 1;
      }

      await logAdminAction(
        user.uid,
        user.email || '',
        'SEND_NOTIFICATION',
        targetMode === 'all_active' ? 'all_active_users' : targetUid,
        `Delivered ${sentCount} in-app notification(s): ${title.trim()}`
      );

      setTitle('');
      setMessage('');
      setFeedback(`Delivered notification to ${sentCount} candidate account(s).`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to deliver notifications.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          Notification Management
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Dispatch verified deadline alerts, job updates, or account advisories to candidate dashboards.
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#CCFBF1]/40 dark:bg-teal-950/30 border border-[#14B8A6]/40 text-xs text-[#0F766E] dark:text-teal-300">
          {feedback}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Bell className="w-4 h-4 text-[#14B8A6]" /> Compose In-App Notification
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              Audience
            </label>
            <select
              value={targetMode}
              onChange={(e) => setTargetMode(e.target.value as 'single' | 'all_active')}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            >
              <option value="single">Single Candidate</option>
              <option value="all_active">All Active Candidates ({users.filter((u) => u.status === 'active').length})</option>
            </select>
          </div>

          {targetMode === 'single' && (
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
                Select Recipient
              </label>
              <select
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value)}
                disabled={loading || users.length === 0}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
              >
                {users.length === 0 ? (
                  <option value="">No registered users loaded</option>
                ) : (
                  users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.email})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              Notification Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NotificationItem['type'])}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            >
              <option value="matching_job">Matching Job Alert</option>
              <option value="deadline">Deadline Reminder</option>
              <option value="interview">Interview Update</option>
              <option value="follow_up">Application Follow-Up</option>
              <option value="resume">Resume Guidance</option>
              <option value="account">Account Notice</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              Destination Path
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/jobs"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
            Title *
          </label>
          <input
            type="text"
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Official SSC notification dates updated"
            className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
            Message *
          </label>
          <textarea
            rows={4}
            required
            maxLength={600}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a concise, helpful notification message..."
            className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || users.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Sending...' : 'Send Notification'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
