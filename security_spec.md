# FormSaathi Security Specification (Phase 0 -> 2.0)

## 1. Data Invariants
1. **Owner Isolation**: Every document under `/users/{uid}` and its subcollections (`savedJobs`, `applications`, `eligibilityChecks`, `resumes`, `documents`, `aiChats`, `notifications`, `resumeAnalyses`, `mockInterviews`, `careerRoadmaps`, `mockTestAttempts`, `savedExams`, `learningProgress`, `jobComparisons`) and `/subscriptions/{uid}` belongs exclusively to `uid`. Non-owners cannot read or mutate them (admins may read user profiles for moderation, or update account suspension status only).
2. **No Self-Admin Escalation**: A user cannot create or modify `/admins/{uid}` or set `isAdmin` / `role` on `/users/{uid}`. Admin privileges are checked exclusively via `/admins/{uid}` existence or the verified bootstrap admin email (`request.auth.token.email_verified == true`).
3. **Verified Public Boundaries**: Unauthenticated visitors and standard users can read `/jobs/{jobId}` only when `verificationStatus == 'verified'`, `/mockTests/{testId}` only when `status == 'published'`, `/questionBank/{questionId}` only when `isActive == true`, `/examEvents/{eventId}` only when `isPublished == true`, and `/learningPaths/{pathId}` only when `isPublished == true`. Draft, pending, rejected, or archived content is readable/writable exclusively by verified admins.
4. **No Fake Subscription Activation**: Users can initialize their own `free` subscription record (`plan == 'free'`) or increment usage counters within allowed keys, but cannot set `plan == 'pro'` via client Firestore writes. Payment gateway remains optional and disabled when unconfigured.
5. **Immutable Audit Trail**: `/adminAuditLogs/{logId}` can only be created by verified admins and never updated or deleted.
6. **Strict Timestamp & Size Integrity**: Every creation and update enforces `request.time` server timestamps and bounded string/array lengths.
7. **Privacy & DPDP Safeguards**: No Aadhaar, PAN, OTP, or banking credentials are stored or collected; private document and resume PDF uploads in Firebase Storage are strictly owner-only (`request.auth.uid == uid`) with verified email and 5MB size caps.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Self-Admin Promotion on User Create**: `POST /users/{uid}` containing `role: "admin"` or `isAdmin: true`.
2. **Ghost Field Injection on User Update**: `PATCH /users/{uid}` updating `status: "active"` or injecting `verifiedBadge: true`.
3. **Spoofed Unverified Email Admin Attempt**: Request with `email: "prince.nuv.bca@gmail.com"` and `email_verified: false` trying to write `/jobs/{jobId}`.
4. **Cross-User Profile Read (PII Leak)**: Signed-in User A attempting `get /users/{userB_uid}`.
5. **Cross-User Subcollection Tampering**: User A writing `/users/{userB_uid}/mockInterviews/{id}` or `/users/{userB_uid}/applications/{appId}` with `userId: userB_uid`.
6. **Unverified Job / Draft Mock Test Public Read**: Unauthenticated visitor attempting `get /jobs/{pendingJobId}` or `get /mockTests/{draftTestId}`.
7. **Non-Admin Catalog Write**: Regular signed-in user attempting `create /examEvents/{id}` or `create /jobs/{jobId}`.
8. **Self-Upgrade to Pro Subscription**: Regular user attempting `update /subscriptions/{uid}` setting `plan: 'pro'`.
9. **Oversized Document ID Poisoning**: Attempting `create /users/{uid}/resumes/{150_char_invalid_id}` or characters like `$` / `.`.
10. **Client Timestamp Forgery**: Attempting `create /users/{uid}/applications/{appId}` with `createdAt` set to a past client Date instead of `request.time`.
11. **Admin Audit Log Deletion**: Even an admin attempting `delete /adminAuditLogs/{logId}` or `update`.
12. **Blanket List Query Scraping**: Signed-in user attempting `list /users`, `list /jobReports`, `list /supportTickets`, or `list /userFeedback`.
