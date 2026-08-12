# Conventions & Domain Primer

> Shared grounding for every solution in the **Catalogue of API Solutions**.
> Read this **first**: it explains how Meta's ads entities and the Marketing API work, plus the
> build conventions that apply to all solutions.

This file is **scaffolding for implementation**, not part of the original source document.
Authentication, access tokens, permissions/scopes and API version pinning are intentionally
**not** covered in depth here — handle credentials in a separate environment/config file. The
access *concepts* (standard vs advanced access, token types) are described below because they
gate which solutions an agency can build.

---

## Build conventions

These conventions apply to every solution.

- **Base URL:** all endpoints are relative to the Graph API base, e.g. `https://graph.facebook.com/<API_VERSION>/`. The catalogue drops the leading `…` prefix on relative paths for clarity.
- **`act_` prefix:** business edges return ad account IDs as bare numbers; prepend `act_` for account-scoped calls (an ad account ID of `123` is called as `act_123/...`). This only applies when the ad account ID is being called as a node. Store the bare ID and add the prefix at call time.
- **Placeholders:** `<BUSINESS_ID>`, `<AD_ACCOUNT_ID>` (used as `act_<AD_ACCOUNT_ID>`), `<CAMPAIGN_ID>`, `<PIXEL_ID>`, `<CATALOG_ID>`, `<APP_ID>`, `<PAGE_ID>`, etc. Replace before calling.
- **Scale pattern:** most solutions start by enumerating assets across a business portfolio (e.g. `<BUSINESS_ID>/owned_ad_accounts` and `<BUSINESS_ID>/client_ad_accounts`) then iterating.
- **Scheduling:** several solutions recommend a scheduled job (e.g. CRON) for repeated evaluation/alerts.

---

## Domain primer (how Meta ads & the Meta Marketing API works)

### Entity hierarchy

Almost every solution starts by walking this ownership tree, so it is the most important model to
internalise:

```
Organization
└── Business (Business Manager / "portfolio")
    ├── Ad Account ──── Campaign ──── Ad Set ──── Ad ──── Ad Creative
    ├── Pixel / Dataset
    ├── Product Catalog
    ├── Page
    └── App
```

- A **Business** owns or is granted access to assets. Assets split into **owned** vs **client**
  (agencies manage client assets), which is why solutions pull both
  `<BUSINESS_ID>/owned_ad_accounts` **and** `<BUSINESS_ID>/client_ad_accounts` (the same pattern
  applies to `owned_product_catalogs`/`client_product_catalogs`, pixels, pages, apps).
- An **Ad Account** is the container for spend and for the campaign tree below it.
- The **delivery tree** is always three levels: **Campaign** (objective, buying type) → **Ad Set**
  (budget, schedule, targeting, optimisation goal, placements) → **Ad** (pairs an ad set with an
  **Ad Creative**). Full campaign structure is detailed in developer documentation [here](https://developers.facebook.com/docs/marketing-api/campaign-structure/).
- Ad object status is detailed in developer documentation [here](https://developers.facebook.com/documentation/ads-commerce/marketing-api/best-practices/manage-your-ad-object-status-and-hierarchy/). Any calls to create ad objects should be placed in `PAUSED` status by default.
- **Pixel = Dataset.** Meta has renamed pixels to **datasets**; a pixel ID is a dataset ID. APIs
  and fields use both terms interchangeably (e.g. `<PIXEL_ID>/stats`, `dataset_quality?dataset_id=`).

### Graph API mechanics

- **Versions** calls to Meta Marketing API are pinned to a specific API version (e.g. `v16.0`). The latest version is referenced in developer documentation [here](https://developers.facebook.com/docs/marketing-api/versioning/).
- **Nodes, edges, fields.** A **node** is an object with an ID (`<CAMPAIGN_ID>`). An **edge** is a
  connection from a node to a collection (`<CAMPAIGN_ID>/adsets`). **Fields** are the properties of
  a node (`<CAMPAIGN_ID>?fields=name,objective,status`).
- **Request fields explicitly.** Default responses return a minimal field set (often just `id`).
  Always pass `?fields=...`; nested/expanded fields use brace syntax
  (`fields=adsets{name,daily_budget}`).
- **Pagination is cursor-based.** List responses return `data` plus `paging.cursors.after`; follow
  `paging.next` or pass the cursor until exhausted. Use `limit` to size pages. Many edges accept
  `summary{total_count}` for a count without paging the whole set.
- **Read vs write.** `GET` reads; `POST` to a node/edge creates or updates; `DELETE` (or
  `POST .../?method=delete`) removes. Updating an object usually means `POST <OBJECT_ID>` with the
  changed fields (re-include child object `id`s when updating nested arrays).
- **Batch & bulk.** For volume, use the Graph API batch endpoint or solution-specific batch edges
  (e.g. catalogue `items_batch`); these are often **asynchronous** — see B5.

### Units, IDs & status gotchas

- **Money is in minor currency units.** Budgets, spend caps and `spend` are integers in the
  currency's smallest unit (cents for USD; a $10 budget is `1000`). Some currencies are zero-decimal.
- **`effective_status` ≠ `status` ≠ `configured_status`.** `configured_status`/`status` is what the
  user set; `effective_status` reflects actual delivery state (e.g. `ACTIVE`, `PAUSED`,
  `DISAPPROVED`, `PENDING_REVIEW`, `CAMPAIGN_PAUSED`). QA/monitoring should read `effective_status`.
- **IDs come back bare.** Payload fields like `account_id`, `campaign_id` are returned without the
  `act_` prefix; re-prefix ad account IDs for account-level calls (see Part A).

### Access & auth model (concepts only)

Credentials live in config, but these concepts decide **whether a solution is buildable**:

- **App + access token.** Calls are made by a registered **App** using an **access token**. For
  unattended, portfolio-wide automation, agencies typically use a **Business System User** token.
- **Permissions / scopes.** Each API requires specific permissions (e.g. `ads_read`,
  `ads_management`, `business_management`, `leads_retrieval`, `catalog_management`).
- **Standard vs Advanced Access.** This is the key gate. Some permissions return **only test/sample
  data under Standard Access** and require **Advanced Access** (App Review) to work on real assets.
  The creator solutions are the clearest example: `instagram_creator_marketplace_discovery` /
  `facebook_creator_marketplace_discovery` need Advanced Access — surface this as a prerequisite.
- **Login flows.** Some products gate on **Facebook Login for Business** and an onboarding/terms
  acceptance step before data is returned.

### Rate limits, async jobs & data freshness

- **Rate limiting.** Marketing API calls are subject to **Business Use Case (BUC) rate limits**;
  responses carry usage headers (e.g. `X-Business-Use-Case-Usage`, `X-App-Usage`). Read the headers
  and **back off** when near the limit rather than retrying blindly.
- **Async patterns.** Batch/feed operations return a **handle** and process asynchronously — poll a
  status endpoint (e.g. catalogue `check_batch_request_status`, feed `GET <FEED_ID>/uploads`) rather
  than assuming success. Back off on throttling errors (e.g. catalogue `80014`). The **Insights API**
  also runs asynchronously for large reports — see *Asynchronous Insights API jobs* below.
- **Data-retention windows.** Some read endpoints only return a recent window — notably pixel/dataset
  `/stats` retains **~7 days** from request time, so scheduled extraction (≥ weekly) is needed to
  build history. EMQ / dataset-quality metrics update closer to real-time.

### Asynchronous Insights API jobs

The **Insights API** can be called **synchronously** (`GET .../insights`) or **asynchronously**
(`POST .../insights`). Several solutions (Insights Data Warehouse & Dashboard, Marketing Mix
Modelling, Reels Performant Creative Dashboard) read at portfolio scale, where async is the safer
default. See Meta's [Insights best practices](https://developers.facebook.com/documentation/ads-commerce/marketing-api/insights/best-practices#asynchronous).

- **When to go async.** Prefer async for **large or complex reports** — wide `time_range`s, multiple
  `breakdowns`, account-level pulls across many objects, or high-cardinality data — to avoid
  client-side HTTP timeouts. Small, narrow queries can stay synchronous. Meta may itself promote a
  heavy synchronous query to async.
- **The four-step workflow:**
  1. **Submit** — `POST act_<AD_ACCOUNT_ID>/insights` (or any `<AD_OBJECT>/insights`) with your
     `fields`, `level`, `breakdowns`, `time_range`/`time_increment`, `filtering` and
     `action_attribution_windows`. The response is **not** the data — it is a **`report_run_id`**
     (an `AdReportRun` node), e.g. `{"report_run_id": "1686..."}`.
  2. **Poll** — `GET <REPORT_RUN_ID>?fields=async_status,async_percent_completion`. Poll on a
     sensible cadence (every few seconds), not in a tight sub-second loop.
  3. **Check status** — `async_status` is a string with these exact values: **`Job Not Started`**,
     **`Job Started`**, **`Job Running`**, **`Job Completed`**, **`Job Failed`**, **`Job Skipped`**.
     **`async_percent_completion = 100` does not mean success** — a job can reach 100% and still be
     `Job Failed`. Gate on `async_status == "Job Completed"` **and** `async_percent_completion == 100`
     before fetching.
  4. **Fetch** — once completed, `GET <REPORT_RUN_ID>/insights` and paginate via `paging.cursors`.
     (The MMM `breakdowns=mmm` variant is delivered as CSV via `async_report_url` instead — see that
     solution.)
- **`report_run_id` lifetime.** The handle is valid for ~**30 days**; treat it as ephemeral — store
  the *results*, not the ID.
- **Concurrency & retries.** Async jobs are subject to a **concurrency cap** and BUC rate limits per
  app/account. Queue jobs rather than firing the whole portfolio at once, add **jitter + exponential
  backoff**, and **do not hammer-retry failed jobs** (retry storms trigger throttling). From v25.0,
  failed report runs return `error_code`/`error_message` by default — read them instead of retrying
  blindly.

### Error handling & common error codes

Every Graph/Marketing API error follows the same envelope, so handle errors **by category**, not by
memorising codes. (Meta's per-product code lists are large; the
[WhatsApp error-codes reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes)
is a good example of the full categorised format — the Marketing API surfaces the same shape inline
per endpoint.)

**Error envelope:**

```json
{
  "error": {
    "message": "(#80014) ...",
    "type": "OAuthException",
    "code": 80014,
    "error_subcode": 1504022,
    "is_transient": true,
    "fbtrace_id": "A1b2C3..."
  }
}
```

- `code` + `error_subcode` identify the error; `type` groups it (e.g. `OAuthException`,
  `GraphMethodException`).
- `is_transient: true` ⇒ safe to **retry with backoff**.
- Always log **`fbtrace_id`** — it is what Meta support needs to trace a single failed call.

**Categories & how to react:**

| Category | Typical signals | Reaction |
| --- | --- | --- |
| **Auth / permission** | `code 190` (token expired/invalid), `code 200`/`10` (missing permission/scope), asset not shared | Fix the token / scope / asset sharing. **Do not** retry unchanged. |
| **Rate limit / throttling** | `code 4` (app-level), `code 17` (user-level), `80004`/`80014` (BUC limits), insights subcode `1504022`; usage headers `X-Business-Use-Case-Usage`, `X-App-Usage`, `x-fb-ads-insights-throttle` | Read the usage headers and **back off**; retry next window. Reduce query range/cardinality. |
| **Transient / server** | `is_transient: true`, `code 1`/`2`, "please retry later" | **Retry** with exponential backoff + jitter. |
| **Validation / business logic** | bad/missing params, documented limits exceeded, ineligibility | **Do not retry** — fix the request, inputs or eligibility first. |

**Catalogue-specific codes** (referenced by individual solutions — context here so each split file
can point back):

| Code | Where | Meaning & handling |
| --- | --- | --- |
| `80014` | Catalogue Batch & Feed Optimiser | Too many catalogue batch uploads — space out/queue batch requests and back off. |
| `613` | Reservation Planner | Reservation (R&F) hourly rate limit — wait for the next window before retrying. |
| `error_code=4` / subcode `1504022` | Insights Data Warehouse & Dashboard | Insights throttling — watch the throttle headers, narrow the query, back off. |
| `1870090` | Audience Uploader | Custom Audience Terms of Service not accepted — a **real (non-system) user** must accept first. |
| `3961010` / `3961014` / `3961021`–`3961025` | Facebook Creator Discovery | Invalid creator / ineligible / invalid filter or range — validate inputs and skip ineligible creators. |
| subcode `10` | Facebook / Instagram Creator Discovery | Creator invited but not yet onboarded — expect a partial field set. |

**Rule of thumb:** retry only transient and rate-limit errors (with backoff + jitter); fix-and-resubmit
auth and validation errors; and capture `code`, `error_subcode` and `fbtrace_id` on every failure for
diagnosis.

---

## Glossary

Acronyms and terms used across the catalogue:

| Term | Meaning |
| --- | --- |
| **Graph API** | Meta's core HTTP API for reading/writing the social graph; the Marketing API is built on it. |
| **Marketing API** | The ads subset of the Graph API (campaigns, insights, audiences, catalogues, signals). |
| **CAPI** | Conversions API — server-side event sending (vs browser-side Pixel). |
| **CAPI Gateway (CAPIG)** | A hosted/self-managed gateway that forwards events to CAPI. |
| **Pixel / Dataset** | The signal source for web/app/offline events; "dataset" is the current name for "pixel". |
| **EMQ** | Event Match Quality — a 0–10 score for how well events match to people. |
| **Advantage+** | Meta's suite of AI-automated ads products (audience, placements, creative). |
| **DA** | Dynamic Ads — catalogue-driven ads (a.k.a. Advantage+ catalogue ads). |
| **Value Rules** | Bid adjustments that optimise toward higher-value audiences. |
| **VO** | Value Optimisation — bidding to maximise total conversion value. |
| **Reservation (R&F)** | Reservation buying, formerly Reach & Frequency campaigns. |
| **MMM** | Marketing Mix Modelling (Meta's open-source library is **Robyn**). |
| **Insights** | The reporting API for performance metrics (spend, impressions, results, etc.). |
| **AdReportRun / `report_run_id`** | The async Insights job handle returned by `POST .../insights`; poll its `async_status`, then read its `/insights` edge. Valid ~30 days. |
| **BUC rate limits** | Business Use Case rate limits — per-app/per-account quotas surfaced via `X-Business-Use-Case-Usage` / `X-App-Usage` headers; back off when near the limit. |
| **`fbtrace_id`** | Per-request trace ID on every API response and error — quote it when escalating a failed call to Meta support. |
| **Opportunity Score** | Account-level 0–100 score quantifying adoption of Meta best practices. |
| **CPM / ROAS** | Cost per mille (per 1,000 impressions) / Return on ad spend. |
| **Owned vs client assets** | Assets a business owns directly vs assets a client has granted it access to. |
| **MVP** | Minimum viable product — the build target for each solution. |
