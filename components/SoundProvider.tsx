"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SoundName = "click" | "open" | "close" | "toggle";

type SoundContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  playSound: (name: SoundName) => void;
};

const storageKey = "migrainz-sound-enabled";
const SoundContext = createContext<SoundContextValue | null>(null);

const tones: Record<SoundName, { frequency: number; duration: number; type: OscillatorType }> = {
  click: { frequency: 620, duration: 0.035, type: "square" },
  open: { frequency: 440, duration: 0.06, type: "sine" },
  close: { frequency: 260, duration: 0.07, type: "sine" },
  toggle: { frequency: 760, duration: 0.05, type: "square" },
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    try {
      setEnabledState(window.localStorage.getItem(storageKey) === "true");
    } catch {
      // Sound remains opt-in when storage is unavailable.
    }
  }, []);

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // The in-memory setting still applies for this page.
    }
  };

  const playSound = (name: SoundName) => {
    if (!enabled) return;
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      const context = new AudioContextConstructor();
      const tone = tones[name];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.025, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + tone.duration);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {
      // Audio is an optional enhancement and may be blocked by the browser.
    }
  };

  useEffect(() => {
    const onControlActivation = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const control = target?.closest<HTMLElement>("a, button");
      if (!control || control.dataset.soundToggle !== undefined) return;
      playSound((control.dataset.sound as SoundName | undefined) || "click");
    };
    document.addEventListener("click", onControlActivation);
    return () => document.removeEventListener("click", onControlActivation);
  }, [enabled]);

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
