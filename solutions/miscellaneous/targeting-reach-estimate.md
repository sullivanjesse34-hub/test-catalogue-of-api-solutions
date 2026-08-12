## Targeting & Reach Estimate

**Solution overview:** An audience tool to utilise audience targeting search functionality and
generate reach estimates for targeting specifications.

**Strategic opportunity:** Enables scaled targeting (alignment across channels), reduction in repetitive tasks.

**KPIs:** increase in campaign performance, time saved.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Targeting Search API](https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search/) | Retrieve targeting details for a search query. |
| [Detailed Targeting API](https://developers.facebook.com/docs/marketing-api/audiences/reference/detailed-targeting/) | Search multiple targeting types in a single request and get suggestions. |
| [Reach Estimate API](https://developers.facebook.com/docs/marketing-api/audiences/guides/reach-estimate/) | Return an estimated reach count for a targeting specification. |

**How to use (API specification):**
1. Using targeting search, query and return targeting lists: `/search?location_types=["country"]&type=adgeolocation&q=un`.
   - *Detail:* `/search` is the global (non-account-scoped) endpoint. `type` enums include `adgeolocation` (with `location_types`: `country`, `region`, `city`, `zip`, `geo_market`, …), `adinterest`, `adworkemployer`, `adeducationschool`, `adTargetingCategory` (requires `class`: `interests`/`behaviors`/`demographics`/…). Geo results return a stable `key` — use it (not `name`) in targeting specs.
2. Using detailed targeting, find related audience lists: `targetingsuggestions?targeting_list=[{'type':'interests','id':123}]`.
   - *Detail:* the Detailed Targeting endpoints are **account-scoped**: `act_<AD_ACCOUNT_ID>/targetingsuggestions` (and siblings `targetingsearch`, `targetingbrowse`, `targetingvalidation`). `limit` default 30 / max 45; results return `id`, `name`, `audience_size_lower_bound`/`upper_bound`, `path`.
3. Using Reach Estimate API, uncover the reach estimate of each target audience: `reachestimate?targeting_spec={…}&optimize_for=IMPRESSIONS`.
   - *Detail:* `act_<AD_ACCOUNT_ID>/reachestimate` returns `users`, `estimate_ready`, `targeting_status`. The richer `act_<AD_ACCOUNT_ID>/delivery_estimate` returns `estimate_dau`, `estimate_mau`, `daily_outcomes_curve`, `estimate_ready` — prefer it for DAU/MAU + spend curves. First use of a new lookalike returns `-1` until populated (see `targeting_status`).

**Build specification:**
1. Using the APIs (see above) create a query engine to search for targeting lists and store reach estimates.
   - *Detail:* distinguish global `/search` (one `type` per call) from account-scoped Detailed Targeting (multiple types per request). Cache stable `key`/`id` values, not `name` (names change).
2. Create a database to store reach estimates and other metadata.
   - *Detail:* store both estimate shapes (`users`/`estimate_ready` from `reachestimate`; `estimate_dau`/`estimate_mau`/`daily_outcomes_curve` from `delivery_estimate`) and persist `targeting_status` to explain `-1` sentinels.
3. Opportunity to expand functionality: this solution is introductory and its functionality may be expanded using the [Custom Audience API](https://developers.facebook.com/docs/marketing-api/reference/custom-audience/) and other targeting options such as [Advantage targeting](https://developers.facebook.com/docs/marketing-api/audiences/reference/advantage-targeting).
