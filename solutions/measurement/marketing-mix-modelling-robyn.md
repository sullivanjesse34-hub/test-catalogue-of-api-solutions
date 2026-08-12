## Marketing Mix Modelling (Robyn)

**Solution overview:** This solution harnesses Meta's open-source MMM code library Robyn in
conjunction with Meta Marketing API to create a full end-to-end MMM solution.

**Strategic opportunity:** Increased speed to insights, increased analytical capabilities, more efficient budget allocation.

**KPIs:** increased campaign performance (through more efficient budget allocation).

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Robyn](https://facebookexperimental.github.io/Robyn/) | Meta's open-source MMM code library. |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Extract ad account IDs within and across businesses. |
| [Insights API](https://developers.facebook.com/docs/marketing-api/insights/marketing-mix-modeling/) | Extract data required for scaled MMM analysis. |

**How to use (API specification):**
1. Using the Business Management API, extract all ad account IDs which belong to a business portfolio: `<BUSINESS_ID>/owned_ad_accounts` (and `client_ad_accounts`).
   - *Detail:* the Insights API works only at ad-account level and below — iterate over each returned account (no business-level MMM call).
2. Using the Insights API, utilise the MMM breakdown to extract MMM data required for full modelling: `act_<AD_ACCOUNT_ID>/insights?breakdowns=mmm`. It is recommended to extract the data at ad account level.
   - *Detail:* `breakdowns=mmm` must be a `POST act_<AD_ACCOUNT_ID>/insights` with **both** `breakdowns=mmm` and `export_format=csv` (results are delivered only as CSV — the legacy `GET <report_run_id>/insights` JSON read is not supported). Also requires `level=adset`; `breakdowns=mmm` can't be combined with other `breakdowns` or `action_breakdowns`.
   - *Detail:* MMM breakdown only works for asynchronous Insights API calls (synchronous requests are unsupported with `breakdowns=mmm`).
   - *Detail:* response returns `report_run_id` → poll `GET <REPORT_RUN_ID>?fields=async_status,async_percent_completion` → download via `async_report_url`. Supported metrics: `impressions`, `spend` (estimated). CSV columns include `account_id, campaign_id, adset_id, date_start, date_stop, impressions, spend, country, region, dma, device_platform, platform_position, publisher_platform, creative_media_type`.
3. Unpack the Robyn code library and host within a development environment.
4. MMM analysis should subsequently be conducted using Robyn.

**Build specification:**
1. Create a database to store the MMM data. Schedule the data pulls on an ongoing basis.
   - *Detail:* MMM jobs are always async CSV exports and can time out — narrow `time_range` and use supported `filtering` to slice large ranges. Don't store `report_run_id` long-term (expires after 30 days).
   - *Detail:* enable the ability for users to upload custom CSV files for MMM analysis.
2. Using Robyn: create channel groupings following Meta campaign objectives (cross-channel data may be incorporated); refine the model's variables; model generation and validation/selection; budget scenarios and forecasting.
3. Perform MMM analysis with support from agency data science team.
