# NV-GENERATED-WAKE-READER-01 · 验证证据

日期：2026-10-27

状态：COMPLETE（有界、离线、合成数据）

基线：#101 `40589d54838f542e470ed9d45c1f2500193b6eaa`，tree `eb454bda8274476caad1da606bf806e9900887af`

权威包：`33001e34568c037964333675b923011214a707ef:docs/construction-envelopes/2026-10-27-generated-wake-reader-v1.md`

分支：`codex/nightvoyage-generated-wake-reader-01`

## 环境

- Windows 10.0.26200，Windows PowerShell 5.1.26100.9711，zh-CN。
- Node `v24.19.0`，npm `11.17.0`。
- 视觉检查：Google Chrome `155.0.8059.85`，headless + CDP `Emulation.setDeviceMetricsOverride`。
- 所有 Store 均为临时目录；未读取真实 Store、Key、浏览器或账号凭据。

## 命令与结果

| 检查 | 命令 | 退出码 | 结果 |
| --- | --- | ---: | --- |
| 故事呈现定向 | `node --test test/generated-wake-story.test.js` | 0 | 10/10 pass |
| 故事 + #101 离线 | `node --test test/generated-wake-story.test.js test/generated-wake-offline.test.js` | 0 | 23/23 pass，3112.6494 ms |
| generated-wake checker | `node scripts/check-generated-wake-offline.mjs` | 0 | `COMPLETE_SYNTHETIC_ONLY`，3 次假调用，0 网络/0 真实请求 |
| versioned-wake checker | `node scripts/check-versioned-wake-admission.mjs` | 0 | 历史门禁保持关闭，0 网络/0 真实请求 |
| 旧 reader checkers | `node scripts/check-dreambook-reader.mjs`；`node scripts/check-dreambook-view.mjs` | 0；0 | 均无模型/凭据/真实 Store 访问 |
| 完整测试 | `npm.cmd test` | 0 | 1958/1958 pass，547811.0792 ms |
| 空白检查 | `git diff --check` | 0 | 无输出 |

两个 checker 均报告 `userStoreAccessed:false`、`realModelRequests:0`、`networkAttempts:0`；新/旧账本和清单未刷新。

## 固定 demo 回执

`node scripts/generated-wake-story-demo.mjs` 退出码 0：

- 合成阶段：2 幕 + 1 次醒来，共 3 次假调用。
- 测试输入回想：2 条，按追加顺序导出。
- `stateBytesUnchanged:true`，`storeClosedOnStop:true`。
- `userStoreAccessed:false`，`keyReads:0`，`networkAttempts:0`，`realModelRequests:0`。
- 示例：`docs/examples/generated-wake-story-example.html`，8349 bytes，SHA-256 `3380462b6293d2969e1605ea758db6977df85588392ad0fac3b85cc22f5ad911`。
- 示例只有一处轻量虚构演示说明；技术区显示模拟余韵强度 `0.12` 和 `generated-wake-offline-view-v1`。

## 视觉检查

使用真实 CSS 设备视口，而不是只裁切窗口：

| 视口 | `innerWidth` | `scrollWidth` | `body.scrollWidth` | `details` | 展开 |
| --- | ---: | ---: | ---: | ---: | --- |
| 375×1500 | 375 | 375 | 375 | 1 | false |
| 375×1700 | 375 | 375 | 375 | 1 | true |
| 1280×1900 | 1280 | 1280 | 1280 | 1 | false |
| 1280×2100 | 1280 | 1280 | 1280 | 1 | true |

截图为合成内容，不含用户 Store：

| 文件 | 尺寸 | SHA-256 |
| --- | --- | --- |
| `generated-wake-reader-375.png` | 375×1661 | `74a1c00fd018030a150b6ef6def37bce40e9f0a05753c271d65771cbbc1423ec` |
| `generated-wake-reader-375-details.png` | 375×1827 | `22a4219cdb74dcf402bcc5a7cedb396d27f28c9ab138176736cd9b35558df6f4` |
| `generated-wake-reader-1280.png` | 1280×1900 | `3672857316f6a4279415d8a3f0a2485cbbbb25675a60904f0b4ccc354991878c` |
| `generated-wake-reader-1280-details.png` | 1280×2100 | `a3d6adf1c8071b0dcdefc2b33b69c17d8e813c4196914b6ada0516dcfa859677` |

目视结果：正文可读，无横向溢出；原梦、残片、心情和回想层次清楚；原生 `details` 可展开，展开后技术说明完整可见。

## 迭代中修正

- 首次定向运行 7/10：两处测试误用了不存在的 `fixture.wake.fragment`，一处理解为自定义场景后未同步 affect 摘录。均为测试构造错误，修正后 10/10；实现范围不变。
- 首次截图检查发现技术区把字符串 `viewVersion` 当作数字格式化，显示“不可用”。已改为转义文本并加断言，重跑测试与截图。
- 最终无遗留测试失败。

## 限制与边界

- 视觉验收限于本机 headless Chrome 的 375px 与 1280px 模拟视口，不等同于真实手机或人工可用性验收。
- 没有读取或截图真实 Store；没有真实梦正文、Key、凭据或付费调用。
- 没有新增持续余韵状态机，没有把数值映射成情绪标签，没有真实互动驱动余韵。
- 已导出副本不会被自动撤回；来源撤回/删除只保证后续读取和新导出不含旧正文。
- 不 ready、不合并、不部署、不自动续开下一包。

## STOP 触碰

无。未改写正文/混层，未生成无来源心情或回想，未在撤回后泄漏旧正文，未读取或写入真实 Store，未放宽校验/清单，未修改冻结 `src/`，未发起真实外部调用或费用。

## R1 收尾修正（2026-10-27）

- 授权：`1a404c68f6db3b84adb11b6dcc32bb4036216cb0` 的 R1 节；沿用既有 worktree、分支与 Draft PR #103，未新建任务或 PR。
- 唯一行为修正：`renderFeeling` 的 absent 文案改为 `无（明确记为无）。`；present、uncertain、省略与已删除路径不变。
- 测试断言：absent 显示新文案且不含旧文案；omitted 与已删除均不出现 absent 文案。
- 权威包副本已同步至 R1 内容。
- `node --test test/generated-wake-story.test.js`：10/10，退出码 0，994.0949 ms。
- `git diff --check`：退出码 0，无空白错误。
- 按 R1 未重跑完整 1958 测试或截图；前轮证据保持原记录，不构成本轮重跑。
- 未访问真实 Store、Key 或模型；PR 保持 Draft，不 ready、不合并、不部署。
