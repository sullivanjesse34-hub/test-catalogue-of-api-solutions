## Recommended Creator Content

**Solution overview:** This solution retrieves the eligible and recommended creator content which
should be created into partnership ads. Recommended creator content is accessed via the Partnership
Ads API and are AI-driven by Meta.

**Strategic opportunity:** Increased campaign performance due to AI-driven recommended creator content.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Partnership Ads API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/partnership-ads/) | Handles post-level permissioning, account-level permissioning and the partnership ads boosting process. |
| [Recommended Creator Content API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/ads-creation/boost-existing-post#recommended-creator-content) | Part of the Partnership Ads API; once `only_fetch_recommended_content` is extracted, it responds with `recommended_campaign_objectives`. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write changes to campaign structures. |

**How to use (API specification):**
1. Extract the recommended creator content: `<INSTAGRAM_ID>/branded_content_advertisable_medias?only_fetch_recommended_content=true…`.
   - *Detail:* request `fields=eligibility_errors,owner_id,permalink,id,has_permission_for_partnership_ad`. Returns `recommended_campaign_objectives` per media (e.g. `OUTCOME_ENGAGEMENT`, `OUTCOME_TRAFFIC`, `OUTCOME_SALES`). Caveats: ~3-day lag for recommendations; only content from the last 60 days; only posts with an explicit paid-partnership label.
   - *Detail:* it is expected that the `<INSTAGRAM_ID>` being used for this step will be the advertiser's Instagram account ID.
   - *Detail:* the `has_permission_for_partnership_ad` is a crucial field as it returns `true`/`false` if permissions for the creator's content are available for the advertiser to boost into a partnership ad.
   - *Deprecation:* `branded_content_advertisable_medias` will be **removed Dec 1, 2026** — check the [Partnership Ads documentation](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/ads-creation/boost-existing-post) for the current migration path before building on it.
2. Recommended: retrieve the `eligibility_errors` and `has_permission_for_partnership_ad` fields.
3. Once fetched, the Ads API can be used to create the adcreative (creative):
   - *Option 1:* create an adcreative (or creative) via source media ID: `act_<AD_ACCOUNT_ID>/adcreatives?source_instagram_media_id=<MEDIA_ID>`.
   - *Option 2:* create ad adcreative (or creative) via ad code: `act_<AD_ACCOUNT_ID>/adcreatives?instagram_boost_post_access_token=<AD_CODE>`.
   - *Once the adcreative (creative) has been created:* create an ad: `act_<AD_ACCOUNT_ID>/ads…`.
   - *Detail:* the adcreatives POST also takes `object_id=<BRAND_PAGE_ID>` plus identity objects `facebook_branded_content={"sponsor_page_id":…}`, `instagram_branded_content={"sponsor_id":…}`, `branded_content={"ad_format":1|2|3}` (1 dual identity, 2 first identity, 3 auto-optimise). The ad code goes inside `branded_content`. Then `act_<AD_ACCOUNT_ID>/ads` with `creative={"creative_id":…}`.
> *Note:* the above specification is illustrative. The process of boosting creator content can be extensive and requires assessment into your organisation's ways of working.

**Build specification:**
1. Research your organisation's ways of working for creator marketing. Key differentials: different/siloed teams, brand safety guidelines for selecting creators, SaaS solutions.
2. Create a system which simultaneously fetches the recommended creator content and creates a partnership ad.
   - *Detail:* before creating, gate on `has_permission_for_partnership_ad == true` and empty `eligibility_errors`; pick the ad-set objective from `recommended_campaign_objectives`.
3. Enable the user to turn the fetched creator content into partnership ad.
4. Create a user interface to enable the user to conduct these processes via a self-serve interface.
5. Opportunity to expand functionality: create a system which tests the effectiveness of these recommended creator content vs. business-as-usual campaigns.
