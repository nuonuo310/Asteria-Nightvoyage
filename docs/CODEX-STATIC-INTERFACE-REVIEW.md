# Codex static interface and credential-free metadata review

## Observations, 2026-10-18

The user reported Windows codex-cli 0.160.0 and locally generated static schemas, without a login or model turn. The following five file hashes match the maintainer's embedded Linux codex-cli 0.159.2 schema output byte-for-byte:

| Schema file | SHA-256 |
| --- | --- |
| v1/InitializeResponse.json | 62ad689c2cb6379913c1d72749cfd8de5089d35760214123518eb92eef11acc9 |
| v2/ThreadStartParams.json | e9c6d3cc18d049bfbc0249add3808fb8e5a27e1a0b5a423767aafbc3859a9428 |
| v2/ThreadStartResponse.json | 70d9c9a3a064edb76662ec7cd066d142ed9252b768272bc3a7d00788386755c0 |
| v2/TurnStartParams.json | 2dfcf68705896fadc344ccfeb2e9fe5a6bcbbb8b9a90cf449ce232b636daf05a |
| v2/TurnStartResponse.json | 12c5151421bb061297c9790ff795a44aa4b9bdb91fbb68012dcf0a08cf4198b1 |

These are hashes of public generated protocol artifacts, not credentials, user configuration or generated dream content. No third-party schema bundle or implementation is copied into this repository. The Windows result is user-reported; it is not a maintainer Windows execution. Equality of these five artifacts does not establish equality of other schema files, binaries, effective configuration, platform behavior, entitlement or model output.

## Actual native metadata-only run

A separate maintainer Linux probe started the embedded 0.159.2 app-server with stdio in a new empty temporary working directory and fresh isolated state directory. Its child environment supplied only the fresh state-directory setting, with no inherited credential variables. It sent initialize, then initialized after the matching reply, then config/read with includeLayers false. It did not send login, thread/start, model/list or turn/start. A successful initialization contained the required codexHome, platformFamily, platformOs and userAgent fields; config/read returned an object containing config and origins.

The probe retained no raw reply, config value, private path, user-agent string or credential in this repository. It terminated its owned native process, waited for it to close, and removed the temporary state/working directories. The command completed with exit code zero and the fixed result label native_metadata_preflight_completed. This is actual native initialization/configuration RPC evidence, not a simulation; it is not a native dream stage, Windows run or production provider integration.

No model-generation request was issued by the probe. Total background network activity was not instrumented, so this is not an audited zero-network claim. No user Store or existing Codex account state was intentionally supplied. No session revocation was needed or claimed: no OAuth action was requested. The isolated process did not establish the user's account access, model identity, tool absence, token transport, billing or remote cancellation.

## Admission remains blocked

The existing synthetic RPC fixture intentionally returns a smaller initialization object than the native schema requires. Its previous tests establish ordering and selected guards, not complete schema conformance. A future native path must separately validate required initialization fields and effective thread model/provider, sandbox, instruction sources and local persistence policy. Metadata/config equality alone cannot be treated as authenticated provider attestation.

The next implementation dependency is native configuration/tool-exclusion qualification, followed by a separately gated owner with durable approval, cancellation, unknown-attempt recovery and sanitized receipts. Do not infer all tools are disabled from read-only sandboxing or an approval policy. Do not enable native inference merely because initialize/config/read worked, renew a consumed GPT grant, or switch a failed GPT dream to Codex. Real login and actual subscription inference remain fresh user boundaries. Direct GPT remains the intended primary adapter; Codex remains a distinct backup. API legacy behavior and Asteria ownership remain unchanged.

## Verification and references

This slice adds documentation only. No runtime source, test, fixture, source manifest, default selection or permission changed; the preceding 1351/1351 result remains evidence for its original code revision, not a newly executed suite. Static hash comparison and the actual metadata-only probe are the new evidence. No private Continuity text, user transcript, local absolute path or raw schema/configuration is published.

- [Official app-server protocol and version-specific schema generation](https://learn.chatgpt.com/docs/app-server)
- [Subscription provider configuration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Existing pure RPC rehearsal](CODEX-RPC-REHEARSAL.md) and [independent Node process rehearsal](CODEX-PIPE-REHEARSAL.md)
