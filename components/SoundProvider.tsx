"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SoundName = "click" | "open" | "close" | "toggle" | "tick";

type SoundContextValue = {
  enabled: boolean;
  /** Turning sound on plays the toggle tone itself, so callers never race the state update. */
  setEnabled: (value: boolean) => void;
  playSound: (name: SoundName) => void;
};

const storageKey = "migrainz-sound-enabled";
const SoundContext = createContext<SoundContextValue | null>(null);

const tones: Record<SoundName, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  click: { frequency: 620, duration: 0.035, type: "square", gain: 0.025 },
  open: { frequency: 440, duration: 0.06, type: "sine", gain: 0.025 },
  close: { frequency: 260, duration: 0.07, type: "sine", gain: 0.025 },
  toggle: { frequency: 760, duration: 0.05, type: "square", gain: 0.025 },
  // Soft hover tick for the shared highlight.
  tick: { frequency: 1800, duration: 0.012, type: "sine", gain: 0.01 },
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const enabledRef = useRef(false);
  // One context for the page: browsers cap how many can exist, and hover ticks would create dozens.
  const contextRef = useRef<AudioContext | null>(null);

  const audioContext = useCallback(() => {
    if (!contextRef.current) {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return null;
      contextRef.current = new AudioContextConstructor();
    }
    // Contexts created before a user gesture start suspended; resume once one has happened.
    if (contextRef.current.state === "suspended") void contextRef.current.resume().catch(() => {});
    return contextRef.current;
  }, []);

  const emit = useCallback((name: SoundName) => {
    try {
      const context = audioContext();
      if (!context) return;
      const tone = tones[name];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(tone.gain, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + tone.duration);
      oscillator.addEventListener("ended", () => { oscillator.disconnect(); gain.disconnect(); }, { once: true });
    } catch {
      // Audio is an optional enhancement and may be blocked by the browser.
    }
  }, [audioContext]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey) === "true";
      enabledRef.current = stored;
      setEnabledState(stored);
    } catch {
      // Sound remains opt-in when storage is unavailable.
    }
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    enabledRef.current = value;
    setEnabledState(value);
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // The in-memory setting still applies for this page.
    }
    if (value) emit("toggle");
  }, [emit]);

  const playSound = useCallback((name: SoundName) => {
    if (enabledRef.current) emit(name);
  }, [emit]);

  useEffect(() => {
    const onControlActivation = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const control = target?.closest<HTMLElement>("a, button");
      if (!control || control.dataset.soundToggle !== undefined) return;
      playSound((control.dataset.sound as SoundName | undefined) || "click");
    };
    // The first gesture unlocks audio, so later hover ticks are audible.
    const unlock = () => { if (enabledRef.current) audioContext(); };
    document.addEventListener("click", onControlActivation);
    document.addEventListener("pointerdown", unlock, { passive: true });
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("click", onControlActivation);
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [playSound, audioContext]);

  useEffect(() => () => { void contextRef.current?.close().catch(() => {}); }, []);

  return (
    <SoundContext.Provider value={{ enabled, setEnabled, playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error("useSound must be used within SoundProvider");
  return context;
}
