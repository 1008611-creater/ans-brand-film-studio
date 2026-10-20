#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""画面节奏体检：把"关键帧/剧情变化够不够"变成数字。

用法： python tools/picture_rhythm.py [frames_dir]
输出： 每幕的强结构事件数、动度形态（预备-爆发-余韵）、以及是否达到目标线。
"""
import sys, os, json
import numpy as np
from PIL import Image

FR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'out', 'frames')
FR = os.path.abspath(FR)
FPS = 24
W, H = 480, 270
ACTS = [(0, 164, 'Act1'), (164, 354, 'Act2'), (354, 571, 'Act3'), (571, 692, 'Act4'), (692, 1049, 'Act5'), (1049, 1102, 'Endcard')]
TARGET_STRONG = {'Act1': 6, 'Act2': 6, 'Act3': 6, 'Act4': 4, 'Act5': 9, 'Endcard': 0}

def load_curve():
    prev, diff, chg = None, [], []
    n = 0
    while True:
        p = os.path.join(FR, 'f%05d.jpg' % n)
        if not os.path.exists(p): break
        im = np.asarray(Image.open(p).convert('L').resize((W, H), Image.BILINEAR), dtype=np.float32)
        diff.append(0.0 if prev is None else float(np.abs(im - prev).mean()))
        chg.append(0.0 if prev is None else float((np.abs(im - prev) > 12).mean()))
        prev = im; n += 1
    return np.array(diff), np.array(chg), n

diff, chg, N = load_curve()
print('frames: %d (%.2f s)' % (N, N / FPS))
if N < 10:
    print('not enough frames'); sys.exit(0)
s = np.convolve(chg, np.ones(6) / 6, mode='same')       # 0.25s 平滑的结构变化
peaks = [i for i in range(3, len(s) - 3) if s[i] > 0.06 and s[i] > s[i-3] and s[i] > s[i+3]]
merged = []
for p in peaks:
    if merged and p - merged[-1][-1] <= 12: merged[-1].append(p)
    else: merged.append([p])
ev = [(m[int(np.argmax([s[k] for k in m]))], s[m[int(np.argmax([s[k] for k in m]))]]) for m in merged]
print('total structural events: %d | strong (>=0.18): %d' % (len(ev), sum(1 for _, v in ev if v >= 0.18)))
print('')
print('%-9s %7s %7s %8s %9s %9s %10s %8s' % ('act', 'mean', 'max', 'strong', 'prep(<=.5x)', 'burst(>=2x)', 'after(<=.8x)', 'verdict'))
ok_all = True
for a, b, name in ACTS:
    if b > N: b = N
    seg, segs = diff[a:b], s[a:b]
    if len(seg) == 0: continue
    m = seg.mean()
    strong = [i for i, v in ev if a <= i < b and v >= 0.18]
    prep = burst = after = 0
    for i in strong:
        rel = i - a
        pre = seg[max(0, rel - 6):rel]
        post = seg[rel + 1:rel + 11]
        if len(pre) and pre.mean() <= 0.5 * m: prep += 1
        if seg[rel] >= 2.0 * m: burst += 1
        if len(post) and post.mean() <= 0.8 * m: after += 1
    need = TARGET_STRONG.get(name, 0)
    verdict = 'OK' if len(strong) >= need else 'NEED+%d' % (need - len(strong))
    if len(strong) < need: ok_all = False
    print('%-9s %7.2f %7.2f %8d %9d %9d %10d %8s' % (name, m, seg.max(), len(strong), prep, burst, after, verdict))
print('')
print('TARGET: 每幕 strong>=目标；事件需有 prep/burst/after 形态（观感=有预备、有爆发、有余韵）')
print('VERDICT: ' + ('PASS' if ok_all else 'FAIL — 关键帧/剧情变化不足'))
json_out = os.path.join(os.path.dirname(FR), 'picture_rhythm.json')
with open(json_out, 'w', encoding='utf-8') as f:
    json.dump({'frames': N, 'events': [{'frame': i, 't': i / FPS, 'strength': v} for i, v in ev],
               'strong_per_act': {name: sum(1 for i, v in ev if a <= i < b and v >= 0.18) for a, b, name in ACTS}}, f, ensure_ascii=False, indent=1)
print('wrote ' + json_out)