import * as migration_20260909_045755_foundation from './20260909_045755_foundation';
import * as migration_20260927_190344_factions_equipment from './20260927_190344_factions_equipment';
import * as migration_20260928_120000_route_key_repair from './20260928_120000_route_key_repair';
import * as migration_20260928_193304_media_derivatives_storage from './20260928_193304_media_derivatives_storage';
import * as migration_20260928_200000_reconcile_legacy_indexes from './20260928_200000_reconcile_legacy_indexes';

export const migrations = [
  {
    up: migration_20260909_045755_foundation.up,
    down: migration_20260909_045755_foundation.down,
    name: '20260909_045755_foundation',
  },
  {
    up: migration_20260927_190344_factions_equipment.up,
    down: migration_20260927_190344_factions_equipment.down,
    name: '20260927_190344_factions_equipment',
  },
  {
    up: migration_20260928_120000_route_key_repair.up,
    down: migration_20260928_120000_route_key_repair.down,
    name: '20260928_120000_route_key_repair',
  },
  {
    up: migration_20260928_193304_media_derivatives_storage.up,
    down: migration_20260928_193304_media_derivatives_storage.down,
    name: '20260928_193304_media_derivatives_storage'
  },
  {
    up: migration_20260928_200000_reconcile_legacy_indexes.up,
    down: migration_20260928_200000_reconcile_legacy_indexes.down,
    name: '20260928_200000_reconcile_legacy_indexes'
  },
];
