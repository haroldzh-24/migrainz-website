import 'server-only';
import { getEquipmentDirectory, getFactions, getProject, getProjectIdentity } from './queries';

/**
 * A project's section links (OVERVIEW, FACTIONS, CHARACTERS, EQUIPMENT, WRITING, GALLERY), shared by the project
 * window's tab row and the equipment directory, which sits outside the window (design canvas board 22). Sections with
 * nothing public are left out. Undefined for a missing or classified project.
 */
export async function projectSections(slug: string, knownEquipment?: readonly unknown[]) {
  const [project, identity] = await Promise.all([getProject(slug), getProjectIdentity(slug)]);
  if (!project || !identity) return undefined;
  // The equipment directory passes the listing it already loaded, so the EQUIPMENT tab costs no second listing there.
  const [factions, equipment] = await Promise.all([getFactions(identity.id), knownEquipment ?? getEquipmentDirectory(identity.id)]);
  const base = `/projects/${project.slug}`;
  const navigation = [{ label: 'OVERVIEW', href: base },
    ...(factions.length ? [{ label: 'FACTIONS', href: `${base}#factions` }] : []),
    ...(project.characters.length ? [{ label: 'CHARACTERS', href: `${base}/characters` }] : []),
    ...(equipment.length ? [{ label: 'EQUIPMENT', href: `${base}/equipment` }] : []),
    ...(project.writing ? [{ label: 'WRITING', href: `${base}#writing` }] : []),
    ...(project.galleries.length ? [{ label: 'GALLERY', href: `${base}#gallery-${project.galleries[0].slug}` }] : [])];
  return { project, identity, equipment, navigation };
}
