# 技术架构与逻辑设计 (Architecture & Logic)

本项目采用了一种非线性的、基于**条件组态 (Configuration)** 的逻辑架构，而非简单的加权求和。这种设计更贴近社会科学中的 QCA (Qualitative Comparative Analysis) 思维。

## 1. 逻辑流转 (Logical Flow)

本项目的核心逻辑已从 Python (Streamlit) 完整迁移至 JavaScript (Vanilla JS)，以适配 GitHub Pages 的静态托管需求。

### 阶段 I：门户分流 (Diversion)
- **输入**: `Q1` & `Q2`
- **逻辑**: 通过 `routing_matrix` 将回答组合映射到 6 个不同的**组态 (Configurations)**。

### 阶段 II：组态深度测验 (Configuration-specific Quiz)
- **逻辑**: 加载对应组态的专属题目。

### 阶段 III：复合计分与干预 (Scoring & Intervention)
- **加权计分**: 题目选项对不同歌曲有不同的 `scores` 权重。
- **一票否决 (Trigger Logic)**: 如果选项包含 `trigger` 字段，系统将无视所有积分，直接命中该 `trigger` 对应的歌曲。
- **平局裁决**: 采用 `entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))` 进行确定性裁决。

## 2. 数据驱动模型

### 数据加载 (`src/logic.js`)
使用原生 `fetch` API 实现单数据源高性能加载：
- `questionbank.json`: 权威题库（合并了历史补充内容）
- `歌曲iframe.md`: 媒体映射表

## 3. 响应式视图渲染 (`src/main.js`)

应用采用单页应用 (SPA) 架构，通过状态机管理 `view` (welcome/quiz/result)：
- **转场引擎**: `transitionView` 函数驱动，实现 0.5s 的电影感缩放淡入淡出。
- **视觉方案**: 3D 倾斜轨道系统 + 呼吸星云 + 动态流星 + 深度毛玻璃卡片。
- **媒体渲染**: 针对 B 站嵌入视频进行正则清洗，动态注入 `autoplay=1` 并确保 16:9 响应式比例。

## 4. 扩展性设计

- **数据合并**: `mergeConfigs` 函数实现了配置项的深度合并（补充题库优先级更高）。
- **静态部署**: 无需后端，直接通过 GitHub Pages 即可实现高性能交付。
