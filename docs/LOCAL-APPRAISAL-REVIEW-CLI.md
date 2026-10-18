# 本地独立评审：显式保存与重读命令

状态：`local_cli_supported / asteria_pending`。复用既有 `LocalFileAppraisalReviewAdapter`，为已有且可读的已完成梦保存独立意见。命令不生成梦、不自动评审、不替糯糯验收；原梦、醒来、模拟数值和账本不改。

## 命令合同

入口是 `scripts/local-appraisal-review.mjs`。它位于付费源码清单之外，不修改已有 src、清单、图、候选、价格期限或批准记录。既有付费入口仍按原合同检查；本脚本没有 init/run/live、Key、模型、URL、费用或自动重试选项。

| 操作 | 必须显式提供 | 行为 |
| --- | --- | --- |
| help | 无参数 | 打印说明，不读 stdin、不打开 Store |
| create | --data-dir，stdin UTF-8 JSON | 校验输入后打开已有仓外 Store；通过适配器核验父场景、来源、协议与指纹，原子保存独立意见及幂等索引 |
| read | --data-dir、--review-id | 重开并返回可读意见，包括原评审者身份；没有/已删除/已撤回返回 null |
| list | --data-dir、--dream-id | 返回该梦仍可读的独立意见，包含旧版及修订；不替调用者挑选最新为事实 |

所有目录参数必须是绝对路径，且已有 state.json；没有默认用户目录，不创建空白账户或替代 Store。read/list 也会取得 Store owner，并可能运行既有恢复和原子保存，不能宣称零文件写入。单 Store 锁与字段/父链/来源检查继续由既有实现负责。

create 的输入封闭形状：

```json
{
  "schemaVersion": 1,
  "dreamId": "fictional-existing-parent-id",
  "reviewer": {"actorId": "fictional-assistant-reviewer", "kind": "assistant"},
  "request": {
    "id": "fictional-review-one",
    "requestId": "fictional-review-request-one",
    "sceneIndex": 1,
    "assessment": {
      "eventRelevance": "related",
      "direction": {"valence": "underdetermined", "arousal": "underdetermined"},
      "magnitude": {"valence": "not_established", "arousal": "not_established"},
      "note": "独立虚构意见；不是现实事实或质量验收。"
    },
    "supersedesReviewId": null
  }
}
```

上面是说明性虚构占位，不能当成已存在的梦或对用户梦的预填评审。正式意见必须先读父场景，再按其 estimated/unchanged 分支填写；unchanged 的相关字段必须 not_applicable。程序校验形状及字面身份，不证明意见正确。reviewer 是本地调用者明确提供的身份断言，不是认证系统；模型响应不能冒充评审者，assistant 不能因保存成功变成人工验收。

stdin 最多 16384 字节，等待完成最多 5 秒；严格 UTF-8，支持 BOM、中文和 CRLF。无效输入不回显正文，越界/超时在打开 Store 前停止。语义字段校验需父场景，因此可能已打开 Store，但失败不创建意见。错误输出仅固定码，不打印未知异常、输入、凭据或私有路径。输入内的命令文字是数据，不执行现实工具。

create 只返回无 assessment/note 正文的回执及来源、评审者、父指纹元数据。available 表示保存或幂等重放后可用，不表示新增了一条，也不表示语义通过。read/list 才显式展示意见正文。删除过的意见以相同请求重放不会复活；父梦撤回/删除后 create 失败，read/list 不返回正文。

## 保存、修订和边界

相同 requestId 与相同内容重放同一意见，变化冲突。修改意见要使用新 id/requestId 和 supersedesReviewId；旧版与原梦都不覆盖。引用与 parent 指纹由适配器从受管理 Store 生成，不接受输入覆盖。不能将公开报告或 illustrative draft 直接导入成为已核验的正式记录。

沿用同 Store 的原子提交、无正文幂等索引和撤回/删除日志，没有评审侧缓存、导出文件或第二份正文文件。来源撤回后，重开、read/list 与旧请求不能重露正文；账本保留无正文占款。保证限于受管理 Store/日志/临时文件，不涵盖调用者的输入副本、PowerShell 历史、终端、外部备份/导出、供应商留存或物理擦除。标准输入不等于调用者所有副本都会自动消失。

## 无 Key 虚构检查

在仓库中运行：

```sh
node scripts/check-local-appraisal-review.mjs
```

脚本只在系统临时目录创建独立虚构 Store，用既有模拟器生成三阶段；随后经真实 CLI 子进程保存、幂等重放、重读、修订、再重开、撤回及拒绝旧请求。子进程守卫拒绝 Key 读取与 native HTTP/fetch。仅输出机制汇总，不读默认用户目录、不输出原梦或评审正文，不追加真实调用。原梦/醒来/账目保持、父指纹、评审者身份和受管理正文清除分别断言。脚本结束删除自己的临时数据，不操作用户梦簿。

结果与限制见 [验证记录](validation/local-appraisal-review-cli-validation.json)。Linux 的 CRLF 副本检查不是 Windows 实机证明；虚构脚本通过也不是对真实梦境的语义或质量验收。下一步可让用户跑同一无 Key 自检确认其 Windows 环境，然后再准备明确的实际本地意见保存指令；不默认将本工作台的摘要写入用户梦簿。

本轮独立自有 MIT 实现，无新依赖、第三方实现复制、私有研究原文、真实聊天或梦簿内容，无跨仓库修改。


## Windows 用户实机回报（2026-10-18）

用户同步至 c84efe3 后，在 Windows／Node v24.19.0 运行上述自检，回报完成：3 次假生成，评审追加调用、真实模型请求和凭据读取均为 0。保存回执无正文、父场景指纹绑定、重开读取、重复不增写、修订保留旧意见、原梦/醒来与账本不变、撤回重开后屏蔽旧请求及受管理正文清除均通过。

这补充的是单个独立虚构脚本的 Windows 实机结果，不是 Windows 全仓 825 项测试，不是已给用户保存的梦创建正式评审，也不是人工或梦境质量验收。Asteria 仍待对接。[独立聚合回报](validation/user-local-appraisal-review-cli-windows.json)不含终端原文、私人路径、梦/意见正文、实际运行编号或密钥。

本次仅记载结果，不改代码、合同、额度、占款或价格期限，不重跑已通过的检查，也不追加模型调用。下一步可准备对已保存梦的显式本地意见保存与重读指令；必须清楚标为助手意见，保持父场景身份和原梦不变，不能将此虚构自检当成实际保存已完成。
