import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  markAllNotificationsRead,
  markNotificationRead,
  updateUserProfileRecord,
} from '../../services/firestoreService';

export function NotificationsPage() {
  const { user, profile, notifications, refreshProfile } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const prefs = profile?.notificationPrefs || {
    matchingJobs: true,
    deadlines: true,
    interviews: true,
    resumeReminders: true,
  };

  const togglePref = async (key: keyof typeof prefs) => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      await updateUserProfileRecord(user.uid, {
        notificationPrefs: { ...prefs, [key]: !prefs[key] },
      });
      await refreshProfile();
    } finally {
      setSavingPrefs(false);
    }
  };

  const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Notifications</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            In-app reminders for deadlines, interviews, matching opportunities, and account alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded ${filter === 'all' ? 'bg-white dark:bg-[#131E30] font-semibold' : ''}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded ${filter === 'unread' ? 'bg-white dark:bg-[#131E30] font-semibold' : ''}`}
            >
              Unread
            </button>
          </div>
          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={() => user && markAllNotificationsRead(user.uid, notifications)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Job Alerts Banner */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-[#14243A] dark:text-white">
              Job Alerts &amp; Simulated Email Digest
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Subscribe to preferred job categories ({profile?.preferredCategories?.length || 0} active) and preview formatted in-app alert emails.
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/job-alerts"
          className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          Configure Job Alerts
        </Link>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-bold mb-3">In-App Notification Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {(
            [
              ['matchingJobs', 'New matching jobs'],
              ['deadlines', 'Upcoming deadlines'],
              ['interviews', 'Interview reminders'],
              ['resumeReminders', 'Resume updates'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={savingPrefs}
                checked={prefs[k]}
                onChange={() => togglePref(k)}
                className="rounded border-slate-300"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
          <Bell className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm text-[#64748B]">
            No notifications right now. Create reminders directly from your Application Tracker.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((n) => (
            <div
              key={n.id}
              className={`bg-white dark:bg-[#131E30] border rounded-xl p-5 flex items-start justify-between gap-4 ${
                n.read
                  ? 'border-[#E2E8F0] dark:border-slate-800 opacity-80'
                  : 'border-[#14B8A6]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <span className="capitalize font-medium text-[#0D9488]">
                    {n.type === 'matching_job'
                      ? 'Simulated Email · Matching Job'
                      : n.type.replace('_', ' ')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Now'}
                  </span>
                </div>
                <h3 className="text-sm font-bold">{n.title}</h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400">{n.message}</p>
                {n.link && (
                  <Link to={n.link} className="inline-block text-xs font-semibold text-[#0D9488] hover:underline pt-1">
                    Open related page
                  </Link>
                )}
              </div>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => user && markNotificationRead(user.uid, n.id)}
                  className="text-xs font-medium text-[#0D9488] hover:underline whitespace-nowrap"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
