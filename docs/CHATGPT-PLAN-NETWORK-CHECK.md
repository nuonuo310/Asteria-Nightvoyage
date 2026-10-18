# 登录前公开配置检查与固定诊断

本切片针对 `plan_http_failed` 无法区分失败位置的问题。既有登录流程在浏览器前先请求公开 discovery 配置；若这一请求失败，就不会打印本机登录链接或开始 code 交换。此时不是订阅推理资格测试，也不能据此判断账号不符合资格。

新增：

```sh
node scripts/chatgpt-plan-network-check.mjs
```

该命令仅以 Node 原生 fetch GET 固定的 OpenAI 公开 discovery 地址，校验原有 issuer/authorize/token/JWKS/revocation 配置约束。不读取凭据、连接目录或用户梦簿，不创建 Store，不打开浏览器、不登录、不请求目录或模型、不自动重试。返回固定状态、阶段及可取得的 HTTP 状态/网络码；成功也仅表示这一次 Node 请求和配置检查通过。

HTTP 诊断只返回100–599的状态整数或null，网络码只允许固定的 DNS/连接/超时/TLS 常量，其余unknown。没有原始异常 message、URL、headers、响应正文、代理配置、账号资料或token。诊断由HTTP边界用WeakMap绑定到自身异常；不能从任意异常属性直接拼出回执。

原 `chatgpt-plan-login.mjs login` 的失败回执也增加 failureStage 与 httpDiagnostic，区分 discovery_http、discovery_validation、browser_callback、registration_save、token_http、jwks_http、identity_validation、identity_save、catalog_http、catalog_validation。不改变OAuth地址/签名/scope校验、持久client/subject绑定、重定向禁令、20秒/131072字节边界或撤销处理。

本机abort不是已确认远端取消。remoteRevocationConfirmed=null只表示本次未进入code交换，不撤销或确认任何更早的未知会话。未知错误仍固定编号；不放宽TLS、不跟随重定向、不偷偷配置代理，不用另一个账户或新目录绕过失败。

验证使用独立虚构HTTP响应、合成签名和临时Store；没有访问真实官方服务或用户电脑。覆盖403/503、固定DNS/TLS错误、未知异常、恶意正文/headers、配置变化、坏JSON、预取消、失败发生在浏览器前、CLI帮助与参数拒绝。完整统计见 [validation/chatgpt-plan-network-check.json](validation/chatgpt-plan-network-check.json)。Windows实际网络原因仍需用户执行一次此公开配置检查，不能把Linux模拟结果当作其电脑网络已恢复。

无模型生成、API Key读取、新费用、跨仓库写入、第三方代码复制或Asteria桥接。官方协议来源沿用[现有登录说明](CHATGPT-PLAN-LOGIN.md)；不是新认证路线。
