## Insights Data Warehouse & Dashboard

**Solution overview:** A unified insights dashboard enables centralised reporting across advertisers
and the opportunity to benchmark trends.

**Strategic opportunity:** Reduction in repetitive tasks, enablement of quick analysis.

**KPIs:** time saved.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Insights API](https://developers.facebook.com/docs/marketing-api/insights/) | Read campaign performance data. |

**How to use (API specification):**
1. *Note:* the Insights API can function asynchronously and synchronously. It is recommended to use [asynchronous requests](https://developers.facebook.com/docs/marketing-api/insights/best-practices#asynchronous) for large jobs.
2. To make synchronous requests, send a GET request to the Insights API:
   - `act_<AD_ACCOUNT_ID>/insights?fields=spend`.
   - `act_<AD_ACCOUNT_ID>/insights?fields=spend&breakdowns=platform`.
   - `<CAMPAIGN_ID>/insights?level=ad&fields=impressions,ad_id`.
   - *Key parameters:* `level` (`account`/`campaign`/`adset`/`ad`); time via `date_preset` (preferred) or `time_range`, with `time_increment` for per-day rows; `breakdowns` (e.g. `age`, `gender`, `country`, `device_platform`, `publisher_platform`, `platform_position`, `product_id`, hourly variants — only valid combinations allowed); `action_breakdowns` (groups the `actions` field); `filtering=[{field, operator, value}]` (dot notation, e.g. `ad.impressions GREATER_THAN 0`); `use_unified_attribution_setting=true` to mirror Ads Manager.
3. To make asynchronous requests, send a POST request to the Insights API:
   - `<AD_OBJECT>/insights`.
   - The API will return a `report_run_id` — store this for later.
   - When the job is finished, extract the data: `<AD_REPORT_RUN_ID>/insights`.
      - *Detail:* poll the report run for `async_status = Job Completed` **and** `async_percent_completion = 100` before fetching. `report_run_id` expires after 30 days. From v25.0, failed reports return `error_code`/`error_message` by default.

**Build specification:**
1. Identify the business requirements for database/data warehouse.
2. Implement the Insights API, ensuring the data is secure and siloed.
   - *Detail:* paginate via `paging.cursors`; monitor the `x-fb-ads-insights-throttle` and `x-ad-account-usage` headers and back off near 100% (errors `error_code=4` / subcode `1504022`). Avoid account-level queries with high-cardinality breakdowns over wide ranges — first fetch object IDs with `level`+`filtering`, then batch per-object. Try sync first, fall back to async on timeout.
3. Analyse the data and include visualisations of data.
4. Create a user interface which enables the user to generate reports or scorecards across ad accounts and/or businesses.
