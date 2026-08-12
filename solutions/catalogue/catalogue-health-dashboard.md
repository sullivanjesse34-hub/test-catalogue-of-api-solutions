## Catalogue Health Dashboard

**Solution overview:** A catalogue health dashboard enables the automated process to check the
quality and health of catalogues. Data which may be evaluated: match rate, catalogue product video
coverage, warnings/diagnostics, inconsistent/inaccurate product details.

**Strategic opportunity:** Increased quality of catalogues, improved campaign performance, informed client discussions.

**KPIs:** improved campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/business-asset-management/guides/catalog/) | Extract catalogue IDs within and across businesses. |
| [Catalogue API](https://developers.facebook.com/docs/marketing-api/catalog/overview) | Read and write catalogue metadata. |

**How to use (API specification):**
1. Using the Business Management API, extract all catalogue IDs within and across businesses: `<BUSINESS_ID>/owned_product_catalogs` (and `client_product_catalogs`).
2. For each catalogue ID, extract catalogue metadata:
   - Event statistics: `<CATALOG_ID>/event_stats`.
      - *Detail:* returns counts of matched/unmatched content IDs (and unique IDs) per day over the previous 28 days, broken down by `ViewContent`/`AddToCart`/`Purchase` and source (`pixel`/`app`) — this is the **match-rate** signal. Params: `breakdowns=["device_type"]`, `date_preset` (`TODAY`/`LAST_28_DAYS`).
   - Warnings/diagnostics: `<CATALOG_ID>/diagnostics?types=['EVENT_SOURCE_ISSUES']`.
      - *Detail:* `types` enum includes `ATTRIBUTES_INVALID`, `ATTRIBUTES_MISSING`, `IMAGE_QUALITY`, `LOW_QUALITY_TITLE_AND_DESCRIPTION`, `POLICY_VIOLATION`, `CHECKOUT`, `EVENT_SOURCE_ISSUES`, `DA_VISIBILITY_ISSUES`, `SHOPS_VISIBILITY_ISSUES`. Also filter by `severities` (`MUST_FIX`/`OPPORTUNITY`), `affected_entities`, `affected_channels`.
   - Key product metadata: `<CATALOG_ID>/products?fields=retailer_id,brand,description,name,custom_label_0,short_description,color,material,pattern,size,custom_data,video_fetch_status`.
      - *Detail:* add `errors` to the field list for per-item validation issues. Required product fields to score completeness: `availability` (`in stock`/`out of stock`/`available for order`/`discontinued`), `condition` (`new`/`refurbished`/`used`), `price`, `image`, `title`, `link`, `brand`. Product-video coverage = items with a populated `video` array or use the `video_fetch_status` field.

**Build specification:**
1. Extract the relevant information using the API specification (see above).
   - *Detail:* per-catalog pull = `event_stats` (match counts) + `diagnostics` (typed/severity-tagged issues) + `products?fields=...,errors`. Feed/batch uploads are asynchronous, so poll rather than assume.
2. Create configurable programmatic rules sets (codifying best practices) and schedule rule set evaluation (e.g. CRON job) with alerts.
   - *Detail:* alert on any diagnostics group with `severities=MUST_FIX` or `types=EVENT_SOURCE_ISSUES`/`CHECKOUT`, and when the `event_stats` unmatched-content-ID ratio is high.
3. Create a user interface. The purpose of this solution is to provide a holistic view of Catalogue Health across catalogues and across businesses, such as a reporting dashboard or scorecard. Widgets are ideal.
   - *Detail:* surface diagnostics grouped by `types` + `severities`, and the matched/unmatched-unique trend over the 28-day window.
