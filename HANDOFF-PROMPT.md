# 换电脑继续迭代 ANS 官方宣传片的交接提示词（直接复制粘贴给 AI）

```markdown
请先完整阅读以下三个核心复利文件，恢复上下文后再开始本轮视频迭代：
1. `.agents/skills/ans-brand-film-live-tour/SKILL.md`（ANS 官网实机导览宣传片 6 大不可妥协复利铁律与工程说明）
2. `.agents/skills/mg-styles-15/SKILL.md`（纯代码动态设计与确定性逐帧渲染管线规范）
3. `.agents/skills/mg-styles-15/demos/ans-brand-film/clauses_timeline.json` 与 `.agents/skills/mg-styles-15/demos/ans-brand-film/index.html`（当前 121.96 秒、3659 帧 @ 1080p 30fps 成片的完整时间轴与渲染源码）

### 必须严格保持的 6 条基线红线（绝不可回退）：
1. **品牌与吉祥物铁律**：`ANS` 唯一官方全称是 `AI Never Stops`（主站 `https://ans.cauai.fun`），吉祥物必须使用真实薄荷绿圆胖小恐龙 `assets/mascot/ans-mascot.png` 及官方负空间三角 `ANS` 标志。
2. **纯净单行字幕 & 口播=字幕 100% 逐字完全一致**：
   - 底部字幕栏内严禁加任何多余标签（严禁出现 `DRAMA-3` 徽章、音波柱或顶部 `▼` 指针），只显示单行居中字幕；
   - `Fish Audio Drama-3`（`reference_id = "44c1d8be3ac24722b7f6dcbeafefeb5a"`）念出的语音 (`tts`) 与画面底部字幕 (`text`) 必须 100% 逐字完全一致（由 `demos/ans-brand-film/gen_audio.py` 生成并写入 `clauses_timeline.json` 和 `timeline_data.js`）。
3. **黑名单项目零出现**：严禁展示任何个人半成品或已下架项目（`念念*`、`简历`、`个人作品集`、`小恐龙 3D`、`AI 科普短剧`、`VibePhoto`、`知微影像`、`无限画布`、`Image2`、`视频定制`、`商业视频`）。
4. **6 大真站高光板块实机导览**：
   - Ch 1 项目广场 (`/explore`)：切换 `全部` → `学习成长` → `GitHub 宝藏` → `效率与生活` 分类并向下平滑滚动展示高星开源项目；
   - Ch 2 `VibeHub` (`/vibe-hub`)：切换 `AI 54` → `前端 146` → `设计风格 24` 向下滑动浏览真实设计风格范例，并切入 `课程` 与 `练习`；
   - Ch 3 & Ch 4 专属 3D 小恐龙 Agent（基于已预缓存的 `assets/tour/dino_00.webp`..`dino_35.webp` 零卡顿序列）：聚焦右下角连点 3 下放大进入近景互动台 → 抽 3 下鞭子触发超频敲代码 → 盲盒投喂 3 次零食拉满好感度 → 打开 3D 衣橱切换 Tripo 喷射套装与 UR 满配神装 360° 旋转预览（保持浮动横幅在左上角，底部按钮 100% 无遮挡）；
   - Ch 5 ANS 市场 (`/market`)：聚焦「发布我的项目或服务」，介绍平台主动推流曝光与完善交易环境；
   - Ch 6 社群与大赛 (`/teams`, `/competitions`, `/competitions/agrihackathon`, `/hubs`)：社群交换需求与组队参赛、盘点黑客松/AIGC 大赛、举办农客松、支持各高校 Hub 入驻（首站中国农业大学 `CAUHub`）。
5. **Screen Studio 级商业动态聚焦**：全片随口播节奏保持平滑的光学镜头推拉缩放 (`zoom`)、焦点跟随 (`focusX, focusY`)、带吸顶导航栏的网页滚动 (`scrollY`) 与鼠标点击波纹。
6. **瑞士风 60 分合格版同款 Lo-Fi BGM**：保持 `assets/sfx/lofi-study_fassounds.mp3` 自动人声闪避混音（`-15.0 LUFS / <= -1.5 dBTP`）。

### 迭代工作流要求：
- 每次修改完 `demos/ans-brand-film/index.html` 或 `gen_audio.py` 后，**先运行静帧抽检命令**：
  `node harness/render.mjs demos/ans-brand-film --stills=9.0,23.0,36.0,46.5,53.0,61.0,68.5,76.0,98.5,105.0,119.5 --motion-blur=1`
- 将抽出的 1080p 静帧展示给我确认无误后，再运行完整视频渲染：
  `node harness/render.mjs demos/ans-brand-film --audio=demos/ans-brand-film/out/audio.wav --motion-blur=1`

现在，我本轮想继续优化的具体需求是：
【在这里写你接下来想调整的细节】
```
