import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchJobReportsAdmin,
  fetchSupportTicketsAdmin,
  updateJobReportAdmin,
  updateSupportTicketStatusAdmin,
} from '../../services/firestoreService';
import type { JobReport, SupportTicket } from '../../types';

export function AdminReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<JobReport[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchJobReportsAdmin().catch(() => []),
      fetchSupportTicketsAdmin().catch(() => []),
    ])
      .then(([r, t]) => {
        setReports(r);
        setTickets(t);
        const noteMap: Record<string, string> = {};
        r.forEach((rep) => {
          noteMap[rep.id] = rep.adminNote || '';
        });
        setNotes(noteMap);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          Reported Jobs, Safety Flags &amp; Support Tickets
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Investigate scam warning indicators, outdated portals, and candidate support inquiries.
        </p>
      </div>

      {loading ? (
        <div className="h-40 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-base font-bold">Job &amp; Safety Reports ({reports.length})</h2>
            {reports.length === 0 ? (
              <p className="text-sm text-[#64748B]">No job reports submitted.</p>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#14243A] dark:text-white">
                        {rep.jobTitle || rep.jobId}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-slate-300 mt-0.5">{rep.reason}</p>
                    </div>
                    <select
                      value={rep.status}
                      onChange={async (e) => {
                        if (!user) return;
                        await updateJobReportAdmin(
                          user.uid,
                          user.email || '',
                          rep.id,
                          e.target.value as JobReport['status'],
                          notes[rep.id]
                        );
                        load();
                      }}
                      aria-label="Report status"
                      className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg self-start"
                    >
                      <option value="open">Open</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>

                  {rep.warningIndicators && rep.warningIndicators.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
                      <span>
                        <strong>Flagged Indicators:</strong> {rep.warningIndicators.join(' · ')}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Moderation note (saved with audit trail)..."
                      value={notes[rep.id] || ''}
                      onChange={(e) => setNotes((p) => ({ ...p, [rep.id]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) return;
                        await updateJobReportAdmin(
                          user.uid,
                          user.email || '',
                          rep.id,
                          rep.status,
                          notes[rep.id]
                        );
                        load();
                      }}
                      className="px-3 py-1.5 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold">Support Tickets ({tickets.length})</h2>
            {tickets.length === 0 ? (
              <p className="text-sm text-[#64748B]">No support tickets yet.</p>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{t.subject}</p>
                      <p className="text-xs text-[#64748B]">
                        {t.name} ({t.email})
                      </p>
                    </div>
                    <select
                      value={t.status}
                      onChange={async (e) => {
                        await updateSupportTicketStatusAdmin(
                          t.id,
                          e.target.value as SupportTicket['status']
                        );
                        load();
                      }}
                      aria-label="Ticket status"
                      className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-slate-300">{t.message}</p>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
