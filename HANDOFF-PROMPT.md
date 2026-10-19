# 换电脑继续迭代 ANS 官方宣传片的交接提示词（当前版本：60分及格基线，待深度优化）

```markdown
请先完整阅读当前工程内的以下核心文件，恢复上下文后再开始本轮视频迭代：
1. `.agents/skills/ans-brand-film-live-tour/SKILL.md`（必读：当前 60 分基线版的 6 条底线红线 + 已知核心问题清单）
2. `demos/ans-brand-film/clauses_timeline.json` 与 `demos/ans-brand-film/index.html`（当前 121.96 秒、3659 帧 @ 1080p 30fps 成片的完整时间轴与渲染源码）

### 一、 当前版本真实状态定位（60 分及格基线 · 仍有很多问题待解决）
当前 `demos/ans-brand-film/out/ans-brand-film-1080p.mp4`（121.96 秒）**仅达到 60 分及格线**。它跑通了全套素材、语音混音与业务板块覆盖，但存在以下明显问题需要在本轮重点迭代解决：
1. **画中画外框冗余、真站画面被挤压**：Ch 1～Ch 6 浏览器左右两侧常驻了两块辅助小卡片（`LEFT / RIGHT HUD`），加上顶部大标题与浏览器内部浮动黑框，导致中间真正的网页内容占比偏小、套壳感太重。
2. **静态长图平移 vs 真实高帧率交互差距**：目前网页浏览主要是对静态 WebP 长图做 `scrollY` 平移和淡入淡出，3D 小恐龙也仅靠 36 张预缓存静态图切换，缺乏丝滑的真实高帧率动态与细腻交互反馈。
3. **镜头聚焦（Camera Rig）节奏单调**：连续 6 个章节（近 95 秒）都困在同一个居中浏览器框里做简单的正弦缩放，缺少顶级商业科技片（Screen Studio / Apple / Linear）的凌厉弹簧推拉、全屏特写切镜与分镜构图变化。

### 二、 迭代时必须严格保留的 6 条底线要求（绝不可回退）：
1. **品牌与吉祥物铁律**：`ANS` 唯一官方全称是 `AI Never Stops`（主站 `https://ans.cauai.fun`），吉祥物必须使用真实薄荷绿圆胖小恐龙 `assets/mascot/ans-mascot.png` 及官方负空间三角 `ANS` 标志。
2. **纯净单行字幕 & 口播=字幕 100% 逐字完全一致**：
   - 底部字幕栏内严禁加任何多余标签（严禁出现 `DRAMA-3` 徽章、音波柱或顶部 `▼` 指针），只显示纯净单行字幕；
   - `Fish Audio Drama-3`（`reference_id = "44c1d8be3ac24722b7f6dcbeafefeb5a"`）念出的语音 (`tts`) 与画面底部字幕 (`text`) 必须 100% 逐字完全一致（17 句原声已缓存在 `demos/ans-brand-film/clauses_tts/` 中，由 `gen_audio.py` 合成）。
3. **黑名单项目零出现**：严禁展示任何个人半成品或已下架项目（`念念*`、`简历`、`个人作品集`、`小恐龙 3D`、`AI 科普短剧`、`VibePhoto`、`知微影像`、`无限画布`、`Image2`、`视频定制`、`商业视频`）。
4. **6 大真站高光板块完整覆盖**：
   - 项目广场 (`/explore`)：切换不同分类并向下滑展示高星开源项目；
   - `VibeHub` (`/vibe-hub`)：切换 AI / 前端 / 24种设计风格向下滑，以及课程与练习；
   - 专属 3D 小恐龙 Agent（先缓存好模型再录制）：连点 3 下放大 → 抽几下鞭子 → 喂几次零食 → 3D 衣橱换衣服；
   - 市场 (`/market`)：上架项目、平台主动推流曝光、提供交易环境；
   - 社群 (`/teams`)：同学们交换需求、跨学科组队参赛做项目；
   - 大赛专区与高校 Hub (`/competitions`, `/competitions/agrihackathon`, `/hubs`)：盘点值得一去的黑客松与 AIGC 比赛、举办农客松、支持各高校 Hub 入驻（目前已入驻中国农业大学 `CAUHub`）。
5. **动态鼠标聚焦放大**：说到对应功能点时跟随鼠标做聚焦放大，拒绝画面静止不动。
6. **合格版 BGM 混音**：保持 `assets/sfx/lofi-study_fassounds.mp3`（瑞士风 60 分合格版同款 BGM）与人声自动闪避混音。

### 三、 已打包在当前目录中的成片全量素材清单
- `demos/ans-brand-film/out/ans-brand-film-1080p.mp4`：当前 60 分基线成片（121.96s）
- `demos/ans-brand-film/out/audio.wav`：已混好 Drama-3 口播 + Lo-Fi BGM + SFX 的母带音轨
- `demos/ans-brand-film/clauses_tts/`：17 句 Drama-3 分句独立语音（`.mp3` + `.wav` + `manifest.json`）
- `demos/ans-brand-film/assets/tour/`：已净化的真站长图（`explore_*.webp`, `vibehub_*.webp`, `market_clean.webp`, `teams_clean.webp`, `competitions_main.webp`, `agrihackathon_main.webp`, `hubs_main.webp`）与 3D 小恐龙 36 帧序列（`dino_00.webp`..`dino_35.webp`）
- `demos/ans-brand-film/assets/sfx/lofi-study_fassounds.mp3`：瑞士风合格版同款 Lo-Fi BGM
- `demos/ans-brand-film/index.html` & `shaders.js` & `gen_audio.py` & `capture_live_tour.mjs`：全套源码与采集/混音脚本

现在，我们在 60 分基线上开始新一轮迭代，我首先要解决的问题是：
【在这里输入你想改的具体问题】
```
