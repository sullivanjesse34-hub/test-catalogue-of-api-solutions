# Catalogue of API Solutions

> A catalogue of buildable solutions that can be developed on top of the **Meta Marketing API**.

Each entry is a **blueprint** for a project: the strategic opportunity (the "why"), a
solution overview (the "what"), the API specification (the "how" — endpoints + developer docs),
and a build specification (the high-level steps to ship it). Solutions are meant to be customised
to your organisation's unique selling points, growth areas and business priorities.

---

## How to use this file (with LLM)

This document is structured so it can be loaded into Muse Code, Codex, Claude (or any LLM coding agent) to rapidly
produce **MVP code** and **UI mock-ups** for any solution below. Suggested prompts:

- *"Build an MVP backend for the Signals Health Dashboard. Use the endpoints listed and stub the auth."*
- *"Mock up a UI for the Opportunity Score Dashboard showing the one-click adopt flow."*
- *"Generate a Python client wrapping the API calls in the Catalogue Batch & Feed Optimiser."*

Each solution is self-contained: it names the exact endpoints to call and links the official
developer documentation so generated code can be grounded in the real API.

### Who does what
| Team | Owns | Catalogue section they drive |
| --- | --- | --- |
| **Media** | Defines use-cases by business demand | Strategic Opportunity |
| **Product** | Bridges media ↔ developer, shapes the solution | Solution Overview, Build Specification |
| **Developer** | Builds the API solution | API Specification |

---

## Build conventions

These conventions apply to every solution (added here as scaffolding for implementation — not part
of the original source document). Authentication, access tokens, permissions/scopes and API version
pinning are intentionally **not** covered here — handle those in a separate environment/config file.

- **Base URL:** all endpoints are relative to the Graph API base, e.g. `https://graph.facebook.com/<API_VERSION>/`. The original document prefixes relative paths with `…`; that prefix has been dropped here for clarity.
- **`act_` prefix:** business edges return ad account IDs as bare numbers; prepend `act_` for account-scoped calls (an ID of `123` is called as `act_123/...`). Store the bare ID and add the prefix at call time. Per-solution notes call out exactly which endpoints need it.
- **Placeholders:** `<BUSINESS_ID>`, `<AD_ACCOUNT_ID>` (used as `act_<AD_ACCOUNT_ID>`), `<CAMPAIGN_ID>`, `<PIXEL_ID>`, `<CATALOG_ID>`, `<APP_ID>`, `<PAGE_ID>`, etc. Replace before calling.
- **Scale pattern:** most solutions start by enumerating assets across a business portfolio (e.g. `<BUSINESS_ID>/owned_ad_accounts` and `<BUSINESS_ID>/client_ad_accounts`) then iterating.
- **Scheduling:** several solutions recommend a scheduled job (e.g. CRON) for repeated evaluation/alerts.

> **Getting started with the Marketing API:** five-part educational video series on the
> [Meta Business Partner Hub](https://www.facebook.com/fbp/api-videos) and the
> [Meta for Business YouTube Channel](https://www.youtube.com/playlist?list=PLDLOX_aRgZSBcAxBFZz-OP0FvetaeXu4t).

---

## Index

| Category | Solution |
| --- | --- |
| Foundational | [Opportunity Score Dashboard](solutions/foundational/opportunity-score-dashboard.md) |
| Foundational | [Quality Assurance](solutions/foundational/quality-assurance.md) |
| Performance | [Value Rules Engine](solutions/performance/value-rules-engine.md) |
| Signals | [Signals Opportunity Dashboard](solutions/signals/signals-opportunity-dashboard.md) |
| Signals | [Signals Health Dashboard](solutions/signals/signals-health-dashboard.md) |
| Signals | [Conversions API Gateway Control Panel](solutions/signals/conversions-api-gateway-control-panel.md) |
| Leads | [Leads Retrieval Set-up & Checker](solutions/leads/leads-retrieval-set-up-checker.md) |
| Catalogue | [Catalogue Health Dashboard](solutions/catalogue/catalogue-health-dashboard.md) |
| Catalogue | [Catalogue Batch & Feed Optimiser](solutions/catalogue/catalogue-batch-feed-optimiser.md) |
| Creators | [Instagram Creator Discovery](solutions/creators/instagram-creator-discovery.md) |
| Creators | [Facebook Creator Discovery](solutions/creators/facebook-creator-discovery.md) |
| Creators | [Recommended Creator Content](solutions/creators/recommended-creator-content.md) |
| Creators | [Partnership Ads Booster](solutions/creators/partnership-ads-booster.md) |
| Creative | [Reels Performant Creative Dashboard](solutions/creative/reels-performant-creative-dashboard.md) |
| Creative | [AI Creative Enhancer](solutions/creative/ai-creative-enhancer.md) |
| Creative | [Creative Fatigue Notifier](solutions/creative/creative-fatigue-notifier.md) |
| Measurement | [Experiment Analysis](solutions/measurement/experiment-analysis.md) |
| Measurement | [Marketing Mix Modelling (Robyn)](solutions/measurement/marketing-mix-modelling-robyn.md) |
| Miscellaneous | [Reservation Planner](solutions/miscellaneous/reservation-planner.md) |
| Miscellaneous | [Insights Data Warehouse & Dashboard](solutions/miscellaneous/insights-data-warehouse-dashboard.md) |
| Miscellaneous | [Targeting & Reach Estimate](solutions/miscellaneous/targeting-reach-estimate.md) |
| Miscellaneous | [Audience Uploader](solutions/miscellaneous/audience-uploader.md) |

---

## License and access to developer documentation

- **License.** This catalogue's solutions are licensed under the Creative Commons
  Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license. The full license text is at
  [`solutions/LICENSE.md`](solutions/LICENSE.md) — read it before reusing, adapting or
  redistributing any part of this catalogue.
- **Developer documentation.** The Meta developer documentation linked from each solution's API
  Specification is available to read: no special access, approval or entitlement is needed to open
  and study the docs, and nothing in this catalogue restricts that.
- **Access to data is separate from access to docs.** Reading the documentation does not grant
  access to any data. Any access to Meta Marketing API data — whether by an advertiser, an agency,
  a partner or an application built from a blueprint in this catalogue — is subject to the applicable Meta
  developer terms, including the
  [Meta Platform Terms](https://developers.facebook.com/terms/) and the
  [Developer Policies](https://developers.facebook.com/devpolicy/). Those terms govern the data
  regardless of how the calling code was produced, including code generated by an LLM from this
  catalogue.
