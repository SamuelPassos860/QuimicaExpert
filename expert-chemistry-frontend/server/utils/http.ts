import type { Request, Response } from 'express';

export function getSearchTerm(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function toLikePattern(value: string) {
  return value ? `%${value}%` : '';
}

const SESSION_COOKIE_NAME = 'expert_chemistry_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAgeMs() {
  return SESSION_MAX_AGE_MS;
}

export function parseCookies(headerValue: string | undefined) {
  if (!headerValue) {
    return new Map<string, string>();
  }

  return new Map(
    headerValue
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=');

        if (separatorIndex === -1) {
          return [cookie, ''] as const;
        }

        const name = cookie.slice(0, separatorIndex).trim();
        const value = cookie.slice(separatorIndex + 1).trim();

        return [name, decodeURIComponent(value)] as const;
      })
  );
}

export function getSessionTokenFromRequest(request: Request) {
  return parseCookies(request.headers.cookie).get(SESSION_COOKIE_NAME) || '';
}

export function setSessionCookie(response: Response, token: string, maxAgeMs = SESSION_MAX_AGE_MS) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`
  ];

  if (isProduction) {
    cookieParts.push('Secure');
  }

  response.setHeader('Set-Cookie', cookieParts.join('; '));
}

export function clearSessionCookie(response: Response) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];

  if (isProduction) {
    cookieParts.push('Secure');
  }

  response.setHeader('Set-Cookie', cookieParts.join('; '));
}
