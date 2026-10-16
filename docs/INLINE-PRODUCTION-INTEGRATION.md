# 直接引文生产集成：审查结论与实施顺序

状态：**design_review_complete / production_integration_blocked**。本轮完成源码盘点和独立反例核验；没有把stub搬进生产、修改旧profile、打开用户Store或发出真实请求。预算stub已实现，不等于生产门禁或真实生成质量通过。

## 本轮发现：先补执行归属

当前通用`Nightvoyage.resume`可接手其他运行器留下的failed记录。固定反例在仓库外临时Store内，先让独立inline预算stub拒绝一个虚构响应、留下unknown，再由普通假模型入口resume同一记录：它能发布两幕fake梦，而该记录的stub标记和unknown仍在。普通入口不理解该运行器的协议/结算要求，却继续了执行。

这是**已在独立虚构反例中确认的机制问题**，不是对用户梦簿受损的断言，也不是收费重试：反例只有本地simulator和FakeProvider，无Key/HTTP。拒绝正文未保存，报告不含生成正文或运行编号。

`test-support/inline-integration-review.js`的候选`ReviewedPlainFake`会在execute和resume前拒绝带foreign标记的记录；反例确认运行及unknown保持不变，普通无标记fake仍可完成。**候选检查尚未写入生产，问题还没有修复。** 用户暂时不要通过通用`src/cli.js resume`恢复其他入口的失败记录。

生产修复必须覆盖execute和resume，不只在CLI拦截：新的运行持久保存执行family/版本/协议与provider身份；对应运行器明确核验自己所属的family。已有未标记普通fake记录可按旧合同读取/恢复，带billing/appraisal/stub等专属标记的历史记录不能降级为普通fake。各专用运行器还须复核自己的原合同；不能只靠任意构造器名称、非空字符串、调用者声称已校验或instanceof绕过。

读取与执行分开：list/read、梦境来源和既有结算回执不能因禁止续跑而消失；撤回/删除仍立即优先。guard不退款、不释放unknown、不重标原梦，也不能为了“兼容”让旧failed变成可自动重试。

## 已核对的源码边界

当前src顶层49个JS和旧coupled profile共50pin逐项匹配，生产模块没有导入test-support。该盘点只描述**当前顶层清单**；新增子目录不能被当作已覆盖的依赖。现有pin函数核验已列项，不会自动发现未来漏列文件。未来profile必须明确覆盖递归生产依赖、动态读取的合同/模板和fixture身份，路径检查与LF归一化均需测试。

修复共享engine及专用执行归属后，旧continuity source pins会漂移，这是正确的派发阻断。不能改旧profile来掩盖变化。先在test-support冻结被改的项目自有MIT历史源码并核对其旧pin，只供隔离历史测试；生产不能导入或自动切回冻结派发代码。保留旧入口的无Key只读能力，并用当前源码测试旧完成/失败记录、撤回及旧unknown不变。冻结测试通过不替代当前源码测试。

## 生产集成裁定

| 项目 | 采用方案 | 不属于本轮完成内容 |
| --- | --- | --- |
| 新协议 | 独立inline版本，明确直接basis引文、affect分支、提示hash及醒来策略 | 没有生产selector或已批准profile |
| 正文与依据 | 新格式程序去重内部引用，原数值、分支、引文和unknown占位不变；完整前缀校验 | 不修复旧非法索引，不推断缺失情绪或目标 |
| 正式账本 | 未来使用共享生产billing根下**新协议绑定的新allowance**，复用原子结算/启动unknown处理 | 不将inlineStubBilling或其合成usage迁入正式账户 |
| 历史约束 | 四个既有unknown逐项核对账户/请求归属、来源版本、状态与完整保守hold；旧完成账项也保留 | 不只核对总额，不改旧配置/额度，不自动清算 |
| 来源权限 | 公共fixture保持no-egress；未来仅获该批次明确批准的本地运行副本可外发 | 没有私人素材授权，Asteria接口仍待对接 |
| 输出 | dream/wake/residue/recall候选/待验证联想/receipt分开；素材身份与梦境非事实各自标记 | 不把梦当事实或指控，不写真实记忆/人格/任务 |
| 读视图 | 先保持旧独立只读合同；新协议仅在完整父梦/来源/版本校验后显式加入 | 不声称现有生产评审适配器已支持新协议 |
| 控制 | 默认关闭；独立启动/取消/状态；同请求去重；仅明确安全前缀恢复 | 没有隐式repair、第四调用、超时补发或未知调用退款 |

真实transport需继续复用/核验官方固定endpoint、凭据后置读取、不跟随重定向、禁止live fetch覆盖、请求65536 bytes、响应流/读取时间上限、400输出token及1200 JSON bytes约束。实际请求body与snapshot指纹必须和送出的内容一致，调用中输入变更不得改变发布阶段或来源。

正文、committed checkpoint、usage及settled记录同次持久保存；任何派发后未知状态保留全额hold。严格区分真实usage、保守占额、已确认账单和脚本计数；单纯结构拒绝不等于供应商未收费。body-free诊断需使用固定词表，新直接格式错误不能沿用未知自由文本或猜测上次坏字段。

## 接续切片与验收门槛

1. **执行归属修复切片**：实现共享核心及各专用运行器的明确owner核验；冻结必要历史测试源，不更新旧profile。当前源码反例必须从“可续跑”变成拒绝；普通fake、各自合法专用恢复、只读旧结果、四hold/撤回/删除不回归。运行必要全仓与历史隔离套件。
2. **生产协议与预算切片（默认disabled）**：项目自有新源码实现直接引文规范、checkpoint、固定诊断、受限transport和新allowance绑定。纯stub复核预留/派发/每幕/醒来原子提交、真实子进程死亡、并发、取消、超时、拒绝与旧账本隔离。不依赖test-support实现，不加入真实入口或Key。
3. **只读及适配器切片**：新增协议的只读内容、独立评审、cue召回和来源撤回规则同合同测试；保留原梦/醒来/回想/续写区分、珍藏/日常访问/余韵独立。未来Asteria adapter仍pending。
4. **提案与门禁切片**：准备独立reviewed profile及依赖闭包、固定fixture、历史前置、credential-free preflight、Windows整块命令。Key之前验证当前源码/合同/历史/预算/来源/下一实际请求；底层API也不得绕过。无批准时不创建账户/目录、不读Key、不派发。
5. **另行确认后真实试跑**：届时复核提供商/模型、官方价格/上下文、价格到期、具体费用和虚构外发，以及四旧hold继续保留。本轮不选定新金额、不沿用旧3元授权、不新建额度。最多两幕加一次醒来；任何失败停止，不自动补救。

每一切片记录实际代码、测试结果及限制；设计通过不记作运行通过，stub通过不记作真实协议/语义/梦质量通过。第一条修复完成前，整体仍blocked。

## 本轮证据和边界

`node scripts/check-inline-integration.mjs`只访问当前源码与自行创建/删除的临时目录。native fetch和Key读取guard均为零。候选owner检查11项，联合上阶段预算33项及当前入口31项共75/75；无新全仓、CRLF或Windows实机成绩。详见[验证记录](validation/inline-integration-validation.json)。

公开内容仅独立MIT实现/说明、源码清单和虚构反例汇总；未复制私有Continuity原文、真实聊天/梦正文、配置、密钥或用户运行编号。受管理单Store以外的终端、导出、备份、文件历史/物理擦除、供应商留存仍不在撤回保证范围内。
