import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Load Firebase projectId from public config for ID token verification
let firebaseProjectId = '';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    firebaseProjectId = parsed.projectId || '';
  }
} catch {
  firebaseProjectId = '';
}

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// --- Rate Limiting (in-memory sliding window) ---
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const entry = rateLimitBuckets.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a few minutes before trying again.',
      });
    }

    entry.count += 1;
    return next();
  };
}

// --- Firebase ID Token Verification (stateless x509 public certs, no IAM required) ---
let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < cachedCerts.expiresAt) {
    return cachedCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Failed to fetch Firebase public verification certificates.');
  }
  const certs = (await resp.json()) as Record<string, string>;
  cachedCerts = { certs, expiresAt: Date.now() + 60 * 60 * 1000 };
  return certs;
}

function base64UrlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

async function verifyFirebaseTokenIfPresent(
  authHeader?: string
): Promise<{ uid: string; email?: string; emailVerified?: boolean } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ') || !firebaseProjectId) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'));
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
    if (header.alg !== 'RS256' || !header.kid) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.aud !== firebaseProjectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) return null;
    if (!payload.sub || typeof payload.sub !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp < nowSec) return null;

    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const valid = verifier.verify(cert, base64UrlDecode(parts[2]));
    if (!valid) return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}

function containsSensitiveInput(text: string): boolean {
  const panPattern = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
  const aadhaarPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
  const sensitiveKeywords = /\b(cvv|atm pin|banking password|netbanking password|otp is)\b/i;
  return panPattern.test(text) || aadhaarPattern.test(text) || sensitiveKeywords.test(text);
}

function requireAiConfigured(res: Response): boolean {
  if (!ai) {
    res.status(503).json({
      error:
        'Gemini AI service is not configured on the server. Please configure GEMINI_API_KEY in Settings > Secrets.',
    });
    return false;
  }
  return true;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Larger JSON parser only for PDF Resume Analyzer route (capped safely at 8MB for 5MB PDF base64)
  app.use('/api/ai/resume-analyzer', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '128kb' }));

  // Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(ai),
      firebaseProjectConfigured: Boolean(firebaseProjectId),
      paymentGatewayEnabled: false,
      timestamp: new Date().toISOString(),
    });
  });

  // 1. FormSaathi AI Career Assistant
  app.post('/api/ai/assistant', rateLimit(30, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      if (!requireAiConfigured(res) || !ai) return;

      const { message, language, history, jobContext, userProfileSummary } = req.body ?? {};
      if (typeof message !== 'string' || message.trim().length < 2 || message.trim().length > 2000) {
        return res.status(400).json({
          error: 'Please enter a clear question between 2 and 2,000 characters.',
        });
      }

      if (containsSensitiveInput(message)) {
        return res.status(400).json({
          error:
            'For your privacy and security under DPDP guidelines, please do not share Aadhaar numbers, PAN numbers, OTPs, or banking passwords in chat.',
        });
      }

      const verifiedUser = await verifyFirebaseTokenIfPresent(req.headers.authorization);
      const targetLang = language === 'hi' ? 'Hindi (Devanagari script, clear everyday Hindi)' : 'English';

      const safeHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .filter(
              (item) =>
                item &&
                (item.role === 'user' || item.role === 'assistant') &&
                typeof item.content === 'string'
            )
            .map((item) => `${item.role.toUpperCase()}: ${item.content.slice(0, 600)}`)
            .join('\n')
        : '';

      const safeJobContext =
        jobContext && typeof jobContext === 'object'
          ? JSON.stringify({
              title: String(jobContext.title || '').slice(0, 180),
              organization: String(jobContext.organization || '').slice(0, 160),
              sector: String(jobContext.sector || '').slice(0, 40),
              location: String(jobContext.location || '').slice(0, 120),
              qualifications: Array.isArray(jobContext.qualifications)
                ? jobContext.qualifications.slice(0, 10)
                : [],
              eligibilityRules: jobContext.eligibilityRules || {},
              importantDates: jobContext.importantDates || {},
              applicationFee: String(jobContext.applicationFee || '').slice(0, 200),
              requiredDocuments: Array.isArray(jobContext.requiredDocuments)
                ? jobContext.requiredDocuments.slice(0, 15)
                : [],
              officialSourceURL: String(jobContext.officialSourceURL || '').slice(0, 300),
            })
          : 'No specific job listing selected.';

      const safeProfile =
        userProfileSummary && typeof userProfileSummary === 'object'
          ? JSON.stringify({
              qualification: String(userProfileSummary.qualification || '').slice(0, 100),
              experience: Number(userProfileSummary.experience || 0),
              skills: Array.isArray(userProfileSummary.skills)
                ? userProfileSummary.skills.slice(0, 15)
                : [],
            })
          : 'Guest or unprovided profile.';

      const systemInstruction = [
        'You are FormSaathi AI, a trustworthy, practical career guidance assistant for Indian students, freshers, and professionals.',
        `Respond strictly in ${targetLang}.`,
        'Safety & Accuracy Rules:',
        '1. Never claim official government authority or guarantee job selection.',
        '2. Never invent dates, fees, vacancies, or official URLs. Rely strictly on the provided Job Context or general well-established application guidance.',
        '3. If a detail is missing from the verified Job Context, clearly advise the user to check the official notification link.',
        '4. Never ask for Aadhaar numbers, PAN numbers, passwords, OTPs, or banking credentials.',
        '5. Keep answers well-structured, concise, actionable, and easy to understand.',
      ].join('\n');

      const prompt = [
        `Authenticated User: ${verifiedUser ? 'Yes' : 'Guest'}`,
        `Verified Job Context: ${safeJobContext}`,
        `User Profile Context: ${safeProfile}`,
        safeHistory ? `Recent Conversation:\n${safeHistory}` : '',
        `Current Question: ${message.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              suggestedFollowUps: { type: Type.ARRAY, items: { type: Type.STRING } },
              disclaimer: { type: Type.STRING },
            },
            required: ['reply', 'suggestedFollowUps', 'disclaimer'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({
        reply: String(parsed.reply || ''),
        suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps)
          ? parsed.suggestedFollowUps.slice(0, 3).map(String)
          : [],
        disclaimer: String(
          parsed.disclaimer ||
            'FormSaathi AI provides career guidance only. Please confirm final requirements on the official recruiting portal.'
        ),
        modelUsed: 'gemini-4-hydrogen',
      });
    } catch (err) {
      console.error('AI Assistant error:', err);
      return res.status(500).json({
        error:
          err instanceof Error
            ? `Unable to reach FormSaathi AI right now: ${err.message}`
            : 'Unable to reach FormSaathi AI right now.',
      });
    }
  });

  // 2. Resume Studio AI Assistance
  app.post('/api/ai/resume-assist', rateLimit(25, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      if (!requireAiConfigured(res) || !ai) return;

      const { action, content, targetRole, language } = req.body ?? {};
      const allowedActions = ['improve_summary', 'improve_experience', 'suggest_skills', 'grammar_check'];
      if (!allowedActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid resume assist action.' });
      }
      if (typeof content !== 'string' || content.trim().length < 5 || content.trim().length > 3000) {
        return res.status(400).json({
          error: 'Please provide between 5 and 3,000 characters of existing resume content to refine.',
        });
      }
      if (containsSensitiveInput(content)) {
        return res.status(400).json({
          error: 'Please remove sensitive numbers (Aadhaar/PAN) before sending resume text.',
        });
      }

      const targetLang = language === 'hi' ? 'Hindi' : 'English';
      const systemInstruction = [
        'You are an ATS-aware resume editor for Indian and global candidates.',
        `Respond in ${targetLang}.`,
        'CRITICAL INTEGRITY RULE: NEVER invent qualifications, degrees, companies, job titles, certifications, metrics, or work experience that the user did not provide. Only improve clarity, grammar, action verbs, and ATS alignment based strictly on the provided facts.',
      ].join('\n');

      const prompt = `Task: ${action}\nTarget Role: ${String(targetRole || 'General Professional').slice(0, 120)}\nUser Content:\n${content.trim()}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              improvedText: { type: Type.STRING },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              notes: { type: Type.STRING },
            },
            required: ['improvedText', 'suggestions', 'notes'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({
        improvedText: String(parsed.improvedText || ''),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 6).map(String) : [],
        notes: String(parsed.notes || ''),
      });
    } catch (err) {
      console.error('Resume Assist error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Resume assistant failed.',
      });
    }
  });

  // 3. AI Resume Analyzer (PDF base64 or pasted text + Target Role + Job Description)
  app.post('/api/ai/resume-analyzer', rateLimit(20, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      if (!requireAiConfigured(res) || !ai) return;

      const { pdfBase64, resumeText, targetRole, jobDescription, fileName } = req.body ?? {};
      if (typeof targetRole !== 'string' || targetRole.trim().length < 2 || targetRole.trim().length > 140) {
        return res.status(400).json({ error: 'Please specify a target job role (2–140 characters).' });
      }

      const hasPdf = typeof pdfBase64 === 'string' && pdfBase64.trim().length > 0;
      const hasText = typeof resumeText === 'string' && resumeText.trim().length >= 40;
      if (!hasPdf && !hasText) {
        return res.status(400).json({
          error: 'Please upload a PDF resume (max 5 MB) or paste at least 40 characters of resume text.',
        });
      }

      const parts: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

      if (hasPdf) {
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
        const pdfBuffer = Buffer.from(cleanBase64, 'base64');
        if (pdfBuffer.byteLength > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'PDF file size exceeds the 5 MB limit.' });
        }
        // Validate PDF magic bytes (%PDF-)
        if (pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
          return res.status(400).json({ error: 'Uploaded file is not a valid PDF document.' });
        }
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        });
      }

      if (hasText) {
        if (containsSensitiveInput(resumeText)) {
          return res.status(400).json({
            error: 'Please remove Aadhaar, PAN, or banking credentials before analyzing resume text.',
          });
        }
        parts.push(`Resume Text:\n${resumeText.trim().slice(0, 15000)}`);
      }

      const safeJd = typeof jobDescription === 'string' ? jobDescription.trim().slice(0, 4000) : '';
      parts.push(
        [
          `File Name: ${String(fileName || 'Uploaded Resume').slice(0, 120)}`,
          `Target Role: ${targetRole.trim()}`,
          safeJd ? `Target Job Description:\n${safeJd}` : 'No custom job description provided; evaluate against standard ATS expectations for the Target Role.',
        ].join('\n\n')
      );

      const systemInstruction = [
        'You are an ATS (Applicant Tracking System) & Career Resume Evaluator for FormSaathi.',
        'Evaluate the candidate resume objectively for ATS readability, structure, clarity, impact verbs, and keyword coverage against the target role and job description.',
        'CRITICAL INTEGRITY RULE: NEVER invent false work experience, degrees, dates, or skills that the candidate does not possess. When proposing an improved summary or bullet rewrites, base them strictly on facts visible in the submitted resume, using placeholders like [add measurable outcome if applicable] only where needed.',
        'Return realistic scores (0-100) for atsScore and keywordMatchScore.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: parts,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              atsScore: { type: Type.NUMBER },
              keywordMatchScore: { type: Type.NUMBER },
              summaryFeedback: { type: Type.STRING },
              matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              sectionSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    section: { type: Type.STRING },
                    status: { type: Type.STRING },
                    feedback: { type: Type.STRING },
                  },
                  required: ['section', 'status', 'feedback'],
                },
              },
              bulletImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvedSummary: { type: Type.STRING },
            },
            required: [
              'atsScore',
              'keywordMatchScore',
              'summaryFeedback',
              'matchedKeywords',
              'missingKeywords',
              'sectionSuggestions',
              'bulletImprovements',
              'improvedSummary',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({
        atsScore: Math.max(0, Math.min(100, Math.round(Number(parsed.atsScore || 0)))),
        keywordMatchScore: Math.max(0, Math.min(100, Math.round(Number(parsed.keywordMatchScore || 0)))),
        summaryFeedback: String(parsed.summaryFeedback || ''),
        matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords.slice(0, 20).map(String) : [],
        missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.slice(0, 20).map(String) : [],
        sectionSuggestions: Array.isArray(parsed.sectionSuggestions)
          ? parsed.sectionSuggestions.slice(0, 8).map((s: any) => ({
              section: String(s?.section || 'General'),
              status: ['strong', 'needs_work', 'missing'].includes(s?.status) ? s.status : 'needs_work',
              feedback: String(s?.feedback || ''),
            }))
          : [],
        bulletImprovements: Array.isArray(parsed.bulletImprovements)
          ? parsed.bulletImprovements.slice(0, 8).map(String)
          : [],
        improvedSummary: String(parsed.improvedSummary || ''),
      });
    } catch (err) {
      console.error('Resume Analyzer error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to analyze resume right now.',
      });
    }
  });

  // 4. AI Mock Interview Studio (Text-based 1-question-at-a-time practice)
  app.post('/api/ai/mock-interview', rateLimit(40, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      if (!requireAiConfigured(res) || !ai) return;

      const { action, roleTitle, difficulty, questionCount, questionIndex, currentQuestion, answer, history } =
        req.body ?? {};

      if (typeof roleTitle !== 'string' || roleTitle.trim().length < 2 || roleTitle.trim().length > 140) {
        return res.status(400).json({ error: 'Please select or enter a valid interview role.' });
      }

      const safeDifficulty = ['Beginner', 'Intermediate', 'Advanced'].includes(difficulty)
        ? difficulty
        : 'Intermediate';
      const totalQ = Math.max(3, Math.min(8, Number(questionCount || 5)));

      if (action === 'start') {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Role: ${roleTitle.trim()}\nDifficulty: ${safeDifficulty}\nTotal Planned Questions: ${totalQ}\nGenerate the opening interview welcome message and Question 1 only.`,
          config: {
            systemInstruction: [
              'You are a professional technical & HR interviewer for Indian and global hiring panels.',
              'Ask ONE clear, focused interview question appropriate to the role and difficulty level.',
              'Keep the welcome friendly and realistic. Do NOT claim audio or spoken voice evaluation.',
            ].join('\n'),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                welcomeNote: { type: Type.STRING },
                question: { type: Type.STRING },
              },
              required: ['welcomeNote', 'question'],
            },
          },
        });
        const parsed = JSON.parse((response.text || '{}').trim());
        return res.json({
          welcomeNote: String(parsed.welcomeNote || ''),
          question: String(parsed.question || ''),
        });
      }

      if (action === 'evaluate_answer') {
        if (typeof answer !== 'string' || answer.trim().length < 5 || answer.trim().length > 3500) {
          return res.status(400).json({ error: 'Please provide an answer (5–3,500 characters) to evaluate.' });
        }
        if (containsSensitiveInput(answer)) {
          return res.status(400).json({ error: 'Please avoid sharing personal ID numbers (Aadhaar/PAN).' });
        }

        const qIdx = Number(questionIndex || 1);
        const isLast = qIdx >= totalQ;
        const historySummary = Array.isArray(history)
          ? history
              .slice(-8)
              .map((m: any) => `${m.role}: ${String(m.content || '').slice(0, 350)}`)
              .join('\n')
          : '';

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: [
            `Role: ${roleTitle.trim()} (${safeDifficulty})`,
            `Question ${qIdx} of ${totalQ}: ${String(currentQuestion || '').slice(0, 500)}`,
            `Candidate Written Answer: ${answer.trim()}`,
            historySummary ? `Earlier Context:\n${historySummary}` : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          config: {
            systemInstruction: [
              'You are a fair, constructive interview evaluator reviewing a WRITTEN text answer.',
              'Score strictly from 0 to 100 on: relevanceScore, clarityScore, structureScore, completenessScore.',
              'IMPORTANT TRANSPARENCY RULE: Never claim you measured spoken pronunciation, tone of voice, or body language because this is a text-based interview.',
              isLast
                ? 'This is the final question. Do not ask another question; provide concise final summary strengths & priority improvements.'
                : `Also ask Question ${qIdx + 1} of ${totalQ} building naturally on the role.`,
            ].join('\n'),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                relevanceScore: { type: Type.NUMBER },
                clarityScore: { type: Type.NUMBER },
                structureScore: { type: Type.NUMBER },
                completenessScore: { type: Type.NUMBER },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                modelAnswerTip: { type: Type.STRING },
                nextQuestion: { type: Type.STRING },
                finalSummary: { type: Type.STRING },
              },
              required: [
                'relevanceScore',
                'clarityScore',
                'structureScore',
                'completenessScore',
                'strengths',
                'improvements',
                'modelAnswerTip',
                'nextQuestion',
                'finalSummary',
              ],
            },
          },
        });

        const parsed = JSON.parse((response.text || '{}').trim());
        const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n || 0))));
        return res.json({
          evaluation: {
            relevanceScore: clamp(parsed.relevanceScore),
            clarityScore: clamp(parsed.clarityScore),
            structureScore: clamp(parsed.structureScore),
            completenessScore: clamp(parsed.completenessScore),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).map(String) : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4).map(String) : [],
            modelAnswerTip: String(parsed.modelAnswerTip || ''),
          },
          nextQuestion: isLast ? '' : String(parsed.nextQuestion || ''),
          finalSummary: String(parsed.finalSummary || ''),
        });
      }

      return res.status(400).json({ error: 'Invalid mock interview action.' });
    } catch (err) {
      console.error('Mock Interview error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Mock interview service failed.',
      });
    }
  });

  // 5. AI Career Roadmap Generator
  app.post('/api/ai/career-roadmap', rateLimit(20, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      if (!requireAiConfigured(res) || !ai) return;

      const { targetGoal, currentLevel, weeklyHours, backgroundNotes } = req.body ?? {};
      if (typeof targetGoal !== 'string' || targetGoal.trim().length < 2 || targetGoal.trim().length > 160) {
        return res.status(400).json({ error: 'Please specify a target career role or exam goal.' });
      }

      const safeHours = Math.max(2, Math.min(70, Number(weeklyHours || 10)));
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Target Role / Exam Goal: ${targetGoal.trim()}`,
          `Current Level: ${String(currentLevel || 'Beginner').slice(0, 80)}`,
          `Available Weekly Study Hours: ${safeHours} hours/week`,
          backgroundNotes ? `Background: ${String(backgroundNotes).slice(0, 800)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        config: {
          systemInstruction: [
            'You are a practical career curriculum architect for Indian students, freshers, and professionals.',
            'Create an actionable 3-stage Career Roadmap (Beginner, Intermediate, Advanced) with concrete milestones, portfolio projects, reputable official/free learning resources, and a 7-day weekly study cadence.',
            'Do NOT guarantee job placement or invent upcoming official government exam dates.',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: { type: Type.STRING },
              weeklyPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
              stages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stageName: { type: Type.STRING },
                    durationLabel: { type: Type.STRING },
                    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    milestones: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                        },
                        required: ['id', 'title', 'description'],
                      },
                    },
                    projects: { type: Type.ARRAY, items: { type: Type.STRING } },
                    resources: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          type: { type: Type.STRING },
                          url: { type: Type.STRING },
                        },
                        required: ['title', 'type'],
                      },
                    },
                  },
                  required: ['stageName', 'durationLabel', 'objectives', 'skills', 'milestones', 'projects', 'resources'],
                },
              },
            },
            required: ['overview', 'weeklyPlan', 'stages'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({
        overview: String(parsed.overview || ''),
        weeklyPlan: Array.isArray(parsed.weeklyPlan) ? parsed.weeklyPlan.slice(0, 7).map(String) : [],
        stages: Array.isArray(parsed.stages) ? parsed.stages.slice(0, 3) : [],
      });
    } catch (err) {
      console.error('Career Roadmap error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to generate career roadmap.',
      });
    }
  });

  // 6. Government Application Form Assistant
  app.post('/api/ai/form-assistant', rateLimit(25, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      if (!requireAiConfigured(res) || !ai) return;

      const { examName, question, language, jobContext } = req.body ?? {};
      if (typeof examName !== 'string' || examName.trim().length < 2) {
        return res.status(400).json({ error: 'Please specify the exam or recruitment form name.' });
      }
      if (typeof question !== 'string' || question.trim().length < 3 || question.trim().length > 1500) {
        return res.status(400).json({ error: 'Please enter a form question (3–1,500 characters).' });
      }
      if (containsSensitiveInput(question)) {
        return res.status(400).json({
          error: 'Never enter Aadhaar numbers, PAN numbers, OTPs, or passwords into Form Assistant.',
        });
      }

      const targetLang = language === 'hi' ? 'Hindi (clear everyday Hindi in Devanagari)' : 'English';
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Form / Exam Name: ${examName.trim().slice(0, 160)}`,
          jobContext ? `Verified Catalog Reference: ${JSON.stringify(jobContext).slice(0, 2000)}` : '',
          `Applicant Question: ${question.trim()}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        config: {
          systemInstruction: [
            'You are the FormSaathi Government Application Form Assistant.',
            `Respond strictly in ${targetLang}.`,
            'Explain complex government form sections, qualification rules, document formatting (photo/signature dimensions & KB ranges), fee category guidance, and step-by-step preparation checklist clearly.',
            'SAFETY RULES: Never ask for OTPs, Aadhaar numbers, PAN numbers, or portal passwords. Never pretend to submit forms or bypass official portals. Remind users to double-check final rules in the official PDF notice.',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              fieldByFieldTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              documentSpecs: { type: Type.ARRAY, items: { type: Type.STRING } },
              stepChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
              cautionNote: { type: Type.STRING },
            },
            required: ['explanation', 'fieldByFieldTips', 'documentSpecs', 'stepChecklist', 'cautionNote'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({
        explanation: String(parsed.explanation || ''),
        fieldByFieldTips: Array.isArray(parsed.fieldByFieldTips) ? parsed.fieldByFieldTips.slice(0, 8).map(String) : [],
        documentSpecs: Array.isArray(parsed.documentSpecs) ? parsed.documentSpecs.slice(0, 8).map(String) : [],
        stepChecklist: Array.isArray(parsed.stepChecklist) ? parsed.stepChecklist.slice(0, 10).map(String) : [],
        cautionNote: String(
          parsed.cautionNote ||
            'Always submit your application directly on the official recruiting portal and verify the official notification PDF.'
        ),
      });
    } catch (err) {
      console.error('Form Assistant error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Form assistant request failed.',
      });
    }
  });

  // Public Contact / Support inquiry endpoint
  app.post('/api/support', rateLimit(10, 15 * 60 * 1000), (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof subject !== 'string' ||
      subject.trim().length < 3 ||
      typeof message !== 'string' ||
      message.trim().length < 10
    ) {
      return res.status(400).json({
        error: 'Please provide a valid name, email address, subject, and message (at least 10 characters).',
      });
    }
    const ticketRef = `FS-${Date.now().toString(36).toUpperCase()}`;
    return res.json({
      accepted: true,
      referenceId: ticketRef,
      message: `Inquiry ${ticketRef} validated. Sign in to save and track support tickets directly in your account.`,
    });
  });

  // Subscription Status Endpoint (Payment Gateway Optional & Disabled per Part 5)
  app.post('/api/subscription/intent', rateLimit(15, 15 * 60 * 1000), async (req: Request, res: Response) => {
    const verifiedUser = await verifyFirebaseTokenIfPresent(req.headers.authorization);
    if (!verifiedUser) {
      return res.status(401).json({ error: 'Authentication required to check subscription status.' });
    }
    return res.status(200).json({
      mode: 'disabled',
      activated: false,
      message:
        'Online payments (Razorpay) are optional and disabled in this release. All FormSaathi 2.0 career tools, mock tests, resume analyzer, and AI features are available immediately without payment setup.',
    });
  });

  // Frontend Vite middleware (dev) or static dist (production)
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FormSaathi server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FormSaathi server:', err);
  process.exit(1);
});
