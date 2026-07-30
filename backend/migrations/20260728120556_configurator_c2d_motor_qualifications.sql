alter table configurator.motor_model
  add column requires_vfd boolean,
  add column is_iec_standard boolean,
  add column article_no_status text;

alter table configurator.motor_model
  add constraint motor_model_requires_vfd_consistency_check
    check (
      requires_vfd is null
      or requires_vfd = (motor_technology in ('PMaSynRM', 'SynRM', 'PM'))
    ),
  add constraint motor_model_iec_classification_check
    check (
      is_iec_standard is null
      or is_iec_standard
      or shaft_spec = 'integrated_gearmotor_non_iec'
    ),
  add constraint motor_model_article_no_status_check
    check (
      article_no_status is null
      or (article_no_status = 'published' and article_no is not null)
      or (article_no_status = 'not_published_in_source' and article_no is null)
    );

comment on column configurator.motor_model.requires_vfd is
  'Vrai uniquement lorsque la technologie impose une alimentation par variateur ; NULL sur les snapshots historiques non qualifies.';

comment on column configurator.motor_model.is_iec_standard is
  'Qualification explicite IEC du moteur ; false exige shaft_spec=integrated_gearmotor_non_iec. NULL sur les snapshots historiques non qualifies.';

comment on column configurator.motor_model.article_no_status is
  'Statut factuel de la reference fabricant dans la source du snapshot : published ou not_published_in_source ; NULL sur les snapshots historiques non qualifies.';
