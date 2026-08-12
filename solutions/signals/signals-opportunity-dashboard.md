## Signals Opportunity Dashboard

**Solution overview:** A signals opportunity dashboard that may identify the leading opportunities
to connect to Conversions API.

**Strategic opportunity:** Increased connection of Conversions API integrations, increase campaign performance.

**KPIs:** improved campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/reference/business/adspixels/) | Read pixel IDs. |
| [Ads Pixel Node](https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/#fields) | Read various metrics and metadata from the pixel node. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write of apps to ad-account subscriptions. |
| [Insights API](https://developers.facebook.com/docs/marketing-api/insights/marketing-mix-modeling/) | Extract campaign metrics. |

**How to use (API specification):**
1. Extract the pixel IDs for a given business portfolio: `<BUSINESS_ID>/adspixels`.
   - *Detail:* supports `id_filter`/`name_filter` and `summary{total_count}` for a count of pixels.
2. For each pixel ID, find spend and metadata:
   - Connected ad accounts: `<PIXEL_ID>/adaccounts`.
   - Ad set promoted object: `act_<AD_ACCOUNT_ID>/adsets?fields=promoted_object`.
      - *Detail:* read `promoted_object.pixel_id` to attribute an ad set's spend to a specific pixel.
   - Spend by ad set ID: `act_<AD_ACCOUNT_ID>/insights?level=adset&fields=spend,adset_id`.
   - Event sources: `<PIXEL_ID>/stats?aggregation=event_source`.
      - *Web-connected events:* `<PIXEL_ID>/stats?event_source=WEB_ONLY`
      - *CAPI-connected events:* `<PIXEL_ID>/stats?event_source=SERVER_ONLY`
   - Pixel settings: `<PIXEL_ID>?fields=automatic_matching_fields`.
      - *Detail:* useful node fields for opportunity sizing: `is_unavailable`, `data_use_setting`, `first_party_cookie_status`, `enable_automatic_matching`, `has_1p_pixel_event`, `last_fired_time`, `server_last_fired_time`.

**Build specification:**
1. Extract the relevant information using the API specification (see above).
2. Schedule extraction of the data and apply calculations to opportunity size the signals opportunities (e.g. score to evaluate amount of pixel spend not connected to CAPI).
   - *Detail:* combine spend (Insights, attributed via `promoted_object.pixel_id`) with CAPI-presence signals (`server_last_fired_time` populated, `has_1p_pixel_event`, `/stats` with `event_source=SERVER_ONLY`). Exclude pixels where `is_unavailable=true`. Note `/stats` only retains 7 days from request time — schedule at least weekly to build history.
3. Create a user interface.
   - *Detail:* the focus is on identifying high-traffic web-connected pixel events (and high-spending web-connected pixels) which may benefit by connecting to CAPI.
