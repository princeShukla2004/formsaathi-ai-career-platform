import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { updateUserProfileRecord } from '../../services/firestoreService';
import type { LanguageCode } from '../../types';

export function ProfileSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { setLanguage } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [summary, setSummary] = useState('');
  const [qualification, setQualification] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState(0);
  const [skillsText, setSkillsText] = useState('');
  const [certificationsText, setCertificationsText] = useState('');
  const [locationsText, setLocationsText] = useState('');
  const [categoriesText, setCategoriesText] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('en');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setLocation(profile.location || '');
      setLinkedin(profile.linkedin || '');
      setPortfolio(profile.portfolio || '');
      setSummary(profile.summary || '');
      setQualification(profile.qualification || '');
      setEducation(profile.education || '');
      setExperience(profile.experience || 0);
      setSkillsText((profile.skills || []).join(', '));
      setCertificationsText((profile.certifications || []).join(', '));
      setLocationsText((profile.preferredLocations || []).join(', '));
      setCategoriesText((profile.preferredCategories || []).join(', '));
      setPreferredLanguage(profile.preferredLanguage || 'en');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const splitList = (raw: string) =>
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      await updateUserProfileRecord(user.uid, {
        name,
        phone,
        location,
        linkedin,
        portfolio,
        summary,
        qualification,
        education,
        experience: Number(experience) || 0,
        skills: splitList(skillsText),
        certifications: splitList(certificationsText),
        preferredLocations: splitList(locationsText),
        preferredCategories: splitList(categoriesText),
        preferredLanguage,
      });
      setLanguage(preferredLanguage);
      await refreshProfile();
      setSavedMsg('Profile preferences and resume defaults saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Profile Settings</h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Keep your personal details, qualifications, and preferences updated for Resume Studio auto-fill and job recommendations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Full Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Preferred Language</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98XXXXXXXX"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Current Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Vadodara, Gujarat"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">LinkedIn Profile URL</label>
            <input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/your-handle"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Portfolio / GitHub URL</label>
            <input
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://github.com/your-username"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5">Professional Summary</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Write a brief overview of your education, skills, and career focus..."
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Highest Qualification</label>
            <input
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="e.g. Bachelor Degree"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Degree / Education</label>
            <input
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. BCA / B.Tech"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Experience (Years)</label>
            <input
              type="number"
              min={0}
              max={60}
              value={experience}
              onChange={(e) => setExperience(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5">Skills (comma-separated)</label>
          <input
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="SQL, Python, Excel, TypeScript"
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5">Certifications (comma-separated)</label>
          <input
            value={certificationsText}
            onChange={(e) => setCertificationsText(e.target.value)}
            placeholder="Enter certifications you have completed"
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Preferred Locations (comma-separated)</label>
            <input
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
              placeholder="Bengaluru, Delhi, Remote"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Preferred Categories (comma-separated)</label>
            <input
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
              placeholder="Data Analyst, Government Jobs, IT & Software"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        {savedMsg && (
          <p className="text-xs font-medium text-[#16A34A] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedMsg}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
}
