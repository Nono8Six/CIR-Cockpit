-- Recherche produit a rappel eleve : qualifier les perimetres CIR, jamais chaque serie.

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
      and change_note = 'Recherche produit par perimetres CIR a rappel eleve'
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
      published_body || E'\n\nPROTOCOLE DE RECHERCHE PRODUIT SEMANTIQUE :\nPour une recherche produit ouverte, commence par search_product_candidates afin de definir le concept, ses synonymes multilingues, ses contextes confirmants et ses contradictions explicites. Le resultat distingue classification_scope et direct_label. Un classification_scope represente une famille CIR complete : juge uniquement le sens du chemin CIR et accepte ensuite toute la famille sans reconnaitre chaque marque, serie ou CAT_FAB. Un direct_label est un libelle restant hors des familles candidates : accepte-le par defaut s il designe le produit et ne porte aucune contradiction explicite. N exclus un candidat que pour wrong_energy ou wrong_product_type, avec un signal visible dans le libelle, le chemin CIR ou les signaux contradictoires. L absence de familiarite avec une marque, une serie, un acronyme ou un libelle anglais n est jamais une exclusion. Si un candidat potentiellement pertinent reste reellement ambigu, appelle request_product_clarification avant tout total. N invente aucun SQL, code CIR, snapshot, table, identifiant ou total. Ne fournis jamais de chaine de pensee : seulement les choix structures et des justifications courtes.',
      'Recherche produit par perimetres CIR a rappel eleve',
      now()
    );
  end if;
end;
$$;
