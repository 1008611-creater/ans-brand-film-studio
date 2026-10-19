# Style Preset: `xiaoke-cel-watercolor` — NB 小科实验「法国 Gobelins × 宫崎骏手绘拍二水彩科普风」(`05-cel-boil` 教育专版)

> **标杆满分范例（Blind Jury 终审 `9.15 / 10.0`，7 维全项 $\ge 9.0$）**：
> - **成片与源码目录**：`demos/xiaoke-paper-airplane/`（《设计与改进纸飞机》15.0s · 1920×1080 · 24fps）
> - **核心动画实现**：`demos/xiaoke-paper-airplane/index.html`
> - **VCSL 温暖原声配乐**：`demos/xiaoke-paper-airplane/gen_audio.py` + `demos/xiaoke-paper-airplane/cues.json`
> - **基础母版参考**：`prompts/05-cel-boil.md` · `demos/05-cel-boil/`

---

## 1. 适用课题与审美锚点 (When to Select This Style)

当为 **NB 小学科学（NB小科）** 制作 15 秒知识科普短片、实验序幕引入片或原理总结短片，且课题具有**自然风力、飞行滑翔、植物生长、光影变化、水循环、手工造物、生活温度**等属性时，优先选用本风格。

- **视觉对标**：法国 Gobelins 学院派手绘毕业短片 × 吉卜力/宫崎骏水彩绘本手稿 × Giant Ant 手绘科普短片（锚定 **9.0/10 大奖入围刻度**）。
- **核心帧率律动（24fps × 12fps 混合拍二机制）**：
  - **24fps 丝滑层**：冷压粗纹水彩纸基底（`#F4EFE6`）、纸张纤维暗角、全局镜头推拉摇移（`getCamera24fps(t)`）保持 24fps 连续流动；
  - **12fps 拍二（On-Twos）手绘层**：实验器材主体、折纸变形、气流卷曲、手写字幕微抖动全部量化在 `f12 = Math.floor(t * 12)`（`t12 = f12 / 12`）上，通过确定性帧哈希噪声实现手绘炭铅笔线条的呼吸沸腾感（`Boiling Lines`）。

---

## 2. 手绘纯粹度三大铁律 (Strict Purity Rules)

1. **极简黄金中文文案铁律（全片仅限 4 句中文，严禁堆砌参数表！）**：
   - 全片 15 秒分为四幕（每幕约 `3.5~4.0s`），**每幕画面底部仅浮现 1 句凝练、有诗意与科学直觉的中文手写感金句**（采用 `Ma Shan Zheng` / `ZCOOL XiaoWei` / `STKaiti`，衬在半透明手刷米白纸条上，配明黄手绘下划线与逐字弹出微抖动）。
   - **严禁出现**：冰冷的电子表格、参数仪表盘、坐标网格、数字 HUD 或多余英文标签！
2. **手绘水彩错版晕染 + 实体留白遮罩（Off-Register Bleed & Cream Knockout）**：
   - 器材主体必须先填充一层微抖动的暖米白纸底遮罩（`PAL.paperCream` `#FAF6EE`），再叠加上色水彩层（`watercolorWash`），防止背景蔚蓝气流或草坪色块透过 `multiply` 混合把主体染脏。
   - 水彩填充固定向右下或左上微偏 `(-4.5px, +3.5px)` 越出炭铅笔轮廓线，形成真实手工印刷与水彩湿边（Wet-edge Rim）质感。
3. **拒绝静态多曝光教学图，强制全动态副机/对照物实时演绎（Live Secondary Action & Cel Smears）**：
   - **错误反例**：把失败对照（如 `45°` 失速纸飞机、未加配重的翻滚状态）画成 4 个静止不动的半透明残影停在画面上。
   - **正确做法**：失败对照物必须作为 **12fps 实时运动的第二主角**（如实时陡升 $\rightarrow$ 漩涡失速悬停 $\rightarrow$ 机头下栽如落叶飘落），仅在其已经飞过的路径后方留下淡淡的洋葱皮铅笔虚影（`alpha: 0.24~0.34`）；初始折纸/组装形态在起飞后应优雅淡化为 `0.24` 透明度的铅笔蓝图记忆残影。
   - **手绘拖影帧（`smear拖影帧`）**：在发射腾跃（如 `1.0s~1.8s`）和关键机关锁死（如 `8.05s` 回形针夹机头）的 2~3 帧内，绘制拉伸的多重炭笔轮廓与放射状红铅笔速度线。

---

## 3. 标准色彩调色板 (Canonical Palette)

| 角色 | 色值 | 用途说明 |
| :--- | :--- | :--- |
| `paperBase` | `#F4EFE6` | 24fps 温暖粗纹冷压水彩画纸基底（叠加 `paper_base.jpg` + `paper_tooth.png`） |
| `paperCream` | `#FAF6EE` | 主体留白遮罩底色、高光纸色、字幕手刷底条 |
| `charcoal` | `#1E1B18` | 12fps 炭铅笔主轮廓线（带 20%~30% 过冲收笔 `overshoot` 与枯笔飞白） |
| `redPencil` | `#C84B31` | 动画师红铅笔辅助线（对称折痕虚线、旋转箭头、放大镜内圈、碰撞放射线） |
| `planeMain` / 主体色 | `#F2B705` | 明黄主体水彩主色（向阳翼面 `#FFD438`、背阴折谷 `#D98E04`） |
| `windCerulean` / 气流 | `#4895D6` | 蔚蓝层流主色（深靛蓝脊线 `#2664A8`、浅天蓝晕染 `#78B7EA`） |
| `stallCoral` / 失速对照 | `#D95B43` | 失败对照/失速漩涡珊瑚红与赤陶土色（`#E5A888`） |
| `meadowSun` / 远航草坪 | `#92C46D` | 第四幕宫崎骏阳光草坪草绿、中景翠绿（`#64A458`）与暖金天光（`#FDE9A2`） |

---

## 4. 四幕 15 秒叙事结构模板 (4-Act 15s Storyboard Template)

| 幕次与时间轴 | 叙事功能 | 画面手绘分镜规范 | 转场机制 |
| :--- | :--- | :--- | :--- |
| **Act 1 (`0.0 ~ 3.5s`)**<br>动手造物·引出悬念 | 0.4s 强钩子 + 核心疑问 | 炭铅笔快速勾勒原始材料，沿红铅笔中线实时折叠/变形，蓄力压缩后带 2 帧手绘 `smear` 拖影跃入蔚蓝微风，原位留下一抹淡铅笔蓝图印记。 | `3.35~3.65s` 三道半透明水彩风带斜扫全屏 + 24fps 镜头顺风甩摇 |
| **Act 2 (`3.5 ~ 7.5s`)**<br>正误对照·黄金规律 | 错误做法 vs 正确做法同屏实时竞速 | 同一发射点绘出手绘量角弧线：错误角度/参数副机在 12fps 下实时冲入乱流漩涡失速飘落；正确黄金参数主机顺着平顺的靛蓝水彩层流稳稳滑翔上升（注意拉开两者剪影距离，严禁在发射顶点堆叠）。 | `7.35~7.65s` 三道水彩风带斜扫转场 |
| **Act 3 (`7.5 ~ 11.5s`)**<br>关键改良·细节特写 | 圆形手绘放大镜特写 + 重心/结构锁定 | 左下角未改良虚影迎风摇晃，左上角弹出双圈手绘放大镜（`Loupe`），特写关键改良件（如银灰回形针）带 `smear` 拖影与红铅笔火花精准卡入机头，主舞台瞬间化作一道流畅的金色轨迹弧线。 | `11.35~11.65s` 三道水彩风带斜扫转场 |
| **Act 4 (`11.5 ~ 15.0s`)**<br>乘风远航·绘本定格 | 宫崎骏阳光草坪远景 + 收藏级海报定格 | 双层手绘炭笔画框内，暖黄斜阳穿透蓬松积云照亮起伏草坪与随风摇曳的野花，主角拖着金蓝双色水彩尾迹飞向远方，在 `13.5~15.0s` 保持 8fps 呼吸沸腾微动态定格为可收藏插画海报。 | 余韵保持至 `15.000s` |

---

## 5. VCSL 温暖原声配乐与音效配方 (`gen_audio.py`)

必须使用 `lib/audio/mgaudio` 的 `05-cel-boil` 基础配方叠加 VCSL 真实采样与手绘拟音（Foley），严禁使用电子合成器/科幻激光音效：

1. **基底与和声（Base & Fingerstyle Guitar）**：
   - `m = recipes.for_style('05-cel-boil', duration=15.0, bpm=96, key='F', drop=8.05, outro=13.2, music_level=-23.5, sfx_duck=2.5)`
   - 压低默认电子鼓底（`kick: -29dB`, `snare: -30dB`），主推 **温暖尼龙弦/钢弦木吉他指弹分解和弦**（`pluck.guitar(note, dur, vel, 'nylon'|'steel')`）+ **尤克里里柔和扫弦**（`pluck.strum(..., kind='uke')`）+ **大提琴拨弦低音**（`pluck.pizz`）。
2. **VCSL 旋律采样层（Crisp Mallet & Harp Melody）**：
   - `samples.inst('marimba')` + `fm.mallet(..., 'xylo')` 演奏主旋律；
   - `samples.inst('glock')`（钟琴清脆高音点亮）、`samples.inst('kalimba')`（拇指琴木质共鸣）、`samples.inst('vibraphone')`（颤音琴温暖铺底）、`samples.inst('harp')`（音乐会竖琴在起飞 `1.75s`、锁定 `8.55s`、定格 `13.55s` 处扫奏琶音）。
3. **手绘触感拟音（Tactile Hand-Drawn Foley）**：
   - **炭铅笔纸面沙沙书写声**：`sfx.pen('pencil', dur, seed=...)` 对齐线条勾勒与手写字幕浮现；
   - **折纸与纸张摩挲声**：`sfx.paper('slide'|'flip'|'rustle', dur, seed=...)` 对齐折痕按压与失速飘落；
   - **轻柔微风拂过声**：`sfx.whoosh(dur, 'air'|'soft'|'swish', direction=1, peak=0.06)` 对齐每次乘风滑翔与风带转场；
   - **四幕动态呼吸包络（LRA $\ge 2.0\text{ LU}$）**：使用 `m.group('music').automate('gain', ...)` 在书写铺垫段压低 `-3.2 ~ -3.5 dB`，在起飞、黄金角抬升、回形针锁定与草坪远航处绽放至 `+0.5 ~ +1.5 dB`，母带导出锁定 `lufs=-14.3, tp=-1.2`（严守 `-16 ~ -14 LUFS`）。

---

## 6. 一键复刻与盲审验收命令

```bash
# Step 1: 关键帧海报级审美确认（未经确认不跑完整视频）
node harness/render.mjs demos/<experiment-slug> --stills=1.5,4.2,6.5,9.2,11.8,14.0

# Step 2: 合成 VCSL 温暖原声母带（验证 LUFS -16~-14 & 100% Hit Alignment）
python3 demos/<experiment-slug>/gen_audio.py

# Step 3: 渲染完整 1080p 24fps MP4 并抽取独立盲审包
node harness/render.mjs demos/<experiment-slug> --out=demos/<experiment-slug>/out.mp4 --workers 2
bash scripts/jury_extract.sh demos/<experiment-slug>/out.mp4 /tmp/jury_<experiment-slug>

# Step 4: 唤醒零上下文 research 子 Agent 按 rubric.md 7 维盲审（单项门禁 >= 7.8，目标 >= 9.0）
```
