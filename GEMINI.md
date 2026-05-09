## 技术架构
- **核心框架**: HTML5 + Vanilla JavaScript (ES Modules)
- **业务逻辑**: `src/logic.js` (指数级得分映射 [0, 1.5, 3, 6, 10], 影子权重 0.1)
- **渲染引擎**: `src/main.js` (300px 视口, GPU 視差加速, 3.6s 劳动幻觉转场逻辑)
- **音频系统**: Web Audio API (55Hz Sine + Brown Noise) 实现心流包裹与听觉真空。
- **数据存储**: `questionbank.json` (32道全量题库, 12+1 抽样逻辑)
- **分享引擎**: html2canvas + 离屏 Canvas (scale: 2, 1080x1920 固屏比例)
- **媒体资源**:
  - `assets/`: 专辑封面资源（已优化为 .jpg 格式）
  - `歌曲iframe.md`: 鲁棒性 B 站音频嵌入映射表 (含音频跳转兜底)
- **UI 设计**: 720px 黄金阅读宽度, 60px 触控热区, 电影感毛玻璃转场, SEO/OG 全链路适配。

## 核心指令
- **本地预览**: `python -m http.server 8000`
- **部署发布**: `git push origin main` (自动触发 GitHub Pages)
- **SEO 校验**: 确保 index.html 包含最新的 og:title 与 og:description。

## 代码规范与约定
- **得分逻辑**: 严禁改动 `[0, 1.5, 3, 6, 10]` 映射，这是确保星图尖锐度的数学基础。
- **资产加载**: 新增封面必须使用 `findAsset` 包装器处理。
- **响应式**: 移动端强制 100vh 垂直居中布局。
