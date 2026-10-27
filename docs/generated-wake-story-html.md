# NV-GENERATED-WAKE-READER-01 · 离线梦簿阅读接线

状态：候选实现完成有界离线验证；不 ready、不合并、不部署。

## 权威与基线

- 唯一施工权威：`docs/construction-envelopes/2026-10-27-generated-wake-reader-v1.md`，取自 `33001e34568c037964333675b923011214a707ef`。
- 固定实现基线：#101 `40589d54838f542e470ed9d45c1f2500193b6eaa`，tree `eb454bda8274476caad1da606bf806e9900887af`。
- 阅读布局与配色参考 #95 `ce0153fb43a19804af3f9163a843ddfdb4eb8404` 的 `scripts/dreambook-story-html.mjs`，blob `14b45a2dbb1b43afc47bba99a5c336af87211764`。本候选没有 import、cherry-pick 或合并 #95。

## 交付物

- `scripts/generated-wake-story-html.mjs`：纯静态呈现层；只接受已校验的阅读投影。
- `scripts/generated-wake-story-demo.mjs`：固定虚构 fixture + 假 simulator，在临时 Store 生成后关闭并导出。
- `test/generated-wake-story.test.js`：呈现、门禁、字节稳定和端到端 demo 测试。
- `docs/examples/generated-wake-story-example.html`：自包含中文虚构示例，无脚本、无远端资产、无网络请求。

## 阅读顺序与语义

页面顺序固定为：原梦两幕 -> 醒来残片 -> 刚醒心情（有记录才显示）-> 后来回想（有记录才显示）。

- 原梦、残片、心情和回想文字逐字来自 `readGeneratedWakeView()` 的受校验投影。
- `absent` 显示轻量“没有记下刚醒时的心情。”；`uncertain` 显示“刚醒时的心情，还说不清。”；省略或已删除的心情的栏目不渲染。
- 没有回想时不显示空卡；多条回想保持投影顺序，不添加伪造时间。
- 投影为 `null` 时只显示“这场梦现在不可读取。”，不输出旧正文或技术区。
- 模拟余韵强度只在原生 `<details>` 技术区显示，并明确“不是持续心情记录，也不随真实回应更新”。
- 主线不显示 provider/model 名、裸 ID、账本、原始状态或强度数字。

## 安全边界

- 动态叙事和详情值先转义 HTML 特殊字符，再将控制字符显示为惰性 `\uXXXX` 文本。
- 输出无 `<script>`、内联事件、远端字体/图片、外链请求或 `localStorage`；CSP 为 `default-src 'none'` 并单独允许内联样式。
- 只使用固定仓库 fixture 和假 simulator；demo 不接受 Store 路径、环境凭据或远程地址参数。
- 导出只是离线副本。来源撤回或删除后，重新读取和导出不会包含旧正文；已经导出的副本不会被自动撤回。

## 本地示例

```powershell
node scripts/generated-wake-story-demo.mjs
```

该命令只写 `docs/examples/generated-wake-story-example.html`，关闭并删除临时 Store，不新增生成调用。

完整命令、环境、退出码和视觉检查见 `docs/validation/generated-wake-reader-v1-validation.md`。
