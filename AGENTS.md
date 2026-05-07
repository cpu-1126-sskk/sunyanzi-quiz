# AGENTS.md - Agent Shared Context

## 项目背景 (Context)
- **名称**: 寻找克卜勒 (Finding Kepler)
- **主题**: 孙燕姿 (Sun Yanzi) 性格测验
- **调性**: 媒介文化研究背景、批判性视角、高审美要求的 Web 应用。
- **关键逻辑**: 门户题分流 -> 组态深度测验 -> 积分/触发计分。

## 核心约定 (Protocol)
- **UI 风格**: 必须保持 Dark Mode + Starry Sky + Glassmorphism。
- **技术栈**: 纯前端静态 (Vanilla JS + ES Modules)。
- **计分模型**: 指数级加速映射 [0, 1.5, 3, 6, 10]，支持反向测项。
- **音频处理**: 必须通过 `歌曲iframe.md` 注入，支持带反引号的 Markdown 格式。

## 已知事实
- **架构版本**: v2.0 (2026-05-07) 全量发布。
- **测项规模**: 32 道陈述句 Likert 量表，抽样 12 题。
- **曲目规模**: 33 首孙燕姿全量经典，已完成 iframe 挂载。
- **UI 特色**: 3D 倾斜开普勒轨道 + 响应式黄金对齐排版 (720px max-width)。
- **部署状态**: 已推送到 GitHub `sunyanzi-quiz` 仓库。

## 待办与计划 (Backlog)
- [ ] 增加更多歌曲的 iframe（如新单曲发布）。
- [ ] 探索 Canvas 生成的高清分享卡片导出。
- [ ] 适配移动端更高刷新率的 CSS 优化。
