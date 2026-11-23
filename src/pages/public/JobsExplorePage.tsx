import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BellRing, Filter, RotateCcw, Search } from 'lucide-react';
import { JobAlertsSubscription } from '../../components/JobAlertsSubscription';
import { JobCard } from '../../components/JobCard';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchCategories, fetchVerifiedJobs } from '../../services/firestoreService';
import { computeJobMatch } from '../../utils/jobMatching';
import type { JobCategory, JobListing, JobSector } from '../../types';

interface JobsExplorePageProps {
  defaultSector?: JobSector | 'all';
  pageTitle?: string;
  pageSubtitle?: string;
}

const PAGE_SIZE = 6;

export function JobsExplorePage({
  defaultSector = 'all',
  pageTitle = 'Explore Career Opportunities',
  pageSubtitle = 'Search verified government, private sector, and internship opportunities across India.',
}: JobsExplorePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [fromFirestore, setFromFirestore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') || '');
  const [debouncedKeyword, setDebouncedKeyword] = useState(keywordInput);
  const [locationFilter, setLocationFilter] = useState(searchParams.get('loc') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [sectorFilter, setSectorFilter] = useState<string>(defaultSector);
  const [qualificationFilter, setQualificationFilter] = useState('all');
  const [workModeFilter, setWorkModeFilter] = useState('all');
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [salaryFilter, setSalaryFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'match'>('newest');
  const [page, setPage] = useState(1);
  const [showJobAlerts, setShowJobAlerts] = useState(false);

  useEffect(() => {
    setSectorFilter(defaultSector);
    setPage(1);
  }, [defaultSector]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keywordInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchVerifiedJobs(), fetchCategories()])
      .then(([res, cats]) => {
        setJobs(res.jobs);
        setFromFirestore(res.fromFirestore);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredJobs = useMemo(() => {
    const q = debouncedKeyword.trim().toLowerCase();
    const loc = locationFilter.trim().toLowerCase();
    const sal = salaryFilter.trim().toLowerCase();

    const list = jobs.filter((job) => {
      if (verifiedOnly && job.verificationStatus !== 'verified') return false;
      if (sectorFilter !== 'all' && job.sector !== sectorFilter) return false;
      if (categoryFilter !== 'all' && job.category.toLowerCase() !== categoryFilter.toLowerCase())
        return false;
      if (workModeFilter !== 'all' && job.workMode !== workModeFilter) return false;
      if (
        employmentFilter !== 'all' &&
        !job.employmentType.toLowerCase().includes(employmentFilter.toLowerCase())
      )
        return false;
      if (
        qualificationFilter !== 'all' &&
        !job.qualifications.some((qual) =>
          qual.toLowerCase().includes(qualificationFilter.toLowerCase())
        )
      )
        return false;
      if (
        experienceFilter !== 'all' &&
        !job.experience.toLowerCase().includes(experienceFilter.toLowerCase())
      )
        return false;
      if (loc && !job.location.toLowerCase().includes(loc)) return false;
      if (sal && !job.salary.toLowerCase().includes(sal)) return false;
      if (q) {
        const hay = `${job.title} ${job.organization} ${job.category} ${job.description} ${job.location}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'match') {
      return [...list].sort(
        (a, b) => computeJobMatch(b, profile).score - computeJobMatch(a, profile).score
      );
    }
    if (sortBy === 'deadline') {
      return [...list].sort((a, b) =>
        (a.expiresAt || '9999').localeCompare(b.expiresAt || '9999')
      );
    }
    return [...list].sort((a, b) =>
      (b.createdAt || b.verifiedAt || '').localeCompare(a.createdAt || a.verifiedAt || '')
    );
  }, [
    jobs,
    debouncedKeyword,
    locationFilter,
    categoryFilter,
    sectorFilter,
    qualificationFilter,
    workModeFilter,
    employmentFilter,
    experienceFilter,
    salaryFilter,
    verifiedOnly,
    sortBy,
    profile,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setKeywordInput('');
    setDebouncedKeyword('');
    setLocationFilter('');
    setCategoryFilter('all');
    setSectorFilter(defaultSector);
    setQualificationFilter('all');
    setWorkModeFilter('all');
    setEmploymentFilter('all');
    setExperienceFilter('all');
    setSalaryFilter('');
    setVerifiedOnly(true);
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#14243A] dark:text-white">{pageTitle}</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1.5">{pageSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-[#64748B] dark:text-slate-400 font-mono-num">
            {filteredJobs.length} opportunities ·{' '}
            {fromFirestore ? 'Live Firestore Catalog' : 'Verified Official Reference Catalog'}
          </div>
          <button
            type="button"
            onClick={() => setShowJobAlerts((prev) => !prev)}
            aria-expanded={showJobAlerts}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 hover:bg-[#CCFBF1]/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{showJobAlerts ? 'Hide Job Alerts' : 'Create Job Alert'}</span>
          </button>
        </div>
      </div>

      {showJobAlerts && (
        <div className="mb-8">
          <JobAlertsSubscription compact onClose={() => setShowJobAlerts(false)} />
        </div>
      )}

      {/* Search & Filter Panel */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Search title, organization, skills..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
            />
          </div>
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Location (e.g. Bengaluru, All India)"
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'deadline' | 'match')}
            aria-label="Sort jobs"
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
          >
            <option value="newest">Sort: Newest Verified</option>
            <option value="deadline">Sort: Upcoming Deadline</option>
            <option value="match">Sort: Best Profile Match</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <select
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Sector filter"
            className="px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <option value="all">All Sectors</option>
            <option value="government">Government</option>
            <option value="private">Private</option>
            <option value="internship">Internship</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Category filter"
            className="px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={qualificationFilter}
            onChange={(e) => {
              setQualificationFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Qualification filter"
            className="px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <option value="all">Any Qualification</option>
            <option value="12th">12th Pass</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor">Bachelor / Graduate</option>
            <option value="B.Tech">B.Tech / B.E.</option>
            <option value="MCA">MCA / Post Graduate</option>
          </select>

          <select
            value={workModeFilter}
            onChange={(e) => {
              setWorkModeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Work mode filter"
            className="px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <option value="all">Any Work Mode</option>
            <option value="onsite">Onsite</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote / WFH</option>
          </select>

          <select
            value={experienceFilter}
            onChange={(e) => {
              setExperienceFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Experience filter"
            className="px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <option value="all">Any Experience</option>
            <option value="Fresher">Fresher / Student</option>
            <option value="0–2">0–2 Years</option>
            <option value="0–3">0–3 Years</option>
          </select>

          <input
            type="text"
            value={salaryFilter}
            onChange={(e) => {
              setSalaryFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Salary / Pay Level..."
            className="px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer text-[#64748B] dark:text-slate-300">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded border-slate-300 text-[#14B8A6]"
            />
            <span>Verified listings only</span>
          </label>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-[#64748B] hover:text-[#172033] dark:text-slate-300 dark:hover:text-white font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('clearFilters')}</span>
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-60 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : paginatedJobs.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-12 text-center">
          <Filter className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#172033] dark:text-slate-100 mb-1">
            {t('noResults')}
          </h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mb-5">
            Try clearing one or more filters or broadening your location keyword.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                matchResult={user && profile ? computeJobMatch(job, profile) : undefined}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3.5 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-mono-num text-[#64748B] dark:text-slate-400 px-3">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
