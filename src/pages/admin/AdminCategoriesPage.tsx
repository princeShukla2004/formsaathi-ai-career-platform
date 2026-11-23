import React, { useEffect, useState } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_CATEGORIES } from '../../data/officialStarterCatalog';
import {
  deleteCategoryAdmin,
  fetchAllCategoriesAdmin,
  logAdminAction,
  upsertCategoryAdmin,
} from '../../services/firestoreService';
import type { JobCategory, JobSector } from '../../types';

export function AdminCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [sector, setSector] = useState<JobSector | 'all'>('all');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadCategories = () => {
    setLoading(true);
    fetchAllCategoriesAdmin()
      .then((list) => setCategories(list))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !user) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      await upsertCategoryAdmin({
        slug: cleanSlug,
        name: name.trim(),
        nameHi: nameHi.trim(),
        sector,
        description: description.trim(),
        isActive,
      });
      await logAdminAction(
        user.uid,
        user.email || '',
        'UPSERT_CATEGORY',
        cleanSlug,
        `Saved category ${name.trim()}`
      );
      setSlug('');
      setName('');
      setNameHi('');
      setSector('all');
      setDescription('');
      setIsActive(true);
      setStatusMsg(`Category "${name.trim()}" saved to Firestore.`);
      loadCategories();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: JobCategory) => {
    if (!user) return;
    try {
      await upsertCategoryAdmin({
        slug: cat.slug,
        name: cat.name,
        nameHi: cat.nameHi,
        sector: cat.sector,
        description: cat.description,
        isActive: !cat.isActive,
      });
      await logAdminAction(
        user.uid,
        user.email || '',
        'TOGGLE_CATEGORY',
        cat.slug,
        `Set active=${!cat.isActive}`
      );
      loadCategories();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to toggle category.');
    }
  };

  const handleDelete = async (catSlug: string) => {
    if (!user) return;
    try {
      await deleteCategoryAdmin(catSlug);
      await logAdminAction(user.uid, user.email || '', 'DELETE_CATEGORY', catSlug, 'Deleted category');
      setStatusMsg(`Removed category ${catSlug}.`);
      loadCategories();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to delete category.');
    }
  };

  const handleSeedDefaults = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await upsertCategoryAdmin({
          slug: cat.slug,
          name: cat.name,
          nameHi: cat.nameHi,
          sector: cat.sector,
          description: cat.description || '',
          isActive: true,
        });
      }
      await logAdminAction(
        user.uid,
        user.email || '',
        'SEED_CATEGORIES',
        'categories',
        `Imported ${DEFAULT_CATEGORIES.length} starter categories`
      );
      setStatusMsg(`Imported ${DEFAULT_CATEGORIES.length} default Indian job categories.`);
      loadCategories();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
            Categories Management
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Organize bilingual job categories across Government, Private, and Internship sectors.
          </p>
        </div>
        {categories.length === 0 && !loading && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSeedDefaults}
            className="px-4 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg hover:bg-[#CCFBF1]/30"
          >
            Import Default Categories ({DEFAULT_CATEGORIES.length})
          </button>
        )}
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-[#CCFBF1]/40 dark:bg-teal-950/30 border border-[#14B8A6]/40 text-xs text-[#0F766E] dark:text-teal-300">
          {statusMsg}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4"
      >
        <h2 className="text-sm font-bold text-[#14243A] dark:text-white flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-[#14B8A6]" /> Add or Update Category
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              Category Name (English) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (!slug) {
                  setSlug(
                    v
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '')
                  );
                }
              }}
              placeholder="e.g. Railway Jobs"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              URL Slug *
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="railway-jobs"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320] font-mono-num"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              Hindi Label (Optional)
            </label>
            <input
              type="text"
              value={nameHi}
              onChange={(e) => setNameHi(e.target.value)}
              placeholder="रेलवे नौकरियां"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              Sector
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as JobSector | 'all')}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            >
              <option value="all">All Sectors</option>
              <option value="government">Government</option>
              <option value="private">Private</option>
              <option value="internship">Internship</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional summary shown to administrators"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-[#E2E8F0]"
              />
              Active
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-[#64748B]">Loading categories from Firestore...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B] dark:text-slate-400">
            No custom categories stored in Firestore yet. Public discovery falls back to default built-in categories until you import or create categories above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {categories.map((cat) => (
                  <tr key={cat.slug}>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#172033] dark:text-white">{cat.name}</p>
                      {cat.nameHi && <p className="text-[#64748B] dark:text-slate-400">{cat.nameHi}</p>}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-[#64748B] dark:text-slate-400">
                      {cat.slug}
                    </td>
                    <td className="py-3 px-4 capitalize">{cat.sector}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className={`font-semibold ${
                          cat.isActive ? 'text-[#16A34A]' : 'text-[#64748B]'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.slug)}
                        className="inline-flex items-center gap-1 text-red-600 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
