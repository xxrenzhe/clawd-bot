const DEFAULT_REFERRAL_URL = 'https://hosting.com?aid=6977a573baa53';

export const CANONICAL_HOSTING_REFERRAL_URL = DEFAULT_REFERRAL_URL;

export function normalizeHostingReferralUrl(raw?: string): string {
  const source = raw?.trim();
  if (!source) return DEFAULT_REFERRAL_URL;

  try {
    const url = new URL(source);
    const hostname = url.hostname.replace(/^www\./, '');

    if (hostname !== 'hosting.com') {
      return DEFAULT_REFERRAL_URL;
    }

    url.protocol = 'https:';
    url.hostname = 'hosting.com';
    url.pathname = '/';
    url.hash = '';

    if (!url.searchParams.get('aid')) {
      const defaultAid = new URL(DEFAULT_REFERRAL_URL).searchParams.get('aid');
      if (defaultAid) {
        url.searchParams.set('aid', defaultAid);
      }
    }

    return url.toString();
  } catch {
    return DEFAULT_REFERRAL_URL;
  }
}
