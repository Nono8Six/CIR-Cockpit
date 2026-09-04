set local lock_timeout = '5s';
set local statement_timeout = '120s';

drop schema if exists configurator cascade;

drop function if exists private.configurator_actor_id();
drop function if exists private.configurator_actor_is_active();
drop function if exists private.configurator_current_agency_id();
drop function if exists private.configurator_enforce_motor_supply_mode();
drop function if exists private.configurator_prepare_saved_configuration();
drop function if exists private.configurator_snapshot_is_mutable(uuid);
drop function if exists private.configurator_validate_motor_dimension();
