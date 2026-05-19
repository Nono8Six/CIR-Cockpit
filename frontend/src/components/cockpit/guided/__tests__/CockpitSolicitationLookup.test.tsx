import { useState, type ChangeEvent } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CockpitSolicitationLookup from '@/components/cockpit/guided/CockpitSolicitationLookup';
import { useCockpitPhoneLookup } from '../../../../hooks/cockpit-utils/useCockpitPhoneLookup';
import type { Interaction } from '@/types';

vi.mock('@/hooks/cockpit-utils/useCockpitPhoneLookup', () => ({
  useCockpitPhoneLookup: vi.fn()
}));

const setValue = vi.fn();

const buildInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: overrides.id ?? '33333333-3333-4333-8333-333333333333',
  agency_id: overrides.agency_id ?? '11111111-1111-4111-8111-111111111111',
  channel: overrides.channel ?? 'Téléphone',
  entity_type: overrides.entity_type ?? 'sollicitation',
  company_name: overrides.company_name ?? 'Sollicitation',
  contact_name: overrides.contact_name ?? 'Marie Martin',
  contact_phone: overrides.contact_phone ?? '05 58 36 96 19',
  contact_email: overrides.contact_email ?? null,
  contact_service: overrides.contact_service ?? '',
  subject: overrides.subject ?? 'Demande de rappel',
  mega_families: overrides.mega_families ?? [],
  status: overrides.status ?? '',
  status_id: overrides.status_id ?? 'status-1',
  status_is_terminal: overrides.status_is_terminal ?? false,
  interaction_type: overrides.interaction_type ?? 'Demande',
  order_ref: overrides.order_ref ?? null,
  reminder_at: overrides.reminder_at ?? null,
  notes: overrides.notes ?? null,
  entity_id: overrides.entity_id ?? null,
  contact_id: overrides.contact_id ?? null,
  created_by: overrides.created_by ?? 'user-1',
  updated_by: overrides.updated_by ?? null,
  created_at: overrides.created_at ?? '2026-01-01T08:00:00Z',
  updated_at: overrides.updated_at ?? '2026-01-01T08:00:00Z',
  last_action_at: overrides.last_action_at ?? '2026-01-02T08:00:00Z',
  timeline: overrides.timeline ?? []
});

const renderLookup = (onComplete = vi.fn(), interactions: Interaction[] = []) => {
  const Harness = () => {
    const [phone, setPhone] = useState('');

    return (
      <CockpitSolicitationLookup
        activeAgencyId="11111111-1111-4111-8111-111111111111"
        errors={{}}
        companyField={{ name: 'company_name', onBlur: vi.fn(), onChange: vi.fn(), ref: vi.fn() }}
        companyName=""
        showSuggestions={false}
        onShowSuggestionsChange={vi.fn()}
        companySuggestions={[]}
        companyInputRef={{ current: null }}
        contactPhoneField={{ name: 'contact_phone', onBlur: vi.fn(), onChange: vi.fn(), ref: vi.fn() }}
        contactPhone={phone}
        onContactPhoneChange={(event: ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
        setValue={setValue}
        interactions={interactions}
        onComplete={onComplete}
      />
    );
  };

  return render(<Harness />);
};

const expectInteractionOnlyValues = (phone: string, name = '') => {
  expect(setValue).toHaveBeenCalledWith('entity_id', '', expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('contact_id', '', expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('company_name', 'Sollicitation', expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('contact_name', name, expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('contact_first_name', '', expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('contact_last_name', '', expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('contact_position', '', expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('contact_email', '', expect.any(Object));
  expect(setValue).toHaveBeenCalledWith('contact_phone', phone, expect.any(Object));
};

describe('CockpitSolicitationLookup', () => {
  it('recherche par numero et cree une sollicitation interaction-only sans contact', async () => {
    vi.mocked(useCockpitPhoneLookup).mockReturnValue({
      data: { ok: true, normalized_phone: '0558965212', total: 0, matches: [] },
      isFetching: false,
      normalizedPhone: '0558965212'
    } as unknown as ReturnType<typeof useCockpitPhoneLookup>);
    const user = userEvent.setup();
    const onComplete = vi.fn();
    setValue.mockClear();

    renderLookup(onComplete);

    await user.type(screen.getByPlaceholderText('Rechercher par numéro de téléphone…'), '05 58 96 52 12');
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await user.type(screen.getByRole('textbox', { name: /nom de la sollicitation/i }), 'Jean Dupont');
    expect(screen.getByRole('textbox', { name: /téléphone de la sollicitation/i })).toHaveValue('05 58 96 52 12');
    await user.click(screen.getByRole('button', { name: /utiliser cette sollicitation/i }));

    expectInteractionOnlyValues('05 58 96 52 12', 'Jean Dupont');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('selectionne un historique par numero sans definir entity_id ni contact_id', async () => {
    vi.mocked(useCockpitPhoneLookup).mockReturnValue({
      data: {
        ok: true,
        normalized_phone: '0558965212',
        total: 1,
        matches: [{
          id: '22222222-2222-4222-8222-222222222222',
          channel: 'Téléphone',
          entity_type: 'Sollicitation',
          company_name: 'Ancien libelle',
          contact_name: 'Ancien contact',
          contact_phone: '05 58 96 52 12',
          subject: 'Question livraison',
          status_id: null,
          interaction_type: 'Demande',
          entity_id: null,
          contact_id: null,
          created_at: '2026-01-01T08:00:00Z',
          last_action_at: '2026-01-02T08:00:00Z'
        }]
      },
      isFetching: false,
      normalizedPhone: '0558965212'
    } as unknown as ReturnType<typeof useCockpitPhoneLookup>);
    const user = userEvent.setup();
    const onComplete = vi.fn();
    setValue.mockClear();

    renderLookup(onComplete);

    await user.click(screen.getByRole('button', { name: /Question livraison/i }));

    expectInteractionOnlyValues('05 58 96 52 12', 'Ancien contact');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('permet une creation rapide meme sans numero pre-saisi dans la recherche', async () => {
    vi.mocked(useCockpitPhoneLookup).mockReturnValue({
      data: { ok: true, normalized_phone: '', total: 0, matches: [] },
      isFetching: false,
      normalizedPhone: ''
    } as unknown as ReturnType<typeof useCockpitPhoneLookup>);
    const user = userEvent.setup();
    const onComplete = vi.fn();
    setValue.mockClear();

    renderLookup(onComplete);

    expect(screen.getByText('Saisis un numéro pour retrouver l’historique.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await user.type(screen.getByRole('textbox', { name: /nom de la sollicitation/i }), 'Comptoir Nord');
    await user.type(screen.getByRole('textbox', { name: /téléphone de la sollicitation/i }), '0558965212');
    await user.click(screen.getByRole('button', { name: /utiliser cette sollicitation/i }));

    expectInteractionOnlyValues('05 58 96 52 12', 'Comptoir Nord');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('affiche les dernieres sollicitations enregistrees et les reprend en interaction-only', async () => {
    vi.mocked(useCockpitPhoneLookup).mockReturnValue({
      data: { ok: true, normalized_phone: '', total: 0, matches: [] },
      isFetching: false,
      normalizedPhone: ''
    } as unknown as ReturnType<typeof useCockpitPhoneLookup>);
    const user = userEvent.setup();
    const onComplete = vi.fn();
    setValue.mockClear();

    renderLookup(onComplete, [
      buildInteraction({ contact_name: 'Hors sujet', entity_type: 'Client à terme' }),
      buildInteraction({ contact_name: 'Marie Martin', contact_phone: '05 58 36 96 19' })
    ]);

    expect(screen.getByText('Dernières sollicitations')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.queryByText('Hors sujet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Marie Martin/i }));

    expectInteractionOnlyValues('05 58 36 96 19', 'Marie Martin');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
