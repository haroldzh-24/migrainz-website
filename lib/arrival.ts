// How the current page was reached (batch 14), for effects that play only on a client-side arrival. PageTransition
// keeps it: `hydrated` turns true in its passive effect after the first render (which runs after every layout effect of
// that render), and `lastPath` is updated there too, so a heading mounting with the new page still reads, in its own
// layout effect, the path it came from. Client-only; never read during server rendering.
export const arrival: { hydrated: boolean; lastPath: string | null } = { hydrated: false, lastPath: null };

/**
 * A once-per-visit record of paths (a visit is a tab session): a module Set, which client navigations share, plus
 * sessionStorage on top so a reload in the same tab remembers it. Each storage read and write has its own try; a
 * corrupt value is ignored. Blocked storage still records within the tab's page lifetime.
 */
export function visitRecord(key: string) {
  let paths: Set<string> | null = null;
  const load = () => {
    if (paths) return paths;
    paths = new Set();
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      if (Array.isArray(value)) for (const item of value) if (typeof item === "string") paths.add(item);
    } catch { /* corrupt or blocked: start empty */ }
    return paths;
  };
  return {
    has: (path: string) => load().has(path),
    add: (path: string) => {
      load().add(path);
      try { sessionStorage.setItem(key, JSON.stringify([...load()].slice(-200))); } catch { /* this page only */ }
    },
  };
}
