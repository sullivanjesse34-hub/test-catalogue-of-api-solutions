## AI Creative Enhancer

**Solution overview:** This solution controls the opt-in and opt-out of Advantage+ Creatives,
returning ad creatives for client use.

**Strategic opportunity:** Increased creative diversification, reduction in repetitive tasks, increased campaign performance.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/business-asset-management/guides/catalog/) | Extract ad account IDs within and across businesses. |
| [Advantage+ Creative API](https://developers.facebook.com/docs/marketing-api/creative/advantage-creative/get-started/) | Opt-in/opt-out of creative features, including AI features. |
| [Ad Previews API](https://developers.facebook.com/docs/marketing-api/generatepreview/v22.0) | Preview creatives. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write changes to campaign structures. |
| [Ads Performance Recommendations API](https://developers.facebook.com/docs/marketing-api/overview/performance-recommendations) | Read and write changes for optimal ads (ad / ad set / campaign level). |

**How to use (API specification):**
1. Using the Business Management API, extract all ad account IDs within and across businesses: `<BUSINESS_ID>/owned_ad_accounts` (and `client_ad_accounts`).
2. Using the Ads Performance Recommendations API, extract the ad IDs which have the `CREATIVE_LIMITED` or `CREATIVE_FATIGUE` recommendation: `act_<AD_ACCOUNT_ID>/recommendations` or `<BUSINESS_ID>/recommendations?recommendation_names=CREATIVE_LIMITED` or `<BUSINESS_ID>/recommendations?recommendation_names=CREATIVE_FATIGUE`
3. Using the Ads API, extract the adcreatives (creative) for each ad ID `<AD_ID>/adcreatives`
4. Using the Ads API, create a new adcreative (creative) or change an adcreative (creative) to enable Advantage+ Creative: `act_<AD_ACCOUNT_ID>/adcreatives?degrees_of_freedom_spec={…}`.
   - *Detail:* opt-in shape is `degrees_of_freedom_spec={"creative_features_spec":{"<feature>":{"enroll_status":"OPT_IN"}}}`. AI features: `image_background_gen`, `image_uncrop`, `image_templates`, `creative_stickers`, `translate_voiceover`; others incl. `text_optimizations`, `enhance_cta`, `add_text_overlay`. `music` is set via `asset_feed_spec.audios`.
   - *Important:* if any opted-in feature is AI-generated, create the ad's `status` as `PAUSED`. The user will need to review the creative changes before setting to `status` to `ACTIVE`.
5. Using the Ad Previews API, preview the ad: `<CREATIVE_ID>/previews`.
   - *Detail:* to preview a specific A+ Creative feature, use `GET <AD_ID>/previews` with `ad_format` + `creative_feature=<FEATURE_NAME>`; the response's `transformation_spec.<FEATURE_NAME>[].status` = `eligible` confirms eligibility (no `transformation_spec` = ineligible on that placement). Spec-based preview: `act_<AD_ACCOUNT_ID>/generatepreviews` with `creative` + `ad_format` (enums incl. `INSTAGRAM_REELS`, `MOBILE_FEED_STANDARD`, `INSTAGRAM_STORY`). Render the returned `body` iframe.
6. Using the Ads API, set the ad to active: `<AD_ID>?status=ACTIVE`.

**Build specification:**
1. Use the above API specifications to enable Advantage+ Creative for a new or existing creative.
   - *Detail:* remember the PAUSED-first requirement when AI features are included.
   - *Detail:* allow the user to reverse any changes via an undo button.
2. Using the agency's own system, return the creative and manipulate the creative for client suitability.
   - *Detail:* GET `creative_features_spec` to see the final eligible config (ineligible OPT_INs auto-removed) and preview via `<AD_ID>/previews?creative_feature=…`.
3. Allow the user to launch the creative for advertising.
   - *Detail:* set `status=ACTIVE` after acceptable previews; recreate without the offending feature if a preview is unacceptable.
