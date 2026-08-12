## Instagram Creator Discovery

**Solution overview:** This solution retrieves personalised creator recommendations in order to
help brands find relevant creators for partnership ads.

**Strategic opportunity:** Increased discovery of net-new creators, creates or expands the agency's creator existing capabilities.

**KPIs:** increased brand deals, increased volume of branded content.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Instagram Creator Marketplace API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/creator-marketplace) | Retrieve recommended creators for partnership ads. |

> **Prerequisites:** Facebook Login for Business determines access. When a brand's admin logs in,
> Meta checks eligibility/onboarding; if not onboarded, the user is prompted to accept the terms of
> service. **Advanced access** is required for the app permission `instagram_creator_marketplace_discovery`
> (standard access returns mock/simulated data only).

**How to use (API specification):**
1. Note all prerequisites above.
2. Using the Instagram Creator Marketplace API, conduct API calls with creator-based filters to retrieve recommended creators: `{ig-user-id}/creator_marketplace_creators?creator_countries=['US']&fields=id,username,country,gender…`.
   - *Filters:* `creator_countries`, `creator_states` (US only), `creator_min_followers`/`creator_max_followers` (bucketed), `creator_age_bucket`, `creator_gender` (`male`/`female`), `creator_interests` (≤5 of ~20 enums), audience filters (`major_audience_age_bucket`, `major_audience_gender`, `major_audience_countries`), `query`, `similar_to_creators`, `recommendation_type` (`most_relevant_for_me`, `high_ad_performance`, `most_ads_experience`, `similar_brands`, `similar_audience`).
   - *Detail:* the gender **filter** is `creator_gender` (`gender` is a response field). When `username` is specified, other filters can't be applied.
3. Specify a creator username to retrieve insights based on the creator: `{ig_user_id}/creator_marketplace_creators?username={creator_username}&fields=insights.metrics(creator_reach).breakdown(follow_type)…`.
   - *Metrics:* `total_followers`, `creator_engaged_accounts`, `creator_reach` (breakdowns `follow_type`/`media_type`), `reels_interaction_rate`, `reels_hook_rate`.
4. Media insights may also be retrieved: `{ig_user_id}/creator_marketplace_creators?username={creator_username}&fields=branded_content_media{media_type,insights.metrics(views)},recent_media{media_type,insights.metrics(views)}…`.
   - *Detail:* `branded_content_media`/`recent_media` return the 30 most recent items (require `username`); per-media fields incl. `permalink`, `caption`, `likes`, `comments`, `views`, `shares`.

**Build specification:**
1. Research your organisation's ways of working for creator marketing. Key differentials: different/siloed teams, brand safety guidelines for selecting creators, SaaS solutions.
2. Understand and onboard to the setup prerequisites: Facebook Login for Business, page access token and advanced access for `instagram_creator_marketplace_discovery`.
3. Deploy and build an Instagram creator discovery engine and blend agency-specific metrics (e.g. brand safety metrics) tied to each creator.
   - *Detail:* use `recommendation_type` to blend Meta's ranked sets with your own brand-safety scoring; `badges`, `has_brand_partnership_experience`, `past_brand_partnership_partners` are useful native signals.
4. Opportunity to expand functionality: blend with **Recommended Creator Content** and **Partnership Ads Booster** to maximise growth. Further, include data connectors (granular business-context information by creator username) which may be imported into the project in order to provide additional business context.
5. Create user interface which will be a marketplace for agencies to explore and select creators.

---

### Additional Build Context: Creator Insights API — creator-specific insights

Insights are read on the same `creator_marketplace_creators` edge via `fields=insights.metrics(...)`, scoped to one creator using the `username` parameter.

**Metric enums (Instagram surface):**
| Metric | Access | Notes |
| --- | --- | --- |
| `total_followers` | Public | the **only** metric returned for a non-onboarded creator |
| `creator_engaged_accounts` | Private (onboarded only) | accounts that engaged |
| `creator_reach` | Private (onboarded only) | accounts reached |
| `reels_interaction_rate` | Private (onboarded only) | L90 window; no breakdowns |
| `reels_hook_rate` | Private (onboarded only) | L90 window; no breakdowns |

**Breakdowns** via `.breakdown(...)` (one at a time; a breakdown requires `period=overall` **and** `time_range=this_month`):
- `creator_engaged_accounts` → `follow_type`, `gender`, `age`, `top_countries`, `top_cities`
- `creator_reach` → `follow_type`, `media_type` (`reels`/`posts`/`stories`)
- reels metrics → none.

**Parameters:** `period` (`day` time-series | `overall`, default `overall`); `time_range` (`this_week`, `last_14_days`, `this_month`, `lifetime`; reels metrics use **L90**). Defaults: `total_followers`→`lifetime`; `creator_engaged_accounts`/`creator_reach`→`this_month`.
- *Example:* `{ig_user_id}/creator_marketplace_creators?username={creator}&fields=insights.metrics(creator_reach,creator_engaged_accounts).breakdown(follow_type)`
