-- Opportunite commerciale sur les interactions : etape de vente, montant, devis, cloture.
-- Champs additifs et nullables : aucun impact sur les lignes existantes (stage null = a qualifier).

alter table public.interactions
  add column if not exists stage text
    constraint interactions_stage_check
      check (stage in ('qualification', 'quote_sent', 'negotiation', 'won', 'lost')),
  add column if not exists amount numeric(12, 2)
    constraint interactions_amount_check
      check (amount >= 0),
  add column if not exists quote_sent_at timestamptz,
  add column if not exists lost_reason text,
  add column if not exists stage_changed_at timestamptz;

comment on column public.interactions.stage is
  'Etape de vente du dossier (pipeline) ; null = a qualifier.';
comment on column public.interactions.amount is
  'Montant estime ou devise du dossier, en euros.';
comment on column public.interactions.quote_sent_at is
  'Date du premier envoi de devis sur le dossier.';
comment on column public.interactions.lost_reason is
  'Motif de perte saisi lors du passage a l''etape lost.';
comment on column public.interactions.stage_changed_at is
  'Dernier changement d''etape, pour mesurer l''age dans l''etape.';

create index if not exists idx_interactions_agency_stage
  on public.interactions (agency_id, stage)
  where stage is not null;
