# 换电脑继续推进 ANS 视频工程的交接提示词（含「p5.brush 手绘双主角动画 V4.6」与「官网实机导览 60分基线」双管线）

---

## 提示词 A：继续推进「`ClaudeAnimationBase` (`p5.js` + `p5.brush`) 双主角手绘水彩动画（V4.6 定稿基线）」

在新电脑打开 `ans-brand-film-studio`（或 `ClaudeAnimationBase`）工作区后，直接复制以下提示词发给 AI：

```markdown
请先完整阅读以下核心文件，恢复 ANS (AI Never Stops, https://ans.cauai.fun) 手绘水彩动画工程上下文：
1. `.agents/skills/ans-p5-brush-cartoon-animation/SKILL.md`（必读：V4.6 双主角定稿几何规范、历史踩坑红线与复利工作流）
2. `ClaudeAnimationBase/src/ans_chars.js`（V4.6 定稿双主角绑定源码：`dino` 宽胖圆滚站立小恐龙 + `creator` 独立开发者主理人“我”）
3. `ClaudeAnimationBase/src/scenes/ans_day01.js` 与 `ClaudeAnimationBase/STORYBOARD.md`（`🟢 Day 01 / 28 · ANS 正式上线` 15 秒 5 幕完整分镜实现）

### 一、 已定稿并严禁回退的双主角造型规范（V4.6）
1. **ANS 小恐龙 `dino(x, y, u, o)`**：
   - 采用 V4.6 宽胖圆滚团子比例（大脑门与饱满婴儿肥脸颊 `rx = 4.88u`、宽厚圆身体 `rx = 4.82u`），**严禁做成「头小肚子大」的梨形或偏瘦细长身形**；
   - 保持双脚稳稳站立，内侧裆部弧线压低至 `-1.12u`，露出**短粗圆润、外侧带小鸡腿弧度的小胖短腿与宽脚掌**（严禁腿太长）；
   - 头顶 3 个圆润凸起使用 `arcContourPts` 开放圆弧无缝融合额头（底部无封口黑线），奶白下脸颊贴片（`rx = 3.68u`）与奶白圆肚皮（`rx = 3.08u`）上下呼应，小短手根部开放式融入肩部（`x = ±4.38u, y = -4.55u`），小尾巴低位上翘（`y = -2.48u..-1.02u`）。
2. **主理人 / “我” `creator(x, y, u, o)`**：
   - 参照站内真实照片还原**上宽下收的干净青年下颌线（`creatorFacePts`）**、高鼻梁线条（严禁在鼻头正中画紫色圆球贴纸）、右脸颊小巧蓝色五角星贴纸；
   - 自然蓬松黑发 + 微中分碎刘海，正中分缝上拱露出**上宽下收大黑框眼镜的双横梁与中间镂空（`眼镜中间是两个横杠，上面还有一个，中间中空`）**；
   - 头顶簇拥 **4 朵深裂圆瓣、色彩鲜明的花朵**（左上珊瑚粉五瓣牡丹 `#FF7096`、正顶明黄六瓣万寿菊 `#FFC72C`、右上天蓝四瓣绣球 `#5CB8FF`、最右薰衣草紫五瓣小花 `#C084FC`），叶片向上斜插在花朵后方（严禁向左右水平伸出成绿帽檐状）；
   - 白色圆领短袖 T 恤正胸前清晰印有手绘墨线 **`ANS`** 字样与薄荷绿底线。

### 二、 常用渲染与验证命令（在 `ClaudeAnimationBase/` 目录下执行）
- 渲染双主角 6 态设定图：`node render.mjs --loop=ans_sheet --sheet=0.4 --cols=1 --w=1280 --out=out/check/ans_chars_sheet.jpg`
- 渲染 5 幕关键帧静帧图：`node render.mjs --stills=1.8,4.6,7.6,10.5,13.6 --out=out/ans_day01_stills`
- 渲染 720p · 24fps 完整视频：`node render.mjs --out=out/ans_day01_720p.mp4`

现在请基于这套 V4.6 定稿双主角与工作流继续推进：
【在这里输入你要推进的具体任务，例如：渲染成片并配音 / 调整某一幕分镜细节 / 制作 Day 02 视频】
```

---

## 提示词 B：继续推进「ANS 官网实机导览宣传片（60分及格基线，待深度优化）」

```markdown
请先完整阅读当前工程内的以下核心文件，恢复上下文后再开始本轮视频迭代：
1. `.agents/skills/ans-brand-film-live-tour/SKILL.md`（必读：当前 60 分基线版的 6 条底线红线 + 已知核心问题清单）
2. `.agents/skills/mg-styles-15/demos/ans-brand-film/clauses_timeline.json` 与 `index.html`（当前 121.96 秒、3659 帧 @ 1080p 30fps 成片的完整时间轴与渲染源码）

当前 `demos/ans-brand-film/out/ans-brand-film-1080p.mp4`（121.96 秒）仅达到 60 分及格线。请在严格保留 6 条底线要求（品牌全称 `AI Never Stops`、纯净单行字幕与 `Fish Audio Drama-3` 口播 100% 逐字对齐、黑名单项目零出现、6 大真站板块覆盖、动态鼠标聚焦、瑞士风同款 Lo-Fi BGM 闪避混音）的前提下，重点攻关 `SKILL.md` 中列出的画中画外框冗余、高帧率交互质感与镜头节奏问题。
```
