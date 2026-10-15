# Watcher performance investigation — 2026-10-15

User reports smooth animation on one Windows laptop but stutter on Macs and a Raider GE/GR68 HX 14V-class machine. The browser versions, GPU settings, refresh rates and power states of those affected devices were not supplied. The specific cross-device failure has not been reproduced on those devices.

## Deployment comparison

Read-only HTTPS inspection of https://migrainzxxl.com returned 200. Its public HTML and ten linked JS/CSS assets contained the same pre-optimization watcher behavior as the local source: React state updates in the normalized pointer handler, touch capture, 10/5 source-pixel eye tracking, 4/3 display-pixel drift, 1000px perspective, 2/1.25-degree rotations, 48%/51% origin, 0.14s/0.25s CSS transitions, SVG noise, and CRT overlay. This is a behavioral/source comparison, not a deployment commit/hash match. No deployment was performed; these optimizations are local.

## Measurements and limits

Isolated production React bundle of the real watcher and the site's stylesheet, served on loopback without the CMS. Chrome 155.0.8059.40 on this Windows host, headless, 1440×1000, CDP CPU throttling at 4×. Each case injects synthetic Pointer Events using an 8ms timer for 2.5 seconds; tracing/throttling reduces actual delivered event frequency. These are not real mouse polling-rate measurements. Rendering instrumentation and shared-host scheduling add noise. Cases are short, single samples, not statistically controlled device benchmarks.

| Case | Delivered events | Watcher renders | Frames | Frames >25ms | Style recalculation ms | Layout ms | Paint ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Before, all effects | 200 | 199 | 137 | 5 | 384.83 | 107.91 | 40.40 |
| Frame loop, original SVG grouping | 191 | 0 | 149 | 1 | 153.91 | 115.80 | 73.81 |
| Frame loop, separated face | 174 | 0 | 141 | 4 | 141.01 | 98.93 | 53.69 |
| Final repeat, all effects | 188 | 0 | 149 | 2 | 102.14 | 72.50 | 55.22 |

Confirmed: per-event React rerendering was eliminated and style recalculation fell in these samples. Paint costs did **not** improve relative to the original baseline; no overall cross-device FPS improvement is claimed. Separating the face improved paint time relative to the first frame-loop version in this run, but does not establish a general speedup. Eye SVGs still repaint.

Effects were independently disabled only in the test harness, keeping handler/JS work present:

| Variant | Before style ms | Before paint ms | Separated-face style ms | Separated-face paint ms |
| --- | ---: | ---: | ---: | ---: |
| Eye transform disabled | 389.88 | 41.84 | 189.08 | 57.85 |
| Socket clip disabled | 548.28 | 49.00 | 150.56 | 53.35 |
| Shared head transform disabled | 477.34 | 60.44 | 136.98 | 83.06 |
| CRT hidden | 394.77 | 59.68 | 72.82 | 67.02 |
| Idle grain, no tracking | 47.27 | 0 | 40.26 | 0 |

No single effect is established as the cross-device culprit. Removing CRT reduces style work in the optimized sample, but the idle grain is already repaint-free in Chrome; the effect remains enabled. Disabling clipping/3D did not consistently improve the measured costs. Main-thread traces do not measure total GPU bandwidth, power consumption or physical input/display latency.

The reusable profiler's final repeat also shifted interference animation time to exercise the sweep during sampling. Idle grain and the idle sweep both recorded zero Paint/RasterTask events (sweep style work 38ms, layout 0ms over 2.5 seconds). This supports compositor reuse in this Chrome configuration, not a claim about other GPUs or Safari.

An additional CDP layer-reason probe returned stale layer IDs (`No layer matching given id found`), so GPU promotion/reasons were not verified directly. Repaint-free idle traces are the available evidence; hardware acceleration on the affected devices remains unknown.

## Changes

- Pointer handlers store the latest coordinates in the mounted effect's closure; no React state updates. One on-demand animation-frame loop measures geometry at most once per dirty frame, before writes, and updates only the relevant transforms/readout text.
- Exponential interpolation uses elapsed milliseconds: `1 - exp(-dt / tau)`, with eye tau `140/3` ms and head tau `250/3` ms (~95% response within 140/250ms). No repeatedly restarted CSS transitions. Convex interpolation between disk-constrained targets preserves the elliptical limits.
- The static face is an ordinary image outside the repainting SVG eyes, with the unchanged socket paths. Both remain inside one HTML parent carrying the same perspective, origin, drift and rotation. Only this shared parent requests transform compositing; this is a browser hint, not a GPU guarantee.
- Existing 64px noise SVG rasterized once with Sharp to a 11,933-byte repeating PNG. Pixels, tint, opacity, tile scale and animation remain unchanged. The SVG remains as source, but is no longer used at runtime. No new dependency or filter on moving artwork.
- Tracking stops after settling, pauses/resets when hidden, and cleans up listeners, capture and animation frames on unmount. Pointer cancellation, scroll/pinch behavior and reduced motion remain supported. CRT animation is independent of pointer activity.

Timestamp-based animation follows the [requestAnimationFrame guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). Engine-specific SVG/compositing differences remain plausible: WebKit describes its [layer-based SVG engine integration](https://webengineshackfest.org/2024/slides/status_of_the_layer-based_svg_engine_in_webkit_by_nikolas_zimmermann.pdf). Those sources explain why compatibility warrants testing; they do not prove a Safari bug in this watcher.

## Verification

- Chrome 155 and Edge 155.0.4283.45: isolated real-component browser checks passed at 375px/430px for touch start, horizontal drag, release/cancel, native vertical scrolling, elliptical limits, CRT, and reduced motion; 1440px layout/mouse hover/leave passed. Screenshots visually inspected. Tests use emulated touch, not physical devices.
- Controlled animation-frame timestamps at simulated 60/120Hz: equal transforms after 300ms (eye x 9.98385px, head x 3.89071px, Y rotation 1.94535deg). Both loops sleep when settled. This proves elapsed-time logic, not real 120Hz display/GPU performance.
- TypeScript and production build checks run after implementation; see feature/changelog validation.
- No Safari/WebKit, macOS, physical iOS/Android/tablet, Raider hardware, or physical high-refresh-display validation. Full CMS/BLUSHLAND regression not run; existing local SQLite blocker remains in bugs.md.

## Repeating the profile

`scripts/profile-watcher.mjs` creates a temporary in-memory production bundle and loopback page, instruments component calls, captures CDP rendering/script/style/layout/paint/raster metrics and animation-frame gaps, and writes ignored `test-results/watcher-profile-LABEL.json`. It includes full, no-eyes, no-clip, no-3D, no-static, idle-grain, and idle-interference-sweep cases. Original before/after/split-layer samples remain in ignored test-results. The profiler needs existing esbuild and Playwright availability; it does not install packages.

Run `npm.cmd exec --yes --package=playwright -- node scripts/profile-watcher.mjs LABEL`, or provide a local Playwright module URL through `PLAYWRIGHT_MODULE`. `BROWSER_PATH` can select an installed Chromium browser such as Edge. CPU throttling is a main-thread stress aid; it does not emulate a phone GPU or Safari.

Next validation should run browser performance recordings on an affected device, recording browser version, refresh rate, DPR, power mode, hardware acceleration and GPU status. Compare with the same effects isolated and inspect the whole-page CRT/other animations too; the isolated test cannot rule out interactions with the full deployed page.
