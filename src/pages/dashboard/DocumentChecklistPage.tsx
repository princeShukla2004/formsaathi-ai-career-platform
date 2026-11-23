import React, { useEffect, useState } from 'react';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { CheckSquare, FileCheck2, Plus, Square, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/firebase';
import {
  deleteDocumentChecklist,
  fetchDocumentChecklists,
  saveDocumentChecklist,
} from '../../services/firestoreService';
import type { DocumentChecklist, DocumentChecklistItem } from '../../types';

const STANDARD_ITEMS: DocumentChecklistItem[] = [
  {
    id: 'doc_resume',
    name: 'Updated ATS Resume (PDF)',
    completed: false,
    specs: 'A4 Single or Two-Page Selectable PDF',
    allowedFormats: 'application/pdf',
    maxSizeLabel: 'Max 2 MB',
    guidance: 'Export cleanly from FormSaathi Resume Studio.',
  },
  {
    id: 'doc_photo',
    name: 'Passport-Size Photograph',
    completed: false,
    specs: '200×230 px (3.5×4.5 cm), plain white background',
    allowedFormats: 'JPEG / PNG',
    maxSizeLabel: '20 KB – 50 KB for Govt forms (up to 5 MB here)',
    guidance: 'Ensure face covers 70–80% of the frame without glare or shadows.',
  },
  {
    id: 'doc_sig',
    name: 'Scanned Signature',
    completed: false,
    specs: '140×60 px, black ink on plain white paper',
    allowedFormats: 'JPEG / PNG',
    maxSizeLabel: '10 KB – 20 KB for Govt forms',
    guidance: 'Sign cleanly inside a white box; avoid capital-letter-only signatures.',
  },
  {
    id: 'doc_edu',
    name: 'Educational Certificates & Mark Sheets (10th, 12th, Degree)',
    completed: false,
    specs: '150–300 DPI legible scan',
    allowedFormats: 'PDF',
    maxSizeLabel: 'Max 5 MB',
    guidance: 'Keep Class 10th certificate handy for Date of Birth verification.',
  },
  {
    id: 'doc_id',
    name: 'Identity Document (for exam centre verification)',
    completed: false,
    specs: 'Original carried to exam; avoid storing sensitive IDs unnecessarily',
    allowedFormats: 'PDF / JPEG',
    maxSizeLabel: 'Max 5 MB',
    guidance: 'Optional: track readiness here without uploading sensitive ID numbers unless needed.',
  },
  {
    id: 'doc_cat',
    name: 'Experience / Category Certificate (if applicable)',
    completed: false,
    specs: 'Central Govt prescribed format for OBC/EWS/SC/ST/PwBD',
    allowedFormats: 'PDF',
    maxSizeLabel: 'Max 5 MB',
    guidance: 'Verify financial-year validity for EWS and non-creamy layer OBC certificates.',
  },
];

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function DocumentChecklistPage() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<DocumentChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const load = () => {
    if (!user) return;
    fetchDocumentChecklists(user.uid)
      .then(setChecklists)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) return;
    const title = newTitle.trim() || 'Standard Application Readiness Checklist';
    await saveDocumentChecklist(user.uid, {
      title,
      items: STANDARD_ITEMS.map((item) => ({ ...item, id: `${item.id}_${Date.now()}` })),
    });
    setNewTitle('');
    load();
  };

  const toggleItem = async (chk: DocumentChecklist, itemId: string) => {
    if (!user) return;
    const updatedItems = chk.items.map((it) =>
      it.id === itemId ? { ...it, completed: !it.completed } : it
    );
    setChecklists((prev) =>
      prev.map((c) => (c.id === chk.id ? { ...c, items: updatedItems } : c))
    );
    await saveDocumentChecklist(user.uid, {
      id: chk.id,
      title: chk.title,
      jobId: chk.jobId,
      items: updatedItems,
    });
  };

  const handleFileUpload = async (
    chk: DocumentChecklist,
    item: DocumentChecklistItem,
    file: File
  ) => {
    if (!user || !user.emailVerified) return;
    setErrorMsg('');
    setUploadNotice('');

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMsg('Only PDF, JPEG, and PNG files are permitted.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMsg('File exceeds the 5 MB maximum upload limit.');
      return;
    }

    const safeFileName = `${item.id}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `users/${user.uid}/documents/${safeFileName}`;
    try {
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: file.type });

      const updatedItems = chk.items.map((it) =>
        it.id === item.id
          ? {
              ...it,
              completed: true,
              uploadedFileName: file.name,
              uploadedFilePath: storagePath,
              uploadedAt: new Date().toISOString(),
            }
          : it
      );
      await saveDocumentChecklist(user.uid, {
        id: chk.id,
        title: chk.title,
        jobId: chk.jobId,
        items: updatedItems,
      });
      setChecklists((prev) =>
        prev.map((c) => (c.id === chk.id ? { ...c, items: updatedItems } : c))
      );
      setUploadNotice(`"${file.name}" uploaded privately under your owner-only storage path.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Private storage upload could not complete (${err.message}). Ensure Firebase Storage & storage.rules are enabled in Firebase Console.`
          : 'Upload failed.'
      );
    }
  };

  const handleDeleteUploadedFile = async (
    chk: DocumentChecklist,
    item: DocumentChecklistItem
  ) => {
    if (!user || !item.uploadedFilePath) return;
    try {
      await deleteObject(ref(storage, item.uploadedFilePath)).catch(() => undefined);
      const updatedItems = chk.items.map((it) =>
        it.id === item.id
          ? { ...it, uploadedFileName: undefined, uploadedFilePath: undefined, uploadedAt: undefined }
          : it
      );
      await saveDocumentChecklist(user.uid, {
        id: chk.id,
        title: chk.title,
        jobId: chk.jobId,
        items: updatedItems,
      });
      setChecklists((prev) =>
        prev.map((c) => (c.id === chk.id ? { ...c, items: updatedItems } : c))
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete file.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Document Assistant</h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Prepare application documents with photo/signature specifications. Uploads are strictly private (PDF/JPEG/PNG, max 5 MB).
        </p>
      </div>

      <form
        onSubmit={handleCreateChecklist}
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Checklist title (e.g. SSC CGL 2026 Document Kit)..."
          className="flex-1 px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          <Plus className="w-4 h-4" /> Create Checklist
        </button>
      </form>

      {uploadNotice && <p className="text-xs font-medium text-[#16A34A]">{uploadNotice}</p>}
      {errorMsg && <p className="text-xs font-medium text-[#DC2626]">{errorMsg}</p>}

      {loading ? (
        <div className="h-44 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : checklists.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
          <FileCheck2 className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm text-[#64748B]">
            Create a checklist above, or click &ldquo;Generate Document Checklist&rdquo; on any Job Details page.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {checklists.map((chk) => {
            const doneCount = chk.items.filter((i) => i.completed).length;
            return (
              <section
                key={chk.id}
                className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-bold">{chk.title}</h2>
                    <p className="text-xs font-mono-num text-[#64748B]">
                      {doneCount} of {chk.items.length} documents ready
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) return;
                      await deleteDocumentChecklist(user.uid, chk.id);
                      setChecklists((p) => p.filter((x) => x.id !== chk.id));
                    }}
                    className="p-1.5 text-[#DC2626]"
                    aria-label="Delete checklist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                  {chk.items.map((item) => (
                    <div key={item.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleItem(chk, item.id)}
                          className="mt-0.5 text-[#0D9488]"
                          aria-label="Toggle document completion"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-[#64748B]" />
                          )}
                        </button>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              item.completed ? 'line-through text-[#64748B]' : ''
                            }`}
                          >
                            {item.name}
                          </p>
                          <p className="text-xs text-[#64748B] dark:text-slate-400">
                            {item.specs} · {item.allowedFormats} · {item.maxSizeLabel}
                          </p>
                          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                            {item.guidance}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-8 md:pl-0">
                        {item.uploadedFileName ? (
                          <div className="flex items-center gap-2 text-xs text-[#16A34A]">
                            <span className="truncate max-w-[160px]">{item.uploadedFileName}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteUploadedFile(chk, item)}
                              className="text-[#DC2626] underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Private Upload</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(chk, item, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
