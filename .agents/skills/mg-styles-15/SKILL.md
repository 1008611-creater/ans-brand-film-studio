---
name: mg-styles-15
description: >
  世界顶级大奖入围级（Award-Shortlist / Buck / ManvsMachine / Giant Ant / Apple Keynote 水准）AI 纯代码动态设计（Motion Graphics）与视频生成权威 Skill。
  完整内化自 Vincent (悬剑听泉) B站教学《Opus 5.5 做视频流程和提示词分享》(BV1kLn36WEN6) 与 GitHub 开源仓库 `Vincentwei1021/mg-styles-15`。
  涵盖 15 种完整开源 MG 风格（及 22 种国际+中文短视频全谱系）、确定性网页/Blender 逐帧渲染器（`harness/render.mjs`）、103 个真实乐器采样的 Python 配乐与音效合成引擎（`lib/audio/mgaudio`）、以及「锚定 9 分大奖刻度 + 独立 Subagent 盲审多轮迭代（单项 ≥ 7.5 过线门禁）」核心方法论。
  当用户需要制作高质感 MG 动画、品牌片头（Ident）、产品发布宣传片、回形针式硬核科普视频、竖屏综艺花字、动画 MAD 混剪，或提到 `mg-styles-15`、15 种 MG 风格、代码生成获奖级视频时激活本技能。
metadata:
  version: "1.0.0"
  upstream: "https://github.com/Vincentwei1021/mg-styles-15"
  tutorial: "https://www.bilibili.com/video/BV1kLn36WEN6"
---

# MG-Styles-15 — 大奖入围级纯代码动态设计 (Motion Graphics) 权威管线

> **核心理念**：不靠生图/生视频扩散模型抽卡，**画面就是确定性代码**（SVG / Canvas 2D / WebGL 2 / Three.js / Blender 5.1 Cycles，`window.renderAt(t)` 纯函数驱动），**声音也是确定性代码**（`lib/audio/mgaudio` 合成器 DSP + 103 个 VCSL 真实乐器采样，帧级对齐 `cues.json`，母带响度精准锁定 `-14 LUFS` / `TP ≤ -1 dBTP`）。

---

## 一、两大黄金铁律（决定成片是「6分剪映模板」还是「9分大赛入围」的关键）

在启动任何视频制作前，必须严格执行以下两条源自 B 站教学视频（[BV1kLn36WEN6](https://www.bilibili.com/video/BV1kLn36WEN6)）的黄金法则（详见 [references/video-tutorial-methodology.md](references/video-tutorial-methodology.md)）：

### 铁律 1：显式锚定 1–10 分评价刻度，先出海报级静帧再做动效 (Key Frames Before Motion)
1. **绝不只说「做得好看点」**：大模型对「好看」的默认对标是 **6 分模板/剪映水平**。必须在任务目标中锁定 **8–9 分高端创意热店与大奖入围水准**（对标 **Buck, ManvsMachine, Ordinary Folk, Giant Ant, Territory Studio, Apple Keynote Motion, Pentagram**），并明确：**“干净但像模板的结果直接算失败（A clean, template-looking result is a fail）”**。
   - `5 分` = 学生作业 | `6 分` = 剪映模板（不及格） | `7 分` = 普通专业 | `8 分` = 高端广告公司 | `9 分` = 大奖入围（目标线） | `10 分` = 世界最佳。
2. **先验静帧（Lookdev Stills Gate）**：在编写复杂动画前，先用渲染器导出 6~10 张关键时间点的全分辨率静帧：
   ```bash
   node <SKILL_DIR>/harness/render.mjs <demo_dir> --stills 0.3,1.2,2.8,4.5,6.2,7.8,9.2
   ```
   用 `view_file` 逐张检查：每一帧都必须像一张**可独立印刷的海报**（构图、视觉层级、负空间、中西文字距行距、标点挤压、5% 安全边距，严禁出现回退系统字体或豆腐块）。静帧不过关，绝不进入动效阶段。

### 铁律 2：独立 Subagent 盲审打分 + 多轮迭代闭环（严禁「自己做的自己评」）
1. **上下文隔离（Context-Free Blind Jury）**：制作 Agent 脑中装满上千行代码与妥协过程，自评必然虚高。初版 `video.mp4` 渲染完成后，**必须**先运行抽帧与响度体检脚本：
   ```bash
   bash <SKILL_DIR>/scripts/jury_extract.sh <demo_dir>/out/video.mp4 <demo_dir>/out/jury_pack
   ```
2. **启动独立评委 Subagent**：使用 `invoke_subagent` 启动一个**不包含制作过程上下文**的子智能体，按照 [references/jury-rubric-and-iteration.md](references/jury-rubric-and-iteration.md) 中的盲审提示词，只看 `jury_pack/`（`spec_report.txt` + `contact_sheet.jpg` + `filmstrip_hero.jpg` + 8 张全分辨率 `stills/*.png` + `audio_spec.png`）与风格 `Signature features`。
3. **单项 ≥ 7.5 分强制门禁**：7 个维度（`style_fidelity`, `concept_wow`, `motion_craft`, `design_typography`, `finish_texture`, `sound_sync`, `technical`）**每一项都必须 ≥ 7.5 分**才算通过！只要有任何一项 < 7.5，主 Agent 必须备份当前版本并按评委给出的 5~10 条量化药方（具体到时间码、缓动参数、像素、帧数，且至少含 1 条提升 Hero Moment 惊艳度的大招）完成第 2 轮乃至第 3 轮修改重渲。

---

## 二、三种视频创作范式路由

根据用户的任务需求，选择对应的创作范式（完整拆解见 [references/video-tutorial-methodology.md](references/video-tutorial-methodology.md)）：

| 范式 | 适用场景 | 核心打法 |
|---|---|---|
| **范式 A：15/22 种经典 MG 风格短片** | 10s~30s 品牌片头（Ident）、功能演示、科普短片、片尾标版 | 从下方 **22 种风格路由表** 选定最匹配的经典风格 → 读取对应 `prompts/<slug>.md` 与 `demos/<slug>/` 源码 → 用 `scripts/new_film.py` 初始化并按 6 步法制作 + 2 轮盲审迭代 |
| **范式 B：一句话叙事长片（《火种》模式）** | 1~4 分钟品牌发家史、产品宣言、深度科普叙事大片 | 不套固定模板 → 第一步先写完整章节与镜头卡点的 `timeline.json` → 第二步自写专属 WebGL / Canvas / SVG 叙事渲染器 → 第三步派生音频 Subagent 用 `mgaudio` 合成全片交响/电子配乐与 20~30 种同步音效 |
| **范式 C：素材驱动型动画 MAD / 混剪** | 番剧/游戏高燃 MAD、实拍产品混剪快闪、带音乐与歌词卡点 MV | 先获取/下载高清官方 PV 或实拍素材 → 用 Python (`librosa` / `mgaudio.qc`) 分析音频高潮节拍与歌词时间轴 → 切片精选高燃运动镜头 + 叠加快闪字卡/漫画分屏框/调色滤镜合成 |

> **品牌合规提醒**：若为用户自有品牌 **ANS** 制作片头或宣传片，严格遵守 **`ANS` 唯一官方全称 = `AI Never Stops`**（严禁误写为 AI Native Society/Studio），且涉及吉祥物时必须使用真实薄荷绿（`#9BE0C5`）圆胖恐龙设定。

---

## 三、15 种核心开源风格 + 7 种扩展风格快速路由表

完整的 22 种风格视觉特征、关键技法参数与配乐配方见 [references/22-styles-catalog.md](references/22-styles-catalog.md)；纯代码实现秘籍见 [references/engineering-cookbook.md](references/engineering-cookbook.md)。

### 1. 15 种内置完整提示词与满分源码的标杆风格

| 编号与 Slug | 风格名称 | 最佳应用场景 | 原版提示词 (`prompts/`) | 原版满分源码 (`demos/`) | `mgaudio` 默认配方 |
|---|---|---|---|---|---|
| `01-flat-vector` | **扁平矢量动画** | SaaS 产品宣传、互联网品牌解释片 | [prompts/01-flat-vector.md](prompts/01-flat-vector.md) | [demos/01-flat-vector/](demos/01-flat-vector/) | `pop` (120 BPM) |
| `02-line-art` | **线条动画（一笔画）** | 奢侈品、建筑、金融、高级感品牌片 | [prompts/02-line-art.md](prompts/02-line-art.md) | [demos/02-line-art/](demos/02-line-art/) | `ambient(flavor='piano')` |
| `03-isometric` | **等轴 2.5D 微缩世界** | 科技架构图、智慧城市、App 全景演示 | [prompts/03-isometric.md](prompts/03-isometric.md) | [demos/03-isometric/](demos/03-isometric/) | `explainer` (112 BPM) |
| `04-3d-render` | **3D 渲染系 (Blender/C4D)** | 硬件产品大片、糖果软胶质感品牌 Ident | [prompts/04-3d-render.md](prompts/04-3d-render.md) | [demos/04-3d-render/](demos/04-3d-render/) | `pop(bpm=118)` |
| `05-cel-boil` | **逐帧手绘 / 线条沸腾** | 独立工作室片头、温暖人文叙事、反数字感广告 | [prompts/05-cel-boil.md](prompts/05-cel-boil.md) | [demos/05-cel-boil/](demos/05-cel-boil/) | `lofi(keys='piano')` |
| `06-collage` | **拼贴剪贴 (大达/杂志风)** | 脑洞播客、文化杂志、街头潮流、音乐创意片 | [prompts/06-collage.md](prompts/06-collage.md) | [demos/06-collage/](demos/06-collage/) | `lofi(flavor='boombap')` |
| `07-liquid` | **液态流动 (SDF Metaball)** | 潮饮食品、高能量转场、流体创意 Logo 演绎 | [prompts/07-liquid.md](prompts/07-liquid.md) | [demos/07-liquid/](demos/07-liquid/) | `future_bass` (150 BPM) |
| `08-morph` | **丝滑形变动画 (Morphing)** | Apple 发布会级图标连环叙事、一镜到底品牌故事 | [prompts/08-morph.md](prompts/08-morph.md) | [demos/08-morph/](demos/08-morph/) | `future_bass(bpm=140)` |
| `09-bauhaus` | **几何构成 / 包豪斯** | 动态海报 (Kinetic Poster)、艺术展、设计节片头 | [prompts/09-bauhaus.md](prompts/09-bauhaus.md) | [demos/09-bauhaus/](demos/09-bauhaus/) | `techno` (124 BPM) |
| `10-synthwave` | **复古 80s Synthwave / VHS** | 复古未来主义、电音/游戏片头、镀铬霓虹视觉 | [prompts/10-synthwave.md](prompts/10-synthwave.md) | [demos/10-synthwave/](demos/10-synthwave/) | `synthwave` (100 BPM) |
| `12-aurora-glass` | **弥散渐变 / 液态玻璃拟态** | **AI 产品发布首选**、iOS 26 风格高定科技短片 | [prompts/12-aurora-glass.md](prompts/12-aurora-glass.md) | [demos/12-aurora-glass/](demos/12-aurora-glass/) | `ambient(flavor='glass')` |
| `18-hanazi` | **竖屏综艺花字 (9:16)** | 萌宠/Vlog 包装、抖音/小红书爆款短视频花字 | [prompts/18-hanazi.md](prompts/18-hanazi.md) | [demos/18-hanazi/](demos/18-hanazi/) | `variety` (128 BPM) |
| `19-paperclip` | **粗描边贴纸科普 (回形针风)** | **硬核科学/工程/财经科普首选**、超大画布拆解 | [prompts/19-paperclip.md](prompts/19-paperclip.md) | [demos/19-paperclip/](demos/19-paperclip/) | `explainer` (112 BPM) |
| `20-pixel` | **复古像素风 (8-bit CRT)** | 独立游戏宣发、桌宠/像素世界片头、怀旧彩蛋 | [prompts/20-pixel.md](prompts/20-pixel.md) | [demos/20-pixel/](demos/20-pixel/) | `chiptune` (150 BPM) |
| `22-hud` | **赛博朋克 HUD / FUI** | 硬核科技测评、航空航天/军工科普、AI 系统锁定界面 | [prompts/22-hud.md](prompts/22-hud.md) | [demos/22-hud/](demos/22-hud/) | `darksynth` (110 BPM) |

### 2. 7 种扩展谱系风格（使用 [template.md](template.md) + [references/22-styles-catalog.md](references/22-styles-catalog.md) 制作）
- `11-grain`（颗粒质感插画风）· `13-text-flash`（苹果/抖音图文快闪）· `14-sticker-journal`（小红书贴纸手账风）· `15-guochao`（国潮新中式水墨金石）· `16-glitch`（数字故障 Datamosh）· `17-vaporwave`（蒸汽波 Win95 美学）· `21-acid`（Y2K 酸性液态镀铬设计）。

### 3. NB 小科实验科普视频权威首选风格与可选风格库

#### 👑 唯一权威首选风格（Authoritative Flagship Style — 默认必选）
凡为 **NB 小学科学（NB小科）** 制作实验科普视频、实验序幕引入或原理剧场短片，**除非用户明确指定其他可选风格，一律默认采用以下权威风格**：

| 权威风格 Slug | 风格名称与核心引擎 | 官方 IP 角色阵容 (`vendor/ClaudeAnimationBase/src/nb_cast.js`) | 专属规范与源码参考 | 核心创作准则 |
|---|---|---|---|---|
| **`xiaoke-nb-p5brush-storybook`**<br>*(基于 `ClaudeAnimationBase` / `PDoomVideo`)* | **NB 水墨水彩手绘剧场风**<br>(`p5.js + p5.brush` 水彩晕染 + 12fps 拍二沸腾墨线 + 多镜头电影运镜) | 1. **NB 博士 (`nbDoctor`)**：白大褂正胸口橙底粗体 **`NB`** 徽章、额头钴蓝护目镜、橙领结、翘呆毛<br>2. **主打吉祥物 A (`bookieNB`)**：「**翻翻书怪兽 · Bookie-NB**」拱脊梯形立体书小兽（5 金环 + 厚书页底边 + 燕尾红书签尾 + 掀盖大嘴 `lid` + `NB` 徽章）<br>3. **保留备选吉祥物 C (`flaskyNB`)**：「**啵啵烧瓶兽 · Flasky-NB**」锥形烧瓶小兽（软木塞帽 + 随情绪变色冒泡药水肚 + `NB` 徽章） | [prompts/xiaoke-nb-p5brush-storybook.md](prompts/xiaoke-nb-p5brush-storybook.md)<br>[vendor/ClaudeAnimationBase/src/nb_cast.js](vendor/ClaudeAnimationBase/src/nb_cast.js)<br>[demos/nb-mascot-proposals/](demos/nb-mascot-proposals/) | 真 `p5.min.js + p5.brush.js` 渲染；拒绝死板单机位课件，采用 **6~9 个高密度电影分镜**（拉开帷幕、博士过肩、推入蓝图、`Bookie-NB` 骑乘闯关、反打呆毛炸起、屏幕震动、`brushWipe` 笔刷横扫与 `iris` 聚光灯收尾） |

#### 🎨 认证可选风格库（Optional Styles — 仅在需要特定媒介对比或用户点名时选用）

| 可选风格 Slug | 风格名称与美学锚点 | 最佳适用小科课题 | 专属提示词规范 (`prompts/`) | 标杆满分源码与成片 (`demos/`) | 音画与文案铁律 |
|---|---|---|---|---|---|
| **`bauhaus-wooden-automata`**<br>*(基于 `09-bauhaus`)* | **瑞士 Naef 榉木积木 × 包豪斯机械工坊风** | 齿轮传动、简单机械、斜面杠杆 | [prompts/09-bauhaus.md](prompts/09-bauhaus.md) | `demos/xiaoke-gear-transmission/` | 普鲁士蓝工坊底 + 2.5D 立体原色木块厚度层 |
| **`cutout-felt-stopmotion`**<br>*(基于 `06-collage`)* | **松石绿毛毡 × 5px 剪刀白边波普定格拼贴风** | 磁铁的秘密、静电吸引、分类实验 | [prompts/06-collage.md](prompts/06-collage.md) | `demos/xiaoke-magnet-lab/` | 8fps 定格抽帧 + 5px 剪刀白边 + 波普网点 |
| **`playful-flat-vector`**<br>*(基于 `01-flat-vector`)* | **Kurzgesagt 高饱和纯色场 × 15% 弹性无描边矢量风** | 气球驱动小车、反冲运动、能量转换 | [prompts/01-flat-vector.md](prompts/01-flat-vector.md) | `demos/xiaoke-balloon-cart/` | 四幕全屏高饱和纯色场切换 + 15% 挤压拉伸 |
| **`cozy-16bit-pixel-workshop`**<br>*(基于 `20-pixel`)* | **温暖田园木屋 16-Bit 像素工坊 × Bayer 抖动光晕风** | 设计制作低压小台灯、简单电路 | [prompts/20-pixel.md](prompts/20-pixel.md) | `demos/xiaoke-lamp-pixel/` | `320×180` 离屏 `4×` 整数倍放大 + Bayer 4×4 抖动光晕 |
| **`risograph-ukiyoe-print`** | **葛饰北斋浮世绘螺旋卷云 × Risograph 孔版套印风** | 设计与改进纸飞机、风力与气象 | — | `demos/xiaoke-plane-ukiyoe-riso/` | 越前和纸拭色渐变 + 2.5px 错位套色 + 螺旋卷云纹 |
| **`matisse-textile-tapestry`** | **马蒂斯野兽派有机剪纸 × 北欧亚麻刺绣挂毯风** | 制作海水淡化模型、水循环与生态 | — | `demos/xiaoke-desalination-matisse/` | 粗亚麻经纬纹理 + 刀剪有机大色块 + 手工刺绣虚线针脚 |
| **`xiaoke-cel-watercolor`**<br>*(基于 `05-cel-boil`)* | **法国 Gobelins × 宫崎骏手绘拍二抖线水彩风**<br>*(盲审 9.15/10 认证)* | 飞行滑翔（纸飞机）、风力/水循环、植物生长、光影自然、手工造物 | [prompts/xiaoke-cel-watercolor.md](prompts/xiaoke-cel-watercolor.md)<br>[prompts/05-cel-boil.md](prompts/05-cel-boil.md) | [demos/xiaoke-paper-airplane/](demos/xiaoke-paper-airplane/) | 24fps 冷压水彩纸底 (`#F4EFE6`) + 12fps 拍二炭笔抖线 + 错版水彩晕染 + 实时副机落叶失速对照 + 全片仅限 4 句手写中文（严禁参数表/网格/英文）+ VCSL 木吉他/木琴/铅笔沙沙/微风 (`-14.4 LUFS`) |
| **`xiaoke-davinci-line`** / **`xiaoke-davinci-line-art`**<br>*(基于 `02-line-art`)* | **达芬奇博物手稿 × Ordinary Folk 一笔画双色钢笔科普风**<br>*(盲审 9.01/10 认证)* | 仿生机械（仿生手臂）、齿轮杠杆、人体骨骼肌肉、生物解剖结构、精密仪器 | [prompts/xiaoke-davinci-line.md](prompts/xiaoke-davinci-line.md)<br>[prompts/xiaoke-davinci-line-art.md](prompts/xiaoke-davinci-line-art.md)<br>[prompts/02-line-art.md](prompts/02-line-art.md) | [demos/xiaoke-bionic-arm/](demos/xiaoke-bionic-arm/) | 温暖复古亚麻手稿纸 (`#F3EDE0`) + 压感毛细钢笔墨线 (`#1E1B18`) 疾徐生长 (`calligProgress`) 与铜版画双曲排线 + 朱砂红 (`#D9381E` 主动屈肌/红绳) 与群青蓝 (`#1D4ED8` 拮抗伸肌/蓝绳) 双色点睛 + 唯一中心铆钉阻尼 (`rivetDampedStep`) + 全片仅限 4 句黄金中文（零 `①②③` 标号）+ VCSL 大提琴拨弦/拉弦 + 钢琴 + 钢笔划亚麻纸沙沙声 (`-14.6 LUFS`) |
| **`xiaoke-guochao-ink`**<br>*(融合 `15-guochao` × `07-liquid`)* | **上美影新国风水墨 × 流体变形东方力学美学风**<br>*(盲审 8.99/10 认证)* | 结构缓冲（鸡蛋保护装置）、流体相变/海水淡化、传统工巧、古代科技、天地自然 | [prompts/xiaoke-guochao-ink.md](prompts/xiaoke-guochao-ink.md)<br>[prompts/15-guochao.md](prompts/15-guochao.md)<br>[references/xiaoke-science-mg-styles.md](references/xiaoke-science-mg-styles.md) | [demos/xiaoke-egg-protector/](demos/xiaoke-egg-protector/) | 30fps 手工熟宣纸底 (`#F2ECE1`) + 焦浓重淡清五色墨 + 朱砂红 (`#C83C23`) 伞衣行波与「完好如初」阳刻方印 + 软棉黏弹性慢陷化泥金 (`#D4AF37`) 同心涟漪与悬浮液滴 (`07-liquid`) + 0.28s 水墨云气无缝转场 + 全片仅限 4 句书法金句（严禁现代电子仪表/表格）+ VCSL 古筝泛音刮奏/大鼓/空灵颂钵/马林巴/金石落印声 (`-14.3 LUFS`) |

---

## 四、标准 6 步生产与命令管线 (Standard Execution Pipeline)

本 Skill 目录（记为 `<SKILL_DIR>`，即 `/Users/eeo/Downloads/ans/.agents/skills/mg-styles-15`）已完整内置 `node_modules`、`harness/render.mjs`、`lib/audio/mgaudio`（含 103 个乐器采样）与公共纹理/HDRI 资产。

### Step 1：立项分镜与脚手架初始化 (`Treatment & cues.json`)
1. 先阅读目标风格的 `prompts/<slug>.md` 以及同风格标杆源码 `demos/<slug>/index.html`、`demos/<slug>/audio.py`（学习其缓动、图层结构与技法实现，**绝不写简陋的扁平矩形凑数**）。
2. 运行脚手架脚本创建新片目录（或直接在 `<SKILL_DIR>/demos/<my-film>/` 下创建）：
   ```bash
   python3 <SKILL_DIR>/scripts/new_film.py --style <style-slug> --name <my-film> --title "<片名>"
   ```
3. 设计全片结构并写入 `cues.json`（画面与声音的唯一共享时间表）：
   - **0.0–0.5s 强钩子（Hook）**：绝不允许超过 0.3s 的黑屏或空屏！
   - **1.0–5.5s 层层升级（Escalation）**：每个节拍引入新视觉元素，错峰 2~4 帧（Stagger），带预备动作（Anticipation）与跟随（Follow-through）。
   - **6.0–7.5s 黄金高潮（Hero Moment）**：全片最惊艳的视觉大招（如元素爆炸重组、液态透镜折射、全息锁定变色、三维克隆波浪碰撞）。
   - **8.0–10.0s 余韵收尾（Composed End Frame）**：品牌/主题定格保持 `0.8~1.2s`，必须带有呼吸感微动态（Micro-motion），绝不死板冻结。

### Step 2：关键静帧海报级验收 (`Key Frames Before Motion`)
1. 在 `index.html` 中实现 `window.DEMO` 与 `window.renderAt(t)`，先导出 6~10 张关键时间点的静帧：
   ```bash
   node <SKILL_DIR>/harness/render.mjs <SKILL_DIR>/demos/<my-film> --stills 0.25,1.5,3.2,5.0,6.5,8.5,9.5
   ```
2. 用 `view_file` 查看 `<demo_dir>/out/stills/*.png`，逐一修正排版、构图、留白、字体加载与色彩对比，直到每张静帧都达到海报级水准。

### Step 3：帧级动态编排 (`Motion Choreography`)
1. 严格兑现该风格的 `Signature features`（详见 [references/engineering-cookbook.md](references/engineering-cookbook.md)）。
2. 可使用低分辨率快速预览检验动作流畅度：
   ```bash
   node <SKILL_DIR>/harness/render.mjs <SKILL_DIR>/demos/<my-film> --scale 0.5 --noaudio
   ```

### Step 4：合成配乐与音效 (`Soundtrack & Frame-Synced SFX`)
1. 阅读 [lib/audio/README.md](lib/audio/README.md)，在 `<demo_dir>/audio.py` 中调用 `mgaudio.recipes.for_style('<slug>')` 并为每个视觉动作挂载帧级同步 SFX，在大撞击前加入 `60ms -9dB` 音乐总线抽吸（Pre-hit Suck）。
2. 运行配乐合成并确认零告警（Zero Warnings）：
   ```bash
   python3 <SKILL_DIR>/demos/<my-film>/audio.py
   ```

### Step 5：全分辨率带运动模糊渲染 (`Full-Res Render`)
1. 执行全分辨率合成渲染（`harness/render.mjs` 会自动调用无头 Chrome 逐帧截图、应用 `tmix` 子快门运动模糊，并用 `ffmpeg` 合成 `out/audio.wav` 输出 `H.264 High Profile CRF 14 bt709` 成片）：
   ```bash
   node <SKILL_DIR>/harness/render.mjs <SKILL_DIR>/demos/<my-film> --workers 2
   ```

### Step 6：独立 Subagent 盲审与多轮迭代 (`Independent Jury Review`)
1. 生成盲审检验包：
   ```bash
   bash <SKILL_DIR>/scripts/jury_extract.sh <SKILL_DIR>/demos/<my-film>/out/video.mp4
   ```
2. 按 [references/jury-rubric-and-iteration.md](references/jury-rubric-and-iteration.md) 启动独立 Subagent 严格打分，未满全项 `≥ 7.5`（或目标 `≥ 8.5~9.0`）时执行第 2 轮、第 3 轮精修重渲，直至达到大奖入围级品质！

---

## 五、参考文档索引 (`references/` & 原仓核心文档)

- [references/video-tutorial-methodology.md](references/video-tutorial-methodology.md) — B站教学视频（BV1kLn36WEN6）三大范式与两大提分秘诀深度笔记
- [references/22-styles-catalog.md](references/22-styles-catalog.md) — 16 种含满分源码标杆风格 + 6 种扩展风格（共 22 种）完整技法与配乐图鉴
- [references/xiaoke-science-mg-styles.md](references/xiaoke-science-mg-styles.md) — **NB 小科实验科普 MG 短片可选风格库（含 `15-guochao` 上美影新国风水墨 × 流体变形 `8.99/10` 标杆规范）**
- [references/engineering-cookbook.md](references/engineering-cookbook.md) — 纯函数渲染契约、阻尼弹簧/贝塞尔数学库、Line Boil / SDF Metaball / Oklab 形变 / 五层花字等源码级秘籍
- [references/jury-rubric-and-iteration.md](references/jury-rubric-and-iteration.md) — 独立 Subagent 盲审打分提示词与多轮迭代 SOP
- [references/ans-live-tour-film-playbook.md](references/ans-live-tour-film-playbook.md) — **ANS (`AI Never Stops`) 官方网站实机导览宣传片复利手册（`demos/ans-brand-film/`：Screen Studio 光学聚焦放大 + 预缓存 3D 小恐龙互动 + `Drama-3` 口播字幕 100% 逐字对齐 + 瑞士风 Lo-Fi BGM 闪避混音）**
- [lib/audio/README.md](lib/audio/README.md) — `mgaudio` 配乐与音效合成引擎完整 API 手册
- [rubric.md](rubric.md) / [template.md](template.md) — 原版评审提示词与新风格提示词编写模板
