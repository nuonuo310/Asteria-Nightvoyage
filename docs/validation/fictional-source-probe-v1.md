# NV-FICTIONAL-SOURCE-PROBE-01 验证回执

日期：2026-10-27

状态：COMPLETE（固定虚构输入、临时 Store、fake transport、无真实模型）

固定基线：#103 `d7f070713aa7d13828efc18667ae66b7a62d257b`，tree `11a67a7e2ffd285ab59d6de8b6ae2802c6ce47f4`

权威包：`3904eabf60146fe0b62658fa79b35179c34ca799:docs/construction-envelopes/2026-10-27-fictional-source-probe-v1.md`

分支：`codex/nightvoyage-fictional-source-probe-01`

## 固定输入

唯一 fictional memory source：

> 两个虚构人物曾在雨停后走过一条小街。一个人轻敲杯沿两下，说有件事下次再讲；另一个人保留了一张折过的车票，票面日期后来模糊了。除此之外没有关于两人关系、那件事的内容或后来结局的资料。

- `source.id=fictional-source-probe-memory`，`version=1`
- 文本 SHA-256：`605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6`
- 临时 Store 中只有这一个来源；未指定恋爱、分离、悲剧、那件事的内容或结局。

## 命令与结果

| 检查 | 命令 | 退出码 | 结果 |
| --- | --- | ---: | --- |
| 新探针定向测试 | `node --test test/fictional-source-probe.test.js` | 0 | 1/1 pass，479.1976 ms |
| 探针回执 | `node scripts/fictional-source-probe.mjs` | 0 | `BOUNDARY_HOLDS_SYNTHETIC_ONLY` |
| generated-wake 相关测试 | `node --test test/generated-wake-offline.test.js test/generated-wake-story.test.js test/fictional-source-probe.test.js` | 0 | 24/24 pass，2705.2367 ms |
| generated-wake checker | `node scripts/check-generated-wake-offline.mjs` | 0 | `COMPLETE_SYNTHETIC_ONLY`，0 网络/0 真实请求 |
| 既有 wake 测试 | `node --test test/wake-first-feeling.test.js test/versioned-wake-admission.test.js` | 0 | 13/13 pass，1312.8672 ms |
| versioned-wake checker | `node scripts/check-versioned-wake-admission.mjs` | 0 | 历史门禁保持关闭，0 网络/0 真实请求 |
| 空白检查 | `git diff --check` | 0 | 无输出 |

按包要求未重跑完整 `npm.cmd test`；前轮 1958 项完整测试不是本轮证据。

## 实际请求捕获

探针捕获的是 `GeneratedWakeRehearsal` 实际构造并交给 fake simulator 的请求，不是 fixture 常量：

| 调用 | stage | sceneIndex | 原素材 | 前幕数 | sourceRefs |
| --- | --- | ---: | --- | ---: | --- |
| 1 | `scene` | 0 | 逐字存在 | 0 | 1 条，匹配固定来源 |
| 2 | `scene` | 1 | 逐字存在 | 1，第一幕逐字存在 | 1 条，匹配固定来源 |
| 3 | `wake` | 2 | 逐字存在 | 2，两幕按序逐字存在 | 1 条，匹配固定来源 |

均记录 `materialKind=fictional`、`generatedEventOrigin=dream`、`isRealityFact=false`、`max_tokens=400`。三次请求的 sourceRefs 均为 `fictional-source-probe-memory@1`。

## 视图与只读字节

- 视图保留两幕原梦；残片 `只把它放回衣袋` 是第二幕的逐字连续摘录，`fragmentSceneIndex=1`。
- `firstFeeling` 为 `present`，文本来自预写 fake 响应，`textBasis=generated_fictional_wake`；不是从候选素材句子自动生成。
- 后来回想由探针在生成完成后显式追加，作为独立固定测试输入；只有一条。
- 原梦、心情、回想拥有不同记录 ID，正文互不替代；渲染顺序为原梦、残片、心情、后来回想。
- 生成及追加上下文后、读取视图前：`state.json` 11590 bytes，SHA-256 `543eddcb065f652dc7fd727e86376ff1f0615e0dc92a06fdb1ce4a59d04706d1`；`readGeneratedWakeView` 与渲染后字节、哈希完全一致。
- Store 在停止时关闭，临时目录已删除。

## 机读回执摘要

```json
{
  "status": "BOUNDARY_HOLDS_SYNTHETIC_ONLY",
  "ok": true,
  "requestCapture": {
    "count": 3,
    "stages": ["scene", "scene", "wake"],
    "indexes": [0, 1, 2],
    "sourceInEveryRequest": true,
    "secondHasSourceAndFirstScene": true,
    "wakeHasTwoScenes": true,
    "allSourceRefsMatch": true
  },
  "view": {
    "dreamScenesExact": true,
    "fragmentExact": true,
    "feelingExact": true,
    "recollectionExact": true,
    "layersDistinct": true,
    "layersOrdered": true
  },
  "store": {
    "stateBytesUnchanged": true,
    "storeClosedOnStop": true,
    "temporaryStoreRemoved": true
  },
  "boundaries": {
    "userStoreAccessed": false,
    "realStorePathInput": false,
    "keyReads": 0,
    "networkAttempts": 0,
    "realModelRequests": 0,
    "realFeesMicroCny": 0,
    "paidCalls": 0
  },
  "judgement": {
    "inputBoundaryHolds": true,
    "readLayersHold": true,
    "qualityAssessed": false,
    "sampleResponseRole": "prewritten_fake_values_not_model_works"
  }
}
```

## 人可读判断

输入边界成立：固定候选作为唯一 fictional memory source，经过既有 contract 的 request builder 进入第一幕，并继续出现在第二幕与 wake；前幕逐次累积，sourceRefs 与视图来源一致。该结论只覆盖输入路径、fake transport 和既有只读投影。

以下内容全部是预写假值，不是模型作品，也不能证明内容质量：两幕事件、残片、模拟 residue `0.08`、刚醒心情、零条联想及后来回想。它们只用于走通路径。

仍未知：真实模型是否保留关系与未完成动作、文学质量与因果连贯性如何、任何 appraisal/affect 是否有语义支持、真实 wake 是否避免复述或补写解释、真实回想是否会自然出现。本探针未评估这些项目，也未读取真实 Store、Key、网络或产生费用。

## STOP 触碰

无。未修改 `src/`、`fixtures/`、运行入口、协议提示、账本、清单、许可或 `package.json`；未新建示例剧情或覆盖既有 HTML 示例；未使用真实用户/沈述经历、真实 Store、Key、模型、网络、付费或自动重试。PR 将保持 Draft，不 ready、不合并、不部署。
