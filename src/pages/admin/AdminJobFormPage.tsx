import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchJobById, upsertJobAdmin } from '../../services/firestoreService';
import type { JobSector, WorkMode } from '../../types';

export function AdminJobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState('Government Jobs');
  const [sector, setSector] = useState<JobSector>('government');
  const [location, setLocation] = useState('All India');
  const [employmentType, setEmploymentType] = useState('Full-Time');
  const [workMode, setWorkMode] = useState<WorkMode>('onsite');
  const [experience, setExperience] = useState('Fresher / Graduate');
  const [qualificationsText, setQualificationsText] = useState('Bachelor Degree');
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('30');
  const [minPercentage, setMinPercentage] = useState('');
  const [ageRelaxationNote, setAgeRelaxationNote] = useState('');
  const [salary, setSalary] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [applicationFee, setApplicationFee] = useState('');
  const [officialSourceURL, setOfficialSourceURL] = useState('');
  const [applicationURL, setApplicationURL] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilitiesText, setResponsibilitiesText] = useState('');
  const [documentsText, setDocumentsText] = useState('Updated Resume, Passport Photograph, Signature, Degree Certificate');
  const [selectionText, setSelectionText] = useState('Online Examination, Interview');
  const [applicationInstructions, setApplicationInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobById(id).then((j) => {
        if (!j) return;
        setTitle(j.title);
        setOrganization(j.organization);
        setCategory(j.category);
        setSector(j.sector);
        setLocation(j.location);
        setEmploymentType(j.employmentType);
        setWorkMode(j.workMode);
        setExperience(j.experience);
        setQualificationsText(j.qualifications.join(', '));
        setMinAge(j.eligibilityRules?.minAge !== undefined ? String(j.eligibilityRules.minAge) : '');
        setMaxAge(j.eligibilityRules?.maxAge !== undefined ? String(j.eligibilityRules.maxAge) : '');
        setMinPercentage(
          j.eligibilityRules?.minPercentage !== undefined
            ? String(j.eligibilityRules.minPercentage)
            : ''
        );
        setAgeRelaxationNote(j.eligibilityRules?.ageRelaxationNote || '');
        setSalary(j.salary);
        setLastDate(j.expiresAt || j.importantDates?.lastDate || '');
        setApplicationFee(j.applicationFee);
        setOfficialSourceURL(j.officialSourceURL);
        setApplicationURL(j.applicationURL);
        setSourceName(j.sourceName || '');
        setDescription(j.description);
        setResponsibilitiesText(j.responsibilities.join('\n'));
        setDocumentsText(j.requiredDocuments.join(', '));
        setSelectionText(j.selectionProcess.join(', '));
        setApplicationInstructions(j.applicationInstructions);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const quals = qualificationsText.split(',').map((s) => s.trim()).filter(Boolean);
      await upsertJobAdmin(user.uid, user.email || '', {
        id,
        title,
        organization,
        category,
        sector,
        location,
        employmentType,
        workMode,
        experience,
        qualifications: quals,
        eligibilityRules: {
          minAge: minAge ? Number(minAge) : undefined,
          maxAge: maxAge ? Number(maxAge) : undefined,
          minPercentage: minPercentage ? Number(minPercentage) : undefined,
          requiredQualifications: quals,
          ageRelaxationNote: ageRelaxationNote || undefined,
        },
        description,
        responsibilities: responsibilitiesText.split('\n').map((s) => s.trim()).filter(Boolean),
        salary: salary || 'Per official notification',
        importantDates: { lastDate },
        applicationFee: applicationFee || 'Refer to official portal',
        requiredDocuments: documentsText.split(',').map((s) => s.trim()).filter(Boolean),
        selectionProcess: selectionText.split(',').map((s) => s.trim()).filter(Boolean),
        applicationInstructions,
        officialSourceURL,
        applicationURL,
        sourceName,
        verificationStatus: 'pending',
        expiresAt: lastDate,
      });
      navigate(isEdit ? '/admin/jobs' : '/admin/verification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          {isEdit ? 'Edit Job Listing' : 'Add New Job Opportunity'}
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Every new or edited submission enters &ldquo;pending&rdquo; status until verified in the Job Verification workflow.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Job Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Organization *</label>
            <input
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Sector *</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as JobSector)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              <option value="government">Government</option>
              <option value="private">Private</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Category *</label>
            <input
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Location *</label>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Work Mode</label>
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value as WorkMode)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Official Source URL *</label>
            <input
              type="url"
              required
              value={officialSourceURL}
              onChange={(e) => setOfficialSourceURL(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Official Application URL *</label>
            <input
              type="url"
              required
              value={applicationURL}
              onChange={(e) => setApplicationURL(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Min Age</label>
            <input
              type="number"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Max Age</label>
            <input
              type="number"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Min % Marks</label>
            <input
              type="number"
              value={minPercentage}
              onChange={(e) => setMinPercentage(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Closing / Expiry Date</label>
            <input
              type="date"
              value={lastDate}
              onChange={(e) => setLastDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Required Qualifications (comma-separated)</label>
            <input
              value={qualificationsText}
              onChange={(e) => setQualificationsText(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Salary / Pay Level</label>
            <input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Description *</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Required Documents (comma-separated)</label>
            <input
              value={documentsText}
              onChange={(e) => setDocumentsText(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Selection Process (comma-separated)</label>
            <input
              value={selectionText}
              onChange={(e) => setSelectionText(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Submit to Verification Queue'}</span>
        </button>
      </form>
    </div>
  );
}
