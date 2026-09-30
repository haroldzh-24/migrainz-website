/** Stable keys shared by the adapter and the opt-in recovery tool. No DB prefix field. */
export function blobPathname(filename: string): string {
  if (!filename || filename === '.' || filename === '..' || /[/\\%?#\u0000-\u001f]/.test(filename)) {
    throw new Error('Invalid Media filename.');
  }
  return `media/${filename}`;
}
