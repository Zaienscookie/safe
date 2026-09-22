# 网络安全社 · 纳新网站（AI 接管与维护手册）

> 本文件是**给其他 AI 或开发者快速接管此项目的完整说明书**。
> 阅读后应当能独立完成：理解架构 → 修改文案/链接/页面 → 本地运行 → 部署到任意静态服务器。
> 请先读完「目录结构」与「核心机制」，再做修改。

---

## 1. 项目是什么

一个「网络安全社团纳新宣传」的纯静态多页网站，科幻/暗色极客风（黑灰 + 橙色高亮）。

- **主站** `index.html`：进入页 → 授权过场（手动点「下一步」→ 首页）→ 六大栏目（首页 / 关于 / 纳新 / 方向 / 活动 / 互动），单页内 JS 切换屏幕；
- **多个子页面**：方向详情、荣誉殿堂、培养体系、加入我们、内部提示、技术人格问卷、FLAG 挑战；
- **手势粒子互动**：摄像头 + MediaPipe 识别手势，驱动 26000 个 3D 粒子变化造型（仅电脑端，手机端禁止）。

## 2. 技术栈与运行性质（重要）

| 项 | 说明 |
|---|---|
| 语言 | 原生 HTML5 + CSS3 + JavaScript（无框架、无构建步骤） |
| 3D | Three.js 0.160（ES Module，本地 `lib/three/`，CDN 兜底） |
| 手势 | MediaPipe Hands（本地 `lib/mediapipe/`，CDN 兜底） |
| Logo 动画 | lottie-web（CDN，失败时回退静态图） |
| 后端 | **无后端 API、无 AJAX**（仅一个探测内网靶场可达性的 `fetch`） |
| 存储 | **无 localStorage / Cookie**，刷新页面即回到进入页（纯静态无痕） |
| 摄像头 | 手势粒子必须经 **http://localhost 或 HTTPS** 访问（`file://` 会被浏览器拒绝） |
| 架构 | 完全静态文件，任何静态服务器 / Nginx / GitHub Pages / Vercel 均可托管 |

## 3. 快速本地运行

```bat
双击 start.bat
```
- 自动用 PowerShell 启动零依赖 HTTP 服务器（`server.ps1`，随机空闲端口）并打开浏览器；
- 手机测试：请先在浏览器地址栏用 `http://127.0.0.1:端口` 访问（需要 **横屏** + 关闭强制访问守卫见第 8 节）。

不依赖服务器也能打开除「互动」外的所有页面：直接双击 `index.html` 等文件。

## 4. 部署上线（服务器）

本目录所有文件都需原样上传（保持相对路径）。推荐方式：

1. **Nginx / Apache / 任意静态托管**：把本目录内容作为网站根目录，直接服务即可。
2. **自托管**：把 `server.ps1` + 目录放服务器，`start.bat` 或手动运行 `server.ps1`。它监听 `127.0.0.1:随机端口`，如需对外开放请改 `TcpListener(..., 0)` 中的 `0` 为固定端口并监听 `[IPAddress]::Any`。
3. **GitHub Pages / Vercel / Netlify**：上传根目录即可（纯静态）。

**部署注意事项**：
- 手势粒子需要 **HTTPS 或 localhost** 才能用摄像头；对外线上请配置 HTTPS。
- `assets/images/qrcode.jpg` 是招新微信群二维码；`server.ps1` 已支持 `.svg/.mp4/.jpg` 等 MIME，Nginx 等默认即可。
- `.gitignore` 不存（此目录未初始化 git）；`lib/` 是离线依赖，务必一并上传。

## 5. 目录结构（逐项说明）

```
网络安全社纳新/
├─ index.html                # 主站：进入页→授权→首页→六大栏目（单页多屏）
├─ direction.html            # 方向详情页（?d=web|rev|pwn|cry|ops）
├─ honors.html               # 战绩·荣誉殿堂
├─ training.html             # 学习·训练 / 培养体系（活动“查看纳新安排”也打开它）
├─ join.html                 # 加入我们（手机号 185 1818 4798 + 微信群二维码）
├─ notice.html               # 内部提示页（社团仓库 / 靶场失败时使用）
├─ quiz.html                 # 极客技术人格问卷（单文件纯前端）
├─ flag.html                 # FLAG 挑战（源码注释藏 flag，提交校验）
├─ start.bat                 # 本地启动入口
├─ server.ps1                # 零依赖静态 HTTP 服务器（含 MIME、剥离 ?query）
├─ README.md                 # 本手册
├─ assets/
│  └─ images/
│     ├─ qrcode.jpg          # ★ 招新微信群二维码（Logo 图不能删）
│     ├─ backgrounds/        # 关于/活动背景图
│     ├─ cards/character/    # 纳新轮播 6 张人物卡
│     └─ ui/icon/            # 首页图标（icon-wechat.svg 微信、icon-flag.svg FLAG 等）
├─ lib/                      # ★ 离线依赖，必须随站点部署
│  ├─ three/three.module.js
│  └─ mediapipe/             # 手势模型 + wasm + camera_utils
└─ src/
   ├─ scripts/
   │  ├─ site-copy.js        # ★ 全站文案中心（最常改）
   │  ├─ enter.js            # ★ 主站交互引擎（屏幕切换/导航/配置）
   │  ├─ particle.js         # ★ 手势粒子模块（start/stop + 手势映射）
   │  ├─ direction.js        # 方向详情页渲染（读 ?d= 参数，SPA 内切换）
   │  ├─ landscape.js        # 移动端横屏守卫（竖屏遮罩强制横屏）
   │  ├─ visit-tip.js        # 访问提示弹窗（建议电脑访问）
   │  └─ rhine-logo-animation-data.js  # Logo 动画 JSON 数据
   └─ styles/
      ├─ base.css / mobile.css          # 基础变量 + 手机端兜底
      ├─ enter/auth/homepage/... css    # 各屏幕样式
      ├─ direction.css                  # 子页面通用样式（direction/honors/training/join/notice）
      └─ particle.css                  # 互动屏幕样式
```

## 6. 页面与入口关系（改链接必备）

| 主站位置 | 元素 | 打开的页面 | 配置出处 |
|---|---|---|---|
| 首页·极客问卷 | `data-quick-link="signup"` | `quiz.html` | `enter.js → quickLinkConfig.signup` |
| 首页·社团仓库 | `data-quick-link="github"` | `notice.html` | `siteConfig.links.github` |
| 首页·邮箱 | `data-quick-link="email"` | 弹窗显示邮箱 | `siteConfig.contact.email` |
| 首页·微信群 | `data-quick-link="qq"` | `join.html` | `quickLinkConfig.qq` |
| 首页·FLAG 题 | `data-quick-link="flag"` | `flag.html` | `quickLinkConfig.flag` → `links.flag` |
| 首页·进入互动体验 | `#homepage-experience` → `showParticle()` | 互动屏幕（手机端禁止） | `enter.js` |
| 关于·加入我们 | `#headquarters-enter` | `join.html` | `enter.js`（固定打开 `links.join`）|
| 方向·左侧 5 方向卡 | `is-link` 卡片 | `direction.html?d=...` | `site-copy.js department[0..4].linkKey` → `links` |
| 方向·CTF 靶场 | `is-link` 卡片 | `https://oj.zain-dev.top/` | `links.ctf` |
| 方向·靶场·实验 | `is-link` 卡片 | 先探测 `links.range`，失败→`notice.html` | `links.range` + `openRange()` |
| 方向·荣誉殿堂 | `is-link` 卡片 | `honors.html` | `links.honor` |
| 方向·学习·训练 | `is-link` 卡片 | `training.html` | `links.training` |
| 方向·报名·加入 | `is-link` 卡片 | `join.html` | `links.join` |
| 活动·查看纳新安排 | `#research-open` | `training.html` | `enter.js`（固定打开 `links.training`）|

> 任何跳转主站子页面会自动追加 `?from=栏目`，子页面“返回主站”据此回到原栏目，而非首页。

## 7. 核心机制（必须先懂）

### 7.1 主站屏幕切换（enter.js）
- 每个栏目是一个 `<section class="xxx-screen">`，靠 toggle `.is-visible` 显示；隐藏用 `opacity/visibility`，**transition 只过渡 opacity**（勿改回，否则出现“弹回欢迎页”bug）。
- 切换函数：`showHomepage / showHeadquarters / showMember / showDepartment / showResearch / showParticle`，都会先 `hideParticle()`（停止摄像头）。
- `currentSection` 记录当前栏目，`withFrom(url)` 给子页面链接加 `?from=x`；`enterSectionByParam` 处理返回时直接进对应栏目。

### 7.2 配置中心
- `enter.js → siteConfig.links`：所有跳转地址 / 联系方式集中地。
- `enter.js → quickLinkConfig`：首页 4 个快捷按钮行为（link / modal）。
- `site-copy.js → window.siteCopy`：全站文案、方向卡片数据（`department` 数组顺序 = DOM 卡片顺序）、成员简介、活动计划、标语。
- 改了文案只需改 `site-copy.js`；改了链接只需改 `siteConfig.links`。

### 7.3 手势粒子（particle.js）
- 暴露 `window.SecParticles.start()/stop()`，主站进入/离开互动栏目时调用；首次进入才加载摄像头与模型。
- 手势映射（`TEXT_LIST` 与 `updateHand`）：
  - 左手 1/2/3/4 指 → 文字：`WELCOME / 网络安全社 / 欢迎加入我们 / CTF 等你来`
  - 右手张开=扩散旋转、1指=盾牌、2指=能量爆散、握拳=爱心
- 左右手以「屏幕前用户的自拍视角」定义（MediaPipe 标签做了交换映射，勿改）。
- 已实现：手指伸直判定、防抖、`openRange` 式探测定时；**移动端禁止访问**（`showParticle` 拦截）。
- 想改粒子数量/颜色/造型：搜 `const N = 26000`、`base[]`、`makeShieldPoints`。

### 7.4 方向详情页（direction.js）
- 读取 `?d=web|rev|pwn|cry|ops`，从 `site-copy.department[0..4]` 找数据渲染标语/路线/标签/话术；
- 顶部导航为 SPA 内切换（`history.pushState`），不刷新页面。

### 7.5 移动端与安全
- `mobile.css`：820px/560px 断点，内容区可滚动、导航横排、字号收紧。
- `landscape.js`：**移动端强制横屏**，竖屏全屏遮罩拦点击。判断**仅按 UA**（触屏笔记本不会误判）。
- `visit-tip.js`：访问提示弹窗，**仅主站 index.html 引用、且仅移动端弹出**（电脑端不显示；子页面不引用）。
- 授权过场**不自动跳转**：必须点击「下一步」才进首页。
- 互动粒子：移动端一律禁止（弹“仅支持电脑端访问”）。

## 8. 使用中的注意 / 已知行为

- 手势粒子需要 **HTTPS 或 localhost + 摄像头授权**；手机端被禁止，需电脑浏览器。
- 靶场实验卡：先 `fetch` 探测 `192.168.89.28:8080`（`links.range`），4 秒超时/失败则进 `notice.html`。
- 纯静态无痕：刷新即回进入页；访问提示弹窗仅主站且仅移动端弹出。
- 移动端强制横屏（`landscape.js`）；电脑端不受影响。
- 修改 `index.html` 结构时注意 `<section>`/`<div>` 配对；`site-copy.department` 数组项必须与右侧卡片顺序一致，否则文案错位。
- 上传服务器请整目录上传（尤其 `lib/`、`assets/images/qrcode.jpg`、mp4 视频、`flag.html` 源码注释）。

## 9. 可交付清单（覆盖后即可上线）

- [ ] 替换 `assets/images/qrcode.jpg` 为真实微信群二维码（同时 `join.html` 展示）
- [ ] 确认 `siteConfig.contact.email`（当前 185...163）、`links.ctf`（OJ 靶场）、`links.range`（内网靶场）为真实地址
- [ ] 如需公开可访问，把 `links.range` 内网地址换成公网可达地址，否则用户会被引导到提示页
- [ ] 配置 HTTPS 以便摄像头粒子可用
- [ ] 整目录部署到目标服务器
