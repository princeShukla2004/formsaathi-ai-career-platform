import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, MessageSquarePlus, Send, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitSupportTicket, submitUserFeedback } from '../../services/firestoreService';
import type { UserFeedbackRecord } from '../../types';

export function ContactPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'support' | 'feedback'>('support');

  // Support state
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Feedback state
  const [fbCategory, setFbCategory] = useState<UserFeedbackRecord['category']>('Feature Request');
  const [fbRating, setFbRating] = useState(5);
  const [fbMessage, setFbMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (user && user.emailVerified) {
        const ticketId = await submitSupportTicket(user.uid, { name, email, subject, message });
        setSuccessMsg(`Support ticket ${ticketId} saved to your account for admin review.`);
      } else {
        const resp = await fetch('/api/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Submission failed.');
        setSuccessMsg(data.message);
      }
      setSubject('');
      setMessage('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const fbId = await submitUserFeedback(user.uid, {
        name: name || user.displayName || 'FormSaathi User',
        email: email || user.email || '',
        category: fbCategory,
        rating: fbRating,
        message: fbMessage,
      });
      setSuccessMsg(`Thank you! Feedback ${fbId} recorded for the FormSaathi product team.`);
      setFbMessage('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#0D9488] text-xs font-semibold uppercase">
          <Mail className="w-4 h-4" />
          <span>Contact, Support &amp; Feedback</span>
        </div>
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white">
          Contact FormSaathi
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Report a broken official link, ask a platform question, request data deletion assistance, or share product feedback.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTab('support');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border ${
            tab === 'support'
              ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
              : 'border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Support Ticket</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('feedback');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border ${
            tab === 'feedback'
              ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
              : 'border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>Share Product Feedback</span>
        </button>
      </div>

      {tab === 'support' ? (
        <form
          onSubmit={handleSupportSubmit}
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Full Name</label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Subject</label>
            <input
              type="text"
              required
              minLength={3}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Link correction, account help"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Message</label>
            <textarea
              rows={5}
              required
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>

          {errorMsg && <p className="text-xs text-[#DC2626]">{errorMsg}</p>}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-[#16A34A] dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Sending...' : 'Submit Inquiry'}</span>
          </button>
        </form>
      ) : !user || !user.emailVerified ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Sign in with a verified email address to submit product feedback directly into the FormSaathi review queue.
          </p>
          <Link
            to={user ? '/dashboard/security' : '/login'}
            className="inline-block px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            {user ? 'Verify Email' : 'Sign In'}
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleFeedbackSubmit}
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Feedback Category</label>
              <select
                value={fbCategory}
                onChange={(e) => setFbCategory(e.target.value as UserFeedbackRecord['category'])}
                aria-label="Feedback category"
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <option value="Feature Request">Feature Request</option>
                <option value="Content Accuracy">Content Accuracy</option>
                <option value="Bug Report">Bug Report</option>
                <option value="General Feedback">General Feedback</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Rating (1–5)</label>
              <div className="flex items-center gap-2 py-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFbRating(star)}
                    aria-label={`Rate ${star} stars`}
                    className={`p-1 rounded ${star <= fbRating ? 'text-[#F59E0B]' : 'text-slate-300 dark:text-slate-700'}`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Your Feedback *</label>
            <textarea
              rows={5}
              required
              minLength={10}
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              placeholder="Tell us what helped you or what we should improve next..."
              className="w-full p-3 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>

          {errorMsg && <p className="text-xs text-[#DC2626]">{errorMsg}</p>}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-[#16A34A] dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Submit Product Feedback'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
