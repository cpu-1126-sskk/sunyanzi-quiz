# 寻找克卜勒 (Finding Kepler) - Streamlit Personality Quiz

## 技术架构
- **核心框架**: Streamlit (Python 3.x)
- **业务逻辑**: `logic.py` (处理题库加载、路由计算与最终计分)
- **数据存储**: 
  - `questionbank.json`: 核心题库（全局题、路由矩阵、组态配置）
  - `补充.json`: 动态扩展题库（与 `questionbank.json` 合并）
- **媒体资源**:
  - `assets/`: 专辑封面/图片资源
  - `歌曲iframe.md`: Bilibili 音频嵌入标签维护文件
- **UI 设计**: `app.py` 中内置自定义 CSS，采用深色星空主题。

## 核心指令
- **运行应用**: `streamlit run app.py`
- **依赖安装**: `pip install -r requirements.txt`
- **逻辑测试**: `python logic.py` (执行内置沙盒测试)

## 代码规范与约定
- **数据合并逻辑**: 应用启动时会自动合并 `questionbank.json` 与 `补充.json`，后者优先级更高。
- **音频维护**: 严禁在代码中硬编码 iframe，新增曲目必须在 `歌曲iframe.md` 中以 `歌名：<iframe>` 格式添加。
- **计分权重**: `calculate_result` 处理分数值累加。若存在 `trigger` 字段，则触发一票否决，直接锁定结果。
- **UI/UX**: 保持毛玻璃（Glassmorphism）效果与 16:9 的视频比例，确保移动端适配。
- **命名规范**: 变量名及代码逻辑保持英文，前端呈现使用中文。
