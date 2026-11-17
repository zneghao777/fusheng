# 项目开发约定

这些约定适用于整个仓库。

1. 提交代码时使用中文描述，默认不要推送。
2. 删除界面中多余的标语、说明文字和次要标签。如果删完界面就看不懂，重新设计布局。
3. 每次修改都要兼顾用户体验、开发体验和 AI Agent 的使用体验，三个都要变好，且不能破坏现有功能。

## 开发与验证

主工程位于 `fusheng-cocos/`。在该目录安装依赖后，可以执行以下检查：

```sh
npm run content
npm run typecheck
npm test
npm run build:web
```

首次打开或构建工程时，Cocos Creator 3.8.8 会生成类型检查所需的引擎声明。
Web 构建并启动服务后，使用 `npm run test:web` 进行浏览器回归。

`game/index.html` 是早期版本和迁移基线，构建审计会校验其哈希。修改游戏内容时，
优先使用 `fusheng-cocos/content/` 和主工程源码。背景音乐有单独的第三方许可；
不要提交被忽略的 OpenTracks 音频或本地生成的 `assets/resources/config/music.json`。
