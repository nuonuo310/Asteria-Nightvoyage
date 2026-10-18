# 本机 ChatGPT 订阅登录核对

用户已接受订阅路线的替代限制并授权继续接入（2026-10-18）。这一切片实现本机登录及型号目录核对，**没有生成入口**；最多3次生成请求、每次60秒和JSON正文1200字节的执行门禁仍待下一切片。API、额外积分消费和旧 DeepSeek 新额度均未授权。

## 使用

Node.js 24+，在夜航仓库执行：

```sh
node scripts/chatgpt-plan-login.mjs login
```

Windows 会用系统浏览器打开本机一次性入口，转到 OpenAI 官方登录/授权页面。其他平台仅打印本机链接，手动打开。5分钟内完成；回调页只表示收到回调，最终以终端的签名、身份、scope及型号核对结果为准。Ctrl+C取消。不要把登录回调URL、密码、令牌或账号页面截图发到公开仓库/聊天。

成功输出 status=signed_in_models_checked、modelChoices、identityValidated、planScopeGranted。这只证明本次身份及权限校验、型号目录请求成功，**不证明某型号真实推理可用、套餐资格全部满足、用量设置已核对或梦境质量通过**。结果明确 generationEnabled=false、usageSettingsVerified=false、extraCreditsApproved=false。

若失败，只回报终端固定reason即可；不要手改连接文件、换目录或重新注册来绕过失败。浏览器登录墙、网络/地区/账号权限和官方接口变化可能使实际流程失败；本轮仅有独立模拟服务证据，未在用户账号上验证。尚未提供跨账号切换，已有绑定身份不一致会拒绝，不按同邮箱自动合并。

若未出现本机登录链接就返回 plan_http_failed，可先运行[不登录的公开配置检查](CHATGPT-PLAN-NETWORK-CHECK.md)。新失败回执提供固定阶段与HTTP状态/网络码，不需要发送回调、原始错误正文或私人配置。

## 登录与保存边界

- 动态注册使用官方公开client入口，先持久保存每安装实例的UUID host ID。已返回issued client ID会在交换code前落盘；交换失败也保留它，下一次复用，不自动另注册。
- 127.0.0.1随机端口与固定/auth/callback，精确state、nonce、PKCE；回调一次性消费、5分钟到期、Host/Origin/方法检查，无CORS、脚本或远端监听。不打印原始回调/供应方错误。
- ID token用官方JWKS、Node内置crypto独立验证。首版仅支持RS256（RSA至少2048位）及ES256/P-256，检查签名、kid、issuer、audience/azp、expiry/iat/nbf、nonce、已绑定subject和token响应的plan scope；未知算法/密钥/字段失败关闭，不自动放宽或信任JWT解码结果。无第三方JWT实现复制或新依赖，尚未完成第三方安全审核。
- 公开discovery的issuer、authorize/token/JWKS地址精确核对；撤销地址从该文档发现，只接受同一HTTPS issuer、无用户信息/查询/fragment的URL，不猜路径。HTTP禁止重定向，无自动重试，单请求20秒、JSON响应131072字节；取消后晚到内容不作为成功结果。
- 首版只核对一个连接。Windows连接元数据位于LOCALAPPDATA/Nightvoyage/chatgpt-plan-connection，其他平台在用户.local/share/Nightvoyage下。只保存host ID、issued client ID、验证过的opaque subject及结构版本；**不保存邮箱、access/refresh/ID token、PKCE、授权code或型号目录**。此连接目录不是新梦簿或预算账户，不改变/接管旧梦簿与历史占款。
- 复用单owner受管理Store的原子持久化和锁。拒绝非空梦簿/计费Store，但Store启动恢复可能先写入；不是对任意第三方目录零写入探测。身份绑定保存失败仍尝试撤销当次会话并释放owner。
- 所有凭据仅在当前进程内存使用；结束时尝试撤销此次refresh会话，清掉程序引用，不宣称物理内存擦除或对进程转储/操作系统的控制。不会注销用户浏览器里的ChatGPT登录，也不删除已注册client。正常退出可撤销；进程被强杀、断电或token响应丢失时可能无法确认远端撤销，须在官方设置断开应用。无自动token续期、后台驻留或跨进程续跑，下一次需重新浏览器登录并复用issued client ID。
- remoteRevocationConfirmed=true只表示官方撤销请求返回成功；false明确提示未确认；null表示未进入code交换，无待清理的已知会话。撤销失败不重试、不把它写成成功，也不进行生成。连接和身份映射同样属于私人配置，不应上传。

## 下一步

先由用户在自己的电脑完成这一登录核对，取得可选型号；再绑定一个型号、虚构材料版本与官方应用用量/积分设置，接持久的三阶段执行门禁。不能用登录成功或目录展示替代“不会额外扣积分”的核对，也不发生成请求测试权限。原来的400 token服务端硬上限仍不可用；字节和超时限制并不保证云端即时停止或退还用量。

输入、梦境非事实身份、独立余韵、原梦/派生分离、取消、去重、恢复和撤回要求保持；Asteria仍待对接。本轮没有修改src/fixtures/package、付费源码清单或历史许可。下一切片不能仅把此登录函数插入旧DeepSeek客户端或把凭据存进state。

## 验证与官方参考

`node --test test/chatgpt-plan-auth.test.js test/chatgpt-plan-login.test.js`：独立RSA/EC签名与反例、PKCE、回调、回调取消/超时、真实本机HTTP回环但模拟官方服务、issued client先落盘、scope/签名失败抑制目录、凭据不落盘、保存失败后的撤销与释放、未确认撤销及CLI参数拒绝。模拟凭据不是用户凭据，模拟目录型号不存在。Windows浏览器启动与官方网络/账号行为仍待实机核对。

实现为独立表述和代码，只依据公开协议要求；无复制官方示例或第三方实现。继续使用[官方注册/登录](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)、[身份签名验证说明](https://developers.openai.com/siwc/website)、[模型目录](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)、[账户/会话撤销](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)、[token字段](https://developers.openai.com/siwc/token-sharing-open-source/token-reference)。
