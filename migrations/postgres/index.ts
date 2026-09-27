import * as migration_20260909_045755_foundation from './20260909_045755_foundation';
import * as migration_20260927_190344_factions_equipment from './20260927_190344_factions_equipment';

export const migrations = [
  {
    up: migration_20260909_045755_foundation.up,
    down: migration_20260909_045755_foundation.down,
    name: '20260909_045755_foundation',
  },
  {
    up: migration_20260927_190344_factions_equipment.up,
    down: migration_20260927_190344_factions_equipment.down,
    name: '20260927_190344_factions_equipment'
  },
];
