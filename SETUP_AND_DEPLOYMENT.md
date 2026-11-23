# FormSaathi — Setup & Deployment Guide

**Your Career. Your Opportunities. One Platform.**

FormSaathi is a full-stack React + TypeScript + Express + Firebase + Google Gemini SaaS platform built for Indian students, freshers, and professionals, architected for future international expansion.

---

## 1. Architecture Overview

- **Frontend (`src/`)**: React 19, TypeScript, Tailwind CSS v4, React Router v7, Lucide Icons, `jspdf` for client-side ATS PDF export.
- **Server (`server.ts`)**: Express server running on port `3000`, serving the Vite client bundle and authenticated server-side API endpoints (`/api/ai/assistant`, `/api/ai/resume-assist`, `/api/support`, `/api/subscription/intent`, `/api/health`).
- **Database, Auth & File Storage**: Firebase Authentication, Cloud Firestore (`firestore.rules` + `firestore.indexes.json`), and Firebase Storage (`storage.rules`).
- **AI Processing**: Server-side `@google/genai` (`gemini-4-hydrogen`) with strict structured JSON output schemas. `GEMINI_API_KEY` is never exposed to browser code.

---

## 2. Environment Variables

Configure these environment variables before running or deploying:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes (for AI features) | Server-side Gemini API key read exclusively by `server.ts`. |
| `PORT` | Optional (default `3000`) | HTTP port for Express server. |
| `APP_URL` | Optional | Public origin URL used for referential links. |
| `PAYMENT_GATEWAY_WEBHOOK_SECRET` | Optional (Production Billing) | When unset, subscription checkout stays safely in test mode without granting fake paid upgrades. |

---

## 3. Firebase Configuration & Security Rules

Firebase project connection details reside in `/firebase-applet-config.json`.

### Step A — Enable Authentication Providers
In the Firebase Console (`Authentication -> Sign-in method`):
1. Enable **Google** Sign-In.
2. Enable **Email/Password** Sign-In (required for email registration, password reset, and verification links).

### Step B — Firestore Rules & Indexes
- `firestore.rules` is already provisioned and follows least-privilege Eight Pillars rules (verified email requirement for writes, immutable audit logs, owner-scoped subcollections, and admin allowlists).
- Deploy composite indexes from `firestore.indexes.json` via Firebase CLI if running outside AI Studio:
  ```bash
  firebase deploy --only firestore:rules,firestore:indexes
  ```

### Step C — Firebase Storage Rules
Deploy `storage.rules` so private document uploads (`users/{uid}/documents/{fileName}`) remain strictly owner-only and capped at 5 MB (PDF, JPEG, PNG):
```bash
firebase deploy --only storage
```

### Step D — Administrator Bootstrap & Starter Catalog
- The primary verified administrator email (`prince.nuv.bca@gmail.com`) is configured in `firestore.rules` and `AuthContext.tsx`.
- Sign in with that verified account and open `/admin`.
- Click **Publish Starter Catalog to Firestore** on Admin Overview to seed verified Indian job portals and categories into `/jobs` and `/categories`.
- Additional administrators can be added or revoked by Firebase Auth UID under `/admin/settings`.

---

## 4. Verification, Build & Production Run

Run security rule invariant checks and deterministic eligibility tests:
```bash
npx tsx firestore.rules.test.ts
```

Lint security rules:
```bash
npx eslint firestore.rules
```

Build and start in production:
```bash
npm install
npm run build
npm start
```

---

## 5. Pre-Launch Checklist

- [ ] Review `firestore.rules` and `storage.rules` before broad public distribution.
- [ ] Confirm `GEMINI_API_KEY` is configured in server environment secrets (never in `VITE_*` variables).
- [ ] Verify Google and Email/Password providers are active in Firebase Authentication.
- [ ] Run **Publish Starter Catalog to Firestore** from `/admin` to populate live Firestore `/jobs`.
- [ ] Keep payment upgrades disabled or integrate a real verified webhook handler before accepting payments.
