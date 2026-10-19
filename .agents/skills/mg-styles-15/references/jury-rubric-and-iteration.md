# 独立评委 Subagent 盲审协议与多轮迭代手册 (Jury Rubric & Iteration Protocol)

本文件整合了原仓库 `rubric.md` 与 B 站教学视频中的「独立 Subagent 七维盲审机制（单项 ≥ 7.5 过线门禁，冲刺 ≥ 9.0 大赛入围级）」。

---

## 一、核心原则：为什么必须用独立 Subagent 盲审？

1. **彻底切断上下文滤镜**：制作 Agent 写了数千行代码，天然倾向于给自己的实现打高分。必须使用 `invoke_subagent`（或新开独立会话）启动 **评审 Subagent（Jury Subagent）**。
2. **只看证据，不看苦劳**：评审 Subagent **只看渲染出来的成片截图、逐帧胶片条（Filmstrip）、音频频谱与响度实测数据**，对照风格提示词中的 `Signature features` 逐条核验。
3. **强制量化药方**：评审意见禁止说「动效再自然一点」「排版再好看一点」等空话，必须给出 **精确时间码（Timecode）+ 可观测缺陷（Observable Flaw）+ 量化修改方案（具体的 `cubic-bezier` 参数、帧数、字号 px、色值 hex、图层结构调整）**，且必须包含至少 1 条专门提升 **Hero Moment 惊艳度（Wow Factor）** 的大招升级。

---

## 二、第一步：抽帧与技术体检脚本（在交给评委前自动运行）

在渲染出 `out/video.mp4` 后，先运行本 Skill 自带的体检与抽帧脚本 `scripts/jury_extract.sh`：

```bash
bash <SKILL_DIR>/scripts/jury_extract.sh <demo_dir>/out/video.mp4 <demo_dir>/out/jury_pack
```

该脚本会自动在 `<demo_dir>/out/jury_pack/` 下生成：
- `spec_report.txt`：`ffprobe` 流信息（分辨率、帧率、精确时长）+ `ffmpeg ebur128` 整合响度（LUFS）与真峰值（dBTP）实测报告。
- `contact_sheet.jpg`：每隔 `0.5s` 抽一帧拼成的 5×4 全片接触表（一眼看清节奏、留白与起止帧）。
- `filmstrip_hero.jpg`：在全片中后段（`5.0s–8.0s` 高潮段）按高密度抽帧的动作胶片条（检验缓动间距、挤压拉伸、打结或跳帧）。
- `stills/frame_*.png`：8 张 100% 原始分辨率关键帧 PNG（0.2s, 1.0s, 2.5s, 4.0s, 5.5s, 6.8s, 8.2s, 9.5s），供评委放大检查边缘锯齿、色带、字体排印与材质细节。

---

## 三、第二步：调用独立评委 Subagent 的标准提示词

使用 `invoke_subagent` 启动一个独立的 `research` 或 `self` 子智能体，将以下提示词发送给它（替换 `<VIDEO_PATH>`、`<JURY_PACK_DIR>` 和 `<STYLE_PROMPT>`）：

```text
You are a senior motion-design jury member (think: Motionographer editor, Buck/ManvsMachine creative director, a 抖音/B站 top design-account lead for the Chinese styles). You did NOT make this film. Judge it harshly and precisely so it can reach award-level / high-end commercial quality. Kindness is useless here; specificity is everything.

The film: <VIDEO_PATH>
Pre-extracted inspection pack: <JURY_PACK_DIR> (contains spec_report.txt, contact_sheet.jpg, filmstrip_hero.jpg, and full-res stills/frame_*.png — view all of them with view_file!).
Also view `<DEMO_DIR>/out/audio_spec.png` if present.

The prompt it was made from:
<STYLE_PROMPT>

1. Look at the film properly: view `contact_sheet.jpg`, `filmstrip_hero.jpg`, and all full-resolution frames in `stills/frame_*.png`. Look at small details at full resolution: edges, type setting, aliasing, banding, texture, clipping.
2. Check the spec in `spec_report.txt`: exactly 10.00 s (or requested duration), resolution and fps as specified, audio present, loudness ≈ −14 LUFS (±1), true peak ≤ −1 dBTP, no black frames except intended, no unintended static spans, visual hits aligned with audio onsets.
3. Score 1–10 on each dimension (5 = competent student work; 6 = decent template level; 7 = solid professional; 8 = high-end agency work; 9 = award shortlist; 10 = best in the world). Most first renders deserve 5–7. Do not inflate.
   PASS GATE: Every single dimension MUST be ≥ 7.5 to pass. Any dimension < 7.5 is a FAIL requiring mandatory revision.
   - style_fidelity: instantly recognisable canonical form; every signature feature and technique present and correct
   - concept_wow: a clear idea, a hook in the first 0.5 s, an unmistakable hero moment, a satisfying end frame
   - motion_craft: easing, spacing, overlap, anticipation and follow-through, arcs, transitions, motion blur; no dead or jittery motion
   - design_typography: composition, hierarchy, grid, type setting (CJK too), palette, negative space
   - finish_texture: lighting, texture, grain, glow and detail appropriate to the style; no banding, aliasing or artifacts
   - sound_sync: musicality, genre-correctness, sound design, sync to picture, mix and master
   - technical: spec compliance, fonts loaded, no glitches, clipping or popping
4. Give 5–10 fixes ordered by impact on the final impression. Each: timecode(s), what is wrong (observable), why it matters, and a concrete how-to (technique and numbers: easing curve, frame counts, px, colours, font, layout change). Prefer a few big upgrades over many nitpicks. At least one fix must raise the wow factor, not just polish.
5. Flag as critical: anything that reads as generic or AI-template, unnatural Chinese copy, fallback fonts or tofu, and any spec failure.

Return: the 7-dimension score table (with average and PASS/FAIL status against the ≥7.5 per-item gate), the critical issues, and the numbered fix list.
```

---

## 四、第三步：主制作 Agent 按评审意见执行版本升级（Round N → Round N+1）

收到独立评委 Subagent 的评审报告后，主制作 Agent 严格按以下规程执行修改（原仓库每支成片均执行了 2 轮以上此闭环）：

```text
An independent jury reviewed your film. Here is the full review:
<PASTE_JURY_REVIEW>

Raise the film to award level (target ≥ 9 in every dimension, mandatory ≥ 7.5 in every single dimension):
1. First keep a backup copy of the current video and source as version N (e.g. `out/video_r1.mp4`).
2. Implement every critical issue and every high-impact fix. You may substitute a better solution for a listed fix if you are confident; say why. Go beyond the list where you see a bigger upgrade, especially for the wow factor. Do not regress anything the jury listed as a strength.
3. Re-run `audio.py` if any timing, impact, or mix issue was flagged, then re-render at full resolution with `node harness/render.mjs`, re-run `scripts/jury_extract.sh`, and inspect the updated frames until the fixes have truly landed.
4. Report which fixes you applied or skipped, and why.
```
