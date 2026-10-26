import { useId } from "react";

export default function WatcherArt() {
  const socketId = useId();
  return (
    <div className="watcher-art" role="img" aria-label="Studio Migrainz watcher wearing night-vision goggles">
      {/* Layers are the pre-tuned scripts/bake-watcher-crt.mjs output: 1248px canvases, 24px of glow padding around the 1200px art.
          Each phosphor has its own baked set; html[data-phosphor] picks one in CSS, so the saved choice never flashes. */}
      <svg viewBox="-24 -24 1248 1248" aria-hidden="true">
        <defs>
          {/* Fixed socket apertures in original image coordinates. */}
          <clipPath id={socketId}>
            <path d="M437 621 C446 600 464 587 486 590 C502 591 516 601 524 614 C500 616 476 633 454 630 Z" />
            <path d="M601 615 C607 596 621 588 642 589 C663 590 678 604 682 622 L674 630 C648 623 624 617 601 618 Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${socketId})`}>
          {/* Watcher.tsx moves this one group; the inactive phosphor layer is display: none. */}
          <g className="watcher-eyes">
            <image className="watcher-eyes-green" href="/images/watcher/watcher-eyes.crt.png" x="-24" y="-24" width="1248" height="1248" />
            <image className="watcher-eyes-amber" href="/images/watcher/watcher-eyes.amber.png" x="-24" y="-24" width="1248" height="1248" />
          </g>
        </g>
      </svg>
      {/* Keep the static face out of the SVG that repaints as eyes move; its image comes from --watcher-base. */}
      <span className="watcher-base" aria-hidden="true" />
    </div>
  );
}
