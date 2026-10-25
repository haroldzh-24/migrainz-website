import { useId } from "react";

export default function WatcherArt() {
  const socketId = useId();
  return (
    <div className="watcher-art" role="img" aria-label="Studio Migrainz watcher wearing night-vision goggles">
      {/* Layers are the pre-tuned scripts/bake-watcher-crt.mjs output: 1248px canvases, 24px of glow padding around the 1200px art. */}
      <svg viewBox="-24 -24 1248 1248" aria-hidden="true">
        <defs>
          {/* Fixed socket apertures in original image coordinates. */}
          <clipPath id={socketId}>
            <path d="M437 621 C446 600 464 587 486 590 C502 591 516 601 524 614 C500 616 476 633 454 630 Z" />
            <path d="M601 615 C607 596 621 588 642 589 C663 590 678 604 682 622 L674 630 C648 623 624 617 601 618 Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${socketId})`}>
          <image className="watcher-eyes" href="/images/watcher/watcher-eyes.crt.png" x="-24" y="-24" width="1248" height="1248" />
        </g>
      </svg>
      {/* Keep the static face out of the SVG that repaints as eyes move. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/watcher/watcher-base.crt.png" width="1248" height="1248" alt="" draggable={false} />
    </div>
  );
}
