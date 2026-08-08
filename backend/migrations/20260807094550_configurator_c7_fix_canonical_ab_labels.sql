-- Correction des libelles canoniques des cotes A et B.
--
-- Constat du 06/08/2026 : les libelles francais des cotes A et B etaient
-- permutes. Les valeurs stockees dans configurator.motor_dimension suivent la
-- convention IEC, ou A est l'entraxe transversal des pieds : 140 mm en carcasse
-- 90, 216 mm en 132, 279 mm en 180 et 406 mm en 250. Tout le frontend libelle
-- egalement A comme transversal. Seuls les deux libelles etaient inverses.
--
-- Migration additive : aucune valeur mesuree n'est touchee, seuls deux libelles
-- changent. Les deux mises a jour sont gardees par leur ancienne valeur, donc
-- rejouer cette migration ne fait rien. Rollback : rejouer la permutation
-- inverse dans une nouvelle migration additive.

update configurator.motor_dimension_canonical
   set label_fr = 'Entraxe transversal des pieds'
 where code = 'A'
   and label_fr = 'Entraxe longitudinal des pieds';

update configurator.motor_dimension_canonical
   set label_fr = 'Entraxe longitudinal des pieds'
 where code = 'B'
   and label_fr = 'Entraxe transversal des pieds';

-- Verification : la migration echoue bruyamment si l'etat final n'est pas celui
-- attendu, plutot que de passer silencieusement sur un etat imprevu.
do $$
declare
  a_label text;
  b_label text;
begin
  select label_fr into a_label
    from configurator.motor_dimension_canonical where code = 'A';
  select label_fr into b_label
    from configurator.motor_dimension_canonical where code = 'B';

  if a_label is distinct from 'Entraxe transversal des pieds'
     or b_label is distinct from 'Entraxe longitudinal des pieds' then
    raise exception
      'Libelles canoniques A/B inattendus apres correction : A=%, B=%',
      a_label, b_label;
  end if;
end
$$;