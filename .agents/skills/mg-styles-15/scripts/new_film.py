#!/usr/bin/env python3
"""Scaffold a new deterministic MG film workspace inside demos/<name>/ from any of the 22 styles.

Usage:
    python3 scripts/new_film.py --style 01-flat-vector --name my-brand-film --title "ANS · AI Never Stops"
"""
import argparse
import json
import os
import shutil
import sys

SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(SKILL_ROOT, 'lib', 'audio'))
from mgaudio.recipes import STYLES  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description='Scaffold a new MG film project.')
    ap.add_argument('--style', required=True, help='Style slug, e.g. 01-flat-vector, 05-cel-boil, 15-guochao, 22-hud')
    ap.add_argument('--name', required=True, help='Folder name under demos/<name>')
    ap.add_argument('--title', default='STUDIO IDENT', help='Film title')
    ap.add_argument('--portrait', action='store_true', help='Use 1080x1920 vertical format (default for 18-hanazi)')
    ap.add_argument('--fps', type=int, default=None, help='Override FPS (default: 24 for 04/05, 30 for others)')
    ap.add_argument('--duration', type=float, default=10.0, help='Duration in seconds (default: 10.0)')
    args = ap.parse_args()

    XIAOKE_ALIASES = {
        'xiaoke-cel-watercolor': ('05-cel-boil', 'xiaoke-cel-watercolor.md', 15.0, 24),
        'xiaoke-davinci-line':   ('02-line-art', '02-line-art.md', 15.0, 24),
        'xiaoke-guochao-ink':    ('15-guochao',  '15-guochao.md', 15.0, 24),
    }
    custom_prompt_file = None
    if args.style in XIAOKE_ALIASES:
        style_key, custom_prompt_file, default_dur, default_fps = XIAOKE_ALIASES[args.style]
        if args.duration == 10.0:
            args.duration = default_dur
        if args.fps is None:
            args.fps = default_fps
    else:
        style_key = next((k for k in STYLES if k == args.style or k.split('-', 1)[1] == args.style), None)
    if not style_key:
        raise SystemExit(f'Unknown style {args.style!r}. Available: {", ".join(list(STYLES.keys()) + list(XIAOKE_ALIASES.keys()))}')

    recipe_name, recipe_kw, alt_recipe, sfx_hint = STYLES[style_key]
    w, h = (1080, 1920) if (args.portrait or style_key == '18-hanazi') else (1920, 1080)
    fps = args.fps or (24 if style_key in ('04-3d-render', '05-cel-boil') else 30)

    demo_dir = os.path.join(SKILL_ROOT, 'demos', args.name)
    os.makedirs(os.path.join(demo_dir, 'out'), exist_ok=True)

    # 1. Copy style prompt as BRIEF.md if available
    prompt_src = os.path.join(SKILL_ROOT, 'prompts', custom_prompt_file or f'{style_key}.md')
    if os.path.exists(prompt_src):
        shutil.copyfile(prompt_src, os.path.join(demo_dir, 'BRIEF.md'))

    # 2. Write cues.json (single source of truth for both picture and sound)
    cues = {
        'title': args.title,
        'style': style_key,
        'width': w,
        'height': h,
        'fps': fps,
        'duration': args.duration,
        'bpm': recipe_kw.get('bpm', 120),
        'build': 2.0,
        'drop': 5.5,
        'outro': 8.2,
        'hits': {
            'hook': 0.25,
            'beat1': 1.20,
            'beat2': 2.40,
            'escalate': 3.80,
            'hero_drop': 5.50,
            'climax': 7.00,
            'logo_land': 8.20,
            'hold': 9.00,
        }
    }
    with open(os.path.join(demo_dir, 'cues.json'), 'w', encoding='utf-8') as f:
        json.dump(cues, f, indent=2, ensure_ascii=False)

    # 3. Write audio.py
    audio_py = f'''#!/usr/bin/env python3
"""Deterministic soundtrack & frame-synced SFX for {args.name} ({style_key}).
Recipe: {recipe_name} | Suggested SFX palette: {sfx_hint}
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import recipes, sfx, sync

cues = json.load(open(os.path.join(HERE, 'cues.json'), encoding='utf-8'))
H = cues['hits']

m = recipes.for_style({style_key!r}, duration=cues['duration'], drop=cues['drop'], outro=cues['outro'])
f = m.form

# Example frame-synced SFX (customize to match every visual motion event in index.html):
m.sfx(sfx.pop('bubble', pitch=1.0), at=H['hook'], gain=-2)
m.sfx(sfx.whoosh(0.5, 'swish', direction=1), at=H['escalate'], gain=-4)
m.sfx(sfx.riser(cues['drop'] - cues['build'], 'hybrid'), at=H['hero_drop'], gain=-4)
m.sfx(sfx.impact('cinematic'), at=H['hero_drop'], gain=-2, verb=-10)
m.sfx(sfx.shimmer_hit(f.chord_at(H['logo_land'])[-1] + 12), at=H['logo_land'], gain=-4, verb=-10)

# Pre-hit 60ms music bus dip ("suck") on major impacts
MAJOR_HITS = [H['hero_drop'], H['logo_land']]
pts = [(0.0, 0.0)]
for h in sorted(MAJOR_HITS):
    pts += [(h - 0.095, 0.0), (h - 0.055, -9.0), (h - 0.006, -9.0), (h, 0.0)]
m.group('music').automate('gain', pts + [(cues['duration'], 0.0)])

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
res = m.export(
    os.path.join(HERE, 'out', 'audio.wav'),
    lufs=-14,
    tp=-1.2,
    spectrogram=os.path.join(HERE, 'out', 'audio_spec.png'),
)
print('QC:', {{k: res[k] for k in ('duration', 'lufs', 'true_peak', 'stereo_corr', 'warnings') if k in res}})
assert not res['warnings'], f"Audio QC warnings: {{res['warnings']}}"
'''
    with open(os.path.join(demo_dir, 'audio.py'), 'w', encoding='utf-8') as f:
        f.write(audio_py)

    # 4. Write deterministic index.html skeleton
    index_html = f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>{args.title} — {style_key}</title>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<style>
  html, body {{
    margin: 0; padding: 0; overflow: hidden;
    width: {w}px; height: {h}px; background: #0f1016;
  }}
  svg, canvas {{ display: block; position: absolute; left: 0; top: 0; }}
</style>
</head>
<body>
<svg id="stage" width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
window.DEMO = {{
  width: {w},
  height: {h},
  fps: {fps},
  duration: {args.duration},
  motionBlur: {{ samples: 2, shutter: 0.5 }}
}};
</script>
<script type="module">
const cues = await (await fetch('./cues.json')).json();
await document.fonts.ready;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
function bezier(x1, y1, x2, y2) {{
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return u => {{
    if (u <= 0) return 0; if (u >= 1) return 1;
    let t = u;
    for (let i = 0; i < 10; i++) {{
      const d = dx(t); if (Math.abs(d) < 1e-6) break;
      t = clamp(t - (sx(t) - u) / d);
    }}
    return sy(t);
  }};
}}
const easeOvershoot = bezier(0.34, 1.56, 0.64, 1);

window.renderAt = async (t) => {{
  // Pure function of t (seconds): draw frame at time t
}};

window.__ready = true;
</script>
</body>
</html>
'''
    with open(os.path.join(demo_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_html)

    print(f'✅ Scaffolded {demo_dir} (style={style_key}, {w}x{h} @{fps}fps, {args.duration}s)')
    print(f'   1. Edit {demo_dir}/cues.json, {demo_dir}/index.html, and {demo_dir}/audio.py')
    print(f'   2. Check poster stills: node {SKILL_ROOT}/harness/render.mjs {demo_dir} --stills 0.5,2.0,4.0,5.5,7.5,9.2')
    print(f'   3. Render soundtrack:   python3 {demo_dir}/audio.py')
    print(f'   4. Full render:         node {SKILL_ROOT}/harness/render.mjs {demo_dir}')


if __name__ == '__main__':
    main()
