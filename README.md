# Asteria-Nightvoyage · 夜航

Experimental standalone dream layer: fictional input snapshots → two scenes with simulated affect → a separate wake record and decaying residue → typed cue-recall candidates.

Requires Node.js 24+. No packages, credentials or network model calls are needed.

```sh
npm test
node src/cli.js /absolute/path/outside-this-checkout/nightvoyage-data demo
node src/cli.js /absolute/path/outside-this-checkout/nightvoyage-data list
node src/cli.js /absolute/path/outside-this-checkout/nightvoyage-data recall lantern
```

On Windows use `npm.cmd test` if PowerShell blocks npm.ps1, and an external absolute data directory such as `C:\NightvoyageData`. Windows runtime behavior has not been tested in this delivery.

The demo is deterministic fake generation. Rerunning it returns the same durable run, not another dream. The API in `src/engine.js` supports explicit new request/session IDs, cancel/resume, append-only recollection/continuation, policy changes, withdrawal and deletion. CLI `resume` intentionally does not authorize retrying an ambiguous attempt; use the explicit API option after reviewing the receipt.

Input material kind and generated event origin are separate. Dreams are never reality facts, including in recall and derived records. This release rejects real input materials and non-fake providers. It cannot modify personality, factual memory, daily emotion, tasks or tools. There is no Asteria adapter or frontend.

See [contract](docs/CONTRACT.md), [plan](docs/PLAN.md), [fictional walkthrough](docs/WALKTHROUGH.md), [references](docs/REFERENCES.md), and [progress and limitations](PROGRESS.md). Storage and backup boundaries are part of the contract. Do not commit local runtime data, real journals, chats, private configuration or credentials. MIT licensed.

DeepSeek preparation is available as an **offline protocol/simulator**, not a live CLI mode. See [offline preparation and at-home handoff](docs/DEEPSEEK-PREPARATION.md). No API key is needed for its tests; real transport, spending controls and egress authorization remain pending.

[Budget accounting and gated transport](docs/BUDGET-AND-TRANSPORT.md) are separate API components. Transport defaults off, no actual pricing/allowance is bundled, and the CLI remains fake-only. Tests use stub HTTP. Live engine integration and external credential/Windows setup are still pending.

The review branch includes an integrated budgeted runtime and `nightvoyage.cmd` launcher. [Windows handoff](docs/RUN-ON-WINDOWS.md) covers initialization, key entry, preflight, resume and the CNY 1 reservation conflict. Defaults send nothing; actual Windows/API execution remains unverified. A higher allowance needs explicit approval.
