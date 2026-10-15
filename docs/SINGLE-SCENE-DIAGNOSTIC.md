# 单幕、单请求的协议诊断入口

最新状态：用户报告 Windows 167 项离线测试通过，随后明确批准并本地执行唯一一次诊断，分类为 `unused_compact_evidence`，该次额度已消耗且被阻止继续。两笔未知占用保留，没有保存生成正文。详情及只用独立虚构样例的候选比较见 [诊断复查](UNUSED-QUOTATION-REVIEW.md)。下文保留原交付提案与合同背景，不代表再次运行授权。旧失败的原因仍未知，本入口不能找回已丢弃的响应。

## 本轮要回答的一个问题

同一固定 `sparse-context` 虚构素材、同一 `compact-appraisal-quotes-v1` 第一幕请求，在一次新生成中是否通过原校验；若未通过，能否得到程序固定的细分分类。它不是旧错误的重现保证，也不是梦境质量评估或完整梦境闭环。

新入口为 `src/single-scene-cli.js`，实现为 `src/single-scene-diagnostic.js`，复用已有 snapshot、Store、BudgetLedger、GatedDeepSeekClient 和原协议规范化器。没有新增模型、HTTP override、第三方依赖或代码复制；使用本项目 MIT 代码。

只请求 scene/index 0，`previousScenes:[]`，原 400 输出 tokens / 1200 正文字节限制、JSON/非思考/无流式/无工具合同不变。成功后不请求第二幕或醒来，不发布 dream、wake、residue、association、recall 或 appraisalView。客户端校验期间短暂处理正文，**返回和持久化仅保留元数据，不保存生成正文**。成功只表示结构/逐字引用校验通过；语义支持和质量仍为 `not_assessed / false`。

## 新批准、原账本和未知占用

提案 `compact-single-scene-diagnostic-20261015`：固定上述一份素材/来源版本，新增人民币 3 元总上限，最多一个诊断 admission、一次 API 尝试。沿用原外部 Store，Windows 默认 `%LOCALAPPDATA%\Nightvoyage\first-fictional-trial`；不得换目录绕过历史。

初始化不仅需要准确的费用、素材编号和虚构外发批准，还需显式 `--acknowledge-preserved-hold`。只有原 compact trial 恰为零幕、一次 unknown、`compact_appraisal_invalid` 的失败记录，且旧占用完整保留，才能进入；原三组质量筛查仍须已完成。其他未知尝试一律阻止，不能借此入口接着跑旧场。新成功或失败均不释放、覆盖或重置旧占用。源码素材仍为 `modelEgress:false`；只有已批准的精确运行副本开放外发。

四个协议/诊断源码摘要与素材摘要支持 CRLF/LF 规范化，其他变化拒绝。原价格审核配置及 **2026-10-16 12:10 UTC** 到期时间不变；每次完整上下文保守预留 2.2032 元，非实际费用预估。真实调用前仍需当前官网价格复核及本轮新增批准，不能沿用上轮批准。

新账本额度上限独立于原保留额：若本次也未知，最多再保留 2.2032 元；两次 compact 未知保留可合计 4.4064 元，此外还有更早已结算金额。**保留额不是已核实的服务商扣费。** 通过原验证的响应仍按原用量/保守费率结算；没有新失败结算、自动退款或提高额度的路径。累计 `runs` 含诊断 admission，不能作为梦的数量。

## 持久化、读取与取消

- 新 `state.protocolDiagnostics` 只存固定版本/协议/额度身份及 running/accepted/failed/cancelled 状态，不存种子或输出正文。成功状态通过已有 publication 回调与账本结算在同一 Store 保存中提交。
- 原 `receipt.billing` 保存固定验证分类、来源编号/版本及用量/占用元数据。来源撤回后不产生正文可恢复路径；无新正文缓存、索引、日志或备份。外部复制、终端、服务商及物理擦除边界沿用原合同。
- `preflight / read` 无需密钥；缺本轮批准时不创建目录、Store 或账户。有效配置下 `run --live` 持有同一个 owner lock，复查先于读取环境密钥。
- 一旦持久化开始记录，取消或中断也不自动重跑。调用前取消可消耗零次预算，但 admission 保持阻断；首次状态保存失败且未持久化、未发送时，没有伪造成功记录。
- Ctrl+C/SIGTERM 传递取消信号；未知/在途请求保留全额且不暴露迟到正文。实际进程退出后，原 Store 将 reserved/dispatched 转成 unknown；running 元数据不会授权再次发送。成功后也不能重复调用。
- 没有 resume/reset/任意模型或传输参数。`read` 只返回 body-free 状态和计费记录，不读回被丢弃的事件。过期或撤回可阻止运行，已有元数据仍可供核对。

## 离线交付与下一步

13 项新测试覆盖精确批准和旧失败前置条件、额外未知阻断、未批准预检只读、无密钥/无 live/非法参数、保留旧账本、一次成功、细分失败、HTTP/坏 JSON、取消/撤回、实际子进程退出、重复/并行去重和状态/结算写盘故障。测试使用独立虚构事件、dummy key、临时 Store 和明确的内存 HTTP 模拟；生产入口不开放模拟、时钟或 endpoint 覆盖。

原交付完整 Linux LF 与临时 Linux CRLF 副本结果及源码摘要见 `docs/validation/single-scene-diagnostic.*`。后续用户报告 Windows 167 项通过并完成唯一一次真实诊断，结果见上述复查。这是同作者复查和用户本地报告，不是独立审计、原始 HTTP 或账单核验；均不能证明语义支持或梦境质量。

当前额度已消耗，勿再提供初始化/执行指令，也无需为补证重复跑既有套件。新的离线引文策略对照尚未启用；未来若另做真实验证，需要先准备明确范围并重新取得批准，不能沿用本次授权。本轮没有 Asteria 或其他仓库修改；未来适配器仍为待对接。
