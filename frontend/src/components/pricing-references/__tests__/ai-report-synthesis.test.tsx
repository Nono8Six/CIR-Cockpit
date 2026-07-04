import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiReportSynthesis } from '@/components/pricing-references/components/ai/ai-report-synthesis';
import { getAiSettings } from '@/services/ai';
import type { PricingReferenceHealthReport } from '../../../../../shared/schemas/pricing/references.schema';

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

vi.mock('@/services/pricingReferences', () => ({
  diagnosePricingReference: vi.fn()
}));

vi.mock('@/services/ai', () => ({
  getAiSettings: vi.fn(async () => ({
    ok: true,
    providers: [
      {
        id: '00000000-0000-4000-8000-000000000010',
        provider: 'openrouter',
        label: 'OpenRouter',
        enabled: false,
        has_api_key: false,
        api_key_last4: null,
        base_url: null,
        organization_id: null,
        last_test_status: null,
        last_test_at: null,
        last_error_code: null,
        last_error_message: null,
        created_at: '2026-06-27T16:00:00.000Z',
        updated_at: '2026-06-27T16:00:00.000Z'
      }
    ],
    models: [
      {
        id: '00000000-0000-4000-8000-000000000011',
        provider_config_id: '00000000-0000-4000-8000-000000000010',
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
        created_at: '2026-06-27T16:00:00.000Z',
        updated_at: '2026-06-27T16:00:00.000Z'
      }
    ],
    quotas: [
      {
        id: '00000000-0000-4000-8000-000000000012',
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
        created_at: '2026-06-27T16:00:00.000Z',
        updated_at: '2026-06-27T16:00:00.000Z'
      }
    ]
  }))
}));

const report: PricingReferenceHealthReport = {
  generated_at: '2026-06-27T16:00:00.000Z',
  storage: {
    bucket: 'pricing-reference-sources',
    max_file_size_bytes: 52428800,
    allowed_extensions: ['.xlsx']
  },
  files: {
    classification: {
      file_kind: 'classification',
      original_filename: 'classification.xlsx',
      storage_path: null,
      sha256: 'a'.repeat(64),
      size_bytes: 1024,
      sheet_name: 'Feuil1',
      rows_count: 12,
      columns_count: 6,
      columns: { expected: [], detected: [], missing: [] }
    },
    segments_grids: {
      file_kind: 'segments_grids',
      original_filename: 'segments.xlsx',
      storage_path: null,
      sha256: 'b'.repeat(64),
      size_bytes: 2048,
      sheet_name: 'Feuil1',
      rows_count: 34,
      columns_count: 12,
      columns: { expected: [], detected: [], missing: [] }
    }
  },
  classification: {
    rows_count: 12,
    columns_count: 6,
    unique_cir_keys: 12,
    duplicate_cir_keys: 0,
    mandatory_empty_rows: 0
  },
  segments_grids: {
    rows_count: 34,
    columns_count: 12,
    unique_segment_identities: 34,
    identity_incomplete_rows: 0,
    classification_incomplete_rows: 0,
    cir_keys_not_validated_rows: 0,
    purchase_grid_missing_rows: 0
  },
  anomalies: { total: 1, bloquante: 0, haute: 1, moyenne: 0, faible: 0 },
  anomaly_samples: []
};

const renderWithQueryClient = (children: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
};

describe('AiReportSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose API key or pricing inputs on the referentials page panel', async () => {
    renderWithQueryClient(
      <AiReportSynthesis
        report={report}
        importId="00000000-0000-4000-8000-000000000001"
        fileType="segments_grids"
      />
    );

    expect(await screen.findByText(/Synthèse IA ·/i)).toBeInTheDocument();
    expect(getAiSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /lancer la synthèse/i })).toBeDisabled();
    expect(screen.queryByLabelText(/clé api/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tarif/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Paramétrage IA requis/i)).toBeInTheDocument();
  });
});
