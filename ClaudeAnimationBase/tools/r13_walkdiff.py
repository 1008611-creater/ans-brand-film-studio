# -*- coding: utf-8 -*-
"""R13 · 6 帧走路的相邻帧差（证明不是重复帧）+ 空旷区抗闪自检。

用法：python tools/r13_walkdiff.py [--dir=out/r13_stills]
输出：终端表格 + out/r13_stills/walkdiff.json
"""
import json, os, sys
import numpy as np
from PIL import Image

D = "out/r13_stills"
for a in sys.argv[1:]:
    if a.startswith("--dir="):
        D = a[6:]

NAMES = ["walk_w000", "walk_w167", "walk_w333", "walk_w500", "walk_w667", "walk_w833"]
PHASE = [0.0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]

def load(n):
    im = Image.open(os.path.join(D, n + ".png")).convert("RGB")
    a = np.asarray(im, dtype=np.float32)
    gray = a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
    return a, gray

imgs = [load(n) for n in NAMES]
H, W = imgs[0][1].shape

# 空旷区 = 角色包围盒（x 625..1283 / y 240..1075）之外的全部像素：左右竖带 + 顶部横带
Y = np.arange(H)[:, None]
X = np.arange(W)[None, :]
EMPTY = (X < 600) | (X > 1320) | (Y < 230)

rows = []
for i in range(len(imgs) - 1):
    a0, g0 = imgs[i]
    a1, g1 = imgs[i + 1]
    d = np.abs(g1 - g0)
    ch = d > 2.0                      # 角色区域 = 有变化的像素
    rows.append({
        "pair": NAMES[i] + " → " + NAMES[i + 1],
        "d_phase": round(PHASE[i + 1] - PHASE[i], 4),
        "mean_abs_all": round(float(d.mean()), 4),
        "mean_abs_char": round(float(d[ch].mean()) if ch.any() else 0.0, 4),
        "pct_gt8": round(float((d > 8).mean() * 100), 3),
        "pct_char": round(float(ch.mean() * 100), 3),
        "empty_mean": round(float(d[EMPTY].mean()), 4),
        "empty_max": round(float(d[EMPTY].max()), 2),
        "luma0": round(float(g0.mean()), 3),
        "luma1": round(float(g1.mean()), 3),
        "d_luma_pct": round(abs(float(g1.mean() - g0.mean())) / float(g0.mean()) * 100, 3),
    })

print("pair                          dphase  meanΔ(all)  meanΔ(char)  %>8   char%  emptyΔ  emptyMax  Δluma%")
for r in rows:
    print("%-28s %6.3f %10.4f %12.4f %6.2f %6.2f %8.4f %9.2f %7.3f" % (
        r["pair"], r["d_phase"], r["mean_abs_all"], r["mean_abs_char"], r["pct_gt8"],
        r["pct_char"], r["empty_mean"], r["empty_max"], r["d_luma_pct"]))

# 两两最大差异：证明 6 帧互不相同（没有任何一帧是另一帧的复制）
diff = np.zeros((len(imgs), len(imgs)))
for i in range(len(imgs)):
    for j in range(len(imgs)):
        diff[i, j] = np.abs(imgs[i][1] - imgs[j][1]).mean()
print("\n6 帧两两平均灰阶差（对角 0；非对角最小 %.4f）" % diff[~np.eye(len(imgs), dtype=bool)].min())
print(np.array2string(np.round(diff, 2), separator=", "))

out = {"pairs": rows, "pairwise_mean_abs": np.round(diff, 3).tolist(),
       "empty_region": "x<600 / x>1330 / y<300（角色包围盒之外）"}
with open(os.path.join(D, "walkdiff.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("\nwrote " + os.path.join(D, "walkdiff.json"))
