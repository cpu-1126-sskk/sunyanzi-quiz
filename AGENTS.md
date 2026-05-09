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
- **架构版本**: v2.1 (2026-05-09) 性能与传播链路深度优化版。
- **测项规模**: 32 道陈述句 Likert 量表，抽样 12+1 题（含 Ipsative 迫选题）。
- **音频体系**: Web Audio API 生成的太空中低频白噪音 + B站 iframe 映射 + 兜底跳转。
- **渲染黑科技**: 3.6s 劳动幻觉 (Labor Illusion) 转场 + 1.2s 听觉真空 (Vacuum)。
- **分享链路**: html2canvas 离屏渲染 (1080x1920) + 动态稀有度打标 + SEO/OG 全链路适配。

## 待办与计划 (Backlog)
- [ ] 接入微信 JS-SDK 实现自定义分享缩略图（需备案域名）。
- [ ] 探索基于 WebGL 的更平滑的星云累积渲染算法。
- [x] 探索 Canvas 生成的高清分享卡片导出。
- [x] 适配移动端更高刷新率的 CSS 优化。
