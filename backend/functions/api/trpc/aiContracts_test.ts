import { assertEquals } from 'std/assert';

import {
  aiPromptsListResponseSchema,
  aiPromptsSaveDraftInputSchema,
  aiSettingsGetResponseSchema,
  aiSettingsSaveModelInputSchema,
  aiSettingsSaveQuotaInputSchema,
  aiSettingsSaveProviderInputSchema,
  aiSettingsTestProviderInputSchema,
  aiUsageListResponseSchema,
  aiUsageSummaryResponseSchema
} from '../../../../shared/schemas/ai.schema.ts';

Deno.test('AI settings contracts are strict and never expose API keys', () => {
  const provider = {
    id: crypto.randomUUID(),
    provider: 'openrouter',
    label: 'OpenRouter',
    enabled: true,
    has_api_key: true,
    api_key_last4: 'abcd',
    base_url: null,
    organization_id: null,
    last_test_status: 'success',
    last_test_at: '2026-06-27T16:00:00Z',
    last_error_code: null,
    last_error_message: null,
    created_at: '2026-06-27T16:00:00Z',
    updated_at: '2026-06-27T16:00:00Z'
  };

  const model = {
    id: crypto.randomUUID(),
    provider_config_id: provider.id,
    provider: 'openrouter',
    model_id: 'deepseek/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    enabled: true,
    is_default: true,
    currency: 'USD',
    input_price_per_million: null,
    output_price_per_million: null,
    cached_input_price_per_million: null,
    reasoning_price_per_million: null,
    price_effective_at: null,
    max_output_tokens: 2000,
    temperature: 0.2,
    created_at: '2026-06-27T16:00:00Z',
    updated_at: '2026-06-27T16:00:00Z'
  };

  const quota = {
    id: crypto.randomUUID(),
    scope: 'global',
    agency_id: null,
    user_id: null,
    feature: 'pricing.references.diagnose',
    enabled: true,
    daily_call_limit: 50,
    monthly_call_limit: 1000,
    daily_token_limit: 200000,
    monthly_token_limit: 4000000,
    daily_cost_limit: 10,
    monthly_cost_limit: 200,
    currency: 'USD',
    created_at: '2026-06-27T16:00:00Z',
    updated_at: '2026-06-27T16:00:00Z'
  };

  const response = { ok: true, providers: [provider], models: [model], quotas: [quota] };
  assertEquals(aiSettingsGetResponseSchema.safeParse(response).success, true);
  assertEquals(aiSettingsGetResponseSchema.safeParse({
    ...response,
    providers: [{ ...provider, api_key: 'secret' }]
  }).success, false);
});

Deno.test('AI mutation inputs keep secrets server-bound and strict', () => {
  assertEquals(aiSettingsSaveProviderInputSchema.safeParse({
    provider: 'openrouter',
    enabled: true,
    api_key: 'sk-or-test'
  }).success, true);
  assertEquals(aiSettingsSaveProviderInputSchema.safeParse({
    provider: 'mistral',
    enabled: true,
    api_key: 'sk-test'
  }).success, false);
  assertEquals(aiSettingsSaveProviderInputSchema.safeParse({
    provider: 'openrouter',
    enabled: true,
    inputCostPerMillion: 1
  }).success, false);
  assertEquals(aiSettingsTestProviderInputSchema.safeParse({
    provider: 'gemini',
    api_key: 'AIza-test'
  }).success, false);
  assertEquals(aiSettingsTestProviderInputSchema.safeParse({
    provider: 'openrouter',
    api_key: 'sk-or-test'
  }).success, true);
  assertEquals(aiSettingsTestProviderInputSchema.safeParse({
    provider: 'unknown',
    api_key: 'test'
  }).success, false);
  assertEquals(aiSettingsSaveModelInputSchema.safeParse({
    provider: 'openrouter',
    model_id: 'deepseek/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    enabled: true,
    is_default: true,
    currency: 'USD',
    input_price_per_million: 0.435,
    output_price_per_million: 0.87,
    cached_input_price_per_million: null,
    reasoning_price_per_million: null,
    price_effective_at: null,
    max_output_tokens: 2000,
    temperature: 0.2
  }).success, true);
  assertEquals(aiSettingsSaveModelInputSchema.safeParse({
    provider: 'openrouter',
    model_id: 'deepseek/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    enabled: true,
    is_default: true,
    currency: 'USD',
    input_price_per_million: 0.435,
    output_price_per_million: 0.87,
    cached_input_price_per_million: null,
    reasoning_price_per_million: null,
    price_effective_at: null,
    max_output_tokens: 2000,
    temperature: 0.2,
    api_key: 'secret'
  }).success, false);
  assertEquals(aiSettingsSaveQuotaInputSchema.safeParse({
    id: crypto.randomUUID(),
    enabled: true,
    daily_call_limit: 25,
    monthly_call_limit: 500,
    daily_token_limit: 100000,
    monthly_token_limit: 2000000,
    daily_cost_limit: 5,
    monthly_cost_limit: 100,
    currency: 'USD'
  }).success, true);
});

Deno.test('AI prompt and usage contracts are strict', () => {
  const templateId = crypto.randomUUID();
  const version = {
    id: crypto.randomUUID(),
    template_id: templateId,
    version: 1,
    status: 'published',
    body: 'Retourne un JSON strict.',
    change_note: null,
    created_by: null,
    published_by: null,
    published_at: '2026-06-27T16:00:00Z',
    created_at: '2026-06-27T16:00:00Z'
  };

  assertEquals(aiPromptsSaveDraftInputSchema.safeParse({
    template_id: templateId,
    body: 'Nouveau prompt',
    change_note: null
  }).success, true);
  assertEquals(aiPromptsListResponseSchema.safeParse({
    ok: true,
    prompts: [{
      id: templateId,
      feature: 'pricing.references.diagnose',
      label: 'Diagnostic referentiels CIR',
      description: null,
      allowed_variables: ['generated_at'],
      created_at: '2026-06-27T16:00:00Z',
      updated_at: '2026-06-27T16:00:00Z',
      versions: [version],
      published_version: version,
      draft_version: null
    }]
  }).success, true);

  assertEquals(aiUsageSummaryResponseSchema.safeParse({
    ok: true,
    summary: {
      calls: 1,
      successful_calls: 1,
      failed_calls: 0,
      cache_hits: 0,
      input_tokens: 100,
      output_tokens: 40,
      cached_input_tokens: 0,
      reasoning_tokens: 0,
      cost_amount: 0,
      currency: 'USD',
      period_start: '2026-06-01T00:00:00Z',
      period_end: '2026-06-27T16:00:00Z',
      budget_alerts: [],
      daily: [{
        date: '2026-06-27',
        calls: 1,
        errors: 0,
        cache_hits: 0,
        input_tokens: 100,
        output_tokens: 40,
        cost_amount: 0
      }]
    }
  }).success, true);
  assertEquals(aiUsageListResponseSchema.safeParse({
    ok: true,
    events: [],
    page: 1,
    page_size: 50,
    total: 0
  }).success, true);
});
