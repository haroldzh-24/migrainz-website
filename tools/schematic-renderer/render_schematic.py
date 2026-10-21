"""Render looping line-art turntable schematics for the Equipment schematic field.

Run headless through Blender (see README.md):

  blender -b -P render_schematic.py -- --model <file.blend> --slug <name>
  blender -b -P render_schematic.py -- --models-dir <folder>
  blender -b -P render_schematic.py -- --model <file.blend> --slug <name> --stills all

Models, frames and finished renders live in a work folder OUTSIDE the repo
(default C:\\Users\\brrrr\\schematic-work, override with --work-dir or
SCHEMATIC_WORK_DIR). Nothing in this script writes into the repository.
"""

import argparse
import glob
import json
import math
import os
import re
import shutil
import subprocess
import sys

import bpy
import numpy as np
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CSS_PATH = os.path.join(REPO, "app", "(frontend)", "globals.css")
DEFAULT_WORK_DIR = os.path.join(os.path.expanduser("~"), "schematic-work")

# Fallbacks only; the live values are read from globals.css :root at start.
FALLBACK_PALETTE = {
    "bg": "#010301", "panel": "#030803", "green": "#72ff62",
    "green2": "#42c93a", "dim": "#247d21", "hot": "#baffaa",
}

# EquipmentSchematic.tsx displays the video at 16:9.
ASPECT = (16, 9)

# --------------------------------------------------------------------------
# Colour helpers
# --------------------------------------------------------------------------


def read_palette():
    palette = dict(FALLBACK_PALETTE)
    try:
        css = open(CSS_PATH, encoding="utf-8").read()
        root = re.search(r":root\s*\{(.*?)\}", css, re.S).group(1)
        for name, value in re.findall(r"--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b", root):
            palette[name] = value
    except Exception as error:  # noqa: BLE001 - fall back to constants
        print(f"[palette] could not read {CSS_PATH}: {error}; using fallbacks")
    return palette


def hex_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))


def mix(a, b, t):
    """Mix two sRGB tuples; t=0 -> a, t=1 -> b."""
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def to_linear(rgb):
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb)


def build_styles(palette):
    p = {k: hex_rgb(v) for k, v in palette.items()}
    bg = p["bg"]
    return {
        # Dark fill, thin green contour, grid on the backdrop.
        "blueprint": dict(
            fill=mix(bg, p["dim"], 0.30), contour=p["green2"], contour_px=1.6,
            crease=p["dim"], crease_px=1.0, grid="screen", grid_alpha=(0.045, 0.085), floor=None),
        # Lighter fill so the form reads; hot-green silhouette.
        "solid": dict(
            fill=mix(bg, p["green2"], 0.26), contour=p["hot"], contour_px=1.9,
            crease=p["green"], crease_px=1.0, grid="screen", grid_alpha=(0.035, 0.07), floor=None),
        # Very dark fill, a grid plane under the object instead of a flat backdrop grid.
        "floor": dict(
            fill=mix(bg, p["dim"], 0.20), contour=p["green"], contour_px=1.5,
            crease=p["green2"], crease_px=0.9, grid=None, grid_alpha=(0, 0), floor=mix(bg, p["dim"], 0.55)),
    }


# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

BUILTIN_DEFAULTS = {
    "style": "blueprint",
    "rotation": [0, 0, 0],      # degrees XYZ applied to the model before centering
    "tilt": 18,                 # camera elevation above the horizon, degrees
    "camera_distance": 1.0,     # multiplier on the auto-fit distance (<1 closer)
    "margin": 1.14,             # framing slack around the bounding extent
    "lens": 85,                 # mm; use "ortho": true for a pure orthographic view
    "ortho": False,
    "crease_angle": 125,        # degrees; lower = fewer interior lines
    "flat_normals": False,      # force flat shading on the mesh
    "start_angle": 0,           # turntable start, degrees
}


def load_config(path, slug):
    cfg = dict(BUILTIN_DEFAULTS)
    if path and os.path.exists(path):
        data = json.load(open(path, encoding="utf-8"))
        cfg.update(data.get("defaults", {}))
        cfg.update(data.get("weapons", {}).get(slug, {}))
    else:
        print(f"[config] {path} not found; using built-in defaults")
    return cfg


# --------------------------------------------------------------------------
# ffmpeg
# --------------------------------------------------------------------------


def find_ffmpeg(explicit):
    candidates = [explicit, os.environ.get("FFMPEG"), shutil.which("ffmpeg")]
    local = os.environ.get("LOCALAPPDATA")
    if local:
        candidates += glob.glob(os.path.join(local, "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg*", "**", "bin", "ffmpeg.exe"), recursive=True)
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    raise SystemExit("ffmpeg not found. Install it or pass --ffmpeg <path>.")


# --------------------------------------------------------------------------
# Scene construction
# --------------------------------------------------------------------------


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def import_model(path, scene):
    """Append renderable geometry from a .blend into a 'weapon' collection."""
    if not path.lower().endswith(".blend"):
        raise SystemExit(f"Unsupported model format: {path} (only .blend is supported)")
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.objects = list(src.objects)
    weapon = bpy.data.collections.new("weapon")
    scene.collection.children.link(weapon)
    meshes = []
    for obj in dst.objects:
        if obj is None:
            continue
        if obj.type in {"CAMERA", "LIGHT"} or obj.hide_render:
            bpy.data.objects.remove(obj)
            continue
        weapon.objects.link(obj)
        if obj.type in {"MESH", "CURVE", "SURFACE", "FONT"}:
            meshes.append(obj)
    if not meshes:
        raise SystemExit(f"No renderable geometry found in {path}")
    return weapon, meshes


def world_points(meshes):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    chunks = []
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        count = len(mesh.vertices)
        if count:
            co = np.empty(count * 3, dtype=np.float64)
            mesh.vertices.foreach_get("co", co)
            co = co.reshape(-1, 3)
            matrix = np.array(evaluated.matrix_world)
            chunks.append(co @ matrix[:3, :3].T + matrix[:3, 3])
        evaluated.to_mesh_clear()
    return np.vstack(chunks)


def normalize(scene, weapon, meshes, cfg):
    """Orient, center on the origin and scale so the bounding radius is 1."""
    orient = bpy.data.objects.new("orient", None)
    turntable = bpy.data.objects.new("turntable", None)
    scene.collection.objects.link(orient)
    scene.collection.objects.link(turntable)
    orient.parent = turntable
    for obj in list(weapon.objects):
        if obj.parent is None:
            obj.parent = orient
    orient.rotation_euler = Euler([math.radians(a) for a in cfg["rotation"]], "XYZ")
    bpy.context.view_layer.update()

    pts = world_points(meshes)
    center = (pts.min(axis=0) + pts.max(axis=0)) / 2
    radius = float(np.max(np.linalg.norm(pts - center, axis=1)))
    scale = 1.0 / radius
    orient.scale = (scale, scale, scale)
    orient.location = Vector(-center * scale)
    bpy.context.view_layer.update()

    pts = world_points(meshes)  # now normalized
    r_xy = float(np.max(np.hypot(pts[:, 0], pts[:, 1])))
    half_z = float(np.max(np.abs(pts[:, 2])))
    z_min = float(pts[:, 2].min())
    if cfg["flat_normals"]:
        for obj in meshes:
            if obj.type == "MESH":
                for poly in obj.data.polygons:
                    poly.use_smooth = False
    return turntable, r_xy, half_z, z_min


def setup_camera(scene, r_xy, half_z, cfg):
    tilt = math.radians(cfg["tilt"])
    margin = cfg["margin"]
    half_w = r_xy * margin
    half_h = (r_xy * math.sin(tilt) + half_z * math.cos(tilt)) * margin
    data = bpy.data.cameras.new("cam")
    data.clip_start, data.clip_end = 0.05, 500
    cam = bpy.data.objects.new("cam", data)
    scene.collection.objects.link(cam)
    aspect = ASPECT[0] / ASPECT[1]
    if cfg["ortho"]:
        data.type = "ORTHO"
        data.ortho_scale = 2 * max(half_w, half_h * aspect) * cfg["camera_distance"]
        dist = 20.0
    else:
        data.type = "PERSP"
        data.lens, data.sensor_width = cfg["lens"], 36
        t_h = (data.sensor_width / 2) / data.lens
        t_v = t_h / aspect
        # Worst case over the turntable: a point on the horizontal circle of radius r
        dist = max(half_w * math.sqrt(1 / t_h ** 2 + 1), half_h * math.sqrt(1 / t_v ** 2 + 1))
        dist *= cfg["camera_distance"]
    cam.location = (0, -dist * math.cos(tilt), dist * math.sin(tilt))
    cam.rotation_euler = (math.pi / 2 - tilt, 0, 0)
    scene.camera = cam
    return cam


def make_floor(scene, r_xy, z_min, color):
    extent = max(2.4, r_xy * 2.6)
    cells = 16
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=cells, y_subdivisions=cells, size=extent, location=(0, 0, z_min - 0.03))
    floor = bpy.context.active_object
    floor.name = "floor"
    mod = floor.modifiers.new("wire", "WIREFRAME")
    mod.thickness = 0.0045
    mod.use_even_offset = True
    floor.color = (*to_linear(color), 1)
    if floor.name not in scene.collection.objects:
        scene.collection.objects.link(floor)
    return floor


def make_lineset(fs, name, collection, color, px, silhouette, crease):
    lineset = fs.linesets.new(name)
    lineset.select_silhouette = silhouette
    lineset.select_border = silhouette
    lineset.select_external_contour = silhouette
    lineset.select_crease = crease
    lineset.select_by_collection = True
    lineset.collection = collection
    lineset.select_by_visibility = True
    lineset.visibility = "VISIBLE"
    style = bpy.data.linestyles.new(name)
    style.color = to_linear(color)
    style.thickness = px
    style.caps = "ROUND"
    lineset.linestyle = style


def configure_render(scene, weapon, meshes, style, cfg, width, height):
    render = scene.render
    render.engine = "BLENDER_WORKBENCH"
    render.resolution_x, render.resolution_y, render.resolution_percentage = width, height, 100
    render.film_transparent = True
    render.image_settings.file_format = "PNG"
    render.image_settings.color_mode = "RGBA"
    render.image_settings.color_depth = "8"
    render.image_settings.compression = 15
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.display_settings.display_device = "sRGB"

    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "OBJECT"
    shading.show_object_outline = False
    shading.show_specular_highlight = False
    shading.show_cavity = False
    shading.show_shadows = False
    scene.display.render_aa = "8"

    for obj in meshes:
        obj.color = (*to_linear(style["fill"]), 1)

    render.use_freestyle = True
    render.line_thickness_mode = "ABSOLUTE"
    layer = scene.view_layers[0]
    layer.use_freestyle = True
    fs = layer.freestyle_settings
    for existing in list(fs.linesets):
        fs.linesets.remove(existing)
    fs.crease_angle = math.radians(cfg["crease_angle"])
    make_lineset(fs, "crease", weapon, style["crease"], style["crease_px"], False, True)
    make_lineset(fs, "contour", weapon, style["contour"], style["contour_px"], True, False)


# --------------------------------------------------------------------------
# Backdrop grid (composited under the transparent frames by ffmpeg)
# --------------------------------------------------------------------------


def write_backdrop(path, palette, style, width, height):
    bg = np.array(hex_rgb(palette["bg"]))
    grid = np.array(hex_rgb(palette["green"]))
    img = np.empty((height, width, 3))
    img[:] = bg
    if style["grid"] == "screen":
        step = max(8, round(height / 18))
        minor, major = style["grid_alpha"]
        for index, x in enumerate(range(0, width, step)):
            img[:, x] = bg + (grid - bg) * (major if index % 4 == 0 else minor)
        for index, y in enumerate(range(0, height, step)):
            img[y, :] = bg + (grid - bg) * (major if index % 4 == 0 else minor)
    rgba = np.ones((height, width, 4))
    rgba[..., :3] = img
    image = bpy.data.images.new("backdrop", width, height, alpha=False)
    image.colorspace_settings.name = "Non-Color"  # write sRGB values verbatim
    image.pixels.foreach_set(np.flipud(rgba).astype(np.float32).ravel())
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------


def encode(ffmpeg, backdrop, frames_dir, out_mp4, poster, fps, max_mb):
    base = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error"]
    composite = "[0:v][1:v]overlay=shortest=1:format=auto,format=yuv420p"
    inputs = ["-loop", "1", "-framerate", str(fps), "-i", backdrop, "-framerate", str(fps), "-i", os.path.join(frames_dir, "f_%04d.png")]
    for crf in (23, 26, 29, 32):
        subprocess.run(base + inputs + [
            "-filter_complex", composite, "-an", "-c:v", "libx264", "-preset", "slow", "-tune", "animation",
            "-crf", str(crf), "-pix_fmt", "yuv420p", "-r", str(fps), "-movflags", "+faststart", out_mp4], check=True)
        size = os.path.getsize(out_mp4) / 1e6
        print(f"[encode] crf {crf}: {size:.2f} MB")
        if size <= max_mb:
            break
    else:
        print(f"[encode] WARNING: still above {max_mb} MB at crf 32")
    subprocess.run(base + inputs + ["-filter_complex", composite.replace("format=yuv420p", "format=rgb24"), "-frames:v", "1", poster], check=True)


def composite_still(ffmpeg, backdrop, frame, out_png):
    subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", backdrop, "-i", frame,
                    "-filter_complex", "[0:v][1:v]overlay=format=auto,format=rgb24", "-frames:v", "1", out_png], check=True)


def build_scene(model, slug, cfg, style_name, styles, palette, width, height):
    scene = reset_scene()
    weapon, meshes = import_model(model, scene)
    turntable, r_xy, half_z, z_min = normalize(scene, weapon, meshes, cfg)
    setup_camera(scene, r_xy, half_z, cfg)
    style = styles[style_name]
    if style["floor"]:
        make_floor(scene, r_xy, z_min, style["floor"])
    configure_render(scene, weapon, meshes, style, cfg, width, height)
    print(f"[{slug}] bounding radius normalized; r_xy={r_xy:.3f} half_z={half_z:.3f} style={style_name}")
    return scene, turntable, style


def render_stills(args, model, slug, cfg, styles, palette, ffmpeg, work):
    names = list(styles) if args.stills == "all" else args.stills.split(",")
    out_dir = os.path.join(work, "renders", slug, "stills")
    os.makedirs(out_dir, exist_ok=True)
    for name in names:
        scene, turntable, style = build_scene(model, slug, cfg, name, styles, palette, args.width, args.height)
        turntable.rotation_euler.z = math.radians(cfg["start_angle"] + args.still_angle)
        raw = os.path.join(out_dir, f"_{name}_raw.png")
        backdrop = os.path.join(out_dir, f"_{name}_bg.png")
        scene.render.filepath = raw
        bpy.ops.render.render(write_still=True)
        write_backdrop(backdrop, palette, style, args.width, args.height)
        composite_still(ffmpeg, backdrop, raw, os.path.join(out_dir, f"{slug}-{name}.png"))
        os.remove(raw)
        os.remove(backdrop)
        print(f"[{slug}] still -> {os.path.join(out_dir, f'{slug}-{name}.png')}")


def render_video(args, model, slug, cfg, styles, palette, ffmpeg, work):
    style_name = args.style or cfg["style"]
    frames = round(args.seconds * args.fps)
    scene, turntable, style = build_scene(model, slug, cfg, style_name, styles, palette, args.width, args.height)
    job = os.path.join(work, "renders", slug)
    frames_dir = os.path.join(job, "frames")
    shutil.rmtree(frames_dir, ignore_errors=True)
    os.makedirs(frames_dir)
    start = math.radians(cfg["start_angle"])

    # Linear 360 degrees over `frames` frames; frame `frames + 1` (== frame 1) is never rendered.
    def spin(s, *_):
        turntable.rotation_euler.z = start + 2 * math.pi * (s.frame_current - 1) / frames

    bpy.app.handlers.frame_change_pre.clear()
    bpy.app.handlers.frame_change_pre.append(spin)
    scene.frame_start, scene.frame_end = 1, frames
    scene.render.fps = args.fps
    scene.render.filepath = os.path.join(frames_dir, "f_")
    bpy.ops.render.render(animation=True)
    bpy.app.handlers.frame_change_pre.clear()

    out_dir = os.path.join(work, "output")
    os.makedirs(out_dir, exist_ok=True)
    backdrop = os.path.join(job, "backdrop.png")
    write_backdrop(backdrop, palette, style, args.width, args.height)
    mp4 = os.path.join(out_dir, f"{slug}.mp4")
    poster = os.path.join(out_dir, f"{slug}-poster.png")
    encode(ffmpeg, backdrop, frames_dir, mp4, poster, args.fps, args.max_mb)
    if not args.keep_frames:
        shutil.rmtree(frames_dir, ignore_errors=True)
    print(f"[{slug}] video -> {mp4}\n[{slug}] poster -> {poster}")


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser(prog="render_schematic.py")
    ap.add_argument("--model", help="a .blend file")
    ap.add_argument("--slug", help="output name; defaults to the model filename")
    ap.add_argument("--models-dir", help="batch: render every .blend in this folder")
    ap.add_argument("--work-dir", default=os.environ.get("SCHEMATIC_WORK_DIR", DEFAULT_WORK_DIR))
    ap.add_argument("--config", default=os.path.join(HERE, "schematic-config.json"))
    ap.add_argument("--style", help="blueprint | solid | floor (overrides config)")
    ap.add_argument("--stills", help="render test stills instead of video: 'all' or comma list of styles")
    ap.add_argument("--still-angle", type=float, default=35, help="turntable angle for stills, degrees")
    ap.add_argument("--seconds", type=float, default=8)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--max-mb", type=float, default=2.9, help="site cap is 3 MiB")
    ap.add_argument("--ffmpeg")
    ap.add_argument("--keep-frames", action="store_true")
    ap.add_argument("--force", action="store_true", help="batch: re-render even if the mp4 exists")
    args = ap.parse_args(argv)
    if not args.model and not args.models_dir:
        ap.error("pass --model or --models-dir")
    if abs(args.width / args.height - ASPECT[0] / ASPECT[1]) > 0.01:
        ap.error("width/height must be 16:9 to match the schematic viewer")
    return args


def main():
    args = parse_args()
    work = os.path.abspath(args.work_dir)
    if os.path.commonpath([work, REPO]) == REPO:
        raise SystemExit(f"--work-dir must be outside the repository: {work}")
    ffmpeg = find_ffmpeg(args.ffmpeg)
    palette = read_palette()
    styles = build_styles(palette)
    print(f"[palette] {palette}")

    try:
        with open(args.config, encoding="utf-8") as handle:
            slug_aliases = json.load(handle).get("slugs", {})
    except OSError:
        slug_aliases = {}

    if args.models_dir:
        models = sorted(glob.glob(os.path.join(args.models_dir, "*.blend")))
    else:
        models = [args.model]
    if not models:
        raise SystemExit("No .blend models found.")

    for model in models:
        stem = os.path.splitext(os.path.basename(model))[0]
        slug = args.slug if (args.slug and not args.models_dir) else slug_aliases.get(stem) or slugify(stem)
        if args.models_dir and not args.stills and not args.force and os.path.exists(os.path.join(work, "output", f"{slug}.mp4")):
            print(f"[{slug}] exists, skipping (use --force)")
            continue
        cfg = load_config(args.config, slug)
        try:
            (render_stills if args.stills else render_video)(args, model, slug, cfg, styles, palette, ffmpeg, work)
        except Exception as error:  # noqa: BLE001 - keep the batch going
            print(f"[{slug}] FAILED: {error}")
            if not args.models_dir:
                raise


main()
