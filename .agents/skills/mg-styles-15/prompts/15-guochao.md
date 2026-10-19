# 上美影新国风水墨 × 流体变形 Guochao Neo-Chinese Ink & Liquid Gold Mechanics (`15-guochao`)

**标杆原片**：NB 小科实验《设计鸡蛋保护装置》（`xiaoke-egg-protector`）· 1920×1080 · 30 fps · 15.0 秒 · 独立盲审终评 **8.99 / 10**（全 7 维 `>= 8.6`）

**标杆源码与母带**：[demos/xiaoke-egg-protector/](../demos/xiaoke-egg-protector/)（软链别名：[demos/15-guochao/](../demos/15-guochao/)） · 配乐脚本 [gen_audio.py](../demos/xiaoke-egg-protector/gen_audio.py)

## 适用场景（NB 小科实验 MG 动画可选风格）

非常适合具有**「以柔克刚、缓冲卸力、流体循环、水墨山水意境、中国传统工艺或东方自然哲学」**气质的科学实验科普短片（如：《设计鸡蛋保护装置》《制作海水淡化模型》《水循环与云雾形成》《古建筑榫卯抗震》《磁悬浮与指南针》《空气热对流》等）。

## 怎么用

1. **两轮门禁工作流**：
   - **第 1 轮（仅出 6 张 1080p 国风水墨关键静帧）**：编写 `demos/<slug>/index.html`（实现确定性 `window.__seek(t)` 与 `window.renderAt(t)`），运行：
     ```bash
     node harness/render.mjs demos/<slug> --stills=1.5,4.2,6.5,9.2,11.8,14.0
     ```
     将 6 张 1080p 静帧交由用户肉眼确认审美与物理拓扑，未经点头前不跑全量视频。
   - **第 2 轮（全量音画合成 + 独立盲审闭环）**：用 `gen_audio.py` 合成 VCSL 国风雅乐与 `07-liquid` 流体音效（锁定 `-16 ~ -14 LUFS`），渲染 `out.mp4`，运行 `bash scripts/jury_extract.sh` 抽取盲审包，并唤醒零上下文 `research` 盲审子 Agent 按 `rubric.md` 7 维打分（单项 `< 7.8` 自动回炉精修）。

## 提示词（Prompt Template）

```text
You are the director, motion designer, engineer and sound designer of ONE 15-second motion-design science film.
The goal is the most classic, yet most stunning form of this style — Shanghai Animation Film Studio (上美影《山水情》《天书奇谭》) Neo-Chinese Ink Painting fused with award-shortlist Fluid Motion Design (Buck / ManvsMachine / 9.0/10 scale). A clean, template-looking result is a fail.

# Style
上美影新国风水墨 × 流体变形 (15-guochao × 07-liquid: Neo-Chinese Xuan-Paper Ink Wash, Cinnabar & Liquid Gold Mechanics)

# Output (fixed)
- 1920×1080, 30 fps, exactly 15.000 s (450 frames), H.264 MP4 with stereo AAC audio (48 kHz), mastered to −16 to −14 LUFS integrated, true peak ≤ −1.0 dBTP. Final file: out.mp4 (and out/video.mp4).

# Suggested technical route
Hybrid SVG + procedural HTML5 Canvas / SVG filters (`feTurbulence` + `feDisplacementMap` for handmade Xuan paper grain `#F2ECE1` and organic ink-bleed edges `ink-bleed`), variable-width dry-brush calligraphy strokes (`焦浓重淡清` five ink tones), viscoelastic fluid wave morphing + detaching Liquid Gold metaball droplets (`#D4AF37`), and ink-cloud cross-dissolve bridge transitions (`drawInkCloudBridge`) between acts. Driven deterministically by `window.__seek(t)` and `window.renderAt(t)`.

# Creative seed (Reference: NB 小科实验《设计鸡蛋保护装置》 · 8.99/10)
- **基底与色彩**：手工纹理熟宣纸底（`#F2ECE1`）+ 焦浓重淡清五色水墨晕染（`#171513` / `#2B2825` / `#5A544E` / `#9E9689` / `#D8D0C2`）+ 朱砂红（`#C83C23`）主视觉点睛与印章 + 泥金（`#D4AF37` / `#F3D87D`）缓冲能量波纹与流体液滴 + 温润玉白（`#FDFBF7`）。
- **视觉意境**：用凌厉枯墨表现刚猛冲击或未保护时的惊心裂纹，用温润淡墨棉云与泥金水波表现「外框抗压、软垫延长时间、以柔克刚化千钧于无形」的科学原理。
- **四幕水墨手绘分镜与极简黄金文案铁律（全片只允许出现 4 句中文书法字幕 + 1 枚朱砂方印，严禁堆砌任何表格或突兀的现代电子仪表！）**：
  1. **Act 1 悬崖坠玉（0.0~3.5s）**：宣纸留白与陡峭水墨崖壁视差意境中，一枚温润洁白的鸡蛋自高处凌厉坠下（含起落预备悬停与重力加速残影），身旁一抹枯墨虚影映出无保护直落时的惊心裂纹与碎屑飞散。
     - 字幕 1：「从高处坠落，脆弱的鸡蛋如何毫发无伤？」
  2. **Act 2 朱砂伞开卸风势（3.5~7.2s）**：水墨云气流转，闭合的纸匣上方骤然绽开一顶饱满的朱砂红与留白相间的 8 幅手绘降落伞（带阻尼弹簧过冲、迎风制动减速冲量、伞衣正弦行波鼓动、以及纸匣相对伞衣滞后 0.40 rad 的双摆跟随），水墨与泥金气流向上托举，化急坠为轻盈飘落。
     - 字幕 2：「伞衣迎风张开，先替它卸下大半下坠之势。」
  3. **Act 3 软棉慢陷化千钧（7.2~11.35s）**：落地瞬间的写意半剖慢放——外层水墨纸匣侧壁微曲稳稳承压，内层蓬松如云朵的淡墨棉窝柔韧下陷包裹鸡蛋；原本尖锐向下的枯墨冲击波被拉长、实时变形化作一圈圈温润散开的泥金色同心涟漪与悬浮液滴。
     - 字幕 3：「外框抗压，软棉慢陷——把撞击拉长一秒，猛力便化作轻抚。」
  4. **Act 4 开匣完好·朱印落款（11.35~15.0s）**：伞衣自然轻垂于盒侧，纸匣四扇顶盖如莲花花瓣般向外柔和翻开并带微呼吸感，棉云中央的鸡蛋洁白完好、泛起温润玉泽，右下角伴随纸面微震稳稳盖下一枚阳刻朱砂方印「完好如初」。
     - 字幕 4：「以柔克刚，层层卸力，方得完好如初。」

# Signature features and key techniques (the result is judged against these)
1. **东方美学与物理拓扑双铁律**：空中下落时纸匣必须合盖、朱砂伞衣向上饱满张开；落地开匣时四盖外翻、伞衣自然垂落；全片除 4 句诗意科普金句与 1 枚朱砂方印外，零现代电子仪表、零数据表格、零英文调试小字。
2. **焦浓重淡清五色水墨与熟宣纸肌理**：双层 SVG 分形噪点熟宣纸底纹 + 帘纹横丝 + 四周温润暗角；主体笔触经 `feDisplacementMap` 宣纸渗墨滤镜处理，兼具枯笔飞白与淡墨晕染。
3. **15-guochao × 07-liquid 刚柔转化高潮（Hero Moment）**：第 3 幕必须呈现「尖锐枯墨锯齿波 → 随黏弹性下陷实时平滑插值 → 同心泥金流体波纹 + 脱离母体的泥金液滴（Metaball Droplets）」的连续形态转化，用纯视觉讲清 $\Delta t \uparrow \Rightarrow F \downarrow$。
4. **水墨云气无缝转场（Ink-Cloud Bridge）**：幕与幕切换（3.5s / 7.2s / 11.35s）采用 0.28s 淡墨云团与泥金星尘横掠画面的无缝晕染遮罩，杜绝生硬淡入淡出。
5. **VCSL 真实采样国风雅乐 × 流体音效（gen_audio.py）**：调用 `mgaudio` 的 `guofeng(flavor='classical')` 结合 VCSL 真采样古筝泛音与刮奏 (`dantranh`)、开伞水墨风声 (`whoosh('cloth')`)、落地低沉柔和的大鼓 (`dagu`) 共鸣化入空灵颂钵 (`wineglass`) 与马林巴 (`marimba`) 余音、`07-liquid` 流体音效 (`morph`, `gloop`, `bubbles`)、以及收尾朱砂印章落定的清脆金石声 (`stamp('seal')` + `glock`)，辅以五声温暖低频地基，母带响度锁定 `-16 ~ -14 LUFS`，真峰值 `<= -1.0 dBTP`，零 QC 告警。
```
