// File-style names for the boot checklist. Pure functions, no data access; scripts/verify-boot-labels.ts checks them.

// Trim separators after the 28-character cut too, so a cut right after a word never leaves a trailing `_`.
export const fileName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 28).replace(/^_+|_+$/g, '') || 'file';

/** `<project slug>_<phase>`, without doubling it when the phase title already starts with the slug (`BLUSHLAND CH1`).
 *  Compared against the slug, not the project title: a project whose slug differs from its title can still double. */
export function phaseLabel(projectSlug: string | undefined, title: string) {
  const name = fileName(title);
  if (!projectSlug) return name;
  const project = fileName(projectSlug);
  return name === project || name.startsWith(`${project}_`) ? name : fileName(`${projectSlug}_${title}`);
}
