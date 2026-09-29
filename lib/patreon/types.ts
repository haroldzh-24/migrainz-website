export type ViewerAccess = {
  signedIn: boolean;
  userID?: string;
  memberID?: string;
  activePatron: boolean;
  tierIDs: string[];
  verification: 'verified' | 'unavailable';
};

export const anonymousAccess: ViewerAccess = { signedIn: false, activePatron: false, tierIDs: [], verification: 'verified' };

export function entitledTo(requiredTierIDs: unknown, viewer: ViewerAccess): boolean {
  if (!viewer.activePatron || viewer.verification !== 'verified') return false;
  if (requiredTierIDs == null) return true;
  if (!Array.isArray(requiredTierIDs) || !requiredTierIDs.every(id => typeof id === 'string' && /^\d+$/.test(id))) return false;
  return requiredTierIDs.length === 0 || requiredTierIDs.some(id => viewer.tierIDs.includes(id));
}
