# ClubMatch 网页 MVP（可演示）

纯静态页面（HTML / CSS / JS），对应 `docs/PRD.md` 中的四 Tab 与「一键投递」主流程。**AI 匹配理由、自荐信、小助手回复**均为前端演示逻辑，非真实大模型。

## 本地预览（任选一种）

### 方式 A：直接打开（推荐先试）

在访达中找到 `web/index.html`，**双击**用默认浏览器打开；或双击 **`打开预览.command`**（macOS）；或在终端进入 `web` 后执行 `open index.html`。

（已去掉 ES Module，一般不再出现「无法加载模块」空白页。）

### 方式 B：本地 HTTP 服务

若仍遇到跨域或扩展拦截，可在 `web` 目录启动：

```bash
cd web
python3 -m http.server 8080
```

浏览器打开：<http://localhost:8080/>

---

## 线上部署（让所有人能访问）

站点根目录为 **`web/`**（内含 `index.html`），任意支持**纯静态托管**的平台均可。

### 方式 A：GitHub Pages（免费）

1. 在 [GitHub](https://github.com) 新建仓库，把本仓库（含 `web/` 与 `.github/workflows/`）推上去。
2. 打开仓库 **Settings → Pages**。
3. **Build and deployment** 里 **Source** 选 **GitHub Actions**（不要选 Deploy from a branch）。
4. 把默认分支命名为 **`main`**（或修改工作流里分支名与之一致），推送后 Actions 会自动跑 **Deploy to GitHub Pages**。
5. 几分钟后，在 **Settings → Pages** 可看到地址，一般为：  
   `https://<你的用户名>.github.io/<仓库名>/`

> 若首页空白，请检查是否用了 **Project site** 子路径；本项目的 CSS/JS 使用相对路径，子路径下可正常加载。

### 方式 B：Netlify（免费，可拖拽）

- **Git 连接**：导入仓库，**Base directory** 填 `web`，**Publish directory** 填 `.`（或留空与 base 相同）。  
- **无 Git**：打开 [Netlify Drop](https://app.netlify.com/drop)，把 **`web` 文件夹打包成 zip** 拖进去即可。

### 方式 C：Vercel（免费）

- 导入 Git 仓库后，在 **Root Directory** 选 **`web`**，Framework Preset 选 **Other**，无需构建命令。

### 方式 D：Cloudflare Pages（免费）

- 连接仓库，**Build output directory** 填 **`web`**（若从仓库根构建则填 `web`；或把构建命令留空、根目录指到 `web` 按面板说明填写）。

---

## 功能对照 PRD

| Tab | 说明 |
|-----|------|
| **匹配** | 社团卡片 + 匹配理由气泡；按钮无感 / 收藏 / 详情；支持拖拽滑走 |
| **发现** | 双列 Feed、社团/新生筛选、热度与类别筛选、热帖区、帖子关联社团主页 |
| **消息** | 置顶「招新小助手」，随机演示回复；投递后与对应社团线程 |
| **我的** | 可翻面名片（MBTI）、碎碎念与 AI 简历、申请进度条 |

投递：匹配页或 Feed 社团详情 →「感兴趣 · 一键投递」→ 编辑 AI 自荐信 → 确认发送 → 跳转消息 Tab 并插入会话。
