## Opportunity Score Dashboard

**Solution overview:** A dashboard which pulls Meta's opportunity score and performance
recommendations. Enables practitioners to opt-in/adopt the suggested best practice via a
"one-click" method.

**Strategic opportunity:** Standardisation of best practices, increased adoption of Meta best practices.

**KPIs:** improved campaign performance (due to adoption of best practices).

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Performance Recommendations API](https://developers.facebook.com/docs/marketing-api/overview/performance-recommendations) | Read and write changes for optimal ads. Recommendations may be set at ad, ad set or campaign level. |
| [Performance Recommendations History API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations-history-api) | Read historical trends and explainability of Opportunity Score (previous dates' score + explanation of fluctuations). |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Read and write assets within a business portfolio. |

**How to use (API specification):**
1. For each business portfolio, pull the ad account IDs: `<BUSINESS_ID>/owned_ad_accounts` (and `client_ad_accounts`).
   - *Shortcut for dashboards:* you can read recommendations for the whole portfolio in one call instead of iterating account by account — see step 2.
2. Read ad account recommendations: `act_<AD_ACCOUNT_ID>/recommendations`. Store the returned `recommendation_signature` and the deeplink to Ads Manager contained in the `url` field.
   - *Portfolio-wide alternative:* `GET <BUSINESS_ID>/recommendations` returns, per *owned* account, the current `opportunity_score` (0–100) and its `recommendations` list. Max **100 accounts/page**; pass `ad_account_ids` (≤100 IDs, no `act_` prefix) to disable pagination and target a subset.
   - *Fields:* `recommendation_content` (holding `lift_estimate` and `body`) is omitted by default — request it with `fields=recommendation_content`. Optional filters: `recommendation_stages` (`pre_create_guidance`, `pre_flight_recommendation`, `mid_flight_recommendation`), `recommendation_names`, `locale`.
   - *Also capture:* `type`/`recommendation_name`, `level` (`ad`/`ad_set`/`campaign`/`ad_account`), `object_ids`, and `recommendation_time` — signatures are perishable, so stale ones fail on apply.
3. To adopt the recommendation, write the change — or navigate to Ads Manager via the `url` and apply through the UI.
   - *Current apply API:* `POST act_<AD_ACCOUNT_ID>/recommendations` with `recommendation_signature` and a type-specific **`extra_data`** object; on success returns `{"success": true}`. Examples: `MUSIC`/`AUTOFLOW_OPT_IN`/`UNCROP_IMAGE`/`CREATIVE_FATIGUE` → `extra_data={"object_selection":"<comma_sep_ad_ids>"}`; `BACKGROUND_GENERATION` → `action_type` (`OPT_IN`/`OPT_OUT`) + `object_selection`; `SCALE_GOOD_CAMPAIGN` → `adsets`/`campaigns` budget-adjustment arrays (budget in cents); `ADVANTAGE_PLUS_AUDIENCE`/`AUTOMATIC_PLACEMENTS` → no params (`extra_data={}`).
   - *Custom workflow:* for granular control, use the returned `object_ids` with the standard Campaign/Ad Set/Ad APIs instead of one-click apply.
4. Extract `opportunity_score`, `lift_estimate`, `opportunity_score_lift` and `url` at an ad-account level to add context to each recommendation.
   - *Note:* `opportunity_score` is exposed directly as a field on the ad-account node and updates in near real-time as changes are applied.
5. Extract opportunity score history and explainability via the Performance Recommendations History API: `act_<AD_ACCOUNT_ID>/opportunity_score_history` specifying `from_date`, `end_date` and `get_reason=true`.

**Build specification:**
1. Create a recommendation system to systematically extract ad account IDs, recommendations, recommendation signatures and other fields from the Performance Recommendations API.
   - *Detail:* use the instructions and steps as detailed in the previous "How to use (API specification)" section.
2. De-codify each recommendation using the references provided in the developer documentation.
   - *Detail:* map each `type` (e.g. `ADVANTAGE_PLUS_AUDIENCE`, `MUSIC`, `CREATIVE_FATIGUE`, `SCALE_GOOD_CAMPAIGN`, `SIGNALS_GROWTH_CAPI_V2`, `PERFORMANT_CREATIVE_REELS_OPT_IN`) to a human-readable description and to its required `extra_data` shape.
3. Create a user interface and prioritise which recommendations to opt into.
   - *Detail:* rank by `opportunity_score_lift`, group by level/category, surface `lift_estimate`/`body`; re-fetch signatures right before applying and handle expiry failures gracefully.
4. Enable the writing of ad, ad set or campaign changes via a "one-click" opt-in method or via navigation to Ads Manager via the deeplink provided in the API response.
   - *Detail:* choose per recommendation — one-click `POST .../recommendations` with the correct `extra_data` for API-applicable types, the `url` deeplink for the rest, or a custom Campaign/Ad Set/Ad workflow where granular control is needed. Re-pull `opportunity_score` after each apply.
5. Chart a line chart using historical trends and explanations.
   - *Detail:* line chart should show the Opportunity Score over time with explanations of changes in score.
