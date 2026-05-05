# AGENTS.md - Agent Shared Context

## 项目背景 (Context)
- **名称**: 寻找克卜勒 (Finding Kepler)
- **主题**: 孙燕姿 (Sun Yanzi) 性格测验
- **调性**: 媒介文化研究背景、批判性视角、高审美要求的 Web 应用。
- **关键逻辑**: 门户题分流 -> 组态深度测验 -> 积分/触发计分。

## 核心约定 (Protocol)
- **UI 风格**: 必须保持 Dark Mode + Starry Sky + Glassmorphism。
- **技术栈**: 纯前端静态 (Vanilla JS + ES Modules)。
- **数据维护**: 逻辑代码与题库内容必须分离。优先修改 JSON/MD。
- **音频处理**: 必须通过 `歌曲iframe.md` 注入，不允许在 JS 中硬编码。

## 已知事实
- **架构迁移**: 2026-05-04 确认已从 Streamlit (Python) 全面迁移至纯前端 Web 架构。
- **数据加载**: `src/logic.js` 使用 `fetch` 动态加载 `questionbank.json`、`补充.json` 和 `歌曲iframe.md`。
- **部署方式**: 适配 GitHub Pages 静态部署。
- `questionbank.json` 与 `补充.json` 目前内容一致，后者作为运行时合并源。
- 视频比例强制 16:9，背景使用 `radial-gradient` 模拟星空。
- **文档体系**: 2026-05-04 完成了从 Claude (CLAUDE.md) 向 Google/Gemini (GEMINI.md) 生态的全面迁移。

## 待办与计划 (Backlog)
- [ ] 优化 `questionbank.json` 与 `补充.json` 的冗余问题。
- [ ] 增加更多歌曲的 iframe。
- [ ] 适配移动端更高刷新率的 CSS 优化。
