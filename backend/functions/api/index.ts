import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import app from './app.ts';

const PATH_PREFIXES = ['/functions/v1/api', '/api'] as const;

const normalizeRequestPath = (req: Request): Request => {
  const url = new URL(req.url);
  const matchedPrefix = PATH_PREFIXES.find((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
  if (!matchedPrefix) return req;

  const normalizedPath = url.pathname.slice(matchedPrefix.length) || '/';
  const normalizedUrl = new URL(req.url);
  normalizedUrl.pathname = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return new Request(normalizedUrl.toString(), req);
};

Deno.serve((req) => app.fetch(normalizeRequestPath(req)));
