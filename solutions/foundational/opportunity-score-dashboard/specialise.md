## Opportunity Score Dashboard — Specialise

> Part of the [Opportunity Score Dashboard](SOLUTION-DESIGN.md) solution set. The solution design
> covers the shared recommendation categorisation, field reference and access model. This module
> narrows the feed produced by [Observe](observe.md).

**Solution overview:** A filtering and prioritisation layer over a portfolio-wide recommendation feed, so teams see only the recommendations that matter to their areas of growth. With 35+ recommendation types across seven categories, a raw feed across hundreds of accounts is noise rather than signal — Specialise cuts it to an agency's specialisms and ranks the accounts where acting would move the most.

**Agency strategic opportunity:** Focus on your specialisms (creative, creators, optimisation, signals, etc.), drive differentiated value for your clients, prioritise effort where the impact is greatest.

**KPIs:** share of relevant recommendations surfaced, coverage of priority categories, portfolio prioritisation accuracy.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Performance Recommendations API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations) | Read recommendations with filtering by name, stage and scope. |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Read assets within a business portfolio. |

> **Prerequisites:** an access token with `ads_read` (or `ads_management`, which covers reads as well as writes). **Standard Access** is enough for ad accounts the agency owns; ad accounts the advertiser owns need **Advanced Access**, via App Review. The user or system user must hold `Insights` on the ad account. See the [solution design](SOLUTION-DESIGN.md#access-and-permissions) for the full model.

**How to use (API specification):**
1. Decide your specialisms and map them to recommendation categories.
   - *Categories:* Audience, Creative, Signals, Campaign Optimisation, Catalog, Partnership Ads, Messaging. E.g. if you're a creative-led agency, focus on `CREATIVE_FATIGUE`, `PERFORMANT_CREATIVE_REELS_OPT_IN`, `MUSIC`, `CREATIVE_LIMITED`, `MULTI_TEXT`, `BACKGROUND_GENERATION`, `UNCROP_IMAGE`; if you're a signals-led agency, focus on `SIGNALS_GROWTH_CAPI_V2`, `CAPI_CRM_GUIDANCE_V2`, `PIXEL_UPSELL`, `PIXEL_OPTIMIZATION_HIE`.
2. Filter the recommendation feed to those specialisms.
   - *Filters:* `recommendation_names`, `recommendation_stages` (`pre_create_guidance`, `pre_flight_recommendation`, `mid_flight_recommendation`), `scopes` (owned/shared). Example: `GET <BUSINESS_ID>/recommendations?recommendation_names=CREATIVE_FATIGUE&recommendation_stages=mid_flight_recommendation`.
   - *Localisation:* pass `locale` to return the recommendation copy (`body`, and the descriptions inside `recommendation_content`) in the language of the team reading the dashboard.

**Build specification:**
1. Add a specialism/filtering layer to the recommendation system.
   - *Detail:* apply `recommendation_names`/`recommendation_stages`/`scopes` so teams only see relevant recommendations; group by category (Audience, Creative, Signals, Campaign Optimisation, Catalog, Partnership Ads, Messaging).
2. Add a portfolio prioritisation view.
   - *Detail:* rank accounts by their `opportunity_score` and by each recommendation's `opportunity_score_lift` to focus effort on the highest-impact opportunities first.
3. Configure per-client or per-team recommendation profiles.
   - *Detail:* save which recommendation types/categories are meaningful for different client segments, and default the UI to those.

**Recommendation categories:** map your specialisms onto the seven-category classification in the
[solution design](SOLUTION-DESIGN.md#recommendation-categorisation) — Audience, Creative, Signals,
Campaign Optimisation, Catalog, Partnership Ads and Messaging — which lists the recommendation types
in each. It is shared across all four modules, so maintain it there rather than copying it here.
