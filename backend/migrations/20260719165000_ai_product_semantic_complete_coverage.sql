-- Une demande explicite de couverture complete qualifie toutes les variantes du
-- produit, sans elargir le perimetre a ses familles parentes.

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
      and change_note = 'Couverture complete sans hyperonymes'
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
      published_body || E'\n\nPROTOCOLE DE RECHERCHE PRODUIT SEMANTIQUE :\nQuand l utilisateur demande explicitement tous les types, toutes les series, variantes, gammes ou familles du produit, qualifie toutes les familles CIR qui nomment directement ce produit sans demander laquelle choisir. Une famille parente ou voisine qui ne nomme pas directement le produit n est jamais une variante du produit : exclus-la avec wrong_product_type, meme si ses exemples contiennent des produits adjacents. Les expressions de positive_terms restent au meme niveau de precision que le produit demande et ne contiennent jamais ses hyperonymes. N invente aucun total, SQL, code CIR, snapshot ou identifiant.',
      'Couverture complete sans hyperonymes',
      now()
    );
  end if;
end;
$$;
