## Facebook Creator Discovery

**Solution overview:** This solution leverages the Facebook Creator Discovery API to build a robust
creator discovery tool which may surface creators based on a creator's ID, or flexible filters and
search-based criteria.

**Strategic opportunity:** Increased discovery of net-new creators, creates or expands the agency's creator existing capabilities.

**KPIs:** increased brand deals, increased volume of branded content.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Facebook Creator Discovery API](https://developers.facebook.com/docs/fb-creator-discovery/) | Creator-ID-based, or flexible filter/search-based discovery of content creators. |

> **Prerequisites:** Facebook Login for Business determines access (same onboarding/terms flow as Instagram Creator Discovery).
> **Advanced access** is required for the app permission `facebook_creator_marketplace_discovery`
> (standard access returns mock/simulated data only).

**How to use (API specification):**
1. Note all prerequisites above.
2. Conduct creator-based or flexible filter/search-based API calls to find relevant creators:
   - `creator_marketplace/creators?creator_id={creator-id}&fields=creator_alias,creator_bio,…`
   - `creator_marketplace/creators?creator_categories={creator_category}&creator_countries={country_code}&query={query}…`
   - *Detail:* `query` is the recommended (semantic) search. `sort_by` values are `followers`/`relevance`. Metric filters take a JSON shape `{min, max, time_range:"L28", breakdown:"follower"}` (`follower_count`, `interaction_rate`, `reach`, `views`, …). Response fields are opt-in via `fields` (default returns only `creator_id`).
3. Conduct content-based or flexible filter/search-based API calls to find relevant content:
   - `creator_marketplace/content?content_id={content-id}…`
   - `creator_marketplace/content?reach={min:min-reach,max:max-reach}&sort_by=followers&time_range={time-range}&content_type=reels…`
   - *Detail:* `sort_by` values include (`followers`, `relevance`). `content_type` values include `reels`, `videos`, `photos`, `story`, `links`, `live`.

**Build specification:**
1. Research your organisation's ways of working for creator marketing. Key differentials: different/siloed teams, brand safety guidelines for selecting creators, SaaS solutions.
2. Understand and onboard to the setup prerequisites: Facebook Login for Business, page access token and advanced access for `facebook_creator_marketplace_discovery`.
   - *Detail:* build for partial field availability — invited-but-not-onboarded creators return a subset of fields (error subcode `10` = not onboarded).
3. Deploy and build a Facebook creator discovery engine and blend agency-specific metrics (e.g. brand safety metrics) tied to each creator.
   - *Detail:* native signals to blend: `creator_interaction_rate`, `creator_reach_by_followers`, audience demographics (`followers_genders`, `followers_top_countries`/`_cities`), `past_partnerships`. Handle error subcodes (`3961010` invalid creator, `3961014` ineligible, `3961021`–`3961025` invalid filter/range).
4. Opportunity to expand functionality: blend with **Partnership Ads Booster** to maximise growth. Further, include data connectors (granular business-context information by creator username) which may be imported into the project in order to provide additional business context.
5. Create user interface which will be a marketplace for agencies to explore and select creators.
