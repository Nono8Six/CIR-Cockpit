import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import app from './app.ts';

Deno.serve((req) => app.fetch(req));
