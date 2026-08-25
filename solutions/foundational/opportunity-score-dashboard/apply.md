## Opportunity Score Dashboard — Apply

> Part of the [Opportunity Score Dashboard](SOLUTION-DESIGN.md) solution set. The solution design
> covers the shared recommendation categorisation, field reference and access model. This module
> acts on the prioritised list produced by [Specialise](specialise.md).

**Solution overview:** The write path for performance recommendations. Practitioners adopt a chosen best practice through a "one-click" API apply, a deeplink into Ads Manager, or a custom workflow against the underlying ad objects — with pre-flight and mid-flight recommendations routed to the right one of those. This is where a dashboard stops reporting on opportunity and starts closing it.

**Agency strategic opportunity:** Increased adoption of Meta best practices, operational efficiency at scale, consistent execution across clients.

**KPIs:** recommendation adoption rate, improved campaign performance (due to adoption of best practices).

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Performance Recommendations API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations) | Read and write changes for optimal ads. Recommendations may be applied at ad, ad set or campaign level. |
| [Performance Recommendations History API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations-history-api) | Read the daily Opportunity Score history and explainability to confirm what your applied changes moved. |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Read and write assets within a business portfolio. |

> **Prerequisites:** an access token with `ads_read` and `ads_management`, or `ads_management` on its own — it covers reads as well as writes. **Standard Access** can be used to test the `POST` call for `recommendation_signature`; ad accounts the advertiser owns need **Advanced Access**, via App Review. The user or system user must hold `Full Control` on the ad account. See the [solution design](SOLUTION-DESIGN.md#access-and-permissions) for the full model.

**How to use (API specification):**
1. Choose how to apply each recommendation — three ways.
   - **Via deep link to Ads Manager:** navigate the user to the `url` returned with the recommendation and apply through the UI.
   - **Via API directly:** `POST act_<AD_ACCOUNT_ID>/recommendations` with `recommendation_signature` and a type-specific `extra_data` object.
   - **Via custom workflow:** use the returned `object_ids` with the standard Campaign/Ad Set/Ad APIs (or a third-party platform) for granular control.
   - *Which route is available:* not every recommendation type can be applied through the API. Check [Recommendation-specific parameters](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations#recommendation-specific-parameters) for the types that can and the `extra_data` each takes; use the deeplink or a custom workflow for the rest. At runtime, `recommendation_signature` is absent for recommendations that cannot be resolved in the API — gate the one-click path on its presence.
2. Supply the correct `extra_data` per recommendation type; on success returns `{"success": true}` (otherwise ad objects remain unchanged).
   - *Shapes:* see the "API-applicable recommendation types" table at the end of this solution. `recommendation_signature` sits outside `extra_data` and is required on every apply call.
   - *Default selection:* where `object_selection` is optional, omitting it applies the recommendation to **all** IDs from the recommendation target — pass it explicitly when the practitioner has chosen a subset.
3. Re-fetch the `recommendation_signature` immediately before applying (signatures are perishable and stale ones fail).
   - *Pre-flight recommendations:* these are adopted via the Ads Manager deep link in the campaign creation flow, not through the apply API — surface the `url` for these rather than a one-click API apply.
4. Confirm what your applied change moved by reading the Opportunity Score history: `act_<AD_ACCOUNT_ID>/opportunity_score_history` with `from_date` and `to_date`.
   - *Window:* `from_date` defaults to 14 days before `to_date` and must not be earlier than 45 days before it; `to_date` defaults to today (data may be missing the most recent ~2 days). Max 45-day window.
   - *Explainability:* add `get_reason=true` so each day includes a `changelog` array explaining what drove the change in `opportunity_score` — budget changes, applied/reverted recommendations, and activated/deactivated campaigns — letting you attribute the movement to the recommendation you applied.

**Build specification:**
1. Enable writing of ad, ad set or campaign changes via a "one-click" opt-in method or via navigation to Ads Manager via the deeplink.
   - *Detail:* choose per recommendation — one-click `POST .../recommendations` with the correct `extra_data` for API-applicable types, the `url` deeplink for the rest, or a custom Campaign/Ad Set/Ad workflow where granular control is needed.
2. Handle signature expiry gracefully, and treat a missing signature as "not API-applicable".
   - *Detail:* re-fetch signatures right before applying; surface a clear retry path on expiry failures.
   - *Detail:* branch the UI on `recommendation_signature` — present offers the one-click apply, absent offers the deeplink or custom workflow only.
3. Route mid-flight vs. pre-flight recommendations correctly.
   - *Detail:* apply mid-flight recommendations to live campaigns via the apply API or deep link; route pre-flight recommendations to the Ads Manager campaign-creation flow via the `url` deep link.
4. Surface the post-apply score history and changelog.
   - *Detail:* after applying, pull `opportunity_score_history` with `get_reason=true` and show the `changelog` entry attributing the score movement to the recommendation you adopted.
   - *Charting:* plot the Opportunity Score over time as a line chart, annotating each movement with its `changelog` explanation so clients can see which adopted recommendations moved the score.

**API-applicable recommendation types** (the types with a documented `extra_data` shape — verify against [Recommendation-specific parameters](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations#recommendation-specific-parameters), which Meta extends over time):

| Recommendation type | `extra_data` |
| --- | --- |
| `ADVANTAGE_PLUS_AUDIENCE` | None — ad set IDs are derived from the recommendation target. |
| `APLUSC_STANDARD_ENHANCEMENTS_BUNDLE` | `object_selection` (optional, ad IDs); `creative_feature_opt_in_overrides` (optional, array of `ad_id` + `opted_in_creative_feature_names`). |
| `AUTOFLOW_OPT_IN` | `object_selection` (optional, ad IDs). |
| `AUTOMATIC_PLACEMENTS` | None. |
| `BACKGROUND_GENERATION` | `action_type` (**required**, `OPT_IN`/`OPT_OUT`); `object_selection` (**required**, ad IDs). |
| `CONVERSION_LEADS_OPTIMIZATION` | None. |
| `CREATIVE_FATIGUE` | `object_selection` (optional, ad IDs). |
| `LANDING_PAGE_VIEW_OPTIMIZATION_GOAL` | None. |
| `MUSIC` | `object_selection` (optional, ad IDs). |
| `PERFORMANT_CREATIVE_REELS_OPT_IN` | `object_selection` (optional, ad set IDs). |
| `PRODUCT_SET_BOOSTING` | None. |
| `SCALE_GOOD_CAMPAIGN` | `adsets` and/or `campaigns` (optional, arrays of `ad_object_id` + `additional_budget` in cents). |
| `SHOPS_ADS_SAOFF` | `object_selection` (optional, ad set IDs). |
| `UNCROP_IMAGE` | `object_selection` (optional, ad IDs). |
