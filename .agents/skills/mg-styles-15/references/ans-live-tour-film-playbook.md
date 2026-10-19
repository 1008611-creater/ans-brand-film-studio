---
name: ans-brand-film-live-tour
description: >
  ANS (AI Never Stops, https://ans.cauai.fun) 商业级官网实机导览与产品发布宣传片复利管线 Skill。
  融合 mg-styles-15 (12-aurora-glass × 03-kinetic-type × 08-morph) + Screen Studio 级光学鼠标聚焦放大/平滑滚页 +
  预缓存 Three.js 3D 小恐龙 Agent 四步连贯互动 (连点3下放大 -> 抽鞭子 -> 喂零食 -> 3D衣橱换装) +
  Fish Audio Drama-3 口播与纯净单行字幕 100% 逐字对齐 + 瑞士风合格版 Lo-Fi BGM 自动闪避混音。
  凡迭代、优化或新制 ANS 官方网站宣传片、实机功能导览片（项目广场 / VibeHub / 3D Agent / 市场推流 / 社群组队 / 农客松 / CAUHub）时必须激活本 Skill。
---

# ANS (`AI Never Stops`) 官网实机导览宣传片复利管线 (`ans-brand-film-live-tour`)

本 Skill 沉淀自 `demos/ans-brand-film`（`121.96s` · `1920x1080` · `30fps` · `3,659 帧`）多轮实战打磨定稿，确保后续在任何电脑或新会话中继续迭代视频时 **100% 继承全部工程资产、审美红线与自动化脚本，绝不退步或踩坑**。

---

## 一、 六大不可妥协复利铁律（Mandatory Compounding Rules）

### 1. 纯净单行字幕 & 口播=字幕 100% 逐字完全一致
- **严禁字幕栏杂物**：字幕条（`drawVoiceoverSubtitleBar`）内 **只允许渲染当前那一句字幕文本本身**，严禁添加 `DRAMA-3` 徽章、严禁添加动态音波柱、严禁添加顶部 `▼` 装饰三角或句号。
- **100% 逐字同源**：`gen_audio.py` 中传给 `Fish Audio Drama-3`（`reference_id = "44c1d8be3ac24722b7f6dcbeafefeb5a"`）的 `tts` 字符串必须与画面渲染的 `text` 字符串 **100% 逐字相等**。
- **由语音真实时长决定视频总长**：严禁为了塞进 15 秒而牺牲叙事节奏。每次修改台词后运行 `python3 demos/ans-brand-film/gen_audio.py`，自动测算每句语音的精确起止秒数并生成 `clauses_timeline.json` 与 `timeline_data.js`，由 `window.DEMO.duration` 动态驱动总帧数。

### 2. 彻底剔除个人半成品/下架项目，聚焦真站 6 大高光板块
- **物理级黑名单过滤（严禁出现在任何截图或画布中）**：
  - 黑名单关键词：`['念念', 'niannian', '简历', '个人作品集', '小恐龙 3D', 'AI 科普短剧', 'VibePhoto', '知微影像', '无限画布', 'Image2', '视频定制', '商业视频']`。
  - 采集真站画面时必须调用 `capture_live_tour.mjs` 中的 `cleanBlockedCards(page)`，在截图前从 DOM 树中物理移除包含上述关键词的卡片并重排 Grid。
- **全片 8 章叙事与真站导览黄金结构**：
  - **Ch 0（痛点与 Day 1 福利）**：打破「90% 的人刷 AI 只剩聊天记录和收藏夹吃灰」，亮出顶配旗舰模型（`GPT-6-Astra`、`大肥鱼 v4.1-1017`、`Opus 5.5`）与注册即送免费算力。
  - **Ch 1（项目广场 `/explore` 分类切换与下滑）**：展示 `Hello 算法`、`Build Your Own X`、`freeCodeCamp`、`Ollama`、`Hermes Agent`、`AppFlowy`、`AFFiNE`、`Stirling PDF` 等高星开源宝藏，实机演示向下平滑滚动（`scrollY` 配合顶部 `64px` 导航栏吸顶固定）并依次点击切换 **`全部 66` → `学习成长 10` → `GitHub 宝藏 7` → `效率与生活 8`**。
  - **Ch 2（`VibeHub` `/vibe-hub` 分类切换与下滑）**：实机切换 **`AI 54` → `前端 146` → `设计风格 24`**，向下平滑滚动浏览 `现代简约`、`苹果风 Apple HIG`、`Notion 风`、`Bento 便当格`、`玻璃拟态`、`瑞士排版`，并切入 `课程` 与 `练习`。
  - **Ch 3 & Ch 4（3D 小恐龙 Agent 预缓存连贯互动）**：
    1. 镜头聚焦放大（`1.85x`）右下角小恐龙 Agent，鼠标 **连点 3 下** 切入中央「灵龙近景互动台」；
    2. 点击 **`🪢 挥鞭催干活`** **连抽 3 下鞭子**（触发金红鞭影、`啪！动力 +15% ⚡` 与 `100% ⚡ 超频` 光速敲代码状态）；
    3. 点击 **`🎲 盲盒投喂`** **连喂 3 次零食**（变态辣火鸡面、多肉杨枝甘露波波冰、4090 满血显卡饼干，好感度与灵感星豆拉满）；
    4. 打开 **`👗 3D 衣橱`** 一键切换 **`🧋 Tripo 喷射套装`** 与 **`👑 UR 满配神装`** 并 360° 旋转欣赏。
  - **Ch 5（ANS 市场 `/market` 上架与推流变现）**：镜头聚焦放大 `发布我的项目或服务` 按钮，介绍 **平台官方主动推流曝光 + 完善交易环境 + 算力收益自动结算**，并向下平滑滚动浏览干净市场作品（`Pi Agent 知识图谱`、`智慧农业多模态大屏`、`农学 SCI 精修工作台`、`ANOVA 科研绘图包`）。
  - **Ch 6（社群组队 `/teams` + 大赛农客松 `/competitions/agrihackathon` + 高校 `CAUHub` `/hubs`）**：
    - 社群交换真实需求、跨学科组队参赛做项目；
    - 大赛专区盘点黑客松与 AIGC 比赛，重点展示 ANS 主办的 **农客松**；
    - 高校 Hub 入驻重点聚焦放大首站入驻高校 **中国农业大学 `CAUHub`**。
  - **Ch 7（28 天 Flag 与官方品牌定格）**：每日有感改进或全员额度重置（`Full Reset`），收尾定格官方 `ANS` 负空间三角 Logo + 巨幅字标 + 真实薄荷绿小恐龙（`public/mascot/ans-mascot.png`）+ `ans.cauai.fun`。

### 3. Screen Studio 级光学镜头聚焦放大与平滑滚页（拒绝画面静止）
- 在 `index.html` 的 `getTourStageState(tReal)` 与 `drawLiveBrowserWindow` 中，每一句口播都必须驱动：
  - `zoom`：光学推拉缩放（`1.04x → 1.24x ~ 1.85x`）；
  - `focusX, focusY`：镜头焦点平滑摇移（注意 `fy` 上限必须设为 `1080 - (pageVisH / 2) / zoom`，确保底部按钮绝不被裁切）；
  - `scrollY`：长网页（`1920×2100`）平滑垂直滚动，且 `y = 0..64` 顶部导航栏自动保持吸顶阴影固定；
  - `curX, curY, clickPulse`：高精度矢量鼠标指针移动、点击下压缩放与双层同心波纹。
- 在 Ch 3 & Ch 4（3D 小恐龙近景互动台）期间，浮动说明横幅自动切换至左上角（`isTopCallout = true`），确保底部 `挥鞭催干活 / 盲盒投喂 / 3D 衣橱 / 切换形态` 四个按钮 **100% 无遮挡**。

### 4. 3D WebGL 小恐龙必须「先预缓存序列帧、再合成渲染」
- 严禁在视频逐帧渲染时直接实时请求未缓存的 Three.js 模型。
- 统一使用 `capture_live_tour.mjs` 预先等待 WebGL 纹理与骨骼模型完全就绪，注入 `* { transition-duration: 0s !important; }` 消除半透明残影，录制 `assets/tour/dino_00.webp` .. `dino_35.webp` 共 36 张确定性序列帧，在 `index.html` 中以 60fps/30fps 零延迟切换调用。

### 5. 瑞士风 60 分合格版同款 Lo-Fi BGM + 自动闪避混音
- 底乐使用 `assets/sfx/lofi-study_fassounds.mp3`（与瑞士风 60 分合格版同源）。
- 在 `gen_audio.py` 中自动计算人声包络：口播发声期间 BGM 增益平滑闪避至 `0.075`，句间气口回升至 `0.22`，叠加 UI 点击、挥鞭脆响、投喂气泡与章节转场音效，最终响度锁定 `-15.0 LUFS / <= -1.5 dBTP`。

---

## 二、 核心文件结构与一键迭代命令

工程位于 `<SKILL_DIR>/demos/ans-brand-film/`（其中 `<SKILL_DIR>` 为 `.agents/skills/mg-styles-15`）：

| 文件路径 | 作用说明 |
| :--- | :--- |
| `demos/ans-brand-film/index.html` | 1920×1080 纯函数确定性渲染主舞台（含 WebGL2 极光毛玻璃、Screen Studio 光学聚焦浏览器、36 帧 3D 小恐龙互动台、纯净单行字幕） |
| `demos/ans-brand-film/gen_audio.py` | 17 句 `Fish Audio Drama-3` 语音合成 + 瑞士风 Lo-Fi BGM 闪避混音 + `clauses_timeline.json` & `timeline_data.js` 自动生成脚本 |
| `demos/ans-brand-film/capture_live_tour.mjs` | 真站页面（`/explore`, `/vibe-hub`, `/market`, `/teams`, `/competitions`, `/hubs`）黑名单净化截图 + 3D 小恐龙 36 帧互动预缓存脚本 |
| `demos/ans-brand-film/clauses_timeline.json` | 17 句口播/字幕精确时间轴与 8 大章节区间定义 |
| `demos/ans-brand-film/timeline_data.js` | 供 `index.html` 同步加载的 `window.ANS_TIMELINE` 数据模块 |
| `demos/ans-brand-film/assets/tour/*.webp` | 预缓存的高清无黑名单真站长图与 `dino_00.webp`..`dino_35.webp` 3D 序列帧 |
| `demos/ans-brand-film/assets/sfx/lofi-study_fassounds.mp3` | 瑞士风 60 分合格版同款 Lo-Fi BGM |
| `demos/ans-brand-film/clauses_tts/clause_*.mp3` | 已缓存的 17 句 `Fish Audio Drama-3` 原声语音（未改动台词的句子无需重复调 API） |

### 常用迭代命令速查

```bash
# 1. 进入 mg-styles-15 根目录
cd .agents/skills/mg-styles-15

# 2. 若修改了台词或混音音量，重新生成音轨与时间轴（未改动的句子自动复用缓存）
python3 demos/ans-brand-film/gen_audio.py

# 3. 先导出关键时间点 1080p 静帧（约 10 秒），肉眼核验排版与镜头聚焦
node harness/render.mjs demos/ans-brand-film --stills=9.0,23.0,36.0,46.5,53.0,61.0,68.5,76.0,98.5,105.0,119.5 --motion-blur=1

# 4. 渲染完整 1080p 30fps 成片（带运动模糊与混音音轨）
node harness/render.mjs demos/ans-brand-film --audio=demos/ans-brand-film/out/audio.wav --motion-blur=1

# 5. 压制 Web 秒开版 H.264 High Profile (CRF 18 + faststart)
ffmpeg -y -i demos/ans-brand-film/out/video.mp4 -c:v libx264 -profile:v high -crf 18 -preset fast -pix_fmt yuv420p -c:a copy -movflags +faststart demos/ans-brand-film/out/ans-brand-film-web.mp4
```
