#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 构图客观检查 v2：连通域找「小恐龙本体」的薄荷绿块，排除横跨画面的大背景块。
# 用途：判断小恐龙是否被道具遮挡 / 被画幅裁切。
# 用法： python tools/comp_check.py <stills_dir>
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'r12_storyboard')
D = os.path.abspath(D)
files = sorted(f for f in os.listdir(D) if f.lower().endswith(('.png', '.jpg')))
print('%-18s %8s %8s %24s %s' % ('file', 'area%', 'bbox', 'shape', 'flags'))
rows = []
for f in files:
    im = Image.open(os.path.join(D, f)).convert('RGB')
    W, H = im.size
    a = np.asarray(im.resize((W//2, H//2), Image.BILINEAR), dtype=np.int16)
    r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
    mask = (g > 150) & (g - r > 22) & (g - b > 8) & (r > 90) & (r < 200)
    lab, n = ndi.label(mask)
    best = None
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 400: continue
        h = ys.max() - ys.min() + 1; w = xs.max() - xs.min() + 1
        fill = len(ys) / float(w * h)
        spans = (w > 0.6 * mask.shape[1]) or (h > 0.6 * mask.shape[0])
        if spans or fill < 0.25: continue      # 排除背景横条 / 散点
        area = len(ys) / float(mask.shape[0] * mask.shape[1])
        if best is None or area > best[0]: best = (area, (int(xs.min()*2), int(ys.min()*2), int(xs.max()*2), int(ys.max()*2)), (w*2, h*2), fill)
    if best is None:
        print('%-18s %8s %8s %24s %s' % (f, '-', '-', '-', 'NO_DINO'))
        rows.append((f, 0.0, None)); continue
    area, bbox, shape, fill = best
    flags = []
    if bbox[0] < 8 or bbox[1] < 8 or bbox[2] > W - 9 or bbox[3] > H - 9: flags.append('BORDER')
    print('%-18s %7.2f%% %s %s fill=%.2f %s' % (f, area*100, bbox, shape, fill, ','.join(flags) or '-'))
    rows.append((f, area, bbox))
areas = [a for _, a, _ in rows if a > 0]
if areas:
    med = float(np.median(areas))
    print('')
    print('恐龙可见面积中位数 %.2f%%；低于 60%% 中位数者提示被遮挡：' % (med*100))
    for f, a, bbox in rows:
        if a > 0 and a < 0.6 * med: print('   %-18s %.2f%%  (%.0f%% of median)' % (f, a*100, 100*a/med))