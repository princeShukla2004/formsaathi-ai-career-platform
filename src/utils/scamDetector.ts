import type { JobListing, ScamCheckResult } from '../types';

const SUSPICIOUS_SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'goo.gl'];

function isOfficialGovernmentDomain(urlStr: string): boolean {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    return (
      host.endsWith('.gov.in') ||
      host.endsWith('.nic.in') ||
      host.endsWith('.ac.in') ||
      host.endsWith('.org.in') ||
      host === 'www.ibps.in' ||
      host === 'ibps.in' ||
      host === 'internship.aicte-india.org'
    );
  } catch {
    return false;
  }
}

export function evaluateJobSafetySignals(job: JobListing): ScamCheckResult {
  const warningIndicators: string[] = [];

  if (job.verificationStatus === 'expired') {
    return {
      statusLabel: 'Expired',
      riskLevel: 'caution',
      warningIndicators: ['This listing is marked expired or past its published closing window.'],
    };
  }

  const sourceUrl = (job.officialSourceURL || '').trim();
  const applyUrl = (job.applicationURL || '').trim();

  if (!sourceUrl.startsWith('https://') || !applyUrl.startsWith('https://')) {
    warningIndicators.push('Source or application URL does not use HTTPS encryption.');
  }

  for (const urlStr of [sourceUrl, applyUrl]) {
    const lower = urlStr.toLowerCase();
    if (SUSPICIOUS_SHORTENERS.some((s) => lower.includes(s))) {
      warningIndicators.push('Uses a shortened redirect URL rather than an explicit organization domain.');
    }
  }

  if (job.sector === 'government' && sourceUrl && !isOfficialGovernmentDomain(sourceUrl)) {
    warningIndicators.push(
      'Government-tagged listing does not point to a standard .gov.in / .nic.in domain—verify independently before applying.'
    );
  }

  const feeAndDesc = `${job.applicationFee || ''} ${job.description || ''}`.toLowerCase();
  if (
    job.sector === 'private' &&
    /(security deposit|training fee|registration deposit|pay .* to get interview|whatsapp only)/i.test(
      feeAndDesc
    )
  ) {
    warningIndicators.push(
      'Mentions upfront fees, deposit, or informal messaging for a private role—legitimate corporate employers rarely charge interview deposits.'
    );
  }

  if (!job.sourceName && !job.verifiedAt) {
    warningIndicators.push('Missing explicit source reference name or timestamp.');
  }

  if (job.verificationStatus === 'pending') {
    return {
      statusLabel: 'Under Review',
      riskLevel: 'review',
      warningIndicators:
        warningIndicators.length > 0
          ? warningIndicators
          : ['Pending editorial verification against official source records.'],
    };
  }

  if (job.verificationStatus === 'rejected') {
    return {
      statusLabel: 'Unverified',
      riskLevel: 'caution',
      warningIndicators:
        warningIndicators.length > 0
          ? warningIndicators
          : ['This entry did not pass verification review.'],
    };
  }

  return {
    statusLabel: 'Verified',
    riskLevel: warningIndicators.length > 0 ? 'caution' : 'low',
    warningIndicators,
  };
}
