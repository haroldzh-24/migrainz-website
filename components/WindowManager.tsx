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
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  moveWindow: (id: string, position: WindowPosition) => void;
};

const WindowManagerContext = createContext<WindowManagerValue | null>(null);

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
  const nextZIndex = useRef(10);
  const { playSound } = useSound();

  const registerWindow = (window: Omit<WindowRecord, "focused" | "zIndex">) => {
    setWindows((current) => {
      if (current.some((entry) => entry.id === window.id)) return current;
      nextZIndex.current += 1;
      return [...current, { ...window, position: clampPosition(window.position, window.size), focused: current.length === 0, zIndex: nextZIndex.current }];
    });
  };
  const focusWindow = (id: string) => {
    nextZIndex.current += 1;
    setWindows((current) => current.map((window) => ({
      ...window,
      focused: window.id === id,
      zIndex: window.id === id ? nextZIndex.current : window.zIndex,
    })));
    playSound("open");
  };
  const minimizeWindow = (id: string) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, minimized: true, focused: false } : window));
    playSound("close");
  };
  const restoreWindow = (id: string) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: true, minimized: false } : window));
    focusWindow(id);
    playSound("open");
  };
  const closeWindow = (id: string) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, open: false, minimized: false, focused: false } : window));
    playSound("close");
  };
  const moveWindow = (id: string, position: WindowPosition) => {
    setWindows((current) => current.map((window) => window.id === id ? { ...window, position: clampPosition(position, window.size) } : window));
  };

  return <WindowManagerContext.Provider value={{ windows, registerWindow, focusWindow, minimizeWindow, restoreWindow, closeWindow, moveWindow }}>{children}</WindowManagerContext.Provider>;
}

function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return context;
}

export function RetroWindow({ id, title, defaultPosition, defaultSize, children }: {
  id: string;
  title: string;
  defaultPosition: WindowPosition;
  defaultSize: WindowSize;
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
  return <section className="retro-window" data-focused={current.focused} style={{ left: current.position.x, top: current.position.y, width: current.size.width, zIndex: current.zIndex }} onPointerDown={() => manager.focusWindow(id)} aria-label={`${title} window`}>
    <div className="retro-window-titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      <strong>{title}</strong>
      <span className="retro-window-controls">
        <button type="button" aria-label={`Minimize ${title}`} data-sound="close" onClick={() => manager.minimizeWindow(id)}>_</button>
        <button type="button" aria-label={`Close ${title}`} data-sound="close" onClick={() => manager.closeWindow(id)}>×</button>
      </span>
    </div>
    <div className="retro-window-body">{children}</div>
  </section>;
}

export function WindowTaskbar() {
  const { windows, restoreWindow } = useWindowManager();
  if (!windows.length) return null;
  return <nav className="window-taskbar" aria-label="Window dock">
    {windows.map((window) => <button type="button" key={window.id} className={window.open && !window.minimized ? "is-open" : ""} aria-label={`${window.open && !window.minimized ? "Focus" : "Restore"} ${window.title}`} onClick={() => restoreWindow(window.id)}>[{window.title}]</button>)}
  </nav>;
}
