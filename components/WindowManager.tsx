"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useSound } from "@/components/SoundProvider";
import { createPortal } from "react-dom";

type WindowPosition = { x: number; y: number };
type WindowSize = { width: number; height: number };
export type ViewerImage = { src: string; viewerSrc?: string; thumbnailSrc?: string; sources?: string[]; alt: string; caption?: string; width?: number; height?: number };
export type ViewerTab = {
  id: string;
  href: string;
  title: string;
  project: string;
  role?: string;
  description?: string;
  images: ViewerImage[];
  /** Shown when there is no artwork so the viewer never dead-ends (e.g. an equipment schematic poster). */
  poster?: ViewerImage;
};
type WindowRecord = {
  id: string;
  title: string;
  open: boolean;
  minimized: boolean;
  focused: boolean;
  zIndex: number;
  position: WindowPosition;
  size: WindowSize;
  maximized?: boolean;
};
type WindowManagerValue = {
  workspace: HTMLDivElement | null;
  setWorkspace: (element: HTMLDivElement | null) => void;
  systemWorkspace: HTMLDivElement | null;
  setSystemWorkspace: (element: HTMLDivElement | null) => void;
  desktopVisible: boolean;
  hideDesktop: () => void;
  windows: WindowRecord[];
  registerWindow: (window: Omit<WindowRecord, "focused" | "zIndex">) => void;
  unregisterWindow: (id: string) => void;
  focusWindow: (id: string, sound?: "click" | "open") => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  moveWindow: (id: string, position: WindowPosition) => void;
  toggleMaximizeWindow: (id: string) => void;
  viewerTabs: ViewerTab[];
  activeViewerTab: string | null;
  openViewerTab: (tab: ViewerTab) => void;
  switchViewerTab: (id: string) => void;
  closeViewerTab: (id: string) => void;
  // True briefly while the window manager itself hands focus back (no sound, no phone scroll).
  isQuietFocus: () => boolean;
};

const WindowManagerContext = createContext<WindowManagerValue | null>(null);
// True inside a route window's hidden copy (before its workspace exists): images there load lazily, so the hidden copy
// never fetches them (the visible copy does). Same value on the server and during hydration, so no mismatch.
const BeforeWorkspace = createContext(false);
export const useBeforeWorkspace = () => useContext(BeforeWorkspace);
const viewerWindowId = "art-viewer";
const viewerStorageKey = "migrainz-art-viewer-tabs-v2";
// Set when the viewer is closed, cleared when it opens: a page reload keeps the tabs but must not reopen a closed viewer.
export const viewerClosedKey = "migrainz-art-viewer-closed";
const viewerWindowDefaults = {
  position: { x: 70, y: 50 },
  size: { width: 900, height: 650 },
};

function readViewerTabs() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.sessionStorage.getItem(viewerStorageKey) || "[]");
    return Array.isArray(value) ? value as ViewerTab[] : [];
  } catch {
    return [];
  }
}

function windowSize(id: string, size: WindowSize, workspace: HTMLDivElement | null) {
  if (workspace && (id === viewerWindowId || id === "comic-reader")) {
    return { width: workspace.clientWidth * 0.78, height: workspace.clientHeight * 0.8 };
  }
  return size;
}

function clampPosition(position: WindowPosition, size: WindowSize, workspace: HTMLDivElement | null) {
  if (!workspace?.clientWidth || !workspace.clientHeight) return position;
  const maxX = Math.max(12, workspace.clientWidth - size.width - 12);
  const maxY = Math.max(12, workspace.clientHeight - size.height - 12);
  return {
    x: Math.max(12, Math.min(position.x, maxX)),
    y: Math.max(12, Math.min(position.y, maxY)),
  };
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<HTMLDivElement | null>(null);
  const [systemWorkspace, setSystemWorkspace] = useState<HTMLDivElement | null>(null);
  const workspaceFor = (id: string) => id === "system" ? systemWorkspace : workspace;
  const [desktopVisible, setDesktopVisible] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const showDesktop = () => {
    if (!desktopVisible) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDesktopVisible(true);
    }
  };
  const hideDesktop = () => {
    setDesktopVisible(false);
    setWindows((current) => current.map((window) => window.id === "system" ? { ...window, minimized: window.open, focused: false } : window));
    const target = returnFocus.current;
    (target?.isConnected ? target : document.getElementById("top"))?.focus({ preventScroll: true });
  };
  const [windows, setWindows] = useState<WindowRecord[]>([]);
  const [viewerTabs, setViewerTabs] = useState<ViewerTab[]>([]);
  const [activeViewerTab, setActiveViewerTab] = useState<string | null>(null);
  const [viewerHydrated, setViewerHydrated] = useState(false);
  const nextZIndex = useRef(10);
  // The control that opened the Art Viewer, so closing the viewer gives keyboard focus back to it (bugs.md 2026-10-27).
  const viewerOpener = useRef<HTMLElement | null>(null);
  // Until this time, focusing a window (focus handed back by the window manager itself) plays no sound and doesn't
  // scroll phones to the window's top.
  const quietFocusUntil = useRef(0);
  const quiet = () => performance.now() < quietFocusUntil.current;
  // Hands focus back after the viewer or one of its tabs closed, if focus fell to <body> (or is stuck in the closing
  // viewer); left alone when focus moved somewhere on purpose.
  const handBackFocus = (target: () => HTMLElement | null | undefined) => requestAnimationFrame(() => {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected && !active.closest(".art-viewer-window")) return;
    const element = target();
    if (!element) return;
    quietFocusUntil.current = performance.now() + 400;
    element.focus({ preventScroll: true });
  });
  const { playSound } = useSound();

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setWindows((current) => current.map((entry) => {
        const target = entry.id === "system" ? systemWorkspace : workspace;
        const position = clampPosition(entry.position, windowSize(entry.id, entry.size, target), target);
        return position.x === entry.position.x && position.y === entry.position.y ? entry : { ...entry, position };
      }));
    });
    if (workspace) observer.observe(workspace);
    if (systemWorkspace) observer.observe(systemWorkspace);
    return () => observer.disconnect();
  }, [workspace, systemWorkspace]);

  useEffect(() => {
    const tabs = readViewerTabs();
    setViewerTabs(tabs);
    setActiveViewerTab(tabs[0]?.id ?? null);
    setViewerHydrated(true);
  }, []);

  useEffect(() => {
    if (!viewerHydrated) return;
    try { window.sessionStorage.setItem(viewerStorageKey, JSON.stringify(viewerTabs)); } catch { /* Optional storage. */ }
  }, [viewerHydrated, viewerTabs]);

  const registerWindow = (window: Omit<WindowRecord, "focused" | "zIndex">) => {
    setWindows((current) => {
      const existing = current.find(entry => entry.id === window.id);
      if (existing) return existing.title === window.title ? current : current.map(entry => entry.id === window.id ? { ...entry, title: window.title } : entry);
      nextZIndex.current += 1;
      const target = workspaceFor(window.id);
      return [...current.map((entry) => window.open ? { ...entry, focused: false } : entry), { ...window, position: clampPosition(window.position, windowSize(window.id, window.size, target), target), focused: window.open, zIndex: nextZIndex.current }];
    });
  };
  const unregisterWindow = (id: string) => {
    setWindows((current) => {
      const remaining = current.filter((window) => window.id !== id);
      if (remaining.some((window) => window.focused)) return remaining;
      const topmost = remaining.filter((window) => window.open && !window.minimized)
        .sort((left, right) => right.zIndex - left.zIndex)[0];
      return remaining.map((window) => ({ ...window, focused: window.id === topmost?.id }));
    });
  };
  const focusWindow = (id: string, sound: "click" | "open" = "open") => {
    const handedBack = quiet();
    window.dispatchEvent(new Event('migrainz:window-activated'));
    nextZIndex.current += 1;
    setWindows((current) => current.map((window) => ({
      ...window,
      focused: window.id === id,
      zIndex: window.id === id ? nextZIndex.current : window.zIndex,
    })));
    if (!handedBack) playSound(sound);
  };
  const minimizeWindow = (id: string) => {
    if (id === "system") hideDesktop();
    setWindows((current) => current.map((window) => window.id === id ? { ...window, minimized: true, focused: false } : window));
    playSound("close");
  };
  const restoreWindow = (id: string) => {
    if (id === "system") showDesktop();
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: true, minimized: false } : window));
    focusWindow(id);
  };
  const closeWindow = (id: string) => {
    if (id === "system") hideDesktop();
    if (id === viewerWindowId) {
      try { window.sessionStorage.setItem(viewerClosedKey, "1"); } catch { /* Optional storage. */ }
      // Back to the opener, else the topmost other window, else the page's main section. Not while the SYSTEM monitor
      // is showing (it manages its own focus).
      const opener = viewerOpener.current;
      viewerOpener.current = null;
      if (!desktopVisible) handBackFocus(() => {
        if (document.querySelector(".art-viewer-window")) return null; // reopened meanwhile
        if (opener?.isConnected && !opener.closest("[inert]")) return opener;
        return [...document.querySelectorAll<HTMLElement>(".retro-window:not(.art-viewer-window)")].sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0]
          ?? document.getElementById("top");
      });
    }
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: false, minimized: false, focused: false } : window));
    playSound("close");
  };
  const moveWindow = (id: string, position: WindowPosition) => {
    const target = workspaceFor(id);
    setWindows((current) => current.map((window) => window.id === id ? { ...window, position: clampPosition(position, windowSize(id, window.size, target), target) } : window));
  };
  const toggleMaximizeWindow = (id: string) => {
    // Keep normal geometry intact; CSS supplies the target workspace bounds.
    setWindows((current) => current.map((window) => window.id === id ? { ...window, maximized: !window.maximized } : window));
  };

  const ensureViewerWindow = () => {
    try { window.sessionStorage.removeItem(viewerClosedKey); } catch { /* Optional storage. */ }
    nextZIndex.current += 1;
    setWindows((current) => {
      const existing = current.find((window) => window.id === viewerWindowId);
      if (existing) return current.map((window) => window.id === viewerWindowId ? { ...window, open: true, minimized: false, focused: true, zIndex: nextZIndex.current } : { ...window, focused: false });
      return [...current.map((window) => ({ ...window, focused: false })), {
        id: viewerWindowId,
        title: "ART VIEWER",
        open: true,
        minimized: false,
        focused: true,
        zIndex: nextZIndex.current,
        position: clampPosition(viewerWindowDefaults.position, windowSize(viewerWindowId, viewerWindowDefaults.size, workspace), workspace),
        size: viewerWindowDefaults.size,
      }];
    });
  };
  const openViewerTab = (tab: ViewerTab) => {
    // Remembered fresh on every open; cleared when nothing outside the viewer has focus (e.g. Safari after a click).
    const active = document.activeElement;
    if (!active?.closest(".art-viewer-window")) viewerOpener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setViewerTabs((current) => current.some((entry) => entry.id === tab.id) ? current : [...current, tab]);
    setActiveViewerTab(tab.id);
    ensureViewerWindow();
    playSound("open");
  };
  const switchViewerTab = (id: string) => {
    setActiveViewerTab(id);
    focusWindow(viewerWindowId, "click");
  };
  const closeViewerTab = (id: string) => {
    setViewerTabs((current) => {
      const index = current.findIndex((tab) => tab.id === id);
      const remaining = current.filter((tab) => tab.id !== id);
      if (activeViewerTab === id) setActiveViewerTab(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
      return remaining;
    });
    if (viewerTabs.length <= 1) closeWindow(viewerWindowId);
    else {
      playSound("close");
      // The closed tab's button is gone: focus the tab that is now active.
      handBackFocus(() => document.querySelector<HTMLElement>(".art-viewer-tab.is-active > button:first-child"));
    }
  };

  return <WindowManagerContext.Provider value={{ workspace, setWorkspace, systemWorkspace, setSystemWorkspace, desktopVisible, hideDesktop, windows, registerWindow, unregisterWindow, focusWindow, minimizeWindow, restoreWindow, closeWindow, moveWindow, toggleMaximizeWindow, viewerTabs, activeViewerTab, openViewerTab, switchViewerTab, closeViewerTab, isQuietFocus: quiet }}>{children}</WindowManagerContext.Provider>;
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return context;
}

export function RetroWindow({ id, title, defaultPosition, defaultSize, defaultOpen = true, defaultMaximized = false, className, children, titlebarContent, onToggleMaximize, renderBeforeWorkspace = false }: {
  id: string;
  title: string;
  defaultPosition: WindowPosition;
  defaultSize: WindowSize;
  defaultOpen?: boolean;
  defaultMaximized?: boolean;
  className?: string;
  children: ReactNode;
  titlebarContent?: ReactNode;
  onToggleMaximize?: () => void;
  // Route windows: render the content, hidden, until the workspace exists (server rendering and hydration). The page
  // then really renders on the server, so a missing record's notFound() sets HTTP 404 (bugs.md 2026-10-27, roadmap 2.2).
  // This relies on nothing deferring the window's content during the server render: no Suspense boundary or
  // loading.tsx between the root layout and route windows, and `cacheComponents` off (it wraps segments in
  // <Activity>). If either changes, scripts/verify-site-health.mjs's 404 list fails.
  renderBeforeWorkspace?: boolean;
}) {
  const manager = useWindowManager();
  const targetWorkspace = id === "system" ? manager.systemWorkspace : manager.workspace;
  const record = manager.windows.find((window) => window.id === id);
  const windowElement = useRef<HTMLElement>(null);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number; workspaceLeft: number; workspaceTop: number } | null>(null);

  useEffect(() => {
    manager.registerWindow({ id, title, open: defaultOpen, minimized: false, maximized: defaultMaximized, position: defaultPosition, size: defaultSize });
  }, [defaultMaximized, defaultOpen, defaultPosition, defaultSize, id, manager, title]);

  useEffect(() => {
    const element = windowElement.current;
    if (record?.focused && record.open && !record.minimized && element && !element.contains(document.activeElement)) element.focus({ preventScroll: true });
  }, [record?.focused, record?.open, record?.minimized]);

  useEffect(() => {
    if (manager.isQuietFocus()) return; // focus handed back after the viewer closed: keep the reader's place
    if ((id !== "system" || manager.desktopVisible) && record?.open && !record.minimized && record.focused && window.matchMedia("(max-width: 700px)").matches) {
      const element = windowElement.current;
      if (element && targetWorkspace) targetWorkspace.scrollTop = element.offsetTop;
    }
  }, [id, manager.desktopVisible, targetWorkspace, record?.open, record?.minimized, record?.focused]);

  // A route window's content appears only after hydration, so on a full page load the browser can't scroll to a
  // #fragment itself (it found, at most, the hidden copy): do it once the window's content is in place.
  useEffect(() => {
    if (!renderBeforeWorkspace || !targetWorkspace) return;
    const raw = window.location.hash.slice(1);
    let id = raw;
    try { id = decodeURIComponent(raw); } catch { /* a malformed escape (#%, #50%) is used as written */ }
    if (!id) return;
    const frame = requestAnimationFrame(() => windowElement.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [renderBeforeWorkspace, targetWorkspace]);

  const current = record ?? { id, title, open: defaultOpen, minimized: false, focused: false, zIndex: 1, position: defaultPosition, size: defaultSize };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, a")) return;
    if (current.maximized) return;
    if (window.matchMedia("(max-width: 700px)").matches) return;
    const windowBounds = event.currentTarget.parentElement?.getBoundingClientRect();
    const workspaceBounds = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!windowBounds || !workspaceBounds) return;
    drag.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - windowBounds.left,
      offsetY: event.clientY - windowBounds.top,
      workspaceLeft: workspaceBounds.left,
      workspaceTop: workspaceBounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    manager.moveWindow(id, { x: event.clientX - drag.current.workspaceLeft - drag.current.offsetX, y: event.clientY - drag.current.workspaceTop - drag.current.offsetY });
  };
  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };
  if (!current.open || current.minimized) return null;
  if (!targetWorkspace) return renderBeforeWorkspace ? <BeforeWorkspace.Provider value={true}><div className="retro-window-pending" hidden>{children}</div></BeforeWorkspace.Provider> : null;
  const size = windowSize(id, current.size, targetWorkspace);
  return createPortal(<section ref={windowElement} tabIndex={-1} className={`retro-window${className ? ` ${className}` : ""}`} data-maximized={current.maximized || undefined} data-focused={current.focused} style={{ left: current.position.x, top: current.position.y, width: size.width, height: size.height, zIndex: current.zIndex }} onFocusCapture={() => { if (!current.focused) manager.focusWindow(id, "click"); }} onPointerDown={() => manager.focusWindow(id)} aria-label={`${title} window`}>
    <div className="retro-window-titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      <strong>{title}</strong>
      {titlebarContent}
      <span className="retro-window-controls">
        {onToggleMaximize && <button type="button" className="art-viewer-maximize" aria-label={`${current.maximized ? "Restore" : "Maximize"} ${title}`} onClick={onToggleMaximize}>{current.maximized ? "❐" : "□"}</button>}
        <button type="button" aria-label={`Minimize ${title}`} onClick={() => manager.minimizeWindow(id)}>_</button>
        <button type="button" aria-label={`Close ${title}`} onClick={() => manager.closeWindow(id)}>×</button>
      </span>
    </div>
    <div className="retro-window-body">{children}</div>
  </section>, targetWorkspace);
}

export function WindowLauncher({ id, children }: { id: string; children: ReactNode }) {
  const { restoreWindow, desktopVisible } = useWindowManager();
  return <button className="terminal-button" type="button" aria-controls={id === "system" ? "pixel-monitor" : undefined} aria-expanded={id === "system" ? desktopVisible : undefined} onClick={() => restoreWindow(id)}>{children}</button>;
}

export function WindowTaskbar({ system = false }: { system?: boolean }) {
  const { windows, viewerTabs, restoreWindow, desktopVisible } = useWindowManager();
  const visibleWindows = windows.filter((window) => (system ? window.id === "system" : window.open && window.minimized) && (window.id !== viewerWindowId || viewerTabs.length > 0));
  if (!visibleWindows.length) return null;
  return <nav className="window-taskbar" aria-label={system ? "SYSTEM window dock" : "Window dock"}>
    {visibleWindows.map((window) => {
      const visible = window.open && !window.minimized && (window.id !== "system" || desktopVisible);
      return <button type="button" key={window.id} className={visible ? "is-open" : ""} aria-label={`${visible ? "Focus" : "Restore"} ${window.title}`} onClick={() => restoreWindow(window.id)}>[{window.title}]</button>;
    })}
  </nav>;
}

export function PublicWindowWorkspace() {
  const { setWorkspace, windows } = useWindowManager();
  const systemFocused = windows.some((window) => window.id === "system" && window.focused);
  return <>
    <div className="public-window-layer" data-system-focused={systemFocused || undefined}>
      <div ref={setWorkspace} className="public-windows" role="region" aria-label="Public terminal window workspace" />
    </div>
    <div className="public-window-dock"><WindowTaskbar /></div>
  </>;
}
