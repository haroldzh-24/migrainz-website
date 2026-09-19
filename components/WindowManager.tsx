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

type WindowPosition = { x: number; y: number };
type WindowSize = { width: number; height: number };
export type ViewerImage = { src: string; alt: string; caption?: string; width?: number; height?: number };
export type ViewerTab = {
  id: string;
  href: string;
  title: string;
  project: string;
  role?: string;
  description?: string;
  images: ViewerImage[];
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
};
type WindowManagerValue = {
  windows: WindowRecord[];
  registerWindow: (window: Omit<WindowRecord, "focused" | "zIndex">) => void;
  focusWindow: (id: string, sound?: "click" | "open") => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  moveWindow: (id: string, position: WindowPosition) => void;
  viewerTabs: ViewerTab[];
  activeViewerTab: string | null;
  openViewerTab: (tab: ViewerTab) => void;
  switchViewerTab: (id: string) => void;
  closeViewerTab: (id: string) => void;
};

const WindowManagerContext = createContext<WindowManagerValue | null>(null);
const viewerWindowId = "art-viewer";
const viewerStorageKey = "migrainz-art-viewer-tabs";
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

function clampPosition(position: WindowPosition, size: WindowSize) {
  const workspaceWidth = document.querySelector<HTMLElement>(".desktop-windows")?.clientWidth ?? window.innerWidth;
  const maxX = Math.max(12, workspaceWidth - size.width - 12);
  const maxY = Math.max(12, window.innerHeight - size.height - 12);
  return {
    x: Math.max(12, Math.min(position.x, maxX)),
    y: Math.max(12, Math.min(position.y, maxY)),
  };
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowRecord[]>([]);
  const [viewerTabs, setViewerTabs] = useState<ViewerTab[]>([]);
  const [activeViewerTab, setActiveViewerTab] = useState<string | null>(null);
  const [viewerHydrated, setViewerHydrated] = useState(false);
  const nextZIndex = useRef(10);
  const { playSound } = useSound();

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
      if (current.some((entry) => entry.id === window.id)) return current;
      nextZIndex.current += 1;
      return [...current, { ...window, position: clampPosition(window.position, window.size), focused: current.length === 0, zIndex: nextZIndex.current }];
    });
  };
  const focusWindow = (id: string, sound: "click" | "open" = "open") => {
    nextZIndex.current += 1;
    setWindows((current) => current.map((window) => ({
      ...window,
      focused: window.id === id,
      zIndex: window.id === id ? nextZIndex.current : window.zIndex,
    })));
    playSound(sound);
  };
  const minimizeWindow = (id: string) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, minimized: true, focused: false } : window));
    playSound("close");
  };
  const restoreWindow = (id: string) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: true, minimized: false } : window));
    focusWindow(id);
  };
  const closeWindow = (id: string) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: false, minimized: false, focused: false } : window));
    playSound("close");
  };
  const moveWindow = (id: string, position: WindowPosition) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, position: clampPosition(position, window.size) } : window));
  };

  const ensureViewerWindow = () => {
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
        position: viewerWindowDefaults.position,
        size: viewerWindowDefaults.size,
      }];
    });
  };
  const openViewerTab = (tab: ViewerTab) => {
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
    else playSound("close");
  };

  return <WindowManagerContext.Provider value={{ windows, registerWindow, focusWindow, minimizeWindow, restoreWindow, closeWindow, moveWindow, viewerTabs, activeViewerTab, openViewerTab, switchViewerTab, closeViewerTab }}>{children}</WindowManagerContext.Provider>;
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return context;
}

export function RetroWindow({ id, title, defaultPosition, defaultSize, className, children }: {
  id: string;
  title: string;
  defaultPosition: WindowPosition;
  defaultSize: WindowSize;
  className?: string;
  children: ReactNode;
}) {
  const manager = useWindowManager();
  const record = manager.windows.find((window) => window.id === id);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number; workspaceLeft: number; workspaceTop: number } | null>(null);

  useEffect(() => {
    manager.registerWindow({ id, title, open: true, minimized: false, position: defaultPosition, size: defaultSize });
  }, [defaultPosition, defaultSize, id, manager, title]);

  const current = record ?? { id, title, open: true, minimized: false, focused: false, zIndex: 1, position: defaultPosition, size: defaultSize };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
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
  return <section className={`retro-window${className ? ` ${className}` : ""}`} data-focused={current.focused} style={{ left: current.position.x, top: current.position.y, width: current.size.width, zIndex: current.zIndex }} onPointerDown={() => manager.focusWindow(id)} aria-label={`${title} window`}>
    <div className="retro-window-titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      <strong>{title}</strong>
      <span className="retro-window-controls">
        <button type="button" aria-label={`Minimize ${title}`} onClick={() => manager.minimizeWindow(id)}>_</button>
        <button type="button" aria-label={`Close ${title}`} onClick={() => manager.closeWindow(id)}>×</button>
      </span>
    </div>
    <div className="retro-window-body">{children}</div>
  </section>;
}

export function WindowTaskbar() {
  const { windows, viewerTabs, restoreWindow } = useWindowManager();
  const visibleWindows = windows.filter((window) => window.id !== viewerWindowId || viewerTabs.length > 0);
  if (!visibleWindows.length) return null;
  return <nav className="window-taskbar" aria-label="Window dock">
    {visibleWindows.map((window) => <button type="button" key={window.id} className={window.open && !window.minimized ? "is-open" : ""} aria-label={`${window.open && !window.minimized ? "Focus" : "Restore"} ${window.title}`} onClick={() => restoreWindow(window.id)}>[{window.title}]</button>)}
  </nav>;
}
