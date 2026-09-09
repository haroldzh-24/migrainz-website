import * as migration_20260909_045755_foundation from './20260909_045755_foundation';

export const migrations = [
  {
    up: migration_20260909_045755_foundation.up,
    down: migration_20260909_045755_foundation.down,
    name: '20260909_045755_foundation'
  },
];
