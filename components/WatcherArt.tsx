import { useId } from "react";

export default function WatcherArt() {
  const socketId = useId();
  return (
    <svg viewBox="0 0 1200 1200" role="img" aria-label="Studio Migrainz watcher wearing night-vision goggles">
      <defs>
        {/* Fixed socket apertures in original image coordinates. */}
        <clipPath id={socketId}>
          <path d="M437 621 C446 600 464 587 486 590 C502 591 516 601 524 614 C500 616 476 633 454 630 Z" />
          <path d="M601 615 C607 596 621 588 642 589 C663 590 678 604 682 622 L674 630 C648 623 624 617 601 618 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${socketId})`}>
        <image className="watcher-eyes" href="/images/watcher/watcher-eyes.png" width="1200" height="1200" />
      </g>
      <image href="/images/watcher/watcher-base.png" width="1200" height="1200" />
    </svg>
  );
}
