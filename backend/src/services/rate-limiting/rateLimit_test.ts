import { test } from "vitest";
import { assertEquals, assert } from '#test/assert';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS } from './rateLimit.ts';

test('RATE_LIMIT_MAX is a positive number', () => {
  assertEquals(typeof RATE_LIMIT_MAX, 'number');
  assert(Number.isFinite(RATE_LIMIT_MAX), 'RATE_LIMIT_MAX must be finite');
  assert(RATE_LIMIT_MAX > 0, 'RATE_LIMIT_MAX must be > 0');
});

test('RATE_LIMIT_MAX defaults to 10 when env is unset', () => {
  // The module reads RATE_LIMIT_MAX from env at import time.
  // When the env var is absent, the fallback is 10.
  // We cannot re-import to force a different value, but we can
  // verify the default holds when no env override was provided.
  const envValue = process.env['RATE_LIMIT_MAX'];
  if (envValue === undefined || envValue === '') {
    assertEquals(RATE_LIMIT_MAX, 10);
  }
});

test('RATE_LIMIT_WINDOW_SECONDS is a positive number', () => {
  assertEquals(typeof RATE_LIMIT_WINDOW_SECONDS, 'number');
  assert(Number.isFinite(RATE_LIMIT_WINDOW_SECONDS), 'RATE_LIMIT_WINDOW_SECONDS must be finite');
  assert(RATE_LIMIT_WINDOW_SECONDS > 0, 'RATE_LIMIT_WINDOW_SECONDS must be > 0');
});

test('RATE_LIMIT_WINDOW_SECONDS defaults to 300 when env is unset', () => {
  const envValue = process.env['RATE_LIMIT_WINDOW_SECONDS'];
  if (envValue === undefined || envValue === '') {
    assertEquals(RATE_LIMIT_WINDOW_SECONDS, 300);
  }
});
