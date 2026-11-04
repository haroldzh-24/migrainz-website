"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { setBusy } from "@/lib/busy";
import { TYPE_CPS, caretBox, typingAllowed, untypedHighlight } from "@/lib/typing";

// Batch 16: the homepage terminal's output types out one character at a time (Harold, 2026-11-04). Each printed line is
// one text node holding its full text from the start (the log region announces it once, as before); a live Range in
// the shared "untyped" highlight hides the part not yet typed, and a solid "_" rides the typing point. About 55
// characters a second, faster when one command prints a lot (all of its output within 2 s). A new command or `clear`
// finishes the typing at once. Reduced motion, CRT off or no Highlight API: lines appear complete.

type Item = { node: Text; range: Range; line: HTMLElement };
const CAP_MS = 2000;
const LINE_PAUSE_MS = 60;

export function useTerminalTyping(log: RefObject<HTMLDivElement | null>, cursor: RefObject<HTMLSpanElement | null>) {
  const pending = useRef<number[]>([]);
  const queue = useRef<Item[]>([]);
  const loop = useRef({ frame: 0, last: 0, carry: 0, rate: TYPE_CPS, pauseUntil: 0 });

  const hideCursor = () => { if (cursor.current) cursor.current.hidden = true; };
  // The log follows the typing point (as a real terminal scrolls line by line), not straight to its last line.
  const follow = (item: Item) => {
    const root = log.current;
    if (!root) return;
    const bottom = item.line.offsetTop + item.line.offsetHeight;
    if (bottom > root.scrollTop + root.clientHeight || item.line.offsetTop < root.scrollTop) root.scrollTop = bottom - root.clientHeight;
  };
  const placeCursor = (item: Item) => {
    const element = cursor.current, holder = cursor.current?.parentElement;
    if (!element || !holder) return;
    follow(item);
    const box = caretBox(item.node, item.range.startOffset);
    if (!box) { element.hidden = true; return; }
    const area = holder.getBoundingClientRect();
    element.style.left = `${box.left - area.left}px`;
    element.style.top = `${box.top - area.top}px`;
    element.style.height = element.style.lineHeight = `${box.height}px`;
    element.hidden = false;
  };

  const finish = useCallback(() => {
    const state = loop.current;
    cancelAnimationFrame(state.frame);
    const had = state.frame !== 0 || queue.current.length > 0;
    state.frame = 0;
    for (const item of queue.current) {
      try { untypedHighlight().delete(item.range); } catch { /* not supported: nothing was added */ }
      item.line.removeAttribute("data-typing");
    }
    queue.current = [];
    pending.current = [];
    hideCursor();
    if (had) {
      setBusy("typing", false);
      window.dispatchEvent(new CustomEvent("migrainz:typing", { detail: { state: "end", where: "terminal" } }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tick = useCallback((now: number) => {
    const state = loop.current;
    const elapsed = Math.min(100, now - state.last);
    state.last = now;
    if (now >= state.pauseUntil) state.carry += (elapsed * state.rate) / 1000;
    while (state.carry >= 1 && queue.current.length) {
      const item = queue.current[0];
      if (!item.node.isConnected) { untypedHighlight().delete(item.range); queue.current.shift(); continue; }
      const next = item.range.startOffset + 1;
      state.carry -= 1;
      if (next >= item.node.length) {
        untypedHighlight().delete(item.range);
        item.line.removeAttribute("data-typing");
        queue.current.shift();
        state.pauseUntil = now + LINE_PAUSE_MS;
        state.carry = 0;
        break;
      }
      item.range.setStart(item.node, next);
    }
    if (!queue.current.length) { finish(); return; }
    placeCursor(queue.current[0]);
    state.frame = requestAnimationFrame(tick);
  }, [finish]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Lines just printed (by id) that should type; their DOM is picked up by attach() after the render. */
  const enqueue = useCallback((ids: number[]) => {
    if (ids.length && typingAllowed()) pending.current.push(...ids);
  }, []);

  /** Called from a layout effect after each render that printed lines: hide the new lines' text and start typing. */
  const attach = useCallback(() => {
    if (!pending.current.length) return;
    const root = log.current;
    const ids = pending.current;
    pending.current = [];
    if (!root) return;
    let added = 0;
    for (const id of ids) {
      const line = root.querySelector<HTMLElement>(`p[data-line="${id}"]`);
      const node = line?.firstChild;
      if (!line || !(node instanceof Text) || !node.length) continue;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, node.length);
      untypedHighlight().add(range);
      line.setAttribute("data-typing", "");
      queue.current.push({ node, range, line });
      added++;
    }
    if (!added) return;
    const state = loop.current;
    const left = queue.current.reduce((sum, item) => sum + item.node.length - item.range.startOffset, 0);
    state.rate = Math.max(TYPE_CPS, (left * 1000) / CAP_MS);
    placeCursor(queue.current[0]);
    if (!state.frame) {
      state.last = performance.now();
      state.carry = 0;
      state.pauseUntil = 0;
      setBusy("typing", true);
      window.dispatchEvent(new CustomEvent("migrainz:typing", { detail: { state: "start", where: "terminal" } }));
      state.frame = requestAnimationFrame(tick);
    }
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => finish, [finish]);
  return { enqueue, attach, finish };
}
