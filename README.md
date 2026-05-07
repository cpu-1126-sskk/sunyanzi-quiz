# ✨ 寻找克卜勒 (Finding Kepler)

> **“在繁星之下，找寻那首刻在你性格里的燕姿。”**

这是一个纯前端构建的交互式性格测验应用。它不仅是一个简单的问卷，更是一场关于孙燕姿音乐作品与生存哲学的深度对话。

![Project Preview](https://raw.githubusercontent.com/placeholder-path/preview.png)

## 🌟 核心亮点 (v2.0)

- **非线性计分引擎**: 引入指数级步长映射 [0, 1.5, 3, 6, 10]，通过“全维度共振”算法彻底消除数据塌陷，生成极具个性化的尖锐雷达图。
- **3D 宇宙美学**: 深度优化的 3D 开普勒轨道系统、脉冲星云与动态流星，配合 720px 黄金宽度与电影感毛玻璃转场。
- **全量曲目对齐**: 深度覆盖孙燕姿全时段 33 首经典曲目，支持自动化资产清洗与音频鲁棒性解析。
- **移动端全适配**: 针对手机触控热区（60px）与垂直视口（100vh）进行的像素级 UI 重构。

## 🛠️ 技术栈

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), CSS3
- **Data Architecture**: JSON & Markdown
- **Logic Engine**: `src/logic.js` (Pure JS implementation of the scoring logic)

## 🚀 快速开始

### 1. 本地运行
由于使用了 ES Modules，建议在本地启动一个简单的 Web Server（如 VS Code Live Server 或 Python HTTP Server）：
```bash
# 使用 Python 快速启动
python -m http.server 8000
```
然后在浏览器访问 `http://localhost:8000`。

### 2. 部署到 GitHub Pages
只需将代码推送到 GitHub 仓库，并在仓库设置中开启 GitHub Pages 功能，指向根目录即可。

## 📂 项目结构

```text
├── index.html          # 主入口文件（已适配 SEO/OpenGraph）
├── src/
│   ├── main.js         # 视图控制与电影感转场调度
│   ├── logic.js        # 核心逻辑与单数据源加载
│   └── style.css       # 3D 星空背景与毛玻璃样式
├── questionbank.json   # 权威题库数据
├── 歌曲iframe.md       # B站音频嵌入维护表
└── assets/             # 已优化的专辑封面资源 (.jpg)
```

## 🔧 维护指南

### 新增歌曲/音频
1. 在 `歌曲iframe.md` 中按格式追加一行：`歌名：<iframe>...</iframe>`。
2. 确保歌名与 `questionbank.json` 中的 `song_database` 键名一致。

### 修改题库
- 编辑 `questionbank.json` 或在 `补充.json` 中添加覆盖项。
- 支持 `trigger`（一票否决）字段，可直接锁定特定结果。

## 📄 开源协议
本项目仅供学术交流与粉丝娱乐使用，音乐版权归原作者及唱片公司所有。
