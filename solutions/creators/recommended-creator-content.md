## Recommended Creator Content

**Solution overview:** This solution retrieves the eligible and recommended creator content which
should be created into partnership ads. Recommended creator content is accessed via the Partnership
Ads Advertisable Content API (Content Discovery API) and is AI-driven by Meta. A single endpoint
returns partnership content — branded content, UGC, affiliate posts, collabs, product and reposted
content — across both Instagram and Facebook.

**Strategic opportunity:** Increased campaign performance due to AI-driven recommended creator content.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Partnership Ads API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/partnership-ads/) | Handles post-level permissioning, account-level permissioning and the partnership ads boosting process. |
| [Partnership Ads Advertisable Content API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/content-discovery-api) | Discovers partnership content across Instagram and Facebook from one endpoint, with filtering, sorting, field expansion and organic insights. Exposes the same inventory advertisers browse visually in the [Partnership Ads Hub](https://business.facebook.com/partnership_ads_hub/). Replaces the legacy `branded_content_advertisable_medias` (Instagram) and `advertisable-posts` (Facebook) endpoints. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write changes to campaign structures. |

**How to use (API specification):**
1. Extract the recommended creator content across Instagram and Facebook from a single endpoint: `<BUSINESS_ID>/partnership-ads-advertisable-content?ig_user_id=<IG_USER_ID>&fb_page_id=<PAGE_ID>&is_recommended=true`.
   - *Note:* at least one of `ig_user_id` or `fb_page_id` is required. Each must belong to `<BUSINESS_ID>`, and if both are supplied the two accounts must be linked to each other.
   - *Note:* `is_recommended` defaults to `false`, so it must be set explicitly to return only Meta-recommended content. `sort_by` defaults to `RECOMMENDED` (the alternative is `DATE`), so recommended content ranks first even when the filter is off.
   - *Note:* the token requires `business_management` plus at least one of `facebook_branded_content_ads_brand` or `instagram_branded_content_ads_brand`. Content is returned only for the platforms your token holds a brand scope for; the Instagram scope also requires `instagram_basic` on the same account — without it the call returns 403.
   - *Detail:* the caller additionally needs any permission on the business and basic admin permission on the Page or Instagram account. User, system user, business person (MMA) and delegated page tokens are all supported.
   - *Migration:* if you have built against the legacy `branded_content_advertisable_medias` (Instagram) or `advertisable-posts` (Facebook) endpoints, plan the move to this unified endpoint — a single integration now covers both platforms.
2. Recommended: retrieve eligibility and permission state via field expansion: `…&fields=content_id,platform,permalink,partnership_info{ad_eligibility,permission_status,permission_type,ad_code}`.
   - *Note:* only `content_id` is returned by default — every other field is opt-in via `fields`. Nested sub-fields use curly braces.
   - *Detail:* `partnership_info` is an **array** with one entry per tagged partner, so a single piece of content can carry several eligibility and permission states. It also exposes `tagged_partner` (identity object) and `content_types`.
   - *Detail:* `ad_eligibility` is the boost gate: `AD_READY`, `INELIGIBLE`, `NEEDS_ATTENTION` or `EXCLUDED`.
   - *Detail:* other useful top-level fields are `media_type`, `post_type`, `caption`, `creation_time` (`YYYY-MM-DD`), `author{display_name,ig_user_id,fb_page_id,profile_picture_url}`, `is_recommended` and `ad_usage`.
3. Optional: narrow the result set using `content_types` (`BRANDED_CONTENT`, `PRODUCT`, `AFFILIATE`, `COLLAB_POST`, `TAGGED`, `REPOSTED`), `ad_eligibilities`, `ad_usages` (`NEVER_USED`, `ACTIVE`, `PREVIOUSLY_USED`), `platform_types`, `media_types` (`IMAGE`, `VIDEO`, `CAROUSEL`, `LINK`), `post_types` (`FEED`, `STORY`, `REEL`), `country_codes`, `start_date`/`end_date`, `ad_partner_ig_user_ids`/`ad_partner_page_ids` or `search_key`.
   - *Detail:* `start_date` and `end_date` must be supplied together, cannot be in the future, and `start_date` must be on or before `end_date`. Naming a platform in `platform_types` that your token lacks the brand scope for returns 403.
4. Optional: prioritise candidates by organic performance before boosting: `…&fields=content_id,organic_insights{reach,views,likes,comments,shares,saves,interaction}`.
   - *Detail:* every organic insight metric is a nullable int — treat missing values as unknown rather than zero.
5. Page through the result set: `limit` accepts 1–50 (default 25), and each response returns `paging.cursors.after` until the final page, which omits the `paging` object entirely.
   - *Detail:* pagination is forward-only — sending a `before` cursor is rejected with 400.
   - *Detail:* direct lookups by `content_ids`, `permalinks` or `ad_codes` (only one of the three per request, max 50 identifiers) return all results in one response and cannot be combined with filter, sort or pagination parameters.
6. Once fetched, the Ads API can be used to create the adcreative (creative):
   - *Option 1:* create an adcreative (or creative) via source media ID: `act_<AD_ACCOUNT_ID>/adcreatives?source_instagram_media_id=<MEDIA_ID>`.
   - *Option 2:* create ad adcreative (or creative) via ad code: `act_<AD_ACCOUNT_ID>/adcreatives?instagram_boost_post_access_token=<AD_CODE>`.
   - *Once the adcreative (creative) has been created:* create an ad: `act_<AD_ACCOUNT_ID>/ads…`.
   - *Detail:* the adcreatives POST also takes `object_id=<BRAND_PAGE_ID>` plus identity objects `facebook_branded_content={"sponsor_page_id":…}`, `instagram_branded_content={"sponsor_id":…}`, `branded_content={"ad_format":1|2|3}` (1 dual identity, 2 first identity, 3 auto-optimise). The ad code goes inside `branded_content`. Then `act_<AD_ACCOUNT_ID>/ads` with `creative={"creative_id":…}`.
> *Note:* the above specification is illustrative. The process of boosting creator content can be extensive and requires assessment into your organisation's ways of working.

**Build specification:**
1. Research your organisation's ways of working for creator marketing. Key differentials: different/siloed teams, brand safety guidelines for selecting creators, SaaS solutions.
2. Create a system which simultaneously fetches the recommended creator content and creates a partnership ad.
   - *Detail:* before creating, gate on `partnership_info[].ad_eligibility == AD_READY` and the `permission_status` of the partner you intend to boost. Use `ad_usage` to avoid re-boosting content that is already `ACTIVE`.
3. Enable the user to turn the fetched creator content into partnership ad.
4. Create a user interface to enable the user to conduct these processes via a self-serve interface.
5. Opportunity to expand functionality: create a system which tests the effectiveness of these recommended creator content vs. business-as-usual campaigns.
