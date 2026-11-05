"use client";

import { useLayoutEffect, useRef } from "react";
import { arrival, visitRecord } from "@/lib/arrival";
import { setBusy } from "@/lib/busy";
import { cssTime } from "@/lib/css-time";
import { ghost } from "@/lib/ghost";
import { isGraphicsPath } from "@/lib/graphics-mode";
import { TYPE_CPS, caretBox, typingAllowed, untypedHighlight } from "@/lib/typing";

// Batch 17: a dark terminal page types out its first screen (Harold, 2026-11-04: "for the terminal page make it so when
// it displays text it displays one letter/space at a time like a system is typing it out with that strobing dash
// thing"). Rendered at the end of a Directory page: everything after the heading that is on screen on arrival types in
// document order, about 55 characters a second (the first screen within 3 s), a solid "_" riding the typing point;
// then the cursor blinks for 5 s and goes. Pictures, buttons and chips in that screen fade in as the typing reaches
// them. Text below the first screen shows complete. Once per page per visit; a tap, click, key, wheel or touch drag
// finishes it at once. Never in grey windows, on the grey-window desktop, coming from it, on "/", with reduced motion
// or CRT off, or without the Highlight API: the text then simply shows. The DOM text never changes (see lib/typing.ts),
// so screen readers, search engines and textContent always get everything.
//
// When it starts: on a link or Back arrival, once the page wipe (batch 13) has revealed the page; on a first load, only
// when the head script found nothing in the way (no boot, no announcement) and marked html[data-typeout="pending"]
// before the first paint (the text stays hidden until typing starts, so it never shows in full first). If that mark
// was already cleared by its 2 s safety timeout (a slow phone), it does not type.

const CAP_MS = 3000;
const BLINK_MS = 5000;
const WAIT_SELECTOR = "img, video, canvas, svg, button, input, select, .terminal-button, .status-chip";
const typed = typeof window === "undefined" ? null : visitRecord("migrainz-typed-v1");
// Batch 19, the ghost's typing slip (one of the visit's rare ambient events, /about only): mid-sentence it types the
// wrong words in its own glow, pauses, erases them, and the real text carries on. The real text is never changed; the
// wrong words are an aria-hidden overlay over the not-yet-typed part.
const SLIPS: [string, string][] = [["things still taking shape", "things that can't get out"], ["follow the studio's production notes", "subscribe to the Patreon so i can eat"]];

type Step = { kind: "text"; node: Text; range: Range } | { kind: "wait"; element: Element };

// Only what is hidden inside the page counts (17b): on a first load the whole site is still aria-hidden behind the boot
// screen's wrapper for a moment, which must not make the page look empty.
const hiddenByAria = (node: Node, section: Element) => {
  const hit = (node.nodeType === 1 ? node as Element : node.parentElement)?.closest("[aria-hidden='true'], [data-type-skip], script, style, noscript, h1, .type-cursor, .visually-hidden");
  return Boolean(hit && section.contains(hit));
};

function collect(section: HTMLElement, heading: Element | null): Step[] {
  const bottom = window.innerHeight;
  const steps: Step[] = [];
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (heading && !(heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (hiddenByAria(node, section)) continue;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (!element.matches(WAIT_SELECTOR) || element.parentElement?.closest(WAIT_SELECTOR)) continue;
      const box = element.getBoundingClientRect();
      if (box.width && box.height && box.top < bottom) steps.push({ kind: "wait", element });
      continue;
    }
    const text = node as Text;
    if (!text.data.trim()) continue;
    const parent = text.parentElement;
    if (!parent || !parent.getClientRects().length || parent.getBoundingClientRect().top >= bottom) continue;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.length);
    steps.push({ kind: "text", node: text, range });
  }
  return steps;
}

export default function TypeOut() {
  const cursor = useRef<HTMLSpanElement>(null);
  const slipLine = useRef<HTMLSpanElement>(null);
  const decided = useRef(false);

  useLayoutEffect(() => {
    const element = cursor.current;
    const section = element?.closest<HTMLElement>(".directory-page");
    const root = document.documentElement;
    const firstLoad = !arrival.hydrated;
    const path = location.pathname;
    const clearPending = () => { if (root.dataset.typeout === "pending") delete root.dataset.typeout; };
    if (decided.current || !element || !section || !typed) { clearPending(); return; }
    decided.current = true;
    const allowed = typingAllowed() && path !== "/" && !isGraphicsPath(path) && !typed.has(path)
      && !section.closest(".retro-window") && !document.querySelector(".graphics-route")
      && (firstLoad ? root.dataset.typeout === "pending" : !isGraphicsPath(arrival.lastPath ?? "/"));
    if (!allowed) { clearPending(); return; }
    // Hidden until typing starts (the first load is already hidden by the head script's mark).
    section.dataset.typeoutPending = "";

    let steps: Step[] = [];
    let index = 0, frame = 0, last = 0, carry = 0, rate = TYPE_CPS, pauseUntil = 0, started = false, done = false;
    // Short pauses after each piece of text and after "." and ","; scaled down so they never take more than 600 ms in all.
    let linePause = 60, stopPause = 90;
    let blinkTimer = 0, startTimer = 0, removeEntered = () => {};
    let slip: { step: Step & { kind: "text" }; offset: number; wrong: string; state: "pending" | "running" | "done"; timers: number[] } | null = null;
    const stopSlip = () => { if (!slip) return; slip.timers.forEach(window.clearTimeout); slip.state = "done"; if (slipLine.current) slipLine.current.hidden = true; };
    const runSlip = () => {
      const active = slip, line = slipLine.current;
      if (!active || !line) return;
      // Typing may have run a few characters past the phrase's start within one frame: step back to it exactly.
      active.step.range.setStart(active.step.node, active.offset);
      const box = caretBox(active.step.node, active.offset);
      if (!box) { active.state = "done"; return; }
      const area = section.getBoundingClientRect();
      line.style.left = `${box.left - area.left}px`;
      line.style.top = `${box.top - area.top}px`;
      line.style.maxWidth = `${Math.max(80, area.right - box.left)}px`;
      line.style.fontSize = getComputedStyle(active.step.node.parentElement ?? section).fontSize;
      line.hidden = false;
      element.hidden = true;
      window.dispatchEvent(new CustomEvent("migrainz:ghost", { detail: { name: "slip", wrong: active.wrong } }));
      let at = 0, wait = 0;
      const later = (ms: number, run: () => void) => { wait += ms; active.timers.push(window.setTimeout(run, wait)); };
      for (let i = 1; i <= active.wrong.length; i++) later(80 + Math.random() * 150 + (active.wrong[i - 1] === " " ? 110 : 0), () => { at = i; line.textContent = active.wrong.slice(0, at) + "_"; });
      later(1300, () => {});
      for (let i = active.wrong.length - 1; i >= 0; i--) later(32, () => { line.textContent = active.wrong.slice(0, i) + "_"; });
      later(200, () => { line.hidden = true; line.textContent = ""; active.state = "done"; last = performance.now(); });
    };
    const highlight = untypedHighlight();
    const placeCursor = () => {
      const step = steps[index];
      if (!step || step.kind !== "text") return;
      const box = caretBox(step.node, step.range.startOffset);
      if (!box) return;
      const area = section.getBoundingClientRect();
      element.style.left = `${box.left - area.left}px`;
      element.style.top = `${box.top - area.top}px`;
      element.style.height = element.style.lineHeight = `${box.height}px`;
      element.style.fontSize = getComputedStyle(step.node.parentElement ?? section).fontSize;
      element.hidden = false;
    };
    // Chromium ignores text-shadow inside a highlight, so the glow of untyped text would still show: the element around
    // each untyped piece has its glow off until that piece is typed.
    const glowOff = new Map<Element, number>();
    const dim = (element: Element | null) => {
      if (!element) return;
      glowOff.set(element, (glowOff.get(element) ?? 0) + 1);
      element.setAttribute("data-type-glow-off", "");
    };
    const undim = (element: Element | null) => {
      if (!element || !glowOff.has(element)) return;
      const left = glowOff.get(element)! - 1;
      if (left > 0) glowOff.set(element, left);
      else { glowOff.delete(element); element.removeAttribute("data-type-glow-off"); }
    };
    const shown = new Set<Step>();
    const reveal = (step: Step) => {
      if (shown.has(step)) return;
      shown.add(step);
      if (step.kind === "text") { highlight.delete(step.range); undim(step.node.parentElement); }
      else step.element.removeAttribute("data-type-wait");
    };
    const stopListening = () => {
      for (const type of ["pointerdown", "keydown", "wheel", "touchmove"]) window.removeEventListener(type, skip, true);
      observer.disconnect();
    };
    const finish = (skipped = false) => {
      if (done) return;
      done = true;
      stopSlip();
      cancelAnimationFrame(frame);
      window.clearTimeout(startTimer);
      for (const step of steps.slice(index)) reveal(step);
      delete section.dataset.typeoutPending;
      clearPending();
      stopListening();
      if (!started) return;
      setBusy("typing", false);
      window.dispatchEvent(new CustomEvent("migrainz:typing", { detail: { state: "end", where: "page", skipped } }));
      // The cursor stays at the end of what was typed, blinking for a few seconds (not after a skip).
      if (skipped) { element.hidden = true; return; }
      element.classList.add("type-cursor-blink");
      blinkTimer = window.setTimeout(() => { element.hidden = true; element.classList.remove("type-cursor-blink"); }, BLINK_MS);
    };
    const skip = () => finish(true);
    // Text React changes while typing (a status line, a NEW mark) shows complete at once.
    const observer = new MutationObserver(records => {
      for (const record of records) for (let i = index; i < steps.length; i++) {
        const step = steps[i];
        const target = step.kind === "text" ? step.node : step.element;
        if (record.target === target || record.target.contains(target)) reveal(step);
      }
    });

    const tick = (now: number) => {
      if (done) return;
      if (slip && slip.state === "pending" && steps[index] === slip.step && slip.step.range.startOffset >= slip.offset) { slip.state = "running"; runSlip(); }
      if (slip && slip.state === "running") { last = now; frame = requestAnimationFrame(tick); return; }
      const elapsed = Math.min(100, now - last);
      last = now;
      if (now >= pauseUntil) carry += (elapsed * rate) / 1000;
      while (index < steps.length && (steps[index].kind === "wait" || (now >= pauseUntil && carry >= 1))) {
        const step = steps[index];
        if (step.kind === "wait") { reveal(step); index++; continue; }
        if (!step.node.isConnected) { reveal(step); index++; continue; }
        const next = step.range.startOffset + 1;
        carry -= 1;
        const typedChar = step.node.data[next - 1];
        if (next >= step.node.length) {
          reveal(step);
          index++;
          pauseUntil = now + linePause;
          break;
        }
        step.range.setStart(step.node, next);
        if (typedChar === "." || typedChar === ",") { pauseUntil = now + stopPause; break; }
      }
      if (index >= steps.length) {
        // Park the cursor after the last typed character.
        const lastText = [...steps].reverse().find(step => step.kind === "text");
        if (lastText && lastText.kind === "text") {
          const box = caretBox(lastText.node, lastText.node.length);
          if (box) {
            const area = section.getBoundingClientRect();
            element.style.left = `${box.left - area.left}px`;
            element.style.top = `${box.top - area.top}px`;
          }
        }
        finish();
        return;
      }
      placeCursor();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (done || !section.isConnected) return;
      steps = collect(section, section.querySelector(":scope > h1"));
      const characters = steps.reduce((sum, step) => sum + (step.kind === "text" ? step.node.length : 0), 0);
      if (!characters) { finish(); return; }
      const pieces = steps.filter(step => step.kind === "text").length;
      const stops = steps.reduce((sum, step) => sum + (step.kind === "text" ? (step.node.data.match(/[.,]/g)?.length ?? 0) : 0), 0);
      const pauses = pieces * 60 + stops * 90;
      const scale = pauses > 600 ? 600 / pauses : 1;
      linePause = 60 * scale;
      stopPause = 90 * scale;
      rate = Math.max(TYPE_CPS, (characters * 1000) / (CAP_MS - Math.min(pauses, 600)));
      if (path === "/about") {
        const options = SLIPS.flatMap(([real, wrong]) => steps.flatMap(step => step.kind === "text" && step.node.data.includes(real) ? [{ step, offset: step.node.data.indexOf(real), wrong }] : []));
        if (options.length && ghost.claim("slip")) slip = { ...options[Math.floor(Math.random() * options.length)], state: "pending", timers: [] };
      }
      for (const step of steps) {
        if (step.kind === "text") { highlight.add(step.range); dim(step.node.parentElement); }
        else step.element.setAttribute("data-type-wait", "");
      }
      started = true;
      typed.add(path);
      delete section.dataset.typeoutPending;
      clearPending();
      setBusy("typing", true);
      window.dispatchEvent(new CustomEvent("migrainz:typing", { detail: { state: "start", where: "page", characters } }));
      for (const type of ["pointerdown", "keydown", "wheel", "touchmove"]) window.addEventListener(type, skip, { capture: true, passive: true });
      observer.observe(section, { subtree: true, characterData: true, childList: true });
      placeCursor();
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const revealMs = cssTime("--motion-reveal", 460);
    const recent = arrival.enter && arrival.enter.to === path && performance.now() - arrival.enter.at < 1000 ? arrival.enter : null;
    // A first load starts once the boot has powered the screen on (it is already on when nothing is in the way) and the
    // page has painted once, never later than a second (17b).
    if (firstLoad) {
      const asked = performance.now();
      const ready = () => {
        if (done) return;
        if (root.dataset.power === "on" || performance.now() - asked > 1000) { startTimer = window.setTimeout(start, 0); return; }
        startTimer = window.setTimeout(ready, 16);
      };
      startTimer = window.setTimeout(() => requestAnimationFrame(ready), 0);
    }
    else if (recent) {
      // React's dev double run: PageTransition already said whether a wipe plays (arrival.enter).
      startTimer = window.setTimeout(start, recent.animated ? Math.max(0, recent.at + revealMs - performance.now()) : 0);
    } else {
      // A client arrival: PageTransition's layout effect runs after this one and says whether a wipe plays.
      const entered = (event: Event) => {
        window.removeEventListener("migrainz:page-enter", entered);
        window.clearTimeout(startTimer);
        const { animated } = (event as CustomEvent<{ animated: boolean }>).detail;
        startTimer = window.setTimeout(start, animated ? revealMs : 0);
      };
      window.addEventListener("migrainz:page-enter", entered);
      removeEntered = () => window.removeEventListener("migrainz:page-enter", entered);
      startTimer = window.setTimeout(() => { removeEntered(); start(); }, 50);
    }
    return () => {
      window.clearTimeout(blinkTimer);
      removeEntered();
      if (!started) {
        // Unmounted (or React's dev double run) before typing began: undo quietly and decide again on the next run;
        // the head script's own timeout clears its mark if nothing does.
        done = true;
        window.clearTimeout(startTimer);
        stopListening();
        delete section.dataset.typeoutPending;
        decided.current = false;
        return;
      }
      finish(true);
      element.hidden = true;
    };
  }, []);

  return <>
    <span ref={cursor} className="type-cursor" aria-hidden="true" hidden>_</span>
    <span ref={slipLine} className="ghost-slip" aria-hidden="true" hidden />
  </>;
}
