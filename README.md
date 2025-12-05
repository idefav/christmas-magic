# 🎄 Christmas Magic - 圣诞魔法

一个基于 Three.js 和 MediaPipe 的 3D 圣诞树粒子特效项目，支持手势交互控制。

## ✨ 功能特性

- 🌟 **粒子圣诞树** - 2500+ 金色粒子组成的 3D 圣诞树，带有层次感和树干
- 🎁 **圣诞礼包** - 20个不同颜色和大小的 3D 礼包漂浮在树中
- 📷 **照片墙** - 15张照片随机分布在粒子中，可点击放大
- ⭐ **闪烁星星** - 树顶星星 + 背景星空 + 离散闪烁粒子
- 🖐️ **手势控制** - 通过摄像头识别手势进行交互
- 💫 **物理效果** - 粒子具有惯性、重力、阻尼等物理特性
- 🌸 **Bloom 特效** - 后处理发光效果

## 🎮 手势控制

| 手势 | 功能 |
|------|------|
| ✋ **张开手掌** | 旋转圣诞树（带惯性）+ 远近缩放（手靠近放大，远离缩小）|
| ☝️ **食指指向** | 选择照片（悬停 0.5 秒放大）|
| 🤏 **捏合** | 缩放视图（带惯性）|
| ✊ **握拳** | 粒子变成球形 |
| ✌️ **V字手势** | 爆炸/聚合粒子 |
| 🖱️ **鼠标点击** | 点击照片放大 |

## 🚀 快速开始

### 方式一：使用 VS Code Live Server

1. 在 VS Code 中安装 **Live Server** 扩展
2. 右键点击 `index.html`
3. 选择 **Open with Live Server**
4. 浏览器自动打开 `http://127.0.0.1:5500`

### 方式二：使用 Python HTTP Server

```bash
# Python 3
cd christmas-magic
python -m http.server 8080

# 然后打开浏览器访问
# http://localhost:8080
```

### 方式三：使用 Node.js

```bash
# 安装 http-server（如果没有）
npm install -g http-server

# 运行
cd christmas-magic
http-server -p 8080

# 访问 http://localhost:8080
```

### 方式四：使用 PowerShell 简易服务器

```powershell
cd christmas-magic
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Server running at http://localhost:8080"
# 按 Ctrl+C 停止
```

## ⚠️ 重要说明

1. **必须使用 HTTP 服务器**
   - 不能直接双击 `index.html` 打开
   - 因为需要加载 ES 模块和摄像头权限

2. **需要摄像头权限**
   - 首次打开时浏览器会请求摄像头权限
   - 请点击"允许"以启用手势控制

3. **推荐浏览器**
   - Chrome (推荐)
   - Edge
   - Firefox

4. **HTTPS 要求**
   - 如果部署到远程服务器，需要使用 HTTPS
   - 本地 localhost 可以使用 HTTP

## 📁 项目结构

```
christmas-magic/
├── index.html      # 主 HTML 文件，包含着色器代码
├── style.css       # 样式文件
├── script.js       # 主要 JavaScript 逻辑
└── README.md       # 项目说明
```

## 🛠️ 技术栈

- **Three.js v0.160.0** - 3D 渲染引擎
- **MediaPipe Hands** - 手势识别
- **GLSL** - 自定义粒子着色器
- **ES Modules** - JavaScript 模块化

## 🎨 自定义配置

在 `script.js` 中可以修改 `CONFIG` 对象来调整效果：

```javascript
const CONFIG = {
    tree: {
        particleCount: 2500,  // 粒子数量
        height: 4,            // 树高度
        baseRadius: 1.5,      // 底部半径
    },
    physics: {
        gravity: -0.0003,     // 重力
        damping: 0.95,        // 阻尼
        returnForce: 0.008,   // 回归力
    },
    bloom: {
        strength: 1.5,        // 发光强度
        radius: 0.4,          // 发光半径
    },
    // ...
};
```

## 🐛 常见问题

### Q: 手势识别不工作？
- 确保已允许摄像头权限
- 检查光线是否充足
- 保持手在摄像头可见范围内

### Q: 页面空白？
- 确保使用 HTTP 服务器而非直接打开文件
- 检查浏览器控制台是否有错误
- 确保网络可以访问 CDN 资源

### Q: 性能卡顿？
- 降低 `CONFIG.tree.particleCount` 粒子数量
- 降低 `CONFIG.bloom.strength` 发光强度
- 关闭其他占用资源的程序

## 📜 许可证

MIT License

---

🎅 **Merry Christmas!** 🎄
