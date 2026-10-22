# wizju TV 原型 → Flutter 移植对照（v0.2 + v0.3 多源导航）

原型用 React + DOM 实现，但焦点/按键/返回模型是按 Flutter 的焦点体系设计的，可以一一映射。
代码位置：`src/engine/focus.ts`（焦点树）、`src/ui/F.tsx`（组件封装）、`src/App.tsx`（按键映射、返回栈）、`src/store.tsx`（路由栈）。

## 1. 焦点树

| 原型概念 | 代码 | Flutter 对应 | 说明 |
|---|---|---|---|
| 可聚焦节点 | `<F id onOk onLong onFocus>` → `[data-fid]` | `Focus` / `FocusNode`，或 `FocusableActionDetector`（同时挂 Shortcuts/Actions、hover、focus 回调） | `onFocus` ≈ `onFocusChange(true)`；`onOk` ≈ `ActivateIntent` 的 Action |
| 分组 + 焦点记忆 | `<FGroup id mem>` → `[data-fgroup]`，`engine.memory` | `FocusTraversalGroup` + 每组一个 `FocusScope`（`FocusScopeNode.focusedChild` 就是“记忆”） | 每次聚焦都会更新所有祖先组的记忆，等同 FocusScope 链自动记录 focusedChild。`mem=false` ≈ 每次进入都 `requestFocus` 指定子节点 |
| 首次进入落点 | `def` → `data-fdefault`；`data-fentry="first"` | `Focus(autofocus: true)` / 进入时 `FocusScope.of(ctx).requestFocus(node)` | |
| 模态作用域 | `[data-fscope]`（最后一个即当前） | `ModalRoute` 自带的 `FocusScope` / `Overlay` 中的 `FocusScope`（`TraversalEdgeBehavior.stop`） | 侧边面板、频道列表、退出对话框都是 overlay 作用域，焦点不会漏到下层 |
| 唯一焦点修复 | `MutationObserver` + `repair()` | 不需要：Flutter 的 `FocusManager` 本身保证单一 primaryFocus；节点 dispose 时焦点回到 scope 的 focusedChild | |
| 焦点样式 | CSS `[data-focused]`，卡片 scale 1.06/1.08 + 白边 + 阴影，180ms；列表项白底黑字不缩放 | `AnimatedScale` / `AnimatedContainer(duration: 180ms)`，由 `Focus.of(ctx).hasFocus` 或 `FocusableActionDetector.onShowFocusHighlight` 驱动 | tvOS 视差（tilt/gleam）可用 `Transform` + 方向键事件模拟 |

## 2. 方向移动（几何遍历）

| 原型 | Flutter |
|---|---|
| `engine.move(dir)`：同一水平带内左右移动；上下选最近的“行带”，再选正交距离最小者；进入新组时用该组记忆 | `DirectionalFocusTraversalPolicyMixin`（`ReadingOrderTraversalPolicy` 不适用）。默认策略已是几何+“最近行”逻辑；组记忆靠 FocusScope；规则差异可在自定义 `FocusTraversalPolicy.inDirection` 里覆写 |
| `data-f-left/right/up/down` 强制跳转 | 在节点的 `onKeyEvent` 里拦截方向键并 `requestFocus(目标)`，或自定义 policy 中特判 |
| 导航栏优先搜索导航组内候选 | 把导航栏包在自己的 `FocusTraversalGroup` 里；policy 先在组内找，找不到再出组 |
| EPG 上下键按“时间光标”跳频道 | EPG 外层 `Focus(onKeyEvent:)` 拦截 ↑↓，计算目标格子后 `requestFocus` |
| 焦点距边缘 ≥60px、滚动跟随 | `Scrollable.ensureVisible(ctx, alignment:…, duration: 180ms)`；或在 `onFocusChange` 中自己算 `ScrollController.animateTo`，带 60px padding。横向行用 `ListView(scrollDirection: Axis.horizontal)` |

## 3. 按键处理（冒泡）

| 原型 | Flutter |
|---|---|
| `useKeyHandler(fn)` → `[data-kh]`，`engine.bubble(k)` 从焦点节点向上冒泡，返回 `true` 即消费 | `Focus(onKeyEvent: (node, e) => KeyEventResult.handled / ignored)`——Flutter 的按键事件同样从 primaryFocus 沿焦点树向上冒泡 |
| `mapKey`：方向键、Enter/13/23/Select → OK；4/461/10009/Escape/Backspace/GoBack → Back；179/415/19 → 播放暂停 | `Shortcuts` 映射 `LogicalKeyboardKey.arrowX → DirectionalFocusIntent`，`select / enter / gameButtonA → ActivateIntent`，`goBack / escape → DismissIntent`（Android TV 返回键一般走系统 back，见下）；`mediaPlayPause → 自定义 PlayPauseIntent` |
| 长按 OK ≥600ms = 收藏：keydown 计时，keyup 前满 600ms 触发 `onLong`；没有 onLong 的节点 keydown 立即触发 OK | `KeyDownEvent` 开始 `Timer(600ms)`，`KeyRepeatEvent` 忽略，`KeyUpEvent` 时未触发则当作短按。注意：有长按的节点短按在 keyup 时才生效 |
| 数字键选台：最多 4 位，1.2s 后提交 | 播放器层 `Focus.onKeyEvent` 接收 `digit0-9`，`Timer(1.2s)` 提交 |

## 4. 路由栈 / 返回（v0.2 六级规则）

| 级别 | 原型 | Flutter |
|---|---|---|
| 1 播放器有浮层（控制条/菜单/频道列表） → 关浮层 | 播放器自身 key handler 先消费 back | 播放器内 `PopScope(canPop: false, onPopInvokedWithResult:)` 先关浮层；菜单用 `OverlayEntry` 或 `showGeneralDialog`（自带路由，back 自动关） |
| 2 播放器无浮层 → 退出播放，焦点回到进入时的节点 | `closePlayer()`，`useScope` 卸载时恢复 previous focus | `Navigator.pop()`；Flutter 路由 pop 后自动把焦点还给上一路由 FocusScope 的 focusedChild |
| 3 详情页 / 配对页 → 上一页 | `app.pop()`（sub 栈），恢复 `popped` 焦点 | `Navigator.pop()` |
| 4 顶级内容页 → 导航当前项 | `backKey` 聚焦 `nav:<tab>` | 根页 `PopScope(canPop:false)` 中 `navFocusNode.requestFocus()` |
| 5 在导航且不是首页 → 首页 | `setTab('home')` | 同上，切 tab |
| 6 导航首页 → Android：退出确认框（默认“取消”）；tvOS：回系统 | `ExitDialog` / `Exited` | Android：`showDialog`，取消按钮 `autofocus: true`，确认后 `SystemNavigator.pop()`；tvOS：Menu 键交给系统（不拦截） |
| 浏览器 `popstate` 当作 Back（真机 TV 浏览器测试用） | `history.pushState` + popstate 监听，500ms 去重 | 不需要：Android 的返回键由 `PopScope` / `WidgetsBindingObserver.didPopRoute` 处理 |

## 5. 页面结构

| 原型 | Flutter |
|---|---|
| Android TV 左侧可展开导航栏 / tvOS 顶部 Tab 栏（P 键切换） | 两套 `Scaffold` 外壳，按 `defaultTargetPlatform` 或配置选择；导航栏 `FocusTraversalGroup` + 展开动画 `AnimatedContainer` |
| 首页行、海报墙（6 列）、剧集季切换（聚焦即切换） | 横向 `ListView.builder`；`GridView.count(crossAxisCount: 6)`；季 chip `onFocusChange` 里 setState |
| 播放器（VOD：−10/+30 不暂停不出控制条、1.2s 进度提示、90s 内 ↑ 跳片头；直播：↑↓ 换台、←→ 信息条 4s、OK 频道列表） | `media_kit` / `video_player`（ExoPlayer）+ 自建控制层；超时用 `Timer` |
| 侧边面板（音轨/字幕/倍速/画质/EPG 时区） | `showGeneralDialog` + `SlideTransition`，或 `OverlayEntry` |
| localStorage 持久化 | `shared_preferences` / `hive` |

## 6. v0.3 多源导航

| 原型 | 代码 | Flutter 对应 | 说明 |
|---|---|---|---|
| 左侧导航 = 源类型（首页 / IPTV / Emby / Xtream / 其他 / 搜索 / 设置） | `Nav` in `App.tsx`，`app.navTabs` | 自建 `NavigationRail` 式组件：外层 `FocusTraversalGroup`（+ `FocusScope` 记住当前项），收起 96 / 展开 300 用 `AnimatedContainer`，展开层用 `Stack` 浮在内容上（不推开内容） | 两种风格共用；tvOS 18 起系统也是侧边栏。只显示有源的类型、最多 8 项；导航项的 `focusedChild` = 当前类型 |
| 导航向右 → 当前分类 Tab（不是源按钮） | `F right="sec:tab:<cat>"` | 导航项 `Focus.onKeyEvent` 拦截 →，`tabFocusNodes[cat].requestFocus()` | |
| 二级行（源按钮 + 分类 Tab + 时钟） | `SourcePage` 的 `sec-row`（`data-sec`） | 一行 `Row`，包在自己的 `FocusTraversalGroup` 里；左右键在行内按顺序走（自定义 `onKeyEvent`），最左再按 ← 交给导航 | 分类 Tab 聚焦 300ms 后才切换内容（`Timer`），按 ↓ / 确认立即切换；焦点 300ms 内离开就取消（见下方“按需加载”） |
| 分类 Tab 按源能力显示 | `capsOf(src)`（`sources.ts`） | 源模型上的 `capabilities` 列表 → 生成 Tab | Emby / Jellyfin / Plex 用服务器返回的媒体库；本地媒体只有“电影”（视频文件） |
| 源切换面板（左侧滑出 520px） | `SourcePanel`，`data-fscope="overlay"` | **浮层路由**：`showGeneralDialog` / `Navigator.push(PageRouteBuilder(opaque: false))` + `SlideTransition`；路由自带 `FocusScope`，返回键 pop，焦点自动回到源按钮 | 打开时 `autofocus` 当前源；连接失败的源选中后在面板内换成“重试 / 编辑”视图 |
| 每种类型记住上次的源、当前分类 | `curSrc` / `cats`（`store.tsx`，localStorage 持久化） | **应用状态**：`Map<SourceType, SourceId>`、`Map<SourceType, Category>`，放在 Riverpod / Provider / Bloc 等状态层，用 `shared_preferences` 持久化 | 不是焦点记忆，切换导航项后仍保留 |
| 切源：保持分类，不支持则退回第一个；焦点落在内容区第一个元素 | `selectSource()` + `pendingFocus = 'content'` | 状态更新后，在下一帧 `WidgetsBinding.instance.addPostFrameCallback` 里 `contentFirstNode.requestFocus()`（或内容区 `FocusScope` 的 `autofocus` 节点） | |
| 内容区返回 → 分类 Tab → 导航 | `backKey` 4a / 4b（`App.tsx`） | 根页 `PopScope(canPop:false)`：焦点在内容区 → `currentTabNode.requestFocus()`；在二级行 → `navNode.requestFocus()` | v0.2 第 4 层拆成两步，其余层不变 |
| 首页跨源聚合 + 来源标签、“我的源”行 | `Home.tsx`，`ownerOfVod` / `favSrc` | 聚合查询放在仓库层（每条记录带 `sourceId`），卡片角标用 `Positioned` | 卡片确认 = 设置当前源 + 切导航项 |
| 源类型 → 导航项 | `navTypeOf(kind, merged)`（`sources.ts`） | 纯函数映射，放在领域层 | 分开：IPTV = M3U + Stalker，Xtream 单独一项，其他 = Jellyfin / Plex / 本地媒体；合并：IPTV = M3U + Xtream + Stalker |
| 导航模式：IPTV/Xtream 分开 \| 合并为 IPTV（`?livemerge=1`） | `settings.navMode` | 一个配置项决定上面的映射；一个导航项里有多种源时，源面板按类型分组（`SliverList` + 分组标题：M3U / Xtream / Stalker，或 Jellyfin / Plex / 本地媒体） | 合并后的导航项和面板标题都叫“IPTV”；默认分开，待 Rocky 确认 |
| Plex 设备关联（“其他”源面板 › ＋ 添加 Plex） | `PlexLink`（`SourcePage.tsx`，`data-fscope="overlay"`） | 全屏浮层路由；真实实现走 Plex PIN 流程（`POST plex.tv/api/v2/pins` 取 4 位 code，轮询 pin 拿 authToken），`PopScope` 返回关闭并取消轮询 | 原型只显示随机代码，不联网 |
| 按需加载：快速经过不加载 | 导航项 / 分类 Tab：`focusNav` / `focusTab` 300ms 定时器，`engine.subscribe` 里焦点一离开就 `clearTimeout`；→ / 确认立即切换 | **debounce**：`onFocusChange(true)` 启动 `Timer(300ms)`，`onFocusChange(false)` 时 `timer.cancel()`；只有 Timer 触发（或 → / 确认）才 setState 切换页面 / 分类、发起数据请求。快速按住方向键扫过的项不会请求任何数据 | 行为测试检查 `__wzLoads`：扫过 4 个导航项 / 2 个 Tab 后加载记录为 0 |
| 按需加载：只构建屏幕上的行和海报 | `useInView`（`ui/Lazy.tsx`，IntersectionObserver）：频道行、海报卡在进入视口前只画骨架，不取 Logo / 正在播出 / 海报图 | **`ListView.builder` / `GridView.builder`**（只 build 可见项 + `cacheExtent`），海报用 `CachedNetworkImage` / `Image.network` + `ResizeImage` 按需解码；EPG 网格用 `TwoDimensionalScrollView` 或按行 `ListView.builder` 懒加载节目数据 | 原型里焦点节点仍全部存在（为了几何移焦）；Flutter 里不可见项没有 FocusNode，跨屏移焦依赖 `ensureVisible` 后再 build：用 `FocusTraversalPolicy` + 先滚动一行再 `requestFocus` |

## 7. 注意事项

- **tvOS：Flutter 官方不支持 tvOS。** 可选方案：社区 fork（如 flutter-tvos，需要自己维护引擎），或 tvOS 端用原生 SwiftUI 实现，共用业务/数据层（Dart 不能直接复用，需要接口约定）。这一点需要尽早决策。
- Flutter 在 Android TV 上需要在 `AndroidManifest` 加 `LEANBACK_LAUNCHER`、`android.software.leanback`、banner 图，并声明 `touchscreen required=false`。
- Flutter 默认的 `DirectionalFocusTraversalPolicyMixin` 在“跨组时用记忆”这一点需要 FocusScope 配合；纯 `FocusTraversalGroup` 不会记忆。
- 长按依赖 keyup：部分遥控器/盒子的 OK 键 keyup 不可靠，真机需验证。
