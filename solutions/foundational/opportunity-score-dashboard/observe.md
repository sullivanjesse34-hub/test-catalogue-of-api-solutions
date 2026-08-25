## Opportunity Score Dashboard — Observe

> Part of the [Opportunity Score Dashboard](SOLUTION-DESIGN.md) solution set. The solution design
> covers the shared recommendation categorisation, field reference and access model, and how this
> module relates to Specialise, Apply and Measure. Build this module first.

**Solution overview:** A read-only dashboard which pulls Meta's opportunity score and performance recommendations across your portfolio, at both ad-account and business-portfolio level. It answers *where* the unrealised opportunity sits across your clients — which accounts are underperforming against Meta's best practices, and what specifically is being recommended — without changing anything in the ad accounts.

**Agency strategic opportunity:** Standardisation of best practices, portfolio-wide visibility, benchmarking of clients.

**KPIs:** portfolio coverage (accounts scored), unrealised opportunity identified, benchmarking cadence.

**APIs & developer docs:**

| API | What it does |
| --- | --- |
| [Performance Recommendations API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations) | Read the opportunity score and recommendations for optimal ads. Recommendations may be set at ad, ad set or campaign level. |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Read assets within a business portfolio. |

> **Prerequisites:** an access token with `ads_read` (or `ads_management`, which covers reads as well as writes). **Standard Access** is enough for ad accounts the agency owns; ad accounts the advertiser owns need **Advanced Access**, via App Review. The user or system user must hold `Insights` on the ad account. See the [solution design](SOLUTION-DESIGN.md#access-and-permissions) for the full model.

**How to use (API specification):**

1. For each business portfolio, pull the ad account IDs: `<BUSINESS_ID>/owned_ad_accounts` (and `client_ad_accounts`).

  - *Shortcut for dashboards:* you can read recommendations for the whole portfolio in one call instead of iterating account by account — see step 3.
2. Read the current Opportunity Score of an ad account via the `opportunity_score` field: `act_<AD_ACCOUNT_ID>?fields=opportunity_score` (real-time numeric 0–100 score).
3. Read ad account recommendations: `act_<AD_ACCOUNT_ID>/recommendations`. Store `recommendation_signature`, `type`, `object_ids`, `lift_estimate`, `body`, `opportunity_score_lift` and the Ads Manager deeplink in `url`.

  - *Portfolio-wide alternative:* `GET <BUSINESS_ID>/recommendations` returns, per account, the current `opportunity_score` and its `recommendations` list. Max **100 accounts/page**; pass `ad_account_ids` (≤100 IDs, no `act_` prefix) and `scopes` (owned/shared) to target a subset.
  - *Fields:* `recommendation_content` (holding `lift_estimate` and `body`) is omitted by default — request it with `fields=recommendation_content`.
  - *Note:* signatures are perishable (they carry `recommendation_time`), so re-fetch them just before applying (see the Apply solution).

**Build specification:**

1. Create a recommendation system to systematically extract ad account IDs, opportunity scores, recommendations and their fields from the Performance Recommendations API.

  - *Detail:* use the instructions and steps as detailed in the previous "How to use (API specification)" section.
2. De-codify each recommendation using the references provided in the developer documentation.

  - *Detail:* map each `type` (e.g. `ADVANTAGE_PLUS_AUDIENCE`, `MUSIC`, `CREATIVE_FATIGUE`, `SCALE_GOOD_CAMPAIGN`, `SIGNALS_GROWTH_CAPI_V2`, `PERFORMANT_CREATIVE_REELS_OPT_IN`) to a human-readable description.
3. Create a user interface that surfaces opportunities across the portfolio.

  - *Detail:* display each account's `opportunity_score`, list its recommendations with `lift_estimate`/`body`, and build client-level scorecards for benchmarking.
