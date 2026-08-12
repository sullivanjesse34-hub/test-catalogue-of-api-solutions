## Reels Performant Creative Dashboard

**Solution overview:** This solution systematically performs checks on reels creatives to determine
if they are performant.

**Strategic opportunity:** Increased creative quality, increased campaign performance.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/business-asset-management/guides/catalog/) | Extract ad account IDs within and across businesses. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write changes to campaign structures. |
| [Advantage+ Creative API](https://developers.facebook.com/docs/marketing-api/creative/advantage-creative/get-started/) | Opt-in/opt-out of creative features, including AI features. |
| [Ads Performance Recommendations API](https://developers.facebook.com/docs/marketing-api/overview/performance-recommendations) | Read and write changes for optimal ads (ad / ad set / campaign level). |

**How to use (API specification):**
1. Using the Business Management API, extract all ad account IDs within and across businesses: `<BUSINESS_ID>/owned_ad_accounts` (and `client_ad_accounts`).
2. Using the Insights API, extract the ad IDs using reels as a placement: `act_<AD_ACCOUNT_ID>/insights?level=ad&fields=impressions,ad_id&breakdowns=publisher_platform,platform_position&filtering=[{"field":"publisher_platform","operator":"ANY","value":["instagram"]},{"field":"platform_position","operator":"IN","value":["instagram_reels"]}]`.
   - *Detail:* `platform_position` filtering may be edited for `facebook_reels`, e.g. `filtering=[{"field":"platform_position","operator":"IN","value":["facebook_reels"]}]`.
3. Using the Advantage+ Creative API, apply features which support performant creatives:
   - *Creative features:* creative features live in `degrees_of_freedom_spec.creative_features_spec`: `video_auto_crop`, `adapt_to_placement`.
   - *Audio features:* `music` is opted in via `asset_feed_spec.audios=[{"type":"random"}]`
   - *Enrolling status:* features are applied by `enroll_status` set as `OPT_IN`/`OPT_OUT`.
4. Using the Ads API, [create ads from reels](https://developers.facebook.com/docs/marketing-api/creative/reels-ads) or update the existing ad IDs with the various opt-in features (see above).
   - *Detail:* repurpose an organic reel by creating the creative at `act_<AD_ACCOUNT_ID>/adcreatives` with `object_id=<PAGE_ID>`, `instagram_user_id`, `source_instagram_media_id=<IG_MEDIA_ID>`; ad set placement `publisher_platforms=["instagram"]`, `instagram_positions=["reels"]`. Eligibility: <90s, 9:16, no third-party music/GIFs/stickers.

**Build specification:**
1. Using the above API specification, extract the media which are currently being used for reels advertising.
   - *Detail:* extract the relevant ad IDs where reels is being used and score if the reel is performant or lacking opt-in features.
   - *Detail:* a performant reel is defined as (9:16, keep 35% of bottom clear (safe zones), audio is on and video enabled)
2. Apply changes to the reels to ensure they are performant.
   - *Detail:* allow the user to opt-in or view a scorecard.
3. Launch the creative for advertising or enable opt-in flow to make updates to the ad ID/s.
