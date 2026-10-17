# 直接引文：正式试跑合同检查

本页记录此前切片。当前专用运行器、私有凭据管道和付费加载入口见[专用进程入口](INLINE-PAID-PROCESS-ENTRY.md)；旧草案和旧验证结果保留原样，不把当时的 pending 状态或测试确认当作当前批准。


状态：`paid_contract_checks_verified / paid_runtime_pending`。本轮实现机器可核验的具体合同、确认字段检查、锁内历史证据采集与无密钥 CLI。没有实现收费运行器，合同不是用户已批准的额度，不得把检查通过当作可以请求 Key 或发起真实调用。

## 固定候选与来源

新候选为 `inline-evidence-paid-entry-plan-20261017`，文件在 `docs/proposals/inline-paid-entry-20261017.json`。旧10月16日草案保留原样，不重绑、续期或清算历史。新合同以规范化 JSON 内容 hash 标识；对象字段顺序不影响身份，额外字段、访问器、非 JSON 值及任一条款变化均拒绝。

合同固定 DeepSeek / deepseek-flash / 官方 chat completions endpoint；仅 sparse-context 虚构样例，两幕加一次醒来，最多1运行/3调用、每次400输出 token、请求65536字节、模型正文1200 JSON字节。输入 fictional 和输出 dream/nonfact 分开，私人材料不允许；没有现实工具、关系/工作主题或正向结局配额。

新增候选预算上限为3000000 micro-CNY（3元），不是本轮已经授权的消费。按高峰缓存未命中输入2元、输出8元/百万的保守快照，输入预留1100000 token，加400输出得到每次2203200 micro-CNY完整预留。这个预留不是实际用量估计；字节数不冒充 token 数。真实账户币种尚未核验，不自动转换美元或采用缓存/闲时折扣。

2026-10-17复核公开官方价格、更新记录和模型列表说明：官方更新记录说明 Flash 当日升级到 DeepSeek-V4.1-Flash-1017，调用名与价格不变；英文价格页已显示新修订名，中文价格搜索结果仍显示简写版本。新合同记录观察到的修订名，也明确 `deepseek-flash` 是可变别名，不能保证之后请求锁定相同服务权重。/models 文档中的上下文值是公开示例，本轮没有带 Key 查询真实模型列表。之前试验不作为新版遵守率或质量证据。

复核时刻固定为2026-10-17T14:49:00Z，候选期限至2026-10-18T14:49:00Z；到期阻断，不自动修改日期或价格。参考只采用公开官方资料，独立表述：

- [中文模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)
- [英文模型与价格](https://api-docs.deepseek.com/quick_start/pricing/)
- [官方更新记录](https://api-docs.deepseek.com/zh-cn/updates/)
- [模型列表 API 说明](https://api-docs.deepseek.com/api/list-models/)

## 已实现的检查

`readInlinePaidContract` 读取固定候选并核对闭合条款、当前源码清单、已发布合同内容、协议身份、虚构输入 hash、stub 图 hash 和时钟。清单自身仍排除，根不接受额外运行时依赖。当前76文件清单覆盖新增合同代码，原33模块/184边的图只覆盖固定 stub session；`paidGraphAvailable:false`。显式草案构造函数只用于仓库准备；普通 read/preflight 不改文件，源码更新不能静默替代已发布候选。

`inlinePaidContractPreflight` 复用既有无锁只读历史观察；不选默认用户目录，不创建目录、owner锁、账户或授权，不恢复或删除残留。结果始终 ready=false。历史观察成功只代表当前形状可读，不是 dispatch admission；锁、来源撤回、未决类别/金额不符等照旧阻断。

`inspectInlinePaidAdmission` 要求当前 checkout 中真实持锁 Store，核对所有旧批准/账户/逐项绑定，并返回当前基线 hash 集与首个请求大小，供未来原子授权保存使用。该函数自身无写盘、无新增账户，也不替代未来持久基线比较。Store 构造/启动仍可能执行既有恢复写盘，不能把“检查函数不写”扩大成整个生命周期零写入。请求大小3337字节是 no-egress 原始虚构输入的预览；真实入口必须在精确外发副本和完整已保存幕上再用同一 builder 检查下一请求，不能拿此首幕预览批准后续请求。

四个旧 unknown 独立保留8812800 micro-CNY；金额不代表已确认供应商收费。未来还要保存所有旧账户和绑定的持久基线，重开比较，不能只核对总额或重新采集。取消/失败/撤回沿用保留未知完整预留并阻断迟到正文的规则；只有逐幕已提交且 settled 对应的非空前缀可显式恢复，不补发未知调用。

`inspectInlinePaidAcknowledgement` 只检查恰好包含：合同 hash、3元、sparse-context、虚构外发、保留旧hold确认与可变模型别名确认。返回 `createsAuthorization:false`；这是格式演练，不是用户批准收据。不能把测试里构造的对象或聊天中的笼统“继续”写成持久付费授权。

## 当前入口与验证

无需 Key：

```sh
node src/inline-paid-contract-cli.js proposal
node src/inline-paid-contract-cli.js preflight
node scripts/check-inline-paid-contract.mjs
```

CLI 只提供 help/proposal/preflight，可选显式绝对仓外历史路径；不接受 init/run/live/预算/Key 参数。到期后 proposal 校验也会拒绝，preflight 返回固定到期原因。不会以“查看提案”为名刷新它。

固定自检使用明确标注的复核 fixture 时钟2026-10-17T14:49:01Z，方便日后重现结构机制；不是当前时钟仍有效、价格续期或 live 许可。仅自行构造仓外虚构历史，检查原账户和state字节不变，Key读取/native请求均0，无用户Store。CLI 时钟测试也在独立子进程固定时刻，生产CLI仍用实际时钟。

新增26项；最终 Linux Node24.19.0 全仓706/706，相关207/207，临时 Linux CRLF同组207/207。测试结果和日志见[验证汇总](validation/inline-paid-contract-validation.json)。原有 stub 启动、生产取消/恢复/撤回、历史读取继续回归；Linux CRLF副本不冒充 Windows实机。所有测试只证明合同与机制，不证明真实模型输出、语义支持或梦境质量。

## 尚未实现的四项

1. 新付费授权与账户的原子保存，以及逐阶段重开校验；不能使用 stub 许可或自动迁入旧批准。
2. 专用 live 运行器与固定供应商 transport；现有 inline live allowance/client/runtime 硬阻断本轮不改。
3. 准入通过后才读取、经一次性私有管道送入子进程的凭据通道；不继承 Key 环境，不进 argv、日志或存储，完成重放不索要 Key。
4. 对实际付费 session 的新依赖图与启动接线；当前 stub 图不得冒充正式收费闭包，宿主前置仍需可信且不是 OS 沙箱。

这些完成并验证后，才给糯糯确认具体费用与外发，并提供整段可复制的执行指令。本轮不请求 Key、不执行真实调用、不动 Asteria 或其他仓库。公开仅项目自有 MIT 实现、独立文字与虚构测试，没有复制私有 Continuity 原文、私人聊天/梦簿/配置或密钥，也未复制第三方实现。
