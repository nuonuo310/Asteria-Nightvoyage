# 分幕候选：独立有限试跑入口（本次已停止）

后续状态：用户已另行批准并执行一次，第一幕引用校验拒绝、账项unknown，当前停止，不重复下方收费块。见 [真实尝试复查](CONTINUITY-LIVE-REVIEW.md)。

本页其余内容保留入口交付时的提案与操作说明：本阶段完成入口和模拟验证，**没有在用户梦簿初始化额度、读取真实Key或发起真实模型请求**。安装代码、公开profile中的匹配模板、旧余额或旧批准都不构成这次批准。

## 具体提案

| 项目 | 本次固定范围 |
| --- | --- |
| 批次 / 协议 | scene-continuity-dream-trial-20261016 / scene-continuity-quotes-v1 |
| 提供商 / 模型 | DeepSeek官方endpoint / deepseek-flash；非思考、JSON、无流式、无工具 |
| 素材 | 仅公开 sparse-context 虚构样例：未指定身份的人、绿色钥匙、玻璃上的风筝；缺失/拒绝/过期通道不补内容 |
| 新上限 | 3 CNY；1个新梦；最多两幕和一次醒来，共3次调用；每次400输出token及1200 JSON bytes；请求65536 bytes |
| 旧占额 | 保留三笔unknown的6609600 micro-CNY（6.6096 CNY），不结清、不退款、不补跑；金额不等于已确认的供应商收费 |
| 价格复核 | 2026-10-16T16:40Z；有效至2026-10-17T16:40Z（洛杉矶10月17日09:40，北京10月18日00:40） |
| 保守预留 | 2.2032 CNY/次，不是实际调用报价；成功后按已校验usage结算，unknown继续全额保留 |
| 保存 / 接收边界 | 原有仓外单Store；原梦、醒来、余韵、联想、独立评审保持来源和非事实身份；不改Asteria记忆/人格/任务 |

官方参考：[DeepSeek模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)。本轮独立复核Flash峰时未命中输入2 CNY/百万、输出8 CNY/百万及1M context。程序仍以1100000 token作为完整context保守上界，并额外预留400输出：2.2 + 0.0032 = 2.2032 CNY；不把新增提示bytes换算成费用。采用高峰费率，不因当前时段或缓存而降低预留。价格可变，过期阻断，不能改原文件偷偷续期。供应商账单、缓存优惠或赠送余额不由本地结算证明。

本次只有一个独立候选样本，没有随机对照或总体质量结论。失败不自动修复、重试或新增额度；unknown会使剩余阶段停止。无启示、安静或确认并非质量失败。

## 入口与批准

`src/continuity-trial-cli.js` 支持 help、proposal、preflight、init、run、read、content。只有 `run --live` 可能发送，默认没有网络；`init`须同时精确给出3元、sparse-context、虚构外发和旧hold保留确认。proposal去掉allowance并将批准标志设false。profile中的approved对象只是用于逐项匹配的模板，不能单独派发。

50个pin覆盖全部生产JS与旧coupled profile；CRLF仅规范为LF。旧profile/旧价格/旧占额没有更新。新入口需要同一个外部Store中的既有三hold和已完成coupled历史，拒绝另建空目录规避撤回。启动前和每次派发均在owner锁下复核；live运行器还要求精确allowance、固定种子、固定request/session，以及与受管理run一致的阶段payload。底层API不能用另一份`approved:true`对象绕过本次合同。

未批准preflight不创建目录/账户、不读Key。已批准但过期、source drift、fixture变更、撤回、金额/次数耗尽、unknown、失败/取消/删除终态均在Key或派发前阻断。已保存的场景链和prompt/policy身份在Key前检查。后续幕与实际发送body在预留前构造；中途source drift阻断下一次请求。

初始queued可以按同一identity继续；已结算并原子保存的幕，只能明确`--resume`后继续剩余阶段。派发中退出转unknown，第二或第三次也不能补发；不为完整梦境额外收费修复。completed重放与read/content无需Key，不受新派发的pin/价格门禁影响。逻辑只读仍会获取Store锁并应用启动journal，并非零文件写入。

`content`只查看这次新批次的已保存正文，先梦与醒来，再数值与独立评审；不新生成、不自动写评审。未来Asteria适配仍待对接。

## Windows：现在可做的无费用检查

整块复制到PowerShell。固定回到项目目录，UTF-8设置用于避免中文管道解码错误。以下没有init、Key或run。

```powershell
& {
    Set-Location "$env:USERPROFILE\Desktop\Asteria-Nightvoyage" -ErrorAction Stop
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
    $nightvoyageGitState = git status --porcelain
    if ($LASTEXITCODE -ne 0) { throw "仓库状态检查失败，请停止并把输出发回。" }
    if ($nightvoyageGitState) { $nightvoyageGitState; throw "有本地修改，先停止，不覆盖。" }
    git switch main
    if ($LASTEXITCODE -ne 0) { throw "切换 main 失败，请停止。" }
    git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw "同步失败，请停止。" }
    npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw "测试未通过，请停止并把输出发回。" }
    node src/continuity-trial-cli.js preflight
    if ($LASTEXITCODE -ne 0) { throw "预检异常，请停止并把输出发回。" }
}
```

首次缺批准应为`ready:false / continuity_approval_required`，不是调用失败，也不需要重新充值。

## Windows：仅在本次具体费用与外发另行确认后执行

**这一块会初始化独立额度并可能收费；当前尚未获得这次批准。** 确认上表后，才整块复制。无需编辑编号、金额或素材，不要把Key发到聊天/仓库。若profile已过期，原样停止，由项目重新评审新批次，不改截止时间。

```powershell
& {
    Set-Location "$env:USERPROFILE\Desktop\Asteria-Nightvoyage" -ErrorAction Stop
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
    node src/continuity-trial-cli.js init --approve-budget-cny 3 --approve-case sparse-context --allow-fictional-egress --acknowledge-preserved-holds
    if ($LASTEXITCODE -ne 0) { throw "初始化未通过，请停止并把输出发回。" }
    $nightvoyageCheckText = node src/continuity-trial-cli.js preflight
    if ($LASTEXITCODE -ne 0) { throw "预检未通过，请停止并把输出发回。" }
    $nightvoyageCheckText
    $nightvoyageCheck = ($nightvoyageCheckText -join "`n") | ConvertFrom-Json
    if (-not $nightvoyageCheck.ready) { throw "当前不允许新调用，请停止，不重试或重置额度。" }
    try {
        $nightvoyageSecureKey = Read-Host "DeepSeek API Key" -AsSecureString
        $nightvoyageKeyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($nightvoyageSecureKey)
        try {
            $env:NIGHTVOYAGE_DEEPSEEK_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($nightvoyageKeyPtr)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($nightvoyageKeyPtr)
        }
        node src/continuity-trial-cli.js run --live
        $nightvoyageRunExit = $LASTEXITCODE
    } finally {
        Remove-Item Env:NIGHTVOYAGE_DEEPSEEK_KEY -ErrorAction SilentlyContinue
        Remove-Variable nightvoyageSecureKey -ErrorAction SilentlyContinue
        Remove-Variable nightvoyageKeyPtr -ErrorAction SilentlyContinue
    }
    node src/continuity-trial-cli.js preflight
    if ($LASTEXITCODE -ne 0) { throw "结束预检异常，请把输出发回，不补跑。" }
    if ($nightvoyageRunExit -ne 0) { throw "本次未完成，请把结果发回；不自动恢复或新建额度。" }
    node src/continuity-trial-cli.js content
    if ($LASTEXITCODE -ne 0) { throw "内容查看异常，请把输出发回。" }
}
```

不默认添加`--resume`。若进程中断，先发preflight结果，区分已保存阶段和unknown；没有自动第二个梦或额外修复调用。

## 证据边界

验证使用独立虚构历史、dummy Key、固定公开脚本与进程内fetch simulator，包含真正子进程退出但没有真实DeepSeek请求。覆盖缺批准不建目录、精确批准/旧三hold不变、profile/账项/fixture/source变更、expiry、取消/撤回/删除、首轮身份保存、完整checkpoint、并发owner、unknown不重发、明确恢复、无Key读取/重放、内容与独立评审来源。Linux全仓454/454；新增入口31/31；临时Linux CRLF入口31＋预算27＋当前历史2共60/60。历史冻结包装中的coupled23/23与pruned13/13另列，不混入外层计数。原始日志与哈希在 `validation/continuity-entry-validation.json`。

Linux CRLF不是Windows实机，也不验证PowerShell执行策略或真实模型质量。模拟usage不等于供应商费用核验。初次复用测试时若干fixture路径/字段/error期望沿用了旧名；修正测试适配，未放宽协议或门禁。

公开仓库只有自有MIT代码、独立说明和虚构数据；不复制第三方实现、私有Continuity原文、用户真实梦簿/聊天/配置/密钥。本地保证仅限受管理单Store/journal/缓存；终端文本、外部备份、供应商副本与物理擦除不受本地撤回保证。
