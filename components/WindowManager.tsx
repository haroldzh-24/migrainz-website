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
  maximized?: boolean;
};
type WindowManagerValue = {
  workspace: HTMLDivElement | null;
  setWorkspace: (element: HTMLDivElement | null) => void;
  desktopVisible: boolean;
  showDesktop: () => void;
  hideDesktop: () => void;
  windows: WindowRecord[];
  registerWindow: (window: Omit<WindowRecord, "focused" | "zIndex">) => void;
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
    const target = returnFocus.current;
    (target?.isConnected ? target : document.getElementById("top"))?.focus({ preventScroll: true });
  };
  const [windows, setWindows] = useState<WindowRecord[]>([]);
  const [viewerTabs, setViewerTabs] = useState<ViewerTab[]>([]);
  const [activeViewerTab, setActiveViewerTab] = useState<string | null>(null);
  const [viewerHydrated, setViewerHydrated] = useState(false);
  const nextZIndex = useRef(10);
  const { playSound } = useSound();

  useEffect(() => {
    if (!workspace || !desktopVisible) return;
    const observer = new ResizeObserver(() => {
      setWindows((current) => current.map((entry) => {
        const position = clampPosition(entry.position, entry.size, workspace);
        return position.x === entry.position.x && position.y === entry.position.y ? entry : { ...entry, position };
      }));
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [workspace, desktopVisible]);

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
    if (!windows.some((entry) => entry.id === window.id) && window.open) showDesktop();
    setWindows((current) => {
      if (current.some((entry) => entry.id === window.id)) return current;
      nextZIndex.current += 1;
      return [...current, { ...window, position: clampPosition(window.position, window.size, workspace), focused: current.length === 0, zIndex: nextZIndex.current }];
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
    showDesktop();
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: true, minimized: false } : window));
    focusWindow(id);
  };
  const closeWindow = (id: string) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: false, minimized: false, focused: false } : window));
    playSound("close");
  };
  const moveWindow = (id: string, position: WindowPosition) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, position: clampPosition(position, window.size, workspace) } : window));
  };
  const toggleMaximizeWindow = (id: string) => {
    // Keep normal geometry intact; CSS supplies the monitor workspace bounds.
    setWindows((current) => current.map((window) => window.id === id ? { ...window, maximized: !window.maximized } : window));
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
        position: clampPosition(viewerWindowDefaults.position, viewerWindowDefaults.size, workspace),
        size: viewerWindowDefaults.size,
      }];
    });
  };
  const openViewerTab = (tab: ViewerTab) => {
    showDesktop();
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

  return <WindowManagerContext.Provider value={{ workspace, setWorkspace, desktopVisible, showDesktop, hideDesktop, windows, registerWindow, focusWindow, minimizeWindow, restoreWindow, closeWindow, moveWindow, toggleMaximizeWindow, viewerTabs, activeViewerTab, openViewerTab, switchViewerTab, closeViewerTab }}>{children}</WindowManagerContext.Provider>;
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return context;
}

export function RetroWindow({ id, title, defaultPosition, defaultSize, defaultOpen = true, className, children, onToggleMaximize }: {
  id: string;
  title: string;
  defaultPosition: WindowPosition;
  defaultSize: WindowSize;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
  onToggleMaximize?: () => void;
}) {
  const manager = useWindowManager();
  const record = manager.windows.find((window) => window.id === id);
  const windowElement = useRef<HTMLElement>(null);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number; workspaceLeft: number; workspaceTop: number } | null>(null);

  useEffect(() => {
    manager.registerWindow({ id, title, open: defaultOpen, minimized: false, position: defaultPosition, size: defaultSize });
  }, [defaultOpen, defaultPosition, defaultSize, id, manager, title]);

  useEffect(() => {
    if (manager.desktopVisible && record?.open && !record.minimized && record.focused && window.matchMedia("(max-width: 700px)").matches) {
      const element = windowElement.current;
      if (element && manager.workspace) manager.workspace.scrollTop = element.offsetTop;
    }
  }, [manager.desktopVisible, manager.workspace, record?.open, record?.minimized, record?.focused]);

  const current = record ?? { id, title, open: defaultOpen, minimized: false, focused: false, zIndex: 1, position: defaultPosition, size: defaultSize };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
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
  if (!current.open || current.minimized || !manager.workspace) return null;
  return createPortal(<section ref={windowElement} className={`retro-window${className ? ` ${className}` : ""}`} data-maximized={current.maximized || undefined} data-focused={current.focused} style={{ left: current.position.x, top: current.position.y, width: current.size.width, height: current.size.height, zIndex: current.zIndex }} onFocusCapture={() => { if (!current.focused) manager.focusWindow(id, "click"); }} onPointerDown={() => manager.focusWindow(id)} aria-label={`${title} window`}>
    <div className="retro-window-titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      <strong>{title}</strong>
      <span className="retro-window-controls">
        {onToggleMaximize && <button type="button" className="art-viewer-maximize" aria-label={`${current.maximized ? "Restore" : "Maximize"} ${title}`} onClick={onToggleMaximize}>{current.maximized ? "RESTORE" : "MAXIMIZE"}</button>}
        <button type="button" aria-label={`Minimize ${title}`} onClick={() => manager.minimizeWindow(id)}>_</button>
        <button type="button" aria-label={`Close ${title}`} onClick={() => manager.closeWindow(id)}>×</button>
      </span>
    </div>
    <div className="retro-window-body">{children}</div>
  </section>, manager.workspace);
}

export function WindowLauncher({ id, children }: { id: string; children: ReactNode }) {
  const { restoreWindow } = useWindowManager();
  return <button className="terminal-button" type="button" onClick={() => restoreWindow(id)}>{children}</button>;
}

export function WindowTaskbar() {
  const { windows, viewerTabs, restoreWindow } = useWindowManager();
  const visibleWindows = windows.filter((window) => window.id !== viewerWindowId || viewerTabs.length > 0);
  if (!visibleWindows.length) return null;
  return <nav className="window-taskbar" aria-label="Window dock">
    {visibleWindows.map((window) => <button type="button" key={window.id} className={window.open && !window.minimized ? "is-open" : ""} aria-label={`${window.open && !window.minimized ? "Focus" : "Restore"} ${window.title}`} onClick={() => restoreWindow(window.id)}>[{window.title}]</button>)}
  </nav>;
}
