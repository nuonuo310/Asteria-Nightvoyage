# Credential-free Codex catalogue/configuration comparison

This is a local observation, not an authenticated transport or a real-model metadata check. It compares four independently authored fictional conditions and retains only bounded request/tool metadata. It never loads an account, passes credentials, contacts an OpenAI inference endpoint, supplies generated responses, creates a dream or enables production dispatch.

## Matrix and provenance

| Case | Catalogue input modalities | Environment configuration bundle |
| --- | --- | --- |
| image_default | text and image | Original thread environment |
| text_default | text | Original thread environment |
| image_empty | text and image | Explicit empty turn environments, experimental API and existing utility-disable requests |
| text_empty | text | Same empty-environment bundle |

The starting data are Nightvoyage's existing independently authored fictional catalogue, not an account catalogue or copied real-model record. Only input_modalities changes between the two catalogue variants. Both preserve gpt-5.6-sol, unified_exec shell metadata, freeform patch metadata and direct tool mode; those fields are not rewritten to manufacture an empty tool list. The environment comparison is a bundle, not an isolated causal test of the environments field alone. The old fictional catalogue and every old owner/entry remain byte-for-byte unchanged.

Each case gets a distinct fresh process and owned state/profile/cwd plus a byte-checked catalogue file outside the checkout. The effective model/provider/catalogue path/configuration is checked before the single ephemeral turn. The fixed prompt contains no person or memory. The sole local Responses POST is classified for declared tools and receives only a fixed error envelope. No assistant output or tool call is supplied. Known nonempty tools can be observed; unknown tools, missing tool inventory, changed catalogue, wrong provider, warning, server request or unexpected notification block. No production inference permission follows from an observed request, including an empty tool list.

The separate owner is an explicit source derivative of scripts/codex-request-observer.mjs, with closed cases and distinct protocol identity codex-local-catalog-comparison-v1. It uses Asteria-Nightvoyage as the initialize application name, consistent with the existing registration helper; no actual registration is made. No token, endpoint, environment, arbitrary catalogue path or model override is accepted. An explicit native executable is required for installed-Codex execution. Automatic tests instead use the existing independent Node peer. Its outgoing tools are scripted, so peer success cannot establish native metadata-dependent tool selection.

## Commands and stopping

- `node --test test/codex-catalog-comparison.test.js`
- `node scripts/check-codex-catalog-comparison.mjs` — four independent Node peers only.
- `node scripts/check-codex-catalog-comparison.mjs --native-executable ABSOLUTE_NATIVE_CODEX_PATH` — at most four fresh installed-native children, one per fixed case and at most one local POST each. Stop at the first blocked case; no retry or replacement condition.

A successful matrix status is comparison_observed, not production admission. The report explicitly keeps realModelMetadataCompared=false, productionAdmission=false, dispatchEnabled=false, modelEntitlementVerified=false, toolExclusionVerified=false and credentials unsupplied. Usage is not interpreted. Native background networking and descendant containment remain uninstrumented/unqualified. Owned child closure and temporary cleanup are checked independently of those broader limitations. No user dream book is opened.

The actual maintainer Linux native 0.159.2 attempt stopped on the first image_default condition at preparation_timeout, before thread/turn/POST, with owned closure and workspace cleanup. This is one actual attempt, not a completed matrix. The subsequent [complete sanitized user Windows native 0.160.0 receipt](validation/user-local-codex-catalog-comparison-windows.json), for code 15de2e2, reports all four conditions observed. Default image/text conditions each declare three tools in file_edit, file_read and interaction; both empty-environment conditions declare zero. Each child/workspace closes cleanly after one local POST. Changing the fictional modality field did not change the observed count in either bundle. This supports a bundle-associated difference in these four observations, not a causal claim about one switch, live model metadata or general handler denial. It is user-reported Windows evidence, not a maintainer Windows reproduction. No fixture rerun is needed. The earlier three-stage receipt remains separate evidence. Full evidence and hashes: [validation](validation/codex-catalog-comparison.json).

## Remaining authenticated boundary

The official [Codex ChatGPT-plan guide](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server) distinguishes catalogue selection from successful inference. Its [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) distinguish local harness tools from hosted Responses tools. Reviewed 2026-10-20. This comparison tests neither live account metadata nor subscription eligibility. It cannot authorize passing a real token or deploying the fictional catalogue as production model metadata.

After a native comparison, review actual account/model metadata and the production tool/credential owner under the separate [transport design](CODEX-PLAN-TRANSPORT-DESIGN.md). If obtaining that evidence needs login or real inference, stop with a new finite diagnostic proposal and request only the minimal user action. No old failed dream/grant, direct GPT trial, fallback or API budget is changed. Asteria bridges and canonical state remain outside Nightvoyage.
