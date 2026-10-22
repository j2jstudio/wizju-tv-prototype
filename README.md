# wizju TV 交互原型 v0.3（多源导航）

只用来验证 TV 端（Android TV / tvOS）的交互和 UI，正式产品用 Flutter（对照见 PORTING.md）。

- 开发：`npm install && npm run dev`；构建：`npm run build` → `dist/index.html`（单文件、相对路径，可放到 GitHub Pages 等任何静态托管，也可以直接用 file:// 打开）
- 遥控器：方向键 = 方向键，Enter = OK（长按 ≥600ms = 收藏），Esc/Backspace = 返回，0–9 = 选台（直播播放中），H = 显示/隐藏按键提示，P = 切换 Android TV / tvOS
- 真机 TV 浏览器：支持 keyCode 4/461/10009、GoBack/BrowserBack、浏览器历史返回（popstate）作为返回；13/23 作为确认
- v0.3 多源导航（wizju-tv-source-nav-v0.3.md）：左侧导航 = 源类型（首页 / IPTV〔M3U + Stalker〕/ Emby / Xtream / 其他〔Jellyfin / Plex / 本地媒体〕/ 搜索 / 设置，没有源的类型不显示）；内容区顶部二级行 = 当前源按钮 + 分类 Tab + 时钟；源按钮确认 → 左侧滑出源列表。两种风格（P 键）都用这套布局
- 添加源：配对页源类型 = Xtream Codes / M3U URL / Stalker Portal / Emby / Jellyfin；Plex 不走配对，在“其他”源面板选“＋ 添加 Plex” → 设备关联页（4 位代码 + plex.tv/link，Mock，返回关闭）
- 按需加载：导航项 / 分类 Tab 聚焦停留 300ms 才切换并加载内容，300ms 内离开即取消（快速扫过不加载）；频道行和海报只在进入屏幕时才加载（其余画骨架）。加载记录在 `window.__wzLoads`
- Mock 源：IPTV 5 个（M3U：家里的M3U / 体育专线 / 本地文件.m3u / 备用源〔连接失败〕；Stalker：Ministra 门户）、Emby 2 个（家庭影院〔电影 剧集 音乐〕/ 公司NAS）、Xtream 2 个（星河 IPTV / 环球TV Plus）、其他 3 个（Jellyfin 书房 / Plex 媒体库 / U 盘 · 电影〔本地媒体〕）
- URL 参数：`?fresh=1`（忽略本地存档）、`?paired=1|0`、`?platform=tvos|android`、`?hints=0`、`?autopair=0`、`?livemerge=1`（M3U / Xtream / Stalker 合并为一个“IPTV”，设置 › 导航模式“IPTV/Xtream 分开 | 合并为 IPTV”也可切换）、`?types=iptv,emby`（只保留这些类型的源）、`?srcs=iptv-home,local-1`（只保留这些 id 的源）、`?nosrc=1`（没有任何源）
- 脚本：`node scripts/shots.mjs`（截图，需要先 `npx vite preview --port 4173`）、`node scripts/behavior.mjs`（交互断言）
