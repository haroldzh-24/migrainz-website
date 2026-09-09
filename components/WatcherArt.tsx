export default function WatcherArt() {
  return (
    <svg viewBox="0 0 600 600" role="img" aria-label="Abstract terminal face">
      <defs>
        <filter id="roughGlow">
          <feGaussianBlur stdDeviation="2.2" result="blur" />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="head" filter="url(#roughGlow)">
        <path
          d="
                M165 120
                L430 120
                L505 205
                L470 462
                L387 520
                L210 500
                L123 418
                L102 210
                Z
              "
        />

        <path
          d="
                M210 185
                L390 175
                L440 235
                L418 405
                L355 452
                L235 445
                L173 390
                L155 245
                Z
              "
        />

        <path
          className="detail"
          d="
                M110 320 L160 330
                M432 318 L493 300
                M297 120 L300 177
                M205 446 L178 480
                M389 452 L415 487
              "
        />
      </g>

      <g className="eye eye-left" transform="translate(225 290)">
        <rect x="-66" y="-38" width="132" height="76" rx="4" />

        <circle className="pupil" cx="0" cy="0" r="17" />
      </g>

      <g className="eye eye-right" transform="translate(375 285)">
        <rect x="-66" y="-38" width="132" height="76" rx="4" />

        <circle className="pupil" cx="0" cy="0" r="17" />
      </g>

      <path
        className="mouth"
        d="
              M232 390
              C270 410
              330 410
              370 388
            "
      />

      <text x="300" y="563" textAnchor="middle">
        POINTER INPUT DETECTED
      </text>
    </svg>
  );
}
