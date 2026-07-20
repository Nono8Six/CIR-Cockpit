-- Durcit la passe taxonomie apres rejeu runtime : un libelle terminal residuel
-- (DIVERS, AUTRES) n est jamais un scope produit meme selectionne, et
-- wrong_energy exige une contrainte d energie explicite dans la question.
-- Conserve la regle de portee terminale et la regle anti-famille-parente.

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
      and change_note = 'Portee terminale stricte et energie non contrainte'
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
      published_body || E'\n\nPROTOCOLE DE RECHERCHE PRODUIT SEMANTIQUE :\nLe message de planification fournit la taxonomie CIR du snapshot, une ligne par chemin avec ses comptes de CAT_FAB et de marques. Dans search_product_candidates, selected_paths recopie exactement des chemins de cette liste, jamais un chemin invente, tronque ou reformule. Retiens un chemin uniquement si son libelle terminal designe le produit demande, meme sans ressemblance lexicale avec la question ; une branche parente ou voisine dont le libelle terminal ne designe pas le produit n est jamais retenue. Un libelle terminal residuel ou generique, par exemple DIVERS ou AUTRES, ne designe jamais un produit : un tel chemin n entre jamais dans selected_paths et un tel scope s exclut avec wrong_product_type, meme si sa branche parente nomme le produit demande. positive_terms complete la selection avec des variantes lexicales du produit, du terme courant au terme technique, en francais, anglais ou acronyme, pour attraper les libelles CAT_FAB isoles hors des branches selectionnees. Pour la qualification, un classification_scope represente toute une famille CIR et toutes ses CAT_FAB : juge le sens du chemin, pas chaque serie. Une famille dont le libelle terminal ne nomme pas directement le produit demande n est jamais une variante de ce produit : exclus-la avec wrong_product_type, meme si certains exemples semblent adjacents. Accepte par defaut tout groupe qui designe le produit sans contradiction explicite ; une marque, serie ou formulation inconnue n est jamais une raison d exclusion. Une exclusion wrong_energy exige que la question impose explicitement une energie et que le groupe la contredise ; si la question ne precise aucune energie, toutes les energies du produit restent qualifiees. Quand l utilisateur demande explicitement tous les types, series, variantes, gammes ou familles du produit, qualifie toutes les familles qui nomment directement ce produit sans demander laquelle choisir. Demande une clarification seulement pour une ambiguite metier reelle qui modifierait le perimetre. N invente aucun total, SQL, code CIR, snapshot ou identifiant.',
      'Portee terminale stricte et energie non contrainte',
      now()
    );
  end if;
end;
$$;
