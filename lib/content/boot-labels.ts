// File-style names for the boot checklist. Pure functions, no data access; scripts/verify-boot-labels.ts checks them.

export const fileName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'file';

/** `<project>_<phase>`, without doubling the project when the phase title already starts with it (`BLUSHLAND CH1`). */
export function phaseLabel(projectSlug: string | undefined, title: string) {
  const name = fileName(title);
  if (!projectSlug) return name;
  const project = fileName(projectSlug);
  return name === project || name.startsWith(`${project}_`) ? name : fileName(`${projectSlug}_${title}`);
}
