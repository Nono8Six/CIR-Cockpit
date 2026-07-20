-- Restreint les termes positifs aux equivalents exacts du produit recherche.

do $$
declare
  assistant_template_id uuid;
  published_body text;
  next_version integer;
begin
  select t.id, v.body
  into assistant_template_id, published_body
  from public.ai_prompt_templates t
  join public.ai_prompt_versions v on v.template_id = t.id
  where t.feature = 'assistant.referentiels'
    and t.archived_at is null
    and v.status = 'published'
  order by v.version desc
  limit 1;

  if assistant_template_id is null or published_body is null then
    raise exception 'Prompt publie assistant.referentiels introuvable.';
  end if;

  if not exists (
    select 1
    from public.ai_prompt_versions
    where template_id = assistant_template_id
      and change_note = 'Termes produit exacts sans familles parentes'
  ) then
    select coalesce(max(version), 0) + 1
    into next_version
    from public.ai_prompt_versions
    where template_id = assistant_template_id;

    update public.ai_prompt_versions
    set status = 'archived'
    where template_id = assistant_template_id
      and status = 'published';

    insert into public.ai_prompt_versions(
      template_id, version, status, body, change_note, published_at
    ) values (
      assistant_template_id,
      next_version,
      'published',
      published_body || E'\n\nPROTOCOLE DE RECHERCHE PRODUIT SEMANTIQUE :\nDans search_product_candidates, positive_terms contient uniquement des equivalents lexicaux exacts du produit demande en francais, anglais ou acronyme. N y place jamais un hyperonyme, une famille parente, un usage, un composant ou un accessoire. Place les libelles plus larges seulement dans classification_hints. Pour la qualification, un classification_scope represente toute une famille CIR et toutes ses CAT_FAB. Accepte les familles qui nomment exactement le produit et le contexte demandes ; exclus uniquement les energies ou types de produits explicitement contradictoires. Pour direct_label, accepte par defaut tout libelle qui nomme le produit sans contradiction explicite. Une marque, serie ou formulation inconnue n est jamais une raison d exclusion. Demande une clarification seulement pour une ambiguite metier reelle qui modifierait le perimetre, jamais pour confirmer des familles dont le chemin CIR nomme deja exactement le produit demande. N invente aucun total, SQL, code CIR, snapshot ou identifiant.',
      'Termes produit exacts sans familles parentes',
      now()
    );
  end if;
end;
$$;
