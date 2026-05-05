# 寻找克卜勒 (Finding Kepler) - Web Personality Quiz

## 技术架构
- **核心框架**: HTML5 + Vanilla JavaScript (ES Modules)
- **业务逻辑**: `src/logic.js` (处理题库加载、逻辑合并与计分)
- **渲染引擎**: `src/main.js` (状态机驱动的视图切换)
- **数据存储**: 
  - `questionbank.json`: 核心题库（全局题、路由矩阵、组态配置）
  - `补充.json`: 动态扩展题库（与 `questionbank.json` 合并）
- **媒体资源**:
  - `assets/`: 专辑封面资源
  - `歌曲iframe.md`: B站音频嵌入映射表
- **UI 设计**: `src/style.css` 采用深色星空 + 毛玻璃（Glassmorphism）风格。

## 核心指令
- **本地预览**: `python -m http.server 8000` (或使用任意静态服务器)
- **部署发布**: 推送至 GitHub 仓库，通过 GitHub Pages 自动部署。

## 项目文档
- [README.md](README.md): 项目概览与快速开始
- [docs/architecture.md](docs/architecture.md): 深度架构解析（逻辑流与数据模型）

## 代码规范与约定
- **架构模式**: 纯前端静态应用，禁止引入 Node.js 或 Python 后端运行时。
- **数据加载**: 必须通过 `fetch` 异步获取资源，路径保持相对关系以适配子路径部署。
- **音频维护**: 新增曲目必须在 `歌曲iframe.md` 中以 `歌名：<iframe>` 格式添加。
- **UI/UX**: 强制 16:9 比例，确保移动端视觉体验一致。
