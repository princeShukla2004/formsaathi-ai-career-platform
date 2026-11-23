import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JobListing } from '../types';

interface CompareContextValue {
  compareJobs: JobListing[];
  addToCompare: (job: JobListing) => { added: boolean; reason?: string };
  removeFromCompare: (jobId: string) => void;
  clearCompare: () => void;
  isInCompare: (jobId: string) => boolean;
}

const CompareContext = createContext<CompareContextValue | undefined>(undefined);
const STORAGE_KEY = 'formsaathi_compare_jobs_v2';

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareJobs, setCompareJobs] = useState<JobListing[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareJobs));
    } catch {
      // ignore storage quota errors
    }
  }, [compareJobs]);

  const addToCompare = (job: JobListing): { added: boolean; reason?: string } => {
    if (compareJobs.some((j) => j.id === job.id)) {
      return { added: false, reason: 'Already in comparison list' };
    }
    if (compareJobs.length >= 3) {
      return { added: false, reason: 'Maximum 3 jobs can be compared side-by-side' };
    }
    setCompareJobs((prev) => [...prev, job]);
    return { added: true };
  };

  const removeFromCompare = (jobId: string) => {
    setCompareJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const clearCompare = () => setCompareJobs([]);

  const isInCompare = (jobId: string) => compareJobs.some((j) => j.id === jobId);

  return (
    <CompareContext.Provider
      value={{ compareJobs, addToCompare, removeFromCompare, clearCompare, isInCompare }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
