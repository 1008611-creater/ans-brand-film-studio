#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 画面丝滑度体检 v3 —— 正式口径：局部平滑度（12 帧滑动窗 std(Δ)/mean(Δ)）的 median 与 p90。
#
# 为什么不是全片 std/mean：会被 12 帧强制大变化（6 转场 + 开幕撕纸 + 35 爆冲）主导，
# 而那些是导演要求的冲击。观感上的「不够丝滑」指持续运动，故取局部中位数。
#
# 用法： python tools/smoothness.py [frames_dir]
import sys, os, json
import numpy as np
from PIL import Image

FR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'frames')
FR = os.path.abspath(FR)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, W, H, WIN = 24, 480, 270, 12
ACTS = [(0,164,'Act1'),(164,354,'Act2'),(354,571,'Act3'),(571,692,'Act4'),(692,1049,'Act5'),(1049,1102,'Endcard')]
TARGET_MED, TARGET_P90 = 0.80, 1.50

files = sorted(f for f in os.listdir(FR) if f.endswith('.jpg'))
prev = None; vis = []
for f in files:
    im = np.asarray(Image.open(os.path.join(FR, f)).convert('L').resize((W, H), Image.BILINEAR), dtype=np.float32)
    vis.append(0.0 if prev is None else float(np.abs(im - prev).mean())); prev = im
vis = np.array(vis[1:])
print('frames %d (%.2f s) | 本地局部口径：%d 帧滑动窗 std(diff)/mean(diff)' % (len(vis), len(vis)/FPS, WIN))
print('')
print('%-9s %9s %9s %9s %10s %8s' % ('act','median','p75','p90','mean_delta','verdict'))
res = {}; bad = []
for a, b, name in ACTS:
    if a >= len(vis): continue
    seg = vis[a:b]
    loc = []
    for i in range(0, max(1, len(seg)-WIN), 6):
        w = seg[i:i+WIN]
        if len(w) < 4 or w.mean() <= 0.2: continue
        loc.append(float(np.diff(w).std()/w.mean()))
    if not loc: continue
    loc = np.array(loc)
    med, p90 = float(np.median(loc)), float(np.percentile(loc, 90))
    ok = (med <= TARGET_MED or name == 'Endcard') and (p90 <= TARGET_P90 or name == 'Endcard')
    if not ok: bad.append(name)
    res[name] = {'median': round(med,3), 'p90': round(p90,3)}
    print('%-9s %9.2f %9.2f %9.2f %10.2f %8s' % (name, med, float(np.percentile(loc,75)), p90, seg.mean(), 'OK' if ok else 'FAIL'))
print('')
print('目标：每幕 median <= %.2f、p90 <= %.2f' % (TARGET_MED, TARGET_P90))
print('VERDICT: ' + ('PASS' if not bad else 'FAIL — ' + ','.join(bad)))
json.dump(res, open(os.path.join(BASE, 'out', 'smoothness.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)