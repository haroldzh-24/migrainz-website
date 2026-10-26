import { useId } from "react";

export default function WatcherArt() {
  const socketId = useId();
  return (
    <div className="watcher-art" role="img" aria-label="Studio Migrainz watcher wearing night-vision goggles">
      {/* Layers are the pre-tuned scripts/bake-watcher-crt.mjs output: 1360px canvases, 80px of glow padding around the 1200px art
          (the outer glow layer is a 16px drop-shadow). Each phosphor has its own baked set; html[data-phosphor] picks one in
          CSS, so the saved choice never flashes. */}
      <svg viewBox="-80 -80 1360 1360" aria-hidden="true">
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
            <image className="watcher-eyes-green" href="/images/watcher/watcher-eyes.crt.webp" x="-80" y="-80" width="1360" height="1360" />
            <image className="watcher-eyes-amber" href="/images/watcher/watcher-eyes.amber.webp" x="-80" y="-80" width="1360" height="1360" />
          </g>
        </g>
      </svg>
      {/* Keep the static face out of the SVG that repaints as eyes move; its image comes from --watcher-base. */}
      <span className="watcher-base" aria-hidden="true" />
    </div>
  );
}
