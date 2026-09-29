import * as migration_20260928_190000_patreon_tier_access from './20260928_190000_patreon_tier_access';
import * as migration_20260928_180000_classified_access from './20260928_180000_classified_access';
import * as migration_20260909_045755_foundation from './20260909_045755_foundation';
import * as migration_20260927_190344_factions_equipment from './20260927_190344_factions_equipment';
import * as migration_20260928_120000_route_key_repair from './20260928_120000_route_key_repair';
import * as migration_20260928_160000_media_image_sizes from './20260928_160000_media_image_sizes';

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
  {
    up: migration_20260928_120000_route_key_repair.up,
    down: migration_20260928_120000_route_key_repair.down,
    name: '20260928_120000_route_key_repair'
  },
  {
    up: migration_20260928_160000_media_image_sizes.up,
    down: migration_20260928_160000_media_image_sizes.down,
    name: '20260928_160000_media_image_sizes'
  },
  { up: migration_20260928_180000_classified_access.up, down: migration_20260928_180000_classified_access.down, name: '20260928_180000_classified_access' },
  { up: migration_20260928_190000_patreon_tier_access.up, down: migration_20260928_190000_patreon_tier_access.down, name: '20260928_190000_patreon_tier_access' },
];
