import React, { useEffect, useState } from 'react';
import { BellPlus, ExternalLink, Kanban, Plus, Search, Table2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createApplicationRecord,
  createUserNotification,
  deleteApplicationRecord,
  fetchUserApplications,
  updateApplicationRecord,
} from '../../services/firestoreService';
import type { ApplicationRecord, ApplicationStatus } from '../../types';

const STATUSES: ApplicationStatus[] = [
  'Saved',
  'Planning to Apply',
  'Applied',
  'Assessment',
  'Interview',
  'Selected',
  'Rejected',
  'Withdrawn',
];

export function ApplicationsPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [reminderNotice, setReminderNotice] = useState('');

  const [newForm, setNewForm] = useState({
    jobTitle: '',
    organization: '',
    status: 'Planning to Apply' as ApplicationStatus,
    appliedAt: '',
    deadline: '',
    interviewDate: '',
    followUpDate: '',
    applicationURL: '',
    notes: '',
  });

  const loadApps = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserApplications(user.uid);
      setApps(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) return;
    await createApplicationRecord(user.uid, newForm);
    setNewForm({
      jobTitle: '',
      organization: '',
      status: 'Planning to Apply',
      appliedAt: '',
      deadline: '',
      interviewDate: '',
      followUpDate: '',
      applicationURL: '',
      notes: '',
    });
    setShowAdd(false);
    await loadApps();
  };

  const handleStatusChange = async (appId: string, status: ApplicationStatus) => {
    if (!user) return;
    await updateApplicationRecord(user.uid, appId, { status });
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
  };

  const handleCreateReminder = async (app: ApplicationRecord) => {
    if (!user) return;
    await createUserNotification(user.uid, {
      type: app.interviewDate ? 'interview' : 'deadline',
      title: `Reminder: ${app.jobTitle}`,
      message: `Follow up on your ${app.status} application with ${app.organization}${
        app.deadline ? ` (Deadline: ${app.deadline})` : ''
      }.`,
      link: '/dashboard/applications',
    });
    setReminderNotice(`In-app reminder added to Notifications for "${app.jobTitle}".`);
  };

  const filtered = apps.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        a.jobTitle.toLowerCase().includes(q) || a.organization.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
            Application Tracker
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Manually track applications you submitted on official portals. FormSaathi never claims auto-submission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#131E30] text-[#172033] dark:text-white shadow-sm'
                  : 'text-[#64748B]'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-[#131E30] text-[#172033] dark:text-white shadow-sm'
                  : 'text-[#64748B]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Board
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>
      </div>

      {/* Summary Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tracked', val: apps.length },
          { label: 'Applied', val: apps.filter((a) => a.status === 'Applied').length },
          { label: 'Interviews', val: apps.filter((a) => a.status === 'Interview').length },
          { label: 'Selected', val: apps.filter((a) => a.status === 'Selected').length },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4"
          >
            <p className="text-xs text-[#64748B] dark:text-slate-400">{s.label}</p>
            <p className="text-xl font-bold font-mono-num mt-1">{s.val}</p>
          </div>
        ))}
      </div>

      {reminderNotice && (
        <p className="text-xs font-medium text-[#16A34A]">{reminderNotice}</p>
      )}

      {/* Add Form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-sm font-bold">Add Tracked Application</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              value={newForm.jobTitle}
              onChange={(e) => setNewForm({ ...newForm, jobTitle: e.target.value })}
              placeholder="Job Title *"
              className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
            <input
              required
              value={newForm.organization}
              onChange={(e) => setNewForm({ ...newForm, organization: e.target.value })}
              placeholder="Organization / Company *"
              className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
            <select
              value={newForm.status}
              onChange={(e) =>
                setNewForm({ ...newForm, status: e.target.value as ApplicationStatus })
              }
              className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[#64748B] mb-1">Deadline</label>
              <input
                type="date"
                value={newForm.deadline}
                onChange={(e) => setNewForm({ ...newForm, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1">Applied Date</label>
              <input
                type="date"
                value={newForm.appliedAt}
                onChange={(e) => setNewForm({ ...newForm, appliedAt: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1">Interview Date</label>
              <input
                type="date"
                value={newForm.interviewDate}
                onChange={(e) => setNewForm({ ...newForm, interviewDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1">Official URL</label>
              <input
                type="url"
                value={newForm.applicationURL}
                onChange={(e) => setNewForm({ ...newForm, applicationURL: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
          <textarea
            rows={2}
            value={newForm.notes}
            onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
            placeholder="Application ID / notes (do not store passwords)..."
            className="w-full p-2.5 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              Save Application
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filter by role or organization..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Views */}
      {loading ? (
        <div className="h-48 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center text-sm text-[#64748B]">
          No applications found. Click &ldquo;Add Application&rdquo; to track your first opportunity.
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] dark:border-slate-800 text-xs text-[#64748B]">
              <tr>
                <th className="py-3 px-4 font-semibold">Role &amp; Organization</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Deadline</th>
                <th className="py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="font-semibold text-left hover:text-[#0D9488]"
                    >
                      {app.jobTitle}
                    </button>
                    <p className="text-xs text-[#64748B]">{app.organization}</p>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={app.status}
                      onChange={(e) =>
                        handleStatusChange(app.id, e.target.value as ApplicationStatus)
                      }
                      className="px-2 py-1 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono-num text-[#64748B]">
                    {app.deadline || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateReminder(app)}
                        title="Create reminder notification"
                        className="p-1.5 text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded"
                      >
                        <BellPlus className="w-4 h-4" />
                      </button>
                      {app.applicationURL && (
                        <a
                          href={app.applicationURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#64748B] hover:text-[#172033]"
                          title="Open Official URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!user) return;
                          await deleteApplicationRecord(user.uid, app.id);
                          setApps((p) => p.filter((x) => x.id !== app.id));
                        }}
                        className="p-1.5 text-[#DC2626]"
                        aria-label="Delete application"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((st) => {
            const colItems = filtered.filter((a) => a.status === st);
            return (
              <div
                key={st}
                className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{st}</span>
                  <span className="font-mono-num text-[#64748B]">{colItems.length}</span>
                </div>
                <div className="space-y-2.5">
                  {colItems.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 space-y-2 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="font-semibold text-left hover:text-[#0D9488] block"
                      >
                        {app.jobTitle}
                      </button>
                      <p className="text-[#64748B]">{app.organization}</p>
                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(app.id, e.target.value as ApplicationStatus)
                        }
                        className="w-full px-2 py-1 text-[11px] bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                      >
                        {STATUSES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer / Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">{selectedApp.jobTitle}</h2>
            <p className="text-sm text-[#64748B]">{selectedApp.organization}</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#64748B]">Status:</span>{' '}
                <strong>{selectedApp.status}</strong>
              </div>
              <div>
                <span className="text-[#64748B]">Deadline:</span>{' '}
                <strong className="font-mono-num">{selectedApp.deadline || '—'}</strong>
              </div>
              <div>
                <span className="text-[#64748B]">Applied:</span>{' '}
                <strong className="font-mono-num">{selectedApp.appliedAt || '—'}</strong>
              </div>
              <div>
                <span className="text-[#64748B]">Interview:</span>{' '}
                <strong className="font-mono-num">{selectedApp.interviewDate || '—'}</strong>
              </div>
            </div>
            {selectedApp.notes && (
              <p className="text-xs bg-[#F8FAFC] dark:bg-[#0B1320] p-3 rounded-lg whitespace-pre-line">
                {selectedApp.notes}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleCreateReminder(selectedApp)}
                className="px-3 py-1.5 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] rounded-lg"
              >
                Create Reminder
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-[#14243A] text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
