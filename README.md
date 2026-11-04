# VITROBOX

> 🎵 **VITROBOX空间悬浮歌词音箱 · 桌面先锋播放器**  
> 透明玻璃水箱、双悬浮声学振膜，支持 Spotify 极简免密 PKCE 实时曲库同步与中英双语动态歌词排版。

---

## ✨ 核心特性

- **🔮 沉浸式空间声学水箱设计**：灵感来源MORROR ART A2音响 极简透明机身、双向发声悬浮振膜与底部环境呼吸氛围光效。
- **🟢 Spotify 实时免密直连 (PKCE OAuth)**：
  - 基于 OAuth 2.0 PKCE 协议，仅需 1 个 Client ID 即可直连，无需在服务器暴露 Client Secret。
  - 独立弹窗授权架构，支持跨标签页与跨域安全回传，彻底杜绝 `X-Frame-Options` 拦截。
- **📝 多源动态聚合歌词与中英双语翻译**：
  - 聚合 LRCLIB、网易云音乐、QQ音乐歌词源。
  - 支持逐行精确毫秒级时间戳、智能拼音/英文对照及双语翻译动态平滑渲染。
- **🎨 三大先锋动态排版视觉风格**：
  - **Style A · 波普贴纸 (Pop Sticker)**：高饱和对比色块、重叠描边卡片、随节奏跳动。
  - **Style B · 瑞士排版 (Swiss Editorial)**：国际主义设计风格、非对称网格、极简优雅与留白。
  - **Style C · 悬浮雾化 (Floating Mist)**：水箱微光折射、毛玻璃弥散与柔和粒子浮现。
- **🔊 物理振膜与双悬浮环形扬声器联动**：
  - 基于 Web Audio API 的实时频域分析（FFT），重低音与人声驱动声学悬浮环产生真实物理位移与形变。
- **📂 本地音频与歌词拖拽播放**：
  - 支持直接将本地 MP3 / FLAC / WAV / M4A 及 LRC 文件拖拽至窗口直接播放。

---

## 🛠️ 技术栈

- **前端 (Frontend)**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Canvas API, Web Audio API
- **后端 (Backend)**: Node.js, Express, TypeScript (TSX)
- **协议与接口**: Spotify Web API (PKCE / OAuth), LRCLIB API, NetEase / QQ Music Lyric API

---

## 🚀 快速开始

### 1. 克隆代码仓库

```bash
git clone https://github.com/reyno2012-sudo/VITROBOX.git
cd VITROBOX
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量 (可选)

复制环境变量示例文件：

```bash
cp .env.example .env
```

可在 `.env` 中填入可选的 Spotify 配置：

```env
PORT=3000
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

> **提示**：VITROBOX 内置 PKCE 免密钥直连，即便不配置任何环境变量，也可直接在网页界面输入 Client ID 完成一键授权！

### 4. 启动开发服务器

```bash
npm run dev
```

在浏览器打开 `http://localhost:3000` 即可开始使用。

### 5. 构建生产版本

```bash
npm run build
npm start
```

---

## 🎧 Spotify 直连配置指南

1. 打开 [Spotify 开发者中心 (Dashboard)](https://developer.spotify.com/dashboard) 登录账号。
2. 点击 **Create App** 创建应用，App name 输入 `VITROBOX`。
3. 勾选 **Web API**。
4. 在 **Redirect URIs** 填入 VITROBOX 弹窗自动生成的完整回调地址（例如 `http://localhost:3000/auth/callback` 或当前部署域名加 `/auth/callback`）。回调地址不需要在播放器内手动填写。
5. 复制生成的 **Client ID**，在 VITROBOX 播放器右上角点击 Spotify 图标粘贴并点击 **【授权并开始同步歌词】** 即可完成直连！

---

## 📄 开源许可证

本项目基于 MIT 协议开源。
