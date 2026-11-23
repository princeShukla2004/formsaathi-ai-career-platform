import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, FileText, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  deleteResumeRecord,
  fetchUserResumes,
  saveResumeRecord,
} from '../../services/firestoreService';
import type { ResumeRecord } from '../../types';

export function ResumeManagerPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    fetchUserResumes(user.uid)
      .then(setResumes)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDuplicate = async (r: ResumeRecord) => {
    if (!user) return;
    await saveResumeRecord(user.uid, {
      ...r,
      id: undefined,
      title: `${r.title} (Copy)`,
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Resume Manager</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Manage your saved ATS resumes and export selectable-text PDFs.
          </p>
        </div>
        <Link
          to="/resume-studio"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          <Plus className="w-4 h-4" /> Create Resume
        </Link>
      </div>

      {loading ? (
        <div className="h-40 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : resumes.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <FileText className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm text-[#64748B]">No saved resumes yet.</p>
          <Link
            to="/resume-studio"
            className="inline-block px-4 py-2 text-xs font-semibold bg-[#14243A] text-white rounded-lg"
          >
            Open Resume Studio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold">{r.title}</h2>
                  <p className="text-xs text-[#64748B] capitalize">
                    Template: {r.template.replace('_', ' ')}
                  </p>
                </div>
                <span className="text-xs font-mono-num text-[#64748B]">
                  {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
                <Link
                  to={`/resume-studio?resumeId=${r.id}`}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                >
                  Edit / Export PDF
                </Link>
                <button
                  type="button"
                  onClick={() => handleDuplicate(r)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;
                    await deleteResumeRecord(user.uid, r.id);
                    setResumes((p) => p.filter((x) => x.id !== r.id));
                  }}
                  className="ml-auto p-1.5 text-[#DC2626]"
                  aria-label="Delete resume"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
