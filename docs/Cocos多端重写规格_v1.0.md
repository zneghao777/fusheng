# 《浮生 · 纸片屋》Cocos 多端重写规格 v1.0

> 文档类型：技术规格 + 内容迁移规格
> 基线版本：Web v4.1（`game/index.html`，5024 行）
> 目标引擎：Cocos Creator 3.8 LTS + TypeScript
> 目标平台：Web / 微信小游戏 / iOS / Android（桌面端可选）
> 编写日期：2026-10-19
> 状态：待评审

> **执行范围更新（2026-10-19）**：首个实现阶段**只做 Web 端**；iOS / Android / 微信小游戏暂不打包，但架构、`PlatformService` 接口与内容格式仍按多端保留。

---

## 目录

- 0. 阅读指南
- 1. 目标与验收
- 2. 基线盘点
- 3. 技术选型
- 4. 多端目标与能力矩阵
- 5. 工程结构
- 6. 架构设计
- 7. 场景与预制体
- 8. 核心系统规格
- 9. 数据模型与内容管线
- 10. 表现规格
- 11. UI/UX 规格
- 12. 存档与多端
- 13. 构建与发布
- 14. 测试与验收
- 15. 里程碑与排期
- 16. 风险与开放问题
- 附录 A：现有文件 → Cocos 映射
- 附录 B：数值速查
- 附录 C：术语

---

## 0. 阅读指南

### 0.1 约束级别

| 词 | 含义 |
|---|---|
| **必须** | 不满足则验收不通过 |
| **应当** | 默认执行；偏离需在评审记录中说明 |
| **可以** | 可选，按排期决定 |

### 0.2 本文档的范围

本文档描述的是**把现有 v4.1 可玩内容重写到 Cocos，并完成一次表现升级**，不是把 `docs/设计方案_v1.0.md` 里的完整 GDD 一次性做完。

- **在范围内**：现有全部玩法、数值、文案、内容表、3 存档位、移动端触屏、四端构建。
- **在范围外**：日程编排、多角色切换、10 条技能、3D/2.5D、联机、宠物、完整遗传、老年段、UGC、内购、云存档（只预留接口）。
- GDD 中与当前实现冲突的部分（如 3D 相机、FOV、日程块）以本文档的 2D 侧视基线为准。

### 0.3 单位与约定

- 逻辑分辨率：**1280 × 720**，16:9。
- 时间：`1 真实秒 = 12 游戏分钟`（1× 速度）；1 游戏日 = 1440 游戏分钟 = 120 真实秒。
- 坐标：设计像素；家具锚点为**底部中心**。
- 内容 ID：**稳定字符串**，禁止用数组下标做存档引用。
- 所有文案必须走 i18n key，禁止在代码里硬编码中文。

---

## 1. 目标与验收

### 1.1 产品目标

做一款**2D 侧视、水墨纸面、可多端发布**的生活模拟游戏：

- 一局 25–40 分钟走完 7→30 岁；
- 角色动作、场景光照、UI 转场、音频达到“可上架”的完成度；
- 一套 TypeScript 代码同时产出 Web、微信小游戏、iOS、Android；
- 后续可以低成本扩展 GDD 中的日程、多角色、更多技能与事件。

### 1.2 本次重写范围（MVP-C）

| 模块 | 范围 |
|---|---|
| 核心循环 | 连续 tick、7 天 = 1 岁、7→30 岁、日终结算、生日、搬家、传承 |
| 角色 | 6 个可选角色、3 档年龄建模、走/爬/跳、12 种家具交互 |
| 住宅 | 3 档住宅（三层 / 两层 / 单层）、按财富动态切换、搬家重置家具 |
| 外景 | 巷口 / 便利店 / 旧书店 / 公园，含各自可交互物件 |
| 出身 | 10 种出身、难度 1–5 星、起始金钱/需求/技能/关系/家具增减/负债 |
| 事件 | 8 个随机事件、8 个命定变故、3 个剧情节点 |
| 成长 | 体格/心智/人缘、3 条技能（绘画/烹饪/社交）、情绪二维模型、5 个 buff 上限 |
| 关系 | 邻居老周、三轴关系、4 种话题、信任门槛借钱 |
| 任务 | 每日 3 件、8 个任务池、完成奖励 |
| 建造 | 14 件家具、6 件可购买、网格吸附、碰撞校验、六成回收 |
| 传承 | 30 岁收尾、3 条家训、下一代属性/技能/金钱继承 |
| 存档 | 3 个存档位、自动 + 手动、Web v2 档迁移、跨端导入码 |
| 多端 | Web、微信小游戏、iOS、Android；横屏；触屏 + 键鼠 |

### 1.3 非目标（明确不做）

- 不做 3D、不做自由摄像机、不做物理引擎。
- 不做日程块拖拽、自动排队、离线结算、多角色切换。
- 不做 10 条技能、职业树、家族树、遗传外貌混合。
- 不做联机、UGC、宠物、天气季节、语音/自由文本对话。
- 不做云存档、账号体系、内购、广告（只预留接口）。
- 不做英文/日文 localization（但文案表从第一天可用）。

### 1.4 验收标准

| 维度 | 标准 |
|---|---|
| 功能对等 | 第 14 节 parity checklist 100% 通过 |
| 表现 | 角色 19 组动画、家具交互 12 组、UI 转场 10 组、音效 20+、音乐 3 段 |
| 性能 | 桌面 60fps；移动 30–60fps；微信小游戏主包 ≤ 4MB；首屏 4G < 5s |
| 稳定 | 崩溃率 < 0.5%；无 missing asset；无未捕获异常 |
| 存档 | v2 → v3 迁移 100%；损坏档可回退；3 槽可用 |
| 多端 | Web / 微信 / iOS / Android 四端均可完成一局 7→30 岁 |
| 体验 | 手机横屏可单手完成移动 + 互动 + 菜单；竖屏有明确转屏提示 |

---

## 2. 基线盘点

### 2.1 现有代码事实

| 维度 | 现状 | 位置 |
|---|---|---|
| 规模 | 单文件 5024 行；JS 约 4300 行；CSS 约 370 行 | `game/index.html` |
| 渲染 | 原生 Canvas 2D；固定 1280×720；DPR ≤ 2 | 521–537 |
| 绘制 | 22 个 `draw*` 函数；房屋/纸张为离屏缓存 | 619–651、3819 |
| UI | DOM + CSS；53 处 `getElementById`、11 处 `innerHTML` | 370–499、3888–4450 |
| 输入 | 键盘 + 鼠标 + 触屏按钮 | 2545–2621、2700+ |
| 存档 | `localStorage`；3 槽；`v:2` | 930、4030、4242 |
| 生命周期 | rAF 主循环；15s 自动存；`beforeunload` | 4500+ |
| 外部资源 | 无图片、无音频、无网络 | — |

### 2.2 内容清单

#### 出身（10）

| ID | 名称 | 难度 | 起始钱 | 特殊 |
|---|---|---:|---:|---|
| normal | 普通家庭 | 2 | 120 | — |
| solo | 独居青年 | 2 | 90 | 兴致 -12、整洁 -8；移除沙发 |
| exam | 小镇做题家 | 3 | 60 | 体力 -12；绘画 Lv.2；收入 ×0.9 |
| rich | 家里有矿 | 1 | 800 | 兴致 +12；收入 ×0.8、关系 ×0.9；加台灯/地毯 |
| single | 单亲家庭 | 4 | 70 | 体力 -8、兴致 -8；烹饪 Lv.2；关系 ×0.85 |
| blend | 重组家庭 | 3 | 110 | 热乎 -8、张力 +18；关系 ×1.15 |
| debt | 负债家庭 | 5 | 30 | 兴致 -10；移除电视；每周利息 6 文 |
| art | 艺术世家 | 2 | 100 | 兴致 -6；绘画 Lv.3；绘画 ×1.15、收入 ×0.95 |
| gran | 奶奶带大的 | 3 | 80 | 整洁 -6；烹饪 Lv.3；热乎 +12、信任 +8；饱腹衰减 ×0.85 |
| city | 城中村租客 | 4 | 50 | 整洁 -12、体力 -6；移除书架；收入 ×1.05 |

#### 角色（6）

| ID | 名称 | 性别 | 加成 |
|---|---|---|---|
| ding | 小丁 | 女 | 绘画 +1 级 |
| shuang | 双双 | 女 | 社交 +1 级 |
| xin | 小鑫 | 女 | 烹饪 +1 级 |
| liu | 小六 | 女 | 体力 +10 |
| kang | 阿康 | 男 | 热乎 +14 |
| wu | 小吴 | 男 | 金钱 +40 |

#### 住宅（3）

| ID | 名称 | 档位 | 层数 | 楼层 Y | 门 X | 房间标签 |
|---|---|---|---:|---|---:|---|
| villa | 三层小楼 | 富裕 | 3 | 600 / 430 / 250 | 1150 | 灶房、客厅、浴室、卧房、画室、书房 |
| flat | 两层住宅 | 小康 | 2 | 600 / 344 | 1118 | 灶房、客堂、浴间、卧房、画室 |
| rental | 单层平房 | 贫困 | 1 | 600 | 1086 | 屋子 |

#### 家具（14）

| ID | 名称 | 宽×高 | 价格 | 交互 | 时长（真实秒） | 可购买 |
|---|---|---:|---:|---|---:|---|
| bed | 床 | 140×56 | 180 | 睡觉 | 1.1 | 否 |
| stove | 灶台 | 70×70 | 120 | 做饭 | 4.2 | 否 |
| fridge | 冰箱 | 56×100 | 100 | 翻冰箱 | 2.4 | 否 |
| shower | 淋浴 | 64×92 | 90 | 冲澡 | 3.4 | 否 |
| sofa | 沙发 | 140×56 | 150 | 瘫着 | 4.0 | 否 |
| tv | 电视 | 90×62 | 130 | 看电视 | 5.0 | 否 |
| easel | 画架 | 62×92 | 160 | 画一幅 | 7.6 | 是 |
| desk | 书桌 | 100×64 | 110 | 上网 | 4.6 | 否 |
| tea | 茶桌 | 80×40 | 90 | 泡茶 | 3.6 | 是 |
| plant | 盆栽 | 44×62 | 45 | 浇水 | 2.0 | 是 |
| bookshelf | 书架 | 72×110 | 110 | 翻书 | 4.2 | 是 |
| wardrobe | 衣柜 | 80×110 | 90 | 换衣服 | 2.2 | 否 |
| lamp | 台灯 | 30×92 | 30 | — | — | 是 |
| rug | 地毯 | 120×14 | 25 | — | — | 是 |

> 可购买集合：`lamp / rug / plant / bookshelf / tea / easel`，共 6 件。

#### 外景（4）

| ID | 名称 | 类型 | 可交互物件 |
|---|---|---|---|
| street | 巷口 | 户外 | 回家、进便利店、逛书店、去公园 |
| store | 便利店 | 室内 | 出去、买便当、拿瓶喝的、和店员闲聊 |
| book | 旧书店 | 室内 | 出去、翻书架、买一本书、和老板聊聊 |
| park | 公园 | 户外 | 回巷口、坐一会儿、喂鸽子、看池塘 |

#### 随机事件（8）

| ID | 标题 | 权重 | 地点/条件 |
|---|---|---:|---|
| delivery | 门口有个快递 | 10 | 家 |
| emo | 深夜 emo | 9 | 21:00–02:00 |
| sauce | 邻居来借酱油 | 10 | 家 |
| landlord | 房东发来两个字 | 8 | 家 |
| inspire | 灵感砸头 | 7 | 任意 |
| cat | 窗台上有一只猫 | 8 | 家 |
| takeout | 外卖满减 | 9 | 任意 |
| oldfriend | 一个很久没联系的人 | 6 | 任意 |

#### 命定变故（8）

`rent` 房东涨租、`cut` 稿子黄了、`hospital` 医院来电、`prize` 天上掉下一点钱、`pipe` 水管爆了、`typhoon` 台风天、`catstay` 猫不走了、`oldbox` 一箱旧物。

#### 剧情节点（3）

| 天 | ID | 标题 |
|---:|---|---|
| 2 | note | 门后的纸条 |
| 4 | call | 家里的电话 |
| 6 | fair | 老周的提议 |

#### 家训（3）

| ID | 名称 | 效果 |
|---|---|---|
| chi | 吃亏是福 | 关系 +30%，收入 -10% |
| eat | 先吃饭再说 | 饱腹衰减 -20%，做饭成本 -20% |
| bad | 不要太乖 | 画作收入 +25%，关系 -15% |

#### 每日任务池（8）

`eat` 吃顿正经饭、`shower` 洗个澡、`paint` 画完一幅画、`talk` 和邻居说话、`earn` 赚 40 文、`water` 给花浇水、`tv` 看会儿电视、`book` 翻两页书。

> 本表用于盘点和验收；**坐标、完整文案、选项效果以 `game/index.html` 对应常量为准**，迁移时逐条对照，不凭记忆补写。

### 2.3 系统清单

时间、需求、情绪、技能、关系、任务、随机事件、命定变故、剧情节点、住宅与财富、家具与建造、经济、传承、存档、开场叙事、日终结算、生日、人物面板、帮助、暂停。

### 2.4 复用 / 重写矩阵

| 资产 | 处理 | 说明 |
|---|---|---|
| 内容表（出身/家具/事件/剧情/家训/任务/角色） | **复用数据，改格式** | 从 JS 常量抽成 JSON；闭包逻辑改为 effect DSL |
| 数值公式 | **复用** | 需求衰减、情绪、技能经验、画作质量、财富阈值等原样保留 |
| 文案 | **复用文本，抽 i18n** | 逐条抽到 `zh-CN.json`，不重写 |
| 存档字段 | **复用语义，升级 schema** | v2 → v3，字段重命名 + 校验 |
| 渲染（22 个 draw） | **重写** | Cocos Graphics/Sprite/Spine；房屋预渲染 |
| UI（14 个面板） | **重写** | Cocos UI prefab + UIManager |
| 输入 | **重写** | Cocos input + InputIntent |
| 存储/生命周期 | **重写** | Platform Storage Driver |
| 音频 | **新增** | 当前没有音频 |

---

## 3. 技术选型

### 3.1 核心栈

| 层 | 选型 | 说明 |
|---|---|---|
| 引擎 | **Cocos Creator 3.8 LTS** | 2D/3D、TypeScript、原生 UI、Spine、粒子、TiledMap、Asset Bundle；一套代码多端 |
| 语言 | **TypeScript 5.x（strict）** | 核心逻辑可单测；禁止 `any` 泛滥 |
| 角色动画 | **Spine**（首选）；DragonBones 可选 | 骨骼、皮肤、事件、状态机；Cocos 原生 `sp.Skeleton` |
| UI | Cocos UI（`UITransform` / `Widget` / `Layout` / `ScrollView` / `Label` / `RichText`） | 不用 DOM/CSS |
| 补间 | Cocos `tween` + 自研 `Timeline` | UI/镜头/演出 |
| 粒子 | `ParticleSystem2D` | 墨点、蒸汽、雨、灰尘 |
| 地图 | TiledMap（可选） | 外景若做 tile 化再用；当前可手摆 |
| 音频 | `AudioSource` + 自研 `AudioManager` | 音乐/环境/音效总线 |
| 数据 | JSON + JSON Schema/Zod 校验 | 策划可读；构建期校验 |
| 单测 | **Vitest**（Node，不依赖 cc） | `assets/scripts/core` 纯逻辑 |
| 构建 | Cocos CLI + `miniprogram-ci` | CI 出 Web / 微信 / 原生包 |
| 代码规范 | ESLint + Prettier + `tsc --noEmit` | CI 门禁 |

### 3.2 为什么是 Cocos，而不是 Phaser / Unity

| 方案 | 优势 | 不选的原因 |
|---|---|---|
| Cocos Creator 3.8 | 国内生态、微信小游戏一键、TypeScript、Spine/UI/粒子齐全 | 需要重写渲染/UI，但这是本次既定目标 |
| Phaser 3 | Web 生态好、轻 | 微信小游戏/原生要自己接适配层；UI 需另做 |
| Unity 2D | 商业级、资产生态最强 | 包体重、Web 版弱、团队学习成本高；本项目不是 3D |
| Godot 4 | 免费、2D 优秀 | 微信/国内生态弱，主机/移动发布链路不如 Cocos 顺 |

### 3.3 版本与依赖

- Cocos Creator：**3.8.x LTS**（锁定小版本，升级需单独评审）。
- TypeScript：5.x，`strict: true`，`noImplicitAny: true`。
- Spine：**3.8**（Cocos 3.8 默认；若用 4.x 需先确认运行时兼容，锁定一个版本）。
- Node：20 LTS（构建脚本）。
- 不在运行时引入大型第三方库；核心逻辑零依赖。

---

## 4. 多端目标与能力矩阵

### 4.1 平台优先级

| 优先级 | 平台 | 原因 |
|---|---|---|
| P0 | Web（桌面 + 手机浏览器） | 现有分发方式；最快验证 |
| P0 | 微信小游戏 | 国内分享/裂变；Cocos 一键构建 |
| P1 | iOS | 触屏与性能基线；App Store |
| P1 | Android | 国内安卓渠道；性能跨度大 |
| P2 | Windows / macOS | 可选；Electron/Tauri 或 Cocos 原生 |

### 4.2 能力矩阵

| 能力 | Web | 微信小游戏 | iOS / Android | 桌面 |
|---|---|---|---|---|
| 存储 | `sys.localStorage` | `wx.setStorageSync`（10MB） | 文件 `writablePath/saves` | 文件 |
| 输入 | 键鼠 + 触屏 | 触屏 | 触屏 | 键鼠 + 手柄可选 |
| 分享 | 链接/二维码 | 微信分享卡片 | 系统分享 | 链接/文件 |
| 安全区 | CSS/Canvas | `wx` 安全区 | 原生安全区 | 无 |
| 包体 | 首包 < 8MB | 主包 ≤ 4MB，总 ≤ 30MB | 按渠道 | 不限 |
| 帧率 | 60 | 30–60 | 30–60 | 60 |
| 云存档 | 预留 | 预留 | 预留 | 预留 |
| 支付 | 不做 | 不做 | 不做 | 不做 |

### 4.3 分辨率与朝向

- 设计分辨率 **1280×720**，横屏。
- `ResolutionPolicy.SHOW_ALL`：保持 16:9，超宽屏两侧留黑/纸边；背景层可以延伸到画布外。
- 手机 19.5:9：游戏区居中，左右黑边用纸色装饰；不要拉伸。
- 安全区：所有 HUD/按钮用 `Widget` 对齐安全区（Cocos 的 `screen.safeArea` 或 `sys.getSafeAreaRect()`，以 3.8 API 为准），至少留 24px 设计坐标（约 12px 物理）边距。
- 竖屏：显示“请横屏”覆盖层；允许“仍然竖屏进入”降级，但不作为主体验。
- 桌面超宽：世界居中，最大宽度 1600px，两侧用书页边缘装饰。

---

## 5. 工程结构

### 5.1 仓库布局

```
fusheng-cocos/
├── assets/
│   ├── scenes/                 # Boot/Title/SaveSelect/Create/Prologue/Home/Outdoor
│   ├── prefabs/
│   │   ├── characters/         # 玩家/NPC
│   │   ├── furniture/          # 14 件家具
│   │   ├── ui/                 # 面板/按钮/弹窗/Toast
│   │   └── fx/                 # 墨点/蒸汽/雨/光斑
│   ├── art/
│   │   ├── characters/         # Spine 资源
│   │   ├── furniture/          # 图集
│   │   ├── houses/             # 3 档房屋背景
│   │   ├── scenes/             # 4 个外景
│   │   └── ui/                 # 9-slice / 图标
│   ├── audio/
│   │   ├── music/
│   │   ├── ambience/
│   │   └── sfx/
│   ├── resources/              # 运行时按路径加载的配置
│   └── scripts/
│       ├── core/               # 纯逻辑（禁止 import 'cc'）
│       ├── data/               # 配置加载/校验/类型
│       ├── sim/                # 系统实现（time/needs/...）
│       ├── view/               # 场景/角色/家具表现
│       ├── ui/                 # UIManager/面板/ViewModel
│       ├── platform/           # storage/input/audio/share/lifecycle
│       └── app/                # Boot/路由/服务容器
├── content/                    # 策划源表：JSON/CSV（构建期拷到 resources）
│   ├── origins.json
│   ├── characters.json
│   ├── houses.json
│   ├── furniture.json
│   ├── scenes.json
│   ├── events.json
│   ├── twists.json
│   ├── story.json
│   ├── creeds.json
│   ├── tasks.json
│   ├── skills.json
│   └── i18n/zh-CN.json
├── tools/
│   ├── validate-content.mjs    # JSON Schema/Zod 校验
│   └── build-content.mjs       # content → assets/resources
├── tests/
│   ├── core/                   # Vitest，直接 import ../assets/scripts/core
│   ├── saves/                  # v1/v2/v3/损坏/未来版本 fixtures
│   └── golden/
└── docs/
```

### 5.2 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 场景 | `PascalCase` | `HomeScene` |
| 预制体 | `PascalCase` | `Furniture_Bed` |
| 脚本 | `PascalCase`，类名同名 | `NeedsSystem.ts` |
| 资源 | `snake_case`，前缀分类 | `char_ding_kid_idle`、`furn_bed`、`ui_panel_paper` |
| 内容 ID | `lower_snake` | `origin.debt`、`event.rent`、`furniture.bed` |
| i18n key | 点分层级 | `ui.title.start`、`event.delivery.title` |

### 5.3 Asset Bundle 规划

| Bundle | 内容 | 加载时机 |
|---|---|---|
| `core` | 常驻 UI、字体、纸张、通用音效 | 启动 |
| `home` | 3 档房屋、家具、玩家/NPC | 进入游戏 |
| `outdoor` | 4 个外景 | 首次出门 |
| `story` | 序章/生日/传承插画、特殊音效 | 首次触发 |
| `audio` | 音乐/环境（可拆） | 按场景 |

微信小游戏：`core` 主包，`home/outdoor/story` 作为分包/Asset Bundle，按需加载。

---

## 6. 架构设计

### 6.1 分层

| 层 | 职责 | 依赖限制 |
|---|---|---|
| **Content** | 配置表、文案、i18n | 无 |
| **Core / Sim** | 状态、tick、需求、情绪、技能、关系、事件判定、存档序列化 | **禁止 import `cc`、DOM、平台 API** |
| **Presentation** | 场景、角色、家具、光照、粒子、镜头 | 只读 Sim 状态 + 订阅事件 |
| **UI** | HUD、面板、弹窗、Toast、输入焦点 | 通过 ViewModel 读写，不直接改 Sim |
| **Platform** | 存储、输入、生命周期、音频、分享、网络 | 接口注入 |

**唯一真相**：Sim 层。表现层和 UI 只能通过命令/事件与它交互。

### 6.2 模拟层

- **固定步长**：`SIM_STEP = 0.1s`（10Hz）；渲染 60Hz，插值显示。
- **命令**：`Command`（`Move`、`Interact`、`Sleep`、`Travel`、`PlaceFurniture`、`ChooseOption`…）。
- **事件**：`SimEvent`（`TimeChanged`、`NeedChanged`、`ActionStarted`、`ActionFinished`、`DayEnded`、`WeekAdvanced`、`EventTriggered`、`SaveRequested`…）。
- **可注入**：`Clock`、`Rng`、`Storage`，便于回放/测试。
- **确定性**：同一 seed + 同一命令序列 → 同一结果；事件随机用注入的 RNG。
- **禁止**：在 Sim 里 `setTimeout`、`tween`、`AudioSource`、`Node`、`director`。

```ts
// assets/scripts/core/state/GameState.ts
export interface GameState {
  charId: CharacterId;
  look: CharacterLook;
  house: HouseId;
  wealth: Wealth;
  scene: SceneId;
  age: number;          // 7..30
  week: number;         // 1..
  day: number;          // 1..7
  clock: number;        // 0..1440 游戏分钟
  money: number;
  growth: { body: number; mind: number; charm: number };
  needs: Record<NeedKey, number>;
  skills: Record<SkillKey, { lv: number; xp: number }>;
  rel: { warm: number; trust: number; tension: number };
  buffs: Buff[];
  tasks: Task[];
  taskProg: Record<string, number>;
  placed: PlacedFurniture[];
  stats: { paintings: number; meals: number; earned: number; rep: number };
  creedId: CreedId | null;
  originId: OriginId;
  twist: TwistState | null;
  story: { seen: Record<string, boolean>; fair: boolean };
  gen: number;
  dayStart: { money: number; needs: Record<NeedKey, number> };
}

// 存档信封：GameState 之外的元数据
export interface SaveData {
  schema: 3;
  game: string;              // 0.5.0
  contentVersion: number;
  saveId: string;
  revision: number;
  platform: 'web' | 'wx' | 'ios' | 'android' | 'desktop';
  createdAt: number;
  updatedAt: number;
  meta: SaveMeta;
  state: GameState;
  settings: GameSettings;    // 设备偏好，不同步
  checksum: string;
}

export interface GameSettings {
  speed: 1 | 2 | 4;
  musicVolume: number;
  sfxVolume: number;
  fontScale: 1.0 | 1.15 | 1.30;
  reduceMotion: boolean;
}
```

### 6.3 表现层

- `SceneView` 订阅 `SimEvent`，把状态映射到 `Node`/`sp.Skeleton`/`Label`。
- 角色状态机：`Locomotion` / `Action` / `Cinematic`；动画事件回到 Sim（如 `ActionFinished`）。
- 家具：`FurnitureView` 负责精灵、交互高亮、动效；逻辑位置来自 `placed`。
- 光照：`LightingView` 读 `clock`，调背景 tint、窗光、灯池、粒子。
- 镜头：固定侧视；事件时轻微推近/震动（可选）。

### 6.4 UI

- `UIManager`：栈式面板（`push/pop/replace`）、模态遮罩、输入阻塞、返回键。
- `PanelBase`：`open(data)` / `close()` / `refresh(vm)`。
- `ViewModel`：由 Sim 状态投影，UI 不直接改 `GameState`；操作发 `Command`。
- 常驻层：HUD、Toast、触摸控制；弹出层：面板/弹窗。
- 所有面板 prefab 化；禁止运行时拼 HTML/字符串布局。

### 6.5 平台服务

```ts
export interface StorageDriver {
  get(key: string): string | null;
  set(key: string, value: string): void;
  setSync(key: string, value: string): void;
  remove(key: string): void;
  info(): { currentSize: number; limitSize: number };
}

export interface PlatformService {
  kind: 'web' | 'wx' | 'ios' | 'android' | 'desktop';
  storage: StorageDriver;
  input: InputService;
  lifecycle: { onHide(cb: () => void): void; onShow(cb: () => void): void };
  audio: AudioService;
  share?: ShareService;
  cloud?: CloudSaveService;
}
```

### 6.6 数据流

```
Input → Command → Sim (fixed step) → SimEvent → View/UI
                              ↓
                         SaveService
                              ↓
                     StorageDriver / Cloud
```

### 6.7 主循环与暂停

- `director` 每帧 `update(dt)`；`SimRunner` 累积 `dt`，按 0.1s 步进。
- 暂停：`modalOpen`、面板、建造模式、切后台 → 停止 Sim 步进，但渲染继续。
- 切后台：`game.on(Game.EVENT_HIDE)` → 立即同步存档；`EVENT_SHOW` → 重新计时，不补算离线。
- 自动暂停白名单：事件/剧情/生日/传承/日终/面板打开。

### 6.8 存档触发

- 每 15 秒（游戏内）自动存；
- 日终、生日、搬家、传承、手动保存、切后台；
- 写前先写 `.bak`，校验后再替换主档。

---

## 7. 场景与预制体

### 7.1 场景清单

| 场景 | 职责 | 主要节点 |
|---|---|---|
| `BootScene` | 初始化服务、加载 core、迁移存档、跳转 | Services、Loading |
| `TitleScene` | 标题、开始/读档/说明 | Background、Title UI |
| `SaveSelectScene` | 3 槽读取/删除/新建 | SlotList |
| `CreateScene` | 性别/角色/立绘 | CharacterStrip、Portrait |
| `PrologueScene` | 六幕叙事 | Veil、Lines、Dots、Skip |
| `HomeScene` | 主玩法 | House、Furniture、Player、NPC、FX、HUD |
| `OutdoorScene` | 4 个外景通用 | Background、Props、Player、HUD |
| `ResultScene` | 日终/生日/传承（可选，或用面板） | Summary |

> 建议：日终/生日/传承用 **UI 面板**，不单独切场景，减少加载与状态迁移。

### 7.2 HomeScene 节点树

```
HomeScene
├── Camera
├── World
│   ├── BackgroundLayer        # 纸张、天空、远景
│   ├── HouseLayer             # 墙体、地板、窗、门、房间标签
│   ├── FurnitureLayer         # 按 y 排序
│   ├── CharacterLayer         # 玩家、NPC
│   ├── FxLayer                # 墨点、蒸汽、光斑
│   └── ForegroundLayer        # 画框、暗角
├── LightLayer                 # 日夜 tint / 灯池
└── UILayer
    ├── HUD
    ├── Toast
    ├── TouchControls
    └── PanelStack
```

### 7.3 预制体清单

- 角色：`PlayerCharacter`、`NpcCharacter`（Spine + 阴影 + 交互点）。
- 家具：14 个 `Furniture_*`，统一挂 `FurnitureView`。
- UI：`Panel_Paper`、`Button_Paper`、`Button_Chip`、`Toast`、`Modal`、`SlotCard`、`CharacterCard`、`OriginCard`、`TaskItem`、`NeedBar`、`MoodBadge`。
- FX：`Fx_Ink`、`Fx_Steam`、`Fx_Rain`、`Fx_Dust`、`Fx_LightPool`。

---

## 8. 核心系统规格

> 以下公式以现有 Web 实现为准；重写时不得“顺手调数值”。数值调整必须单独立项并更新本文档。

### 8.1 时间与日历

| 规则 | 值 |
|---|---|
| 时间刻度 | 1 真实秒 = 12 游戏分钟（1×） |
| 一天 | 1440 游戏分钟；07:00 起床；24:00 强制收工 |
| 一周 | 7 天 = 1 岁 |
| 年龄 | 7 → 30；30 岁这一周结束进传承 |
| 速度 | 1× / 2× / 4× |
| 生日 | 每周结束 `advanceWeek()` |
| 事件检测 | 每跨过一个游戏小时，8% 概率触发随机事件；每天最多 2 件；08:00 前不触发 |

**验收**：1× 下，一个游戏日约 120 秒；4× 下约 30 秒；切后台不补算。

**日切（07:00）**：`clock=420`；`energy=100`；`food -14`；`clean -8`；`fun -5`；buffs 清空；`eventsToday=0`；`scene=home`；刷新每日任务；记录 `dayStart` 快照。

### 8.2 需求

| 需求 | 每游戏分钟衰减 | 修正 |
|---|---:|---|
| 体力 energy | 3.0 / 60 | × `(1 - min(0.25, body × 0.008))` |
| 饱腹 food | 4.5 / 60 | × `foodDecay`（出身/家训） |
| 整洁 clean | 2.4 / 60 | — |
| 兴致 fun | 3.0 / 60 | — |

- 范围 0–100，`clamp`。
- 低于 25：对应行为效率下降（当前实现主要体现在情绪与提示；重写时保留“效率乘数”接口，先不做完整 8 象限）。
- 需求变化必须发 `NeedChanged` 事件，UI 做 0.4s 补间。

### 8.3 情绪

```
avg = (energy + food + clean + fun) / 4
v = (avg - 50) * 1.25 + Σ buff.v
a = 30 + (fun - 50) * 0.45 + (energy - 50) * 0.25 + Σ buff.a
v = clamp(v, -100, 100)
a = clamp(a, 0, 100)
```

| 条件 | 标签 |
|---|---|
| v ≥ 18 且 a ≥ 58 | 兴奋 |
| v ≥ 18 | 满足 |
| -8 ≤ v < 18 | 平静 |
| -34 ≤ v < -8 且 a ≥ 48 | 烦躁 |
| -34 ≤ v < -8 | 低落 |
| v < -34 | 疲惫 |

- buff 最多 5 个；`addBuff` 同名覆盖；到期按 `clock` 过滤。
- “因为”列表：饱腹 <38、体力 <32、整洁 <35、兴致 <35、buff ±6。

### 8.4 技能与成长属性

| 成长属性 | 作用 |
|---|---|
| 体格 body | 体力衰减 ×`(1 - min(0.25, body × 0.008))`，最多减 25% |
| 心智 mind | 技能经验 ×`(1 + mind × 0.02)` |
| 人缘 charm | 关系升温 ×`(1 + charm × 0.01)` |

| 技能 | 作用 |
|---|---|
| 绘画 paint | 画作质量/收入 |
| 烹饪 cook | 做饭经验/后续扩展 |
| 社交 social | 聊天经验/关系 |

- `xpNeed(lv) = 30 + lv * 22`；最高 10 级。
- 经验倍率：`1 + mind * 0.02`。
- 画作质量：`q = clamp(46 + lv*6 + mood.v*0.24 + rand(-9,9), 22, 100)`。
- 画作收入：`earnMoney(q * 0.85 * paintMod)`。
- 画作消耗：`fun +9`、`energy -9`、`clean -3`、`xp +20`、`paintings +1`。
- 做饭：成本 `8 * cookCost`；`food +46`、`fun +5`、`clean -4`、`cook xp +14`、`meals +1`。
- 洗澡：`clean +66`、`fun +4`、`energy +3`、`social xp +3`。

### 8.5 关系与 NPC

| 轴 | 范围 | 当前作用 |
|---|---|---|
| 热乎 warm | 0–100 | 聊天/借钱/结局评价 |
| 信任 trust | 0–100 | ≥30 才能借到 60 文 |
| 张力 tension | 0–100 | 事件选项/后续扩展 |

- 老周出现时间：09:00–21:00，位置 `x=764`，一层。
- 4 个话题：安全牌（warm +4 / social xp +8）、请进家（warm +7 / fun +7 / trust +5 / 40 分钟）、借钱（trust ≥30 → +60 文 / warm +3；否则 trust -4）、先忙（fun -2）。
- 聊天完成 `bump('talk')`。
- 重写时关系系统扩展为“三轴 + 记忆条目”的接口，但 MVP-C 只实现三轴 + 4 话题。

### 8.6 每日任务

- 任务池 8 条，按家具可用性过滤；不足 3 条则用全池。
- 每天随机 3 条，`done=false`。
- 进度 `taskProg[key]`；达到 `need` 后：
  - `fun +6`、`stats.rep +1`、Toast 提示。
- `earn` 任务按实际收入累加。
- 日终显示完成数；无惩罚。

### 8.7 随机事件

- 触发：每跨游戏小时 8%，08:00 后，每天最多 2 件，`modalOpen/action/dayEnded` 时跳过。
- 池过滤：`where` 匹配当前场景、`cond` 满足。
- 权重抽取；打开模态，选项执行 effect。
- 8 个事件及权重见 2.2；选项文本与效果从现有代码逐条迁移。

### 8.8 命定变故

- 每局随机 1 件，安排在第 2–5 天；避开第 2/4/6 天（与剧情错开），超过 7 天则落在第 3 天。
- 每 3 周重新抽一件（`week - twist.week >= 3`）。
- 触发日弹模态；执行选项效果。
- 8 个变故见 2.2。

### 8.9 剧情节点

- 第 2 天 `note`、第 4 天 `call`、第 6 天 `fair`。
- 每天只触发一个；`story.seen` 去重。
- `call` 的文本按 `originId` 分支（10 种）。
- `fair` 选项可设置 `story.fair=true`，影响传承文案。

### 8.10 住宅与财富

| 当前财富 | 条件 | 新财富 |
|---|---|---|
| poor | money ≥ 450 | mid |
| mid | money ≥ 1100 | rich |
| rich | money < 500 | mid |
| mid | money < 90 | poor |

- 每周生日结算；跨档触发搬家。
- 生日成长：体格/心智各 +1（22% 概率 +2）；14 岁起人缘 +1（22% 概率 +2）。
- 搬家：`house` 切换、`placed = defaultPlaced(house)`、玩家重置到门口。
- 旧家具不保留（现有设计取舍）。
- 房屋数据：三层/两层/单层，楼层 Y、门 X、窗户、房间标签见 2.2。

### 8.11 家具与建造

- 摆放：仅在家；`x` 按 20px 网格吸附；必须在楼层段内；与同层家具不重叠；钱够。
- 回收：返还 `round(price * 0.6)`。
- 可购买 6 件；建造成本从 `money` 扣除。
- 触屏：轻点放置，长按 0.55s 回收；键鼠：左键放置，右键回收。
- 家具 `use` 映射到 `ActionDef`；动作时长见 2.2。
- 行动期间移动/跳跃应取消行动（与现有一致）。

### 8.12 经济与行动

| 行为 | 金钱 | 需求 | 经验 | 其他 |
|---|---:|---|---|---|
| 画画 | `+q*0.85*paintMod` | fun +9 / energy -9 / clean -3 | paint +20 | paintings +1 |
| 做饭 | `-8*cookCost` | food +46 / fun +5 / clean -4 | cook +14 | meals +1、buff 热乎饭 |
| 翻冰箱 | 0 | food +18 / fun +3 | — | 35% buff |
| 洗澡 | 0 | clean +66 / fun +4 / energy +3 | social +3 | buff 清爽 |
| 沙发 | 0 | energy +12 / fun +10 / clean -2 | — | — |
| 电视 | 0 | fun +24 / energy -3 | — | bump tv |
| 书桌 | 0 | fun +13 / energy -2 | paint +5 | 28% buff |
| 茶桌 | 0 | fun +10 / energy +7 | — | buff 静心 |
| 盆栽 | 0 | fun +7 | — | bump water |
| 书架 | 0 | fun +11 | paint +8 | bump book |
| 衣柜 | 0 | clean +9 / fun +5 | — | — |
| 睡觉 | 0 | 进入日终 | — | `endDay(false)` |

> 完整数值以 `game/index.html` 的 `do*` 函数为准；迁移时逐条对照，不凭记忆。
>
> **行动时长按真实秒计，不随速度倍率缩短**：4× 时同样 4.2 秒，但游戏时间走 4 倍。重写时必须保留这个手感。

### 8.13 传承

- 30 岁这一周结束 → `showLegacy()`。
- 结算：画作数、存款、成长、声望、老周评价、结局文案（4 档）。
- 选择 1 条家训（3 选 1）。
- 下一代：
  - `gen + 1`；
  - `age=7`、`week=1`、`day=1`、`clock=420`；
  - `money = round(money*0.5) + 60`；
  - `rel = {warm:10, trust:8, tension:0}`；
  - `needs = {energy:100, food:70, clean:80, fun:60}`；
  - 技能 `lv = max(1, floor(lv*0.7))`，`xp=0`；
  - `stats.rep += 2`；
  - 新变故/剧情，`story` 重置。

### 8.14 存档

见第 12 节；此处只约定触发点：

- 自动：15s、日终、生日、搬家、传承、切后台；
- 手动：暂停菜单；
- 读档：标题/读档页/暂停菜单；
- 迁移：BootScene 首次启动检测 v2。

---

## 9. 数据模型与内容管线

### 9.1 类型定义

```ts
export type NeedKey = 'energy' | 'food' | 'clean' | 'fun';
export type SkillKey = 'paint' | 'cook' | 'social';
export type Wealth = 'poor' | 'mid' | 'rich';
export type HouseId = 'villa' | 'flat' | 'rental';
export type SceneId = 'home' | 'street' | 'store' | 'book' | 'park';
export type CharacterId = 'ding' | 'shuang' | 'xin' | 'liu' | 'kang' | 'wu';
export type OriginId = 'normal' | 'solo' | 'exam' | 'rich' | 'single'
                     | 'blend' | 'debt' | 'art' | 'gran' | 'city';
export type CreedId = 'chi' | 'eat' | 'bad';

export interface CharacterLook {
  hair: string;
  cloth: string;
  skin: string;
  skirt: boolean;
  acc: string;
  scale: number;
}

export interface PlacedFurniture {
  furnitureId: string;
  x: number;
  y: number;
}

export interface Buff {
  name: string;
  v: number;
  a: number;
  until: number;   // 游戏分钟
}

export interface Task {
  key: string;
  textKey: string;
  shortKey: string;
  need: number;
  done: boolean;
}

export interface SaveMeta {
  name: string;
  age: number;
  week: number;
  money: number;
  house: HouseId;
  gen: number;
}

export interface TwistState {
  id: string;
  week: number;
  day: number;
  fired: boolean;
}
```

### 9.2 内容表接口

```ts
export interface OriginDef {
  id: OriginId;
  nameKey: string;
  diff: 1 | 2 | 3 | 4 | 5;
  money: number;
  needs?: Partial<Record<NeedKey, number>>;
  skills?: Partial<Record<SkillKey, number>>;
  rel?: Partial<{ warm: number; trust: number; tension: number }>;
  mods?: Partial<Record<'income' | 'warm' | 'foodDecay' | 'cookCost' | 'paint', number>>;
  remove?: string[];
  extra?: string[];
  debt?: number;
  descKey: string;
}

export interface FurnitureDef {
  id: string;
  nameKey: string;
  w: number;
  h: number;
  price: number;
  buildable: boolean;
  use?: {
    labelKey: string;
    duration: number;        // 真实秒
    actionId: string;
  };
}

export interface EventOptionDef {
  id: string;
  labelKey: string;
  hintKey?: string;
  /** 选项可能有多条结果；按权重/条件选取第一条满足的 */
  outcomes: OutcomeDef[];
}

export interface OutcomeDef {
  weight?: number;                 // 默认 1
  conditions?: Condition[];        // 全部满足才可选
  effects: Effect[];
  replyKey?: string;
  replyWhoKey?: string;
}

export interface TextVariant {
  conditions: Condition[];
  textKey: string;
}

export interface EventDef {
  id: string;
  titleKey: string;
  bodyKey: string;
  bodyVariants?: TextVariant[];    // 如“家里的电话”按出身分支
  seal?: string;                   // 单字印章：事/变/命/家
  subKey?: string;                 // 副标题
  weight: number;
  where?: SceneId;
  conditions?: Condition[];
  options: EventOptionDef[];
}

export interface StoryDef extends EventDef {
  day: number;                     // 第 2/4/6 天
}

export interface TwistDef extends EventDef {
  minDay: number;                  // 2
  maxDay: number;                  // 5
}
```

**示例：把现有「房东涨租」迁成数据**

```json
{
  "id": "rent",
  "titleKey": "twist.rent.title",
  "bodyKey": "twist.rent.body",
  "weight": 1,
  "options": [
    {
      "id": "accept",
      "labelKey": "twist.rent.accept",
      "hintKey": "twist.rent.accept.hint",
      "outcomes": [
        { "effects": [{ "type": "money", "delta": -70 }] }
      ]
    },
    {
      "id": "bargain",
      "labelKey": "twist.rent.bargain",
      "hintKey": "twist.rent.bargain.hint",
      "outcomes": [
        {
          "weight": 1,
          "conditions": [{ "type": "chance", "p": 0.5 }],
          "effects": [
            { "type": "money", "delta": -35 },
            { "type": "reply", "whoKey": "npc.landlord", "textKey": "twist.rent.bargain.ok" }
          ]
        },
        {
          "weight": 1,
          "effects": [
            { "type": "money", "delta": -80 },
            { "type": "reply", "whoKey": "npc.landlord", "textKey": "twist.rent.bargain.bad" }
          ]
        }
      ]
    }
  ]
}
```

> 约定：`outcomes` 按顺序匹配，取第一条 `conditions` 全部通过的结果；带 `chance` 的结果先判定；都不匹配时用最后一条无条件结果兜底。`weight` 只用于多个“无条件结果”之间的加权随机，通常用 `chance` 就够了。

### 9.3 Effect / Condition DSL

现有事件把逻辑写在 `onClick` 闭包里；Cocos 版本必须数据化。

```ts
export type Effect =
  | { type: 'money'; delta: number }
  | { type: 'need'; key: NeedKey; delta: number }
  | { type: 'xp'; skill: SkillKey; amount: number }
  | { type: 'rel'; key: 'warm' | 'trust' | 'tension'; delta: number }
  | { type: 'buff'; nameKey: string; v: number; a: number; hours: number }
  | { type: 'clock'; minutes: number }
  | { type: 'flag'; key: string; value: boolean }
  | { type: 'travel'; scene: SceneId; x?: number }
  | { type: 'task'; key: string; amount?: number }
  | { type: 'stat'; key: 'paintings' | 'meals' | 'earned' | 'rep'; delta: number }
  | { type: 'reply'; whoKey: string; textKey: string }
  | { type: 'toast'; textKey: string };

export type Condition =
  | { type: 'moneyAtLeast'; value: number }
  | { type: 'moneyBelow'; value: number }
  | { type: 'needBelow'; key: NeedKey; value: number }
  | { type: 'trustAtLeast'; value: number }
  | { type: 'chance'; p: number }
  | { type: 'flag'; key: string; value: boolean }
  | { type: 'originIn'; ids: OriginId[] }
  | { type: 'hourBetween'; from: number; to: number };
```

**验收**：所有事件/变故/剧情选项不得含 JavaScript 闭包；内容表可被非程序人员编辑；构建期用 Zod/JSON Schema 校验。

### 9.4 内容构建

1. 策划编辑 `content/*.json`（或 CSV 转 JSON）。
2. `tools/validate-content.mjs` 校验：
   - ID 唯一、引用存在（家具/场景/技能/出身/家训）；
   - 文案 key 在 `zh-CN.json` 中存在；
   - 数值范围合法（0–100、价格 ≥0、时长 >0）；
   - Effect 类型合法。
3. `tools/build-content.mjs` 输出 `assets/resources/config/*.json`，并生成 `ContentTypes.ts`。
4. CI 在构建前必须跑校验；失败阻断构建。

### 9.5 ID 与版本

- 所有内容 ID 稳定，新增内容只加不改。
- `contentVersion` 整数；存档记录 `contentVersion`，用于调试。
- 删除内容时保留 ID 占位（`deprecated: true`），避免老档引用失效。

---

## 10. 表现规格

### 10.1 美术方向

- 水墨 + 纸面 + 低饱和；主色 `#2b2a26`、纸色 `#f3eddf`、朱红 `#a6402f`。
- 线条有毛边，避免纯矢量硬边；纸张有纤维、水渍、四角压暗。
- 角色 3 档：小孩（7–13）、青年（14–23）、中年（24–30）；比例/头身/鬓角变化。
- 家具与房屋保持“剖开的纸片屋”侧视；不要转向 2.5D。

### 10.2 角色（Spine）

**骨架**：`root / hip / torso / head / hair_front / hair_back / face / arm_upper_l/r / arm_lower_l/r / hand_l/r / leg_upper_l/r / leg_lower_l/r / foot_l/r / cloth / accessory`。

**皮肤**：6 个角色 × 3 个年龄档 = 18 套皮肤；共享骨架，换皮肤 + 骨骼缩放：
- kid：整体 0.74，头身比更大，腿短；
- young：1.0；
- mid：1.04，肩背更宽，鬓角白。

**动画清单（必须）**：

| 状态 | 说明 | 循环 |
|---|---|---|
| idle | 站立呼吸 | 是 |
| walk | 左右走 | 是 |
| climb_up / climb_down | 爬梯 | 是 |
| jump | 跳 | 否 |
| sit | 坐沙发/椅子 | 是 |
| sleep | 睡觉 | 是 |
| cook | 做饭 | 是 |
| shower | 洗澡 | 是 |
| paint | 画画 | 是 |
| tv | 看电视 | 是 |
| read | 看书 | 是 |
| water | 浇水 | 是 |
| tea | 泡茶 | 是 |
| wardrobe | 换衣服 | 否 |
| talk | 聊天 | 是 |
| carry | 端东西（可选） | 是 |
| tired | 低体力 idle | 是 |
| celebrate | 生日/传承 | 否 |

**事件**：`footstep`、`ink`、`finish`、`sfx`、`camera_shake`（可选）。

**状态机**：

- `Locomotion`：idle ↔ walk ↔ climb ↔ jump；移动输入优先。
- `Action`：交互开始进入，`ActionFinished` 回到 Locomotion；左右移动取消（与现有行为一致）。
- `Cinematic`：序章/传承/生日，锁定输入。
- 过渡：0.12–0.2s crossfade；不要硬切。

### 10.3 家具与场景

- 家具：Sprite Atlas，2x 资源，pivot 底部中心；按 y 排序。
- 交互高亮：描边/轻微上浮/纸色光圈；触屏用常驻“互动”按钮文案提示。
- 房屋：3 档背景预渲染为 2560×1440（2x）PNG/WebP；墙体/地板/窗/门分层，便于日夜 tint。
- 外景：4 张背景 + 前景道具；可用视差层，但不要做自由摄像机。
- 建造幽灵：半透明 Sprite + 网格线 + 可放/不可放 tint。

### 10.4 光照与日夜

- `dayLight(hour)` 0–0.4：白天 0，18:00–21:00 渐暗，21:00–05:00 0.4，05:00–07:00 回升。
- 窗光：按小时调窗色/亮度；夜晚灯池用径向渐变 Sprite（Additive/Soft）。
- 全局 tint：背景/房屋/角色统一乘色，避免只暗背景。
- 粒子：灰尘（白天）、雨（台风事件）、墨点（交互）。

### 10.5 UI 动效

| 场景 | 动效 | 时长 |
|---|---|---|
| 面板打开 | 纸面从下方 12px 浮起 + 透明度 0→1 | 0.22s |
| 面板关闭 | 反向 | 0.16s |
| 页面切换 | 纸色闪白/横向擦除 | 0.35s |
| 序章文字 | 逐行浮起 + 去模糊 | 0.8–1.0s/行 |
| 数值变化 | 数字滚动 + 条 0.4s 补间 | 0.4s |
| Toast | 上浮 + 2.6s 后淡出 | 0.25s |
| 生日/传承 | 印章落下 + 纸纹扩散 | 0.6s |
| 按钮按下 | scale 0.96 + 墨色填充 | 0.08s |

- 所有动效支持“减少动效”开关：关闭位移/模糊，只保留透明度。
- 禁止每帧创建 `Tween`/`Label`；用对象池。

**序章（6 幕）**：

| 幕 | 内容 |
|---:|---|
| 1 | 七岁那年的春天 |
| 2 | 你住在哪（按房型分支） |
| 3 | 家里的样子（按出身分支） |
| 4 | 你叫什么（角色名 + 一句话性格） |
| 5 | 伏笔（这一年看起来会和往常一样） |
| 6 | 落版（你今年七岁 / 接下来的二十三年，由你来过） |

- 纸面蒙版透明度：0.97 → 0.76 → 1.0；第二幕隐约看见屋子。
- 每行文字从下方浮起、去模糊、逐个延迟入场。
- 左侧墨线由上至下画出，顶部“序”字；底部进度点；右上“跳过”。
- 点击/空格继续；跳过直接进投胎面板。

### 10.6 镜头

- 固定侧视，正交相机；设计分辨率 1280×720。
- 事件/生日：轻微推近 1.03× + 0.2s 回弹（可选）。
- 搬家/传承：0.4s 纸色闪白 + 镜头轻微平移。
- 不做自由缩放/旋转。

### 10.7 音频

| 类别 | 内容 | 说明 |
|---|---|---|
| 音乐 | 白天、夜晚、情绪低落 | 3 段循环，1s crossfade |
| 环境 | 屋内、巷口、便利店、书店、公园 | 5 条循环 |
| 音效 | 脚步（3 种地面）、开门、水、锅、画笔、翻书、电视、硬币、UI 点击、Toast、生日、事件 | 20+ |
| 总线 | Master / Music / Ambience / SFX | 设置面板可调 |

- 格式：Web/Android OGG，iOS/微信 MP3；44.1kHz；音乐 -18 LUFS，音效 -14 LUFS。
- 循环点：音乐/环境文件本身必须做成无缝循环；`AudioSource.loop = true`。
- 切后台：暂停音乐/环境；回前台恢复；不叠音。

### 10.8 性能预算

| 指标 | 桌面 | 移动 | 微信小游戏 |
|---|---:|---:|---:|
| 帧率 | 60 | 30–60 | 30–60 |
| Draw call | ≤ 120 | ≤ 80 | ≤ 80 |
| 同屏角色 | ≤ 4 | ≤ 3 | ≤ 3 |
| 粒子 | ≤ 200 | ≤ 60 | ≤ 60 |
| 纹理常驻 | ≤ 150MB | ≤ 80MB | ≤ 60MB |
| 首包 | < 8MB | < 60MB | 主包 ≤ 4MB |
| 冷启动 | < 3s | < 5s | < 5s |

**手段**：图集、静态层预渲染、对象池、Label 缓存、避免每帧 Graphics、纹理压缩（ASTC/ETC2）、微信分包、远程资源。

**性能档位**：

| 档位 | 判定 | 策略 |
|---|---|---|
| low | 低端 Android / 内存 ≤3GB | 渲染分辨率 ×0.75、30fps、粒子 ≤30、关阴影/额外光效 |
| mid | 主流手机 | 1.0、60fps、粒子 ≤60 |
| high | 桌面/旗舰 | 1.0、60fps、完整 VFX/光照 |

---

## 11. UI/UX 规格

### 11.1 布局

| 元素 | 位置 | 说明 |
|---|---|---|
| 顶栏 | 顶部，安全区内缩 12px | 年龄、周/天、时钟、场景、金钱、速度、人物、布置、菜单 |
| 状态 | 左上（触屏）/ 左下（桌面） | 4 条需求 + 情绪 |
| 任务 | 右上（触屏）/ 右下（桌面） | 3 条 + 进度 |
| 交互提示 | 角色附近 | 桌面显示键帽“E”；触屏只显示红点 |
| 触屏控制 | 左下方向键；右下菜单/跳/互动 | 实际 ≥44px；1280×720 设计坐标约 84–100px |
| Toast | 底部居中，触屏上移 | 最多 4 条 |
| 面板 | 居中，最大 720×560 | 可滚动 |

**基准字号（1280×720）**：正文 18px、辅助 14px、按钮 16px、面板标题 32px、大标题 44px。触屏端整体 ×1.2–1.3（小屏取上限），保证 667×375 下正文不小于 11px 物理像素。

### 11.2 界面清单

| 界面 | 类型 | 打开时机 | 关键内容 | 关闭方式 |
|---|---|---|---|---|
| Title | 场景 | 启动 | 开始/读档/说明 | 进入子页 |
| SaveSelect | 场景 | 标题/暂停 | 3 槽、删除、新建 | 返回 |
| Create | 场景 | 新建 | 性别、6 角色、立绘 | 返回/开始 |
| Prologue | 场景/覆盖层 | 开局 | 6 幕、跳过 | 完成/跳过 |
| HUD | 常驻层 | 游戏中 | 顶栏、需求、任务、触摸 | — |
| Pause | 面板 | 菜单 | 保存、读档、说明、回标题 | 继续/关闭 |
| Character | 面板 | 人物 | 成长、技能、关系、统计 | 关闭 |
| Help | 面板 | 说明 | 操作、系统 | 关闭 |
| Build | 面板 | 布置 | 6 件家具、价格、提示 | 再点布置/关闭 |
| DaySummary | 面板 | 日终 | 3 件事、钱包、情绪、结语 | 下一天/下周 |
| Birthday | 面板 | 生日 | 成长、搬家 | 继续 |
| Story | 面板 | 剧情节点 | 标题、正文、选项 | 选项 |
| Event | 面板 | 随机事件 | 标题、正文、选项 | 选项 |
| Twist | 面板 | 命定变故 | 标题、正文、选项 | 选项 |
| Reply | 面板 | 对话回复 | 谁、文本 | 嗯 |
| Legacy | 面板 | 30 岁 | 统计、结局、3 家训 | 选择 |
| Origin | 面板 | 投胎结果 | 出身、难度、起始 | 推门 |

### 11.3 输入映射

| 意图 | 键鼠 | 触屏 | 手柄（可选） |
|---|---|---|---|
| 移动 | A/D、←/→ | 左下方向键/摇杆 | 左摇杆/十字键 |
| 上下楼 | W/S、↑/↓ | 上/下 | 上/下 |
| 跳 | 空格 | 跳按钮 | A |
| 互动 | E | 情境按钮 | X |
| 布置 | B | 顶栏 | Y |
| 人物 | C | 顶栏 | LB |
| 菜单 | Esc | 菜单按钮 | Start |
| 关闭 | Esc | 面板 ×/返回 | B |

**硬性规则**：所有功能必须能用“方向 + 确认 + 取消”完成；触屏按钮**物理尺寸 ≥44px**；焦点可见。

### 11.4 可访问性

- 字号：100% / 115% / 130%。
- 减少动效：关闭位移/模糊/粒子，只保留透明度。
- 色盲友好：情绪不只靠颜色，配图标/文字。
- 对比度：正文与纸面 ≥ 4.5:1。
- 键盘/手柄焦点：面板按钮可 Tab/方向键遍历。

### 11.5 本地化

- v1 只做 `zh-CN`，但所有文案走 `I18nService.t(key, params)`。
- 占位符：`{name}`、`{money}`、`{age}`。
- 文案表：`content/i18n/zh-CN.json`；事件正文支持简单标记（`<b>`、`<i>`、换行），用 RichText 渲染。
- 字体：正文用系统字体；标题用衬线字体（可打包一个子集，控制包体）。

---

## 12. 存档与多端

### 12.1 Schema v3

```json
{
  "schema": 3,
  "game": "0.5.0",
  "contentVersion": 1,
  "saveId": "sv_8f3c2a1b",
  "revision": 12,
  "platform": "wx",
  "createdAt": 1760000000000,
  "updatedAt": 1760000000000,
  "meta": {
    "name": "小丁",
    "age": 23,
    "week": 17,
    "money": 1286,
    "house": "villa",
    "gen": 2
  },
  "state": { },
  "settings": { "speed": 1, "musicVolume": 0.7, "sfxVolume": 0.8, "fontScale": 1.0, "reduceMotion": false },
  "checksum": "9f2c1a7b"
}
```

- `saveId`：跨端主键；槽位只是本地展示位。
- `revision`：每次写 +1；云同步乐观锁。
- `meta`：列表页摘要，避免解析全量。
- `settings`：设备偏好（速度、音量、字号、减少动效），不同步。
- `checksum`：FNV-1a over `JSON.stringify(state)`；只防损坏，不防作弊。

### 12.2 存储驱动

| 平台 | 实现 | Key |
|---|---|---|
| Web | `sys.localStorage` | `fs.slot.1..3`、`fs.meta` |
| 微信 | `wx.setStorageSync` | 同上 |
| iOS/Android | `jsb.fileUtils.writeStringToFile` | `writablePath/saves/slot_N.json` |
| 测试 | MemoryDriver | — |

- 单档硬上限 64KB；超过报警。
- 写前 `.bak`；启动主档解析失败回退 `.bak`。
- `onHide` 必须同步写。

### 12.3 v2 → v3 迁移

| v2 字段 | v3 字段 | 处理 |
|---|---|---|
| `v:2` | `schema:3` | 映射 |
| `char` | `charId` + `look` | 按 `char.id` 查找；look 原样 |
| `origin` | `originId` | 取 `id`；找不到回退 `normal` |
| `creed` | `creedId` | 取 `id`；`null` 保留 |
| `placed[].t` | `placed[].furnitureId` | 重命名 |
| `ts` | `updatedAt` | 重命名 |
| `speed` | `settings.speed` | 移出 state |
| 其他 | 原样 | 保留 |

- v1 单档（`fusheng_paperhouse_v1`）先迁到 slot 1（等价现有逻辑），再走 v2 → v3；迁移前备份。
- Web 版首次启动：检测 `fusheng_slot_1..3`，迁移到 Cocos 存储；保留旧 key 30 天。
- 其他端：通过“存档码”导入（`FS1.` + LZ-string + checksum）。
- `schema > CURRENT`：拒绝加载并提示升级；`schema < CURRENT`：串行迁移。
- 迁移在内存完成，写回前先备份；任一步失败保留原档，不覆盖。

### 12.4 导出/导入码

- 格式：`FS1.` + `LZ.compressToEncodedURIComponent(JSON.stringify(save))` + `.` + checksum。
- 导出：复制到剪贴板；导入：粘贴 + 校验 + 迁移 + 选槽。
- 角色名做长度/敏感词校验。
- 用途：Web ↔ 手机 ↔ 微信小游戏迁移；不依赖服务器。

### 12.5 云存档（预留）

- `CloudSaveService` 接口：`pull(saveId)`、`push(saveId, baseRevision, state)`、`list()`、`delete(saveId)`。
- 冲突：409 + 远端版本；弹“本机 vs 云端”对比；不自动合并。
- 触发：生日/搬家/传承/手动/切后台（节流 5 分钟）；日终只本地存。
- v1 不实现，只留接口。

---

## 13. 构建与发布

### 13.1 构建目标

| 目标 | 命令/平台 | 产物 |
|---|---|---|
| Web | Cocos `web-mobile` / `web-desktop` | `build/web-mobile` 静态站点 |
| 微信小游戏 | Cocos `wechatgame` | `build/wechatgame` + `game.json` |
| iOS | Cocos `ios` | Xcode 工程 |
| Android | Cocos `android` | Gradle 工程 |
| 桌面（可选） | Electron/Tauri 包 Web 构建 | `.app` / `.exe` |

### 13.2 包体与分包

- Web：首包 < 8MB；纹理 WebP；开启 gzip/brotli。
- 微信：主包 ≤ 4MB；`core` 主包，`home/outdoor/story` 分包；大图/音频走远程 CDN（HTTPS 合法域名）。
- iOS/Android：Asset Bundle + 纹理压缩；首包 < 60MB。
- 所有平台：启动只加载 `core`；进入游戏再加载 `home`。

#### 资产预算

| 资产 | 规格 | 体积预算 | 加载策略 |
|---|---|---:|---|
| 纸张纹理 | 1280×720 或 2048×2048 可平铺 WebP | 200–400KB | 常驻 |
| 房屋背景 | 3 档 × 2560×1440 WebP（移动端 1x） | 1.5–3MB/档 | `home` bundle，按当前房型加载 |
| 家具图集 | 14 件，2048×2048 图集 | 2–3MB | `home` bundle |
| 角色 Spine | 每角色 1 套骨架 + 2048×2048 图集 | 1.5–2.5MB/角色 | 只加载当前选中角色；其余按需 |
| UI 图集 | 9-slice、按钮、图标，2048×2048 | 1–2MB | 常驻 |
| 音乐 | 3 段，OGG/MP3 | 1–2MB/段 | `audio` bundle，按场景 |
| 环境 | 5 条循环 | 200–500KB/条 | 按场景 |
| 音效 | 20+，单声道 | 20–100KB/条 | 常驻/按需 |

**微信主包策略**：`core` + UI + 纸张 + 默认角色（小丁）+ 默认房型 ≤ 4MB；其余角色/房型/外景/音乐放分包或远程 CDN。

### 13.3 CI

```
lint → tsc --noEmit → vitest → validate-content → build-content
→ Cocos build (web) → Cocos build (wechat) → miniprogram-ci upload
→ smoke test (headless) → artifact
```

- 版本号：`0.5.0+build.N`；`game` 写入存档。
- 发布：Web 静态托管；微信体验版/审核；iOS TestFlight；Android 内测包。
- 热更新：Web 缓存戳；微信分包/远程资源；原生 Asset Bundle。

### 13.4 发布检查清单

- [ ] 四端启动无报错、无 missing asset。
- [ ] 新档 7→30 岁可完成；旧档可迁移。
- [ ] 存档/读档/删除/导入码正常。
- [ ] 手机横屏/安全区/触屏按钮正常。
- [ ] 微信主包 ≤ 4MB；分包可加载。
- [ ] 60/30fps 达标；无内存泄漏。
- [ ] 文案无硬编码；i18n key 全量。
- [ ] 音频总线/静音/切后台正常。
- [ ] 隐私/合规文案（如需上架）。

---

## 14. 测试与验收

### 14.1 测试层级

| 层级 | 内容 | 工具 |
|---|---|---|
| 单元 | 需求衰减、情绪、技能、财富、任务、存档迁移 | Vitest |
| 集成 | Sim + Save + Content 加载 | Vitest |
| 黄金 | 固定 seed 跑 1000 局，断言分布 | Node 脚本 |
| 场景 | 每个场景加载、无 missing asset | Cocos 构建 + 自动截图 |
| 设备 | 真机矩阵 | 手动/自动化 |
| 性能 | 帧率、draw call、内存、包体 | Cocos Profiler |

### 14.2 Parity Checklist（必须 100%）

| # | 功能 | 验收 |
|---:|---|---|
| 1 | 标题/读档/新建三页 | 3 槽、空位新建、满位提示 |
| 2 | 6 角色、性别页签、立绘 | 选择正确、加成生效 |
| 3 | 10 出身随机/预览 | 金钱/需求/技能/关系/家具/负债正确 |
| 4 | 六幕序章 | 6 幕、跳过、结束进投胎面板 |
| 5 | 时间/年龄/周/天 | 7 天=1 岁、7→30、1×=120s/日 |
| 6 | 需求/情绪 | 公式一致、UI 0.4s 补间 |
| 7 | 移动/爬梯/跳 | 三层/两层/单层均可走通 |
| 8 | 12 种家具交互 | 时长/数值/动画事件一致 |
| 9 | 老周 09–21、4 话题 | 信任借钱门槛正确 |
| 10 | 4 外景 + 物件 | 往返、时间消耗、文案正确 |
| 11 | 日终结算/下一天 | 3 件事、钱包、情绪、周结算 |
| 12 | 生日/成长/搬家 | 3 属性、财富阈值、家具重置 |
| 13 | 8 随机事件 | 权重/地点/时间/每天 2 件 |
| 14 | 8 命定变故 | 第 2–5 天、每 3 周重抽 |
| 15 | 3 剧情节点 | 第 2/4/6 天、出身分支 |
| 16 | 每日 3 任务 | 8 池、家具过滤、奖励 |
| 17 | 建造 | 6 件、20px 吸附、碰撞、60% 回收 |
| 18 | 传承 | 30 岁、3 家训、下一代继承 |
| 19 | 存档 | 3 槽、自动/手动、v2 迁移、损坏回退 |
| 20 | 触屏/横屏/安全区 | 单手可玩、竖屏提示 |
| 21 | 调试参数 | Web 上 `skip/age/scene/hour/touch` 等价；原生用开发者面板；selftest 进 CI |
| 22 | 音频 | 音乐/环境/音效/静音/切后台 |

### 14.3 设备矩阵

- iPhone SE / 12 / 14 / 15 Pro；iPad。
- Android：骁龙 6 系 4GB（低端）、8 系旗舰。
- Web：Chrome / Safari / Edge；1280×720、1920×1080、2560×1440。
- 微信：iOS / Android；主包/分包；弱网。
- 桌面：macOS / Windows（可选）。

### 14.4 性能验收

- 桌面 60fps 稳定；移动平均 ≥30fps，低端机不崩。
- 首次加载 4G < 5s；场景切换 < 1s。
- 内存无持续增长；连续玩 30 分钟不 OOM。
- 微信主包 ≤4MB；总包 ≤30MB。

---

## 15. 里程碑与排期

### 15.1 阶段

| 阶段 | 内容 | 产出 | 验收 | 估算 |
|---|---|---|---|---:|
| M0 | 技术验证：Cocos 工程、Web/微信构建、纸张/房屋渲染、Spine 走路、存档服务 | 可跑 demo | 60fps、微信主包 <4MB | 5 天 |
| M1 | Core 模拟层：状态、tick、需求、情绪、技能、财富、任务、存档 | `assets/scripts/core` + 单测 | 公式 parity、34 项自测 | 10 天 |
| M2 | 主场景：3 档房屋、家具、移动、交互、日夜 | HomeScene | 家中 7→30 可玩 | 15 天 |
| M3 | 流程/UI：标题/读档/新建/序章/HUD/面板/日终/生日/传承 | 全 UI | 全流程可玩 | 15 天 |
| M4 | 内容：出身/角色/事件/变故/剧情/任务/NPC/外景 | 内容 parity | checklist 100% | 10 天 |
| M5 | 多端：Web/微信/iOS/Android 构建、适配、包体 | 四端包 | 四端 smoke | 10 天 |
| M6 | 表现：Spine 19 组动画、UI 动效、音频、VFX | 表现版 | 质量验收 | 15 天 |
| M7 | QA/发布：真机、性能、存档、审核 | 上线 | 验收标准 | 10 天 |

**合计**：约 90 个工作日（不含审核等待）。单人全职约 18 周；2–3 人并行约 10–12 周。

### 15.2 团队

| 角色 | 职责 | 投入 |
|---|---|---|
| 客户端 | Cocos/TS、场景/UI/构建 | 1 人全职 |
| 美术/动画 | 房屋/家具/角色 Spine/UI | 1 人全职（关键路径） |
| 策划/文案 | 内容表、事件、文案、数值 | 0.5–1 人 |
| 音频 | 音乐/环境/音效 | 外包/兼职 |
| QA | 设备矩阵、回归 | 0.5 人 |

### 15.3 关键路径

1. **角色 Spine + 家具资产**：决定 M2/M6 能否按时。
2. **UI prefab 体系**：决定 M3 的复用效率。
3. **微信包体/性能**：决定 M5 是否要砍资源。
4. **存档迁移**：决定老玩家是否流失。

---

## 16. 风险与开放问题

### 16.1 风险

| 风险 | 影响 | 应对 |
|---|---|---|
| 美术/Spine 产能 | 关键路径延误 | 先做 2 周 vertical slice；占位图先跑通 |
| UI 重写超预期 | 工期翻倍 | 先做 PanelBase + 3 个核心面板，再铺开 |
| 微信包体/性能 | 无法上线 | Asset Bundle/分包/纹理压缩；低端机降档 |
| 存档迁移 | 老玩家流失 | v2 fixtures + 自动迁移 + 导入码 |
| 范围蔓延 | 无法交付 | 冻结 MVP-C；GDD 功能进 backlog |
| Cocos 版本升级 | API 变动 | 锁 3.8 LTS；升级单独评审 |
| 团队不熟 Cocos | 上手慢 | M0 技术验证；预留 1–2 周学习 |
| 音频/字体包体 | 首包超标 | 音频压缩/远程；字体子集 |

### 16.2 开放问题（评审时定）

1. 角色动画是 **Spine** 还是 **逐帧**？建议 Spine；逐帧成本更高、灵活性差。
2. 房屋是 **整张预渲染** 还是 **分层节点**？建议分层背景 + 预渲染静态层。
3. 微信是否首发？如果首发，M5 提前，包体预算从 M0 开始卡。
4. 是否保留 3 存档位？建议保留；云存档后槽位只是本地视图。
5. 是否做英文？v1 不做，但 i18n key 从第一天可用。
6. 目标帧率：桌面 60、移动 30–60；是否锁 30 省电？建议默认 60，低端机自动降。
7. 音频是否外包？建议至少音乐/环境外包，音效自建库。
8. 是否上 Steam？如果上，桌面壳用 Tauri/Electron，还是 Cocos 原生？建议先 Web/移动，Steam 后置。

---

## 附录 A：现有文件 → Cocos 映射

| 现有代码 | Cocos 对应 |
|---|---|
| `HOUSES` / `buildHouse` | `content/houses.json` + `HouseView` prefab + `HouseBuilder`（编辑器烘焙） |
| `FURN` / `drawFurn` | `content/furniture.json` + `Furniture_*` prefab + `FurnitureView` |
| `drawPlayer` / `drawNPC` | `PlayerCharacter` / `NpcCharacter`（Spine） |
| `SCENES` / `drawOutdoorScene` | `OutdoorScene` + `content/scenes.json` + `Interactable` |
| `EVENTS` / `TWISTS` / `STORY` | `content/events.json` / `twists.json` / `story.json` + `NarrativeRunner` |
| `save` / `loadSave` | `SaveService` + `StorageDriver` |
| `updateTime` / `updatePlayer` / `updateAction` | `TimeSystem` / `MovementSystem` / `ActionSystem` |
| `openModal` / `showChar` / `showHelp` / `showPause` / `showLegacy` | `UIManager` + `Panel_*` prefab |
| `startPrologue` / `renderProBeat` | `PrologueScene` + `PrologueView` |
| `toast` | `ToastService` |
| `renderCatalog` / `tryPlace` / `tryRemove` | `BuildSystem` + `BuildPanel` |
| `keydown` / `touch` | `InputService` → `InputIntent` |
| `fit` | `ViewportService` |

## 附录 B：数值速查

- 需求衰减（每游戏分钟）：体力 3.0/60、饱腹 4.5/60、整洁 2.4/60、兴致 3.0/60。
- 情绪：`v=(avg-50)*1.25`；`a=30+(fun-50)*0.45+(energy-50)*0.25`。
- 技能：`xpNeed=30+lv*22`；经验 ×`1+mind*0.02`。
- 画作：`q=clamp(46+lv*6+mood.v*0.24+rand(-9,9),22,100)`；收入 `q*0.85*paintMod`。
- 财富：poor→mid 450；mid→rich 1100；rich→mid <500；mid→poor <90。
- 传承：钱 `*0.5+60`；技能 `*0.7`（最低 1）；声望 +2。
- 事件：8%/游戏小时；每天 ≤2；08:00 后。
- 老周：09:00–21:00；信任 ≥30 可借 60 文。
- 行动时长：见 2.2 家具表。

## 附录 C：术语

| 术语 | 含义 |
|---|---|
| Sim | 纯逻辑模拟层，不依赖引擎 |
| Command | 输入转成的命令，如 `Interact` |
| SimEvent | Sim 发出的状态变化事件 |
| Effect | 内容表中的效果指令 |
| ViewModel | UI 读取的状态投影 |
| Asset Bundle | Cocos 资源包，用于分包/按需加载 |
| Spine | 2D 骨骼动画工具 |
| 9-slice | 九宫格拉伸的 UI 图 |
| Parity | 与现有 Web 版功能对等 |

---

*本文档为 v1.0；评审通过后，任何范围/数值/接口变更需更新版本号并记录变更。*
