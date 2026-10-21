# Schematic renderer

Turns an untextured `.blend` weapon model into a looping line-art turntable (MP4 + poster) for the
Equipment schematic field. Local tooling only; it never touches the CMS, Blob, Neon or Vercel.

## Quick start (Windows)

1. Put your `.blend` files in `%USERPROFILE%\schematic-work\models\` (created on first run).
2. **Drag a model onto `render-stills.cmd`** to get three style test stills, and pick one.
3. Set the style in `schematic-config.json` (`"style": "blueprint"`, per weapon or in `defaults`).
4. **Drag a model onto `render.cmd`** to render its video loop, or **double-click `render.cmd`** to batch every model in the folder (existing videos are skipped).

Results: `schematic-work\output\<slug>.mp4` and `<slug>-poster.png`; stills in `schematic-work\renders\<slug>\stills\`.
The slug is the model's filename, lowercased with dashes. These files stay outside the repo and are never committed.

## Setting up another computer

1. **Blender** (5.2 or newer): download from https://www.blender.org/download/ and install to the default
   location, or `winget install BlenderFoundation.Blender`. The wrappers look in
   `C:\Program Files\Blender Foundation\Blender *\` and on PATH. To use another location, set the
   `BLENDER` environment variable to the full path of `blender.exe`.
2. **ffmpeg** (with libx264): `winget install Gyan.FFmpeg`. The script finds it on PATH or in the winget
   folder; otherwise set `FFMPEG` to the full path of `ffmpeg.exe`.
3. **Repo**: clone it and use `tools\schematic-renderer\`. Nothing else is needed; the script uses Blender's
   bundled Python and numpy, and reads the site colors from `app\(frontend)\globals.css`.
4. Optional: set `SCHEMATIC_WORK_DIR` to keep models and renders somewhere other than `%USERPROFILE%\schematic-work`
   (it must be outside the repo).

## Command line

    & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P tools\schematic-renderer\render_schematic.py -- --model x.blend --slug x
    ... -- --model x.blend --stills all        # style test stills
    ... -- --models-dir <folder>               # batch (add --force to re-render)

Other options: `--report-hidden` (list hidden and visible objects per model, no render), `--style`, `--seconds`, `--fps`, `--max-mb`, `--keep-frames`, `--work-dir`, `--ffmpeg`.

## What gets rendered

What's visible when you open the file is what renders. Objects hidden with the eye icon, disabled in the viewport or in renders, in excluded or hidden collections, or outside the active view layer are left out, and each render prints a "left out" line for them. Run `--report-hidden` to check every model first. Every render also prints a framing check that projects the model at every 3 degrees of the turn and flags anything that would be cut off.

## Per-weapon overrides: `schematic-config.json`

`defaults` apply to every model; `weapons.<slug>` overrides them, so re-renders are repeatable.

| key | meaning |
| --- | --- |
| `style` | `blueprint`, `solid` or `floor` |
| `rotation` | `[x, y, z]` degrees applied before centering (stand the model upright / point it along X) |
| `tilt` | camera elevation in degrees |
| `camera_distance` | multiplier on the auto-fit distance (below 1 is closer) |
| `margin`, `lens`, `ortho` | framing slack, focal length, orthographic camera |
| `crease_angle` | lower values draw fewer interior lines |
| `flat_normals` | force flat shading |
| `start_angle` | turntable start angle in degrees |
| `line_scale` | multiplier on all line thicknesses (default 1.5 in the config so lines survive scanlines and compression) |

Top-level `slugs` maps a model filename (without `.blend`) to its output slug when plain lowercasing is not enough, e.g. `"ValmetM88": "valmet-m88"`.

## Output

1280x720 (16:9, matching `EquipmentSchematic`), 30 fps, 8 s, 240 frames. The rotation is linear,
360 degrees over the 240 frames, and the 360-degree frame is not rendered so the loop has no repeated frame.
H.264, `yuv420p`, `+faststart`, no audio. The encoder raises CRF until the file is under `--max-mb`
(default 2.9; the site's upload cap is 3 MiB). The poster is the first frame. Colors come from `:root` in
`globals.css`; no scanlines or CRT effects are baked in.

Only `.blend` input is supported.
