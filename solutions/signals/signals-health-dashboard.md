## Signals Health Dashboard

**Solution overview:** A signals health dashboard that may centralise, analyse, score and monitor
signal-related data. Alternatively, a signals maturity framework (like a scorecard) could be
developed. Data which may be evaluated: event match quality score, event volume, diagnostics etc.

**Strategic opportunity:** Increased quality of Conversions API integrations, delegation of technical topics, informed client discussions.

**KPIs:** improved event match quality score, improved campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/reference/business/adspixels/) | Read pixel IDs. |
| [Ads Pixel Node](https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/#fields) | Read various metrics and metadata from the pixel node. |
| [Dataset Quality API](https://developers.facebook.com/docs/marketing-api/conversions-api/dataset-quality-api#) | Dataset quality metrics for web CAPI (e.g. event match quality / EMQ score). |
| [Dataset Quality API for Offline Events](https://developers.facebook.com/documentation/ads-commerce/conversions-api/dataset-quality-api/offline-events) | Dataset quality metrics for offline CAPI (e.g. offline dataset quality score). |

**How to use (API specification):**
1. Extract the pixel IDs for a given business portfolio: `<BUSINESS_ID>/adspixels`.
2. For each pixel ID, extract metadata:
   - Event statistics: `<PIXEL_ID>/stats`.
      - *Detail:* default `aggregation=event`; useful health aggregations: `event_source` (server vs browser), `event_processing_results`, `match_keys`, `had_pii`. Data only up to 7 days from request.
   - Various dataset quality metrics: `dataset_quality?dataset_id=<DATASET_ID>&agent_name=<AGENT_NAME>&fields=web{event_match_quality,event_name}`.
      - *Detail:* `dataset_quality` is a **top-level node** keyed by `dataset_id` (= pixel ID). The `web` field is an array per `event_name`. Key sub-fields: `event_match_quality{composite_score}` (the EMQ score out of 10) and `match_key_feedback[]{identifier, coverage{percentage}}`; `event_coverage{percentage, goal_percentage}` (goal example 75); `dedupe_key_feedback[]`; `data_freshness{upload_frequency}` (`real_time`/`hourly`); `event_potential_aly_acr_increase` (upside for events not yet on CAPI).
      - *Detail:* `agent_name` is **optional**.
   - For offline events, use the field parameter to denote "offline": `dataset_quality?dataset_id=<DATASET_ID>&fields=offline`.
      - *Detail:* `offline{composite, match_key, frequency, freshness}` — each returns `{score, recommendation}`. `composite` is out of 10; `composite ≥ 8.5` unlocks omnichannel ads. `match_key.coverage{email, phone}` gives match coverage.
   - Pixel settings: `<PIXEL_ID>?fields=automatic_matching_fields,checks`.

**Build specification:**
> *Note:* the solution may be used to create monitoring/alerts, or a holistic signals maturity framework.
1. Extract the relevant information using the API specification (see above).
2. Create configurable programmatic rules sets or develop a signals maturity framework (codifying best practices) and schedule rule set evaluation (e.g. CRON job) and create a user interface.
   - *Detail:* codify thresholds from doc-provided goals — EMQ `composite_score` buckets, `event_coverage.percentage` vs `goal_percentage` (75), `data_freshness.upload_frequency != real_time`, offline `composite < 8.5` (omnichannel gate). Use `event_match_quality.diagnostics` (`solution` text) to auto-generate remediation alerts. EMQ is real-time so it can be polled on the CRON cadence; `/stats` retains only 7 days, so extract at least weekly.
