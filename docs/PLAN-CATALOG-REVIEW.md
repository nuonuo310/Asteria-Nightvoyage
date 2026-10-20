# Selected ChatGPT-plan catalogue shape review

This is a separately approved, catalogue-only login entry. It addresses the account-metadata evidence gap after the Windows fictional catalogue/environment comparison. A subsequent user-reported catalogue-only observation is recorded below; native compatibility remains unresolved. It does not start Codex, pass a token to a child, call Responses, generate a dream, establish inference entitlement or grant production adapter admission.

## Exact scope

The existing checked application OAuth owner validates identity, plan scope and the visible model list. Inside its transient checked session, this entry makes at most one additional authenticated GET to the same fixed https://api.openai.com/v1/models endpoint, selecting only gpt-5.6-sol. Thus the maximum is two authenticated catalogue GETs total: one owned by login validation and one by this review. No HTTP retry is added; no POST to a model endpoint is present. The existing same-issuer refresh-token revocation attempt still occurs at action end. Authentication token exchange and revocation are separate from catalogue GETs and inference accounting.

The application receives OAuth credentials in memory through the existing checked owner; it never asks the user to paste a token or API key. The connection store retains its existing app/client/identity mapping, not credentials. The new review store is separate from every dream, billing and historical trial store. The entry cannot refresh an old grant or continue an earlier failed dream. No new paid API or extra-credit approval is provided.

The catalogue projection reads only the selected model's fixed known fields through own-data descriptors. It returns closed labels for visibility, shell_type, apply_patch_tool_type, tool_mode, input_modalities, experimental_supported_tools and the presence/type of an instruction template. Unknown values become unreviewed; absent values remain missing. It does not return raw property values, instructions, other model records or account metadata. It does not turn a field's presence into a capability conclusion or feed a projected/fabricated catalogue to Codex.

Source: [OpenAI models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) and [Codex app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server), reviewed 2026-10-20. The first describes the authenticated account catalogue; the second warns that a native model/list can instead be bundled/cached. A selected-model catalogue entry is not proof of a successful inference request. Those sources do not establish that this application's selected raw fields form a complete native model schema; native compatibility remains not assessed even when labels are recognized.

## Approval and durable stopping

- `node scripts/plan-catalog-review-cli.mjs preflight` is credential-free and does not create a missing review store. It shows the exact source-pinned proposal.
- `init --approve-catalog-login --acknowledge-no-inference` requires fresh explicit user confirmation. It creates one immutable allowance with a 24-hour expiry, one authorization attempt, at most one additional catalogue GET, zero model requests and zero native Codex children.
- `run --login` consumes the durable authorization intent before contacting discovery or opening a login callback. No separate native executable is selected. The browser link is local and transient; do not share it or callbacks. The program does not automatically open a browser.
- A network or login failure consumes this authorization attempt even if no model call occurred. Re-init does not reset it, extend expiry or silently request another session. Queued cancellation is terminal without login. Restart after an unfinished authorizing intent reports uncertain and cannot log in again.
- The additional GET intent is durable before credential use by HTTP. Late/cancelled metadata is discarded. A failed persistence operation prevents publication; the existing OAuth finally still attempts cleanup when reached. Process death can prevent remote cleanup, which remains explicitly unknown rather than invented successful.
- Metadata observation and cleanup are separate facts: observed with remoteCleanupMayBeRequired=true is not a clean remote session. If revocation is unconfirmed after authorization, disconnect the app in ChatGPT Settings before another authorization. A locally closed callback is not proof of remote revocation or cancellation.

Reports always keep external_calls_started=0, realModelRequests=0, nativeChildrenStarted=0, generationEnabled=false and productionAdmission=false. They count authorization and additional catalogue intents separately. Persistent reports contain only closed shape/error/network labels, source pins, timestamps and approval state, never an access/refresh/ID token, callback, raw model record or generated body. JavaScript reference disposal is not memory zeroization. No Asteria bridge/canonical state, private memory, user dream book or other repository is modified.

## Verification and next boundary

All automated verification uses independent synthetic OAuth/JWT/HTTP and local loopback callback fixtures. Tests cover closed projection and unknown/absent fields, large irrelevant metadata, missing/duplicate selected data, exact approval, no-store preflight, no model endpoint, replay, cancellation including noncooperative late response, expiry, foreign ownership, overlap, durable save failure, actual child process exit at authorizing/observed stages and explicit failed revocation. The default CLI has no test-auth override, transport injection, model selection or fee flag.

Evidence: [validation](validation/plan-catalog-review.json). No real account login or catalogue read is claimed by these tests. The subsequent user operation completed this bounded directory review; its allowance is consumed and must not be rerun. Actual native credential ownership, actual catalogue-to-native compatibility and a separately approved inference diagnostic remain future work. The previous Windows four-case observations remain independent evidence; they do not authorize this entry.

## User-reported Windows catalogue observation

The [sanitized receipt](validation/user-local-plan-catalog-review-windows.json) reports one authorization attempt, one additional catalogue GET intent, zero model requests and zero native children. The selected model is listed; patchType=freeform, inputModalities=text_and_image, experimentalTools=empty and instructions=text_present. Remote revocation is confirmed. This is user-reported evidence, not a maintainer account reproduction. The action and following preflight repeat the same observation.

shellType=unreviewed and toolMode=unreviewed mean only that the original values did not match this version's closed vocabulary. Their original values and types are not retained. They cannot be recovered or relabelled from this receipt, and do not prove either incompatibility or support. Do not broaden the source-pinned consumed entry to reinterpret history. Review the relevant provider/native field definitions offline before proposing any distinct diagnostic. No new login, inference or native credential transfer is approved by this record.

The unchanged entry's 11 tests passed again on Linux; its implementation, test and proposal hashes match the previous 1565/1565 full regression. This documentation-only archive does not claim another full run, Windows reproduction or successful subscription inference.
