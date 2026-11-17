# 浮生 · 纸片屋 Cocos Web

当前版本加入「七岁到三十岁」完整篇章：新角色从7岁开始，每7个游戏日长1岁，
完成童年、少年、青年、成年与30岁中年序章。30岁这一周结束后进入
“敬请期待”，可以回看人生相册、选择、作品与街坊，或保存并返回标题。
作品、街坊记忆、承诺后果和房间陈设跨年保存。
规则与分支见 [七天生活与市集](docs/七天生活与市集.md)。
旧18岁周模式存档按原年龄继续；旧经典存档保留原玩法，在30岁进入统一终页。

使用 Cocos Creator 3.8.8 打开这个目录。全部游戏画面、人物、家具和界面
由 Cocos 节点、Graphics、Label、ScrollView、Button、EditBox 和预制体实现。
内容基线是上一级只读文件 `game/index.html` v4.1。

`assets/scripts/core/WeekLife.ts` 管理每周心力、作品归属、委托、关系记忆和市集。
`core/LifeCourse.ts` 管理人生阶段、关键选择与年度积累；
`ui/LifePanels.ts` 呈现成长和终页，`ui/WeekPanels.ts` 组织日常生活。
`view/ArtworkView.ts` 在画夹和实际房间中呈现题材与风格。
中文文案仍由内容表构建，新增存档字段在加载时验证。

## 运行

在终端进入工程目录，安装依赖并构建 Web 版本，然后启动静态服务器：

```sh
cd fusheng-cocos
npm ci
npm run build:web
npm run serve
```

桌面访问 <http://127.0.0.1:8088/web-desktop/>，手机浏览器使用
`http://电脑的局域网地址:8088/web-mobile/`。服务器监听所有本地网络接口，
仅用于本机和同 Wi-Fi 测试。停止服务器使用 `Ctrl+C`。

手机竖屏显示转屏提示，横屏后自动继续。点击空地走路，点击物品会走近互动，
跨楼层自动经木梯上下；右下保留轻量的跳跃和情境互动。顶栏打开手账、布置和菜单。
菜单第一页左下固定显示**回到开始界面**，点击后保存进度再返回。面板左侧正文可以滑动，
右侧操作始终可见；长菜单通过明确的上一页、下一页切换。创建角色一屏完成。
布置时先挑家具，再轻点地板放置；长按 0.55 秒回收。

桌面使用 A/D 或左右方向键走动，W/S 或上下方向键爬梯，空格跳跃，E 互动，
B 布置，C 人物，H 帮助，Esc 返回或打开菜单。面板中可用 Tab/方向键和 Enter。

## 构建和测试

工程锁定 Creator 3.8.8；TypeScript 使用 strict。
安装 npm 依赖后可以执行：

```sh
npm ci
npm run content
npm run typecheck
npm test
npm run build:web
```

`npm run build:web` 调用本机 Creator，生成 `build/web-mobile` 和
`build/web-desktop` 两套独立静态产物。只构建一个目标可以使用
`npm run build:web -- web-mobile`。
编辑器安装位置不同时，设置 `COCOS_CREATOR` 为可执行文件的绝对路径。
首次打开或构建由 Creator 生成 `temp/tsconfig.cocos.json` 和引擎类型声明。
构建脚本会在缺少这些文件时先启动一次 Creator 构建。

浏览器检查使用 `npm run test:web`，默认连接本地 8088 服务。
自定义服务可设置 `FUSHENG_WEB_URL=http://127.0.0.1:端口/`。
检查需要安装 Google Chrome。首次运行前，执行 `npx playwright install webkit`
安装项目匹配的 WebKit 内核。
检查结果保存在 `output/life-course-checks.json`。真机检查边界见
[验收记录](docs/验收记录.md)。

## 音乐

仓库包含三首按 [BGMer 使用条款](https://bgmer.net/terms/)提供的音乐。
另外三首 OpenTracks 曲目不随源码分发：首次构建时，缺少的曲目会自动使用
仓库中可用的音乐。游戏的音乐设置和场景切换仍然可用。

如需使用原曲，请先阅读 [OpenTracks 许可](https://opentracks.com/en/help/articles/license/)，
再手动从各曲目页面获取对应的 MP3，保存为以下文件：

- `output/music-source/title.mp3`：[昼下がり気分](https://opentracks.com/bgm/detail/4695)
- `output/music-source/day.mp3`：[高原の小さなカフェにて](https://opentracks.com/bgm/detail/17543)
- `output/music-source/book.mp3`：[坂道のカフェ](https://opentracks.com/bgm/detail/15187)

安装 `ffmpeg` 后，在 `fusheng-cocos` 目录下执行以下命令，重新构建 Web 版本：

```sh
node tools/pack-music.mjs
npm run build:web
```

生成的 OpenTracks 资源不会被 Git 跟踪。曲目作者、来源和许可链接见
[`content/music.json`](content/music.json)。

## 内容和架构

`content/` 包含出身、角色、住宅、家具、行动、外景、事件、变故、剧情、
家训、任务、技能、序章和数值规则。`content/i18n/zh-CN.json` 保留旧版文案，
`content/ui.json` 存放通用界面文案；`life-course.json` 存放五个阶段、
九个关键年龄及适龄文案，`life-panels.json`、`scene-polish.json` 存放新增界面文案；
构建时合并并校验7至30岁连续覆盖。
`npm run content` 校验数量、ID、引用、文案键和效果 DSL，再复制到资源目录。

`tools/extract-legacy.mjs` 是一次性迁移工具，只读取旧文件。正式游戏加载 JSON，
不读取旧 HTML，也不在运行时执行旧版脚本。原版绘制算法已转为
`ArtGeometry.ts` 中的 Cocos Graphics 几何绘制。场景和家具只在内容或时刻变化时
重建，人物按 10Hz 更新姿态，位置按渲染帧插值。

`assets/scripts/core` 是不依赖引擎或平台的纯 TypeScript。
`Sim` 以 0.1 秒步长接受 Command、产生 SimEvent。界面只发送命令并读取状态。
输入、存储、生命周期和剪贴板位于 WebPlatform；存档服务可使用内存驱动测试。
17 类界面和共享 UI 元件均有 Cocos prefab。

CharacterView 保留 CharacterAnimator 接口，可以接入 Spine；当前使用六种外观、
随儿童、少年、成年变化的水墨人物。背景音乐按场景播放，设置支持音量、
静音、阅读字号和减少动态效果。

## 存档

使用 `fs.slot.1` 到 `fs.slot.3`，每槽有独立 `.bak`。
信封包含 schema 3、saveId、revision、checksum、meta、state 和 settings。
每 15 秒，以及日终、生日、搬家、传承、手动保存和切后台时写入。
写入前校验并备份；主档损坏时加载有效备份，高于当前 schema 的档案拒绝加载。

首次启动会检查 `fusheng_paperhouse_v1` 和 `fusheng_slot_1..3`。
旧数据保留，并另写迁移备份；不会删除旧 key。
自动迁移只适用于相同浏览器来源：协议、主机和端口必须一致。
不同来源无法由浏览器直接读取，需要存档码转移。

暂停菜单可以导出 `FS1.` 存档码，读档页可以导入到指定槽位。
格式为 LZ-string 编码加 checksum。局域网 HTTP 下剪贴板可能不可用，
可以点击 Cocos EditBox 输入框，手动全选复制或粘贴。

## 开发入口

调试入口用于本地回归。示例：

- `?skip=1&origin=normal&char=ding&house=villa&age=24&hour=20&touch=1`
- `?skip=1&scene=park`
- `?skip=1&panel=origin|char|help|build|summary|birthday|legacy|event|twist|story|pause|prologue`
- `?skip=1&panel=prologue&beat=3`
- `?screen=create` 或 `?screen=load`
- `?selftest=1` 运行原生核心自检。
- `?test=1` 暴露本地验收桥 `window.__FUSHENG__`。
- `?profiler=1` 显示 Cocos 性能面板。

验收结论和待办以 `docs/验收记录.md` 为准。手机真机测试与桌面仿真分开记录。
