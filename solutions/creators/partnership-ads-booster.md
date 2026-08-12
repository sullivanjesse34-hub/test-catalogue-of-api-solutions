## Partnership Ads Booster

**Solution overview:** This solution creates a boosting engine to automate the creation of
partnership ads.

**Strategic opportunity:** Consolidation of boosting processes, increased campaign performance.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Partnership Ads API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/partnership-ads/) | Handles post-level permissioning, account-level permissioning and the partnership ads boosting process. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write changes to campaign structures. |

**How to use (API specification):**
1. Determine if post-level or account-level permissioning is required for your business context.
   - *Note:* these two options may also be enabled via the Facebook/Instagram app, or via Meta Business Suite.
   - *Detail:* post-level signal is per-media `has_permission_for_partnership_ad`; account-level/allowlist is `only_fetch_allowlisted=true` + `media_relationship` (`OWNED` vs `IS_TAGGED`).
2. Once determined, the Partnership Ads API can be used to fetch the branded content media: `<INSTAGRAM_ID>/branded_content_advertisable_medias?fields=…`.
   - *Deprecation:* `branded_content_advertisable_medias` will be **removed Dec 1, 2026** — check the [Partnership Ads documentation](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/ads-creation/boost-existing-post) for the current migration path before building on it.
3. Once fetched, the Ads API can be used to:
   - *Option 1:* create an adcreative (or creative) via source media ID: `act_<AD_ACCOUNT_ID>/adcreatives?source_instagram_media_id=<MEDIA_ID>`.
   - *Option 2:* create ad adcreative (or creative) via ad code: `act_<AD_ACCOUNT_ID>/adcreatives?instagram_boost_post_access_token=<AD_CODE>`.
   - *Once the adcreative (creative) has been created:* create an ad: `act_<AD_ACCOUNT_ID>/ads…`.
   - *Detail:* identical creative/identity params as Recommended Creator Content (`object_id`, `facebook_branded_content.sponsor_page_id`, `instagram_branded_content.sponsor_id`, `branded_content.ad_format`). Video edge case → `act_<AD_ACCOUNT_ID>/advideos` with `partnership_ad_ad_code` + `is_partnership_ad=true`.

> *Note:* the above specification is illustrative; the boosting process can be extensive.

**Build specification:**
1. Research your organisation's ways of working for creator marketing. Key differentials: different/siloed teams, brand safety guidelines for selecting creators, SaaS solutions.
2. Create a system which checks the end-to-end permissions required for boosting creator content.
   - *Detail:* gate boosting on `has_permission_for_partnership_ad == true` and empty `eligibility_errors`.
3. Create a system to boost creator content into partnership ads.
   - *Detail:* choose `ad_format` (1/2/3) per identity strategy; handle the IG-video-to-FB upload error via the `advideos` + `partnership_ad_ad_code` workaround.
