# Exact account-rate notification opt-out in the local refusal mode

## Observed native boundary

The user Windows continuation receipt observes the one scoped expected trace, then stops at the public account/rateLimits/updated notification during observing. There is still one local POST and no refusalObservation. The thread/catalogue checks and current owned closure/cleanup pass. No account authorization or credential environment is requested. The receipt contains no rate-limit payload; a notification's presence cannot establish logged-in identity, model entitlement, billing or a need to buy credits. [Sanitized user result](validation/user-local-codex-refusal-rate-notification-windows.json).

The trace policy permitted waiting for a continuation; this is not a successful native refusal. Pattern metadata still does not authenticate a cause. A second correctly bound tool-output request remains required.

## Implemented handshake change

Only the explicit check-codex-refusal-continuation entry now requests initialize.capabilities.optOutNotificationMethods with exactly one fixed method: account/rateLimits/updated. The list is not caller-supplied. The original refusal entry and other observers do not select this opt-out. No account request, login, token/credit inspection or provider/model/response change accompanies it.

This uses transport-level notification negotiation rather than accepting or interpreting the received account payload. Incoming validation remains unchanged: if the native server still sends the opted-out method, it is rejected as before. Other account, tool, warning, approval and unknown notifications remain blocked. No required tool/error/cancellation event is added to the opt-out list. The local two-POST cap, one app-server turn, fixed interaction-only response and scoped single trace policy remain unchanged.

Receipts record notificationOptOutRequested, notificationOptOutVerified=false, accountRateLimitPayloadInterpreted=false and accountRateLimitDataReturned=false. Initialize does not acknowledge each opted-out method in its response; even an absent notification does not prove the server honored the setting. These flags cannot authorize real inference or qualify account/model capability.

Independent peer tests validate the exact singleton list at initialization and simulate a background rate update that is omitted only when requested. Separate cases deliberately ignore the setting or emit another account/unknown notification: the owner still blocks and returns no account data or refusal result. Original entry behavior and caller override rejection are covered. Synthetic payload markers are independent fixtures, not actual account data.

Actual maintainer native CLI 0.159.2 still times out before thread preparation, local turn or HTTP POST, with current owned cleanup complete. It reports the requested method, not a verified suppression. Windows 0.160.0 opt-out behavior and the bound refusal continuation are pending. [Validation and final source hashes](validation/codex-refusal-notification-optout.json).

Use the existing explicit local continuation command after syncing:

`node scripts/check-codex-refusal-continuation.mjs --native-executable ABSOLUTE_NATIVE_CODEX_PATH`

The default command remains an independent Node peer. There is no login/live/fee or caller-configurable notification method switch. No old subscription approval is reused. Do not automatically repeat a blocked native result. General handler denial, real subscription readiness, background network containment, descendants and dream quality stay unqualified.

## Official rust-v0.160.0 references

- [Initialize protocol](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v1.rs), Git blob 7d05fb1bd4d62bc79954bdd929a7f9f69936ccf3: opt_out_notification_methods is an optional exact notification-name list, serialized in camelCase.
- [Initialize processor](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server/src/request_processors/initialize_processor.rs), blob d68a29df9f364ed0836904847bae3927db1ae339: negotiated methods are collected into initialized connection state.

Public protocol fields inform original implementation. No upstream implementation or account payload is copied. Source review is distinct from installed native suppression evidence.
