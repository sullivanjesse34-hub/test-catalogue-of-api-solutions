## Partnership Ads Booster

**Solution overview:** This solution creates a boosting engine to automate the creation of
partnership ads.

**Strategic opportunity:** Consolidation of boosting processes, increased campaign performance.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Partnership Ads API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/partnership-ads/) | Handles post-level permissioning, account-level permissioning and the partnership ads boosting process. |
| [Partnership Ads Advertisable Content API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/content-discovery-api) | Fetches the partnership content available to boost, across Instagram and Facebook, from one endpoint. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write changes to campaign structures. |

**How to use (API specification):**
1. Determine if post-level or account-level permissioning is required for your business context.
   - *Note:* these two options may also be enabled via the Facebook/Instagram app, or via Meta Business Suite.
   - *Detail:* whichever route is used, the resulting state is read back per tagged partner from `partnership_info{permission_status,permission_type}` on the Advertisable Content API, alongside `ad_eligibility` (`AD_READY`, `INELIGIBLE`, `NEEDS_ATTENTION`, `EXCLUDED`) and the `ad_code` needed for boosting.
2. Once determined, the Partnership Ads Advertisable Content API can be used to fetch the partnership content across both platforms: `<BUSINESS_ID>/partnership-ads-advertisable-content?ig_user_id=<IG_USER_ID>&fb_page_id=<PAGE_ID>&fields=…`. See [the Content Discovery API documentation](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/content-discovery-api) for the full parameter set.
   - *Note:* at least one of `ig_user_id` or `fb_page_id` is required, and only `content_id` is returned unless you request more via `fields`.
   - *Note:* the token needs `business_management` plus at least one of `facebook_branded_content_ads_brand` or `instagram_branded_content_ads_brand` (the Instagram scope also requires `instagram_basic`). Filter to already-boostable content with `ad_eligibilities=['AD_READY']`, and use `ad_usages` to skip content that is already `ACTIVE`.
   - *Migration:* this replaces the legacy `branded_content_advertisable_medias` (Instagram) and `advertisable-posts` (Facebook) endpoints — a single integration now covers both platforms.
3. Once fetched, the Ads API can be used to:
   - *Option 1:* create an adcreative (or creative) via source media ID: `act_<AD_ACCOUNT_ID>/adcreatives?source_instagram_media_id=<MEDIA_ID>`.
   - *Option 2:* create ad adcreative (or creative) via ad code: `act_<AD_ACCOUNT_ID>/adcreatives?instagram_boost_post_access_token=<AD_CODE>`.
   - *Once the adcreative (creative) has been created:* create an ad: `act_<AD_ACCOUNT_ID>/ads…`.
   - *Detail:* identical creative/identity params as Recommended Creator Content (`object_id`, `facebook_branded_content.sponsor_page_id`, `instagram_branded_content.sponsor_id`, `branded_content.ad_format`). Video edge case → `act_<AD_ACCOUNT_ID>/advideos` with `partnership_ad_ad_code` + `is_partnership_ad=true`.

> *Note:* the above specification is illustrative; the boosting process can be extensive.

**Build specification:**
1. Research your organisation's ways of working for creator marketing. Key differentials: different/siloed teams, brand safety guidelines for selecting creators, SaaS solutions.
2. Create a system which checks the end-to-end permissions required for boosting creator content.
   - *Detail:* gate boosting on `partnership_info[].ad_eligibility == AD_READY` and the `permission_status` of the partner you intend to boost. `partnership_info` is an array — one entry per tagged partner — so resolve the correct entry rather than reading the first.
   - *Detail:* to re-check a known set of posts, use the direct lookup parameters `content_ids`, `permalinks` or `ad_codes` (one of the three per request, max 50 identifiers). These return everything in one response but cannot be combined with filters, sorting or pagination.
3. Create a system to boost creator content into partnership ads.
   - *Detail:* choose `ad_format` (1/2/3) per identity strategy; handle the IG-video-to-FB upload error via the `advideos` + `partnership_ad_ad_code` workaround.
