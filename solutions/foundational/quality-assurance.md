## Quality Assurance

**Solution overview:** A quality assurance tool that may check and monitor the quality of campaign
set-ups. Things to check: best practices, overspend risks and naming taxonomies.

**Strategic opportunity:** Scales Meta best practices across ad accounts, standardise best practice and save time on repetitive tasks.

**KPIs:** reduction in overspend, increased campaign performance (from best practice adoption).

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Campaign Structure](https://developers.facebook.com/docs/marketing-apis/overview) | Reference for how the ad campaign structure works. |
| [Ads API (Campaign)](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/) | Read and write changes to campaigns. |
| [Ads API (Ad Set)](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign) | Read and write changes to ad sets. |
| [Ads API (Ad)](https://developers.facebook.com/docs/marketing-api/reference/adgroup) | Read and write changes to ads. |
| [Insights API](https://developers.facebook.com/docs/marketing-api/insights) | Read campaign metrics. |
| [Ad Rules Engine API](https://developers.facebook.com/docs/marketing-api/ad-rules/) | Efficient management of ads via rules. |

**How to use (API specification):**
1. Extract campaign IDs for all ad account IDs: `act_<AD_ACCOUNT_ID>/campaigns`.
2. The `adaccount`, `campaign`, `adset` and `adcreative` nodes may be queried to surface campaign delivery information.
   - *Fields to QA:* at campaign level — `name`, `objective`, `status`/`effective_status`, `buying_type` (`AUCTION`/`FIXED_CPM`/`RESERVED`), `bid_strategy`, `special_ad_categories`, `daily_budget`/`lifetime_budget`, `spend_cap`; at ad set level — `optimization_goal`, `billing_event`, `is_autobid`, `bid_amount`, `placement`/`targeting`; at ad level — `bid_amount`, `creative`, `effective_status`. Note `effective_status` ≠ `status`/`configured_status`. Budgets/spend are in the currency's minor unit (cents for USD).
3. Extract metadata for each campaign ID: `<CAMPAIGN_ID>?fields=<COMMA_SEPARATED_FIELD_LIST>`.
4. Relevant information from [edges](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/#edges) may also be extracted: `<CAMPAIGN_ID>/adsets`.
   - *Pacing signal:* compare `spend` from Insights against budget.
   - *Overspend signal:* expose `daily_budget` or `lifetime_budget` in the user interface to check if these values are expected.
5. [Trigger-based](https://developers.facebook.com/docs/marketing-api/ad-rules/guides/trigger-based-rules) and [schedule-based](https://developers.facebook.com/docs/marketing-api/ad-rules/guides/scheduled-based-rules) rules may be set via the Ad Rules Engine API.
   - *Detail:* create rules at `POST act_<AD_ACCOUNT_ID>/adrules_library` with `name`, `evaluation_spec`, `execution_spec`. `evaluation_spec.evaluation_type` selects `TRIGGER` vs `SCHEDULE` (not separate endpoints). `evaluation_spec.filters[]` are `{field, value, operator}` (operators incl. `GREATER_THAN`, `LESS_THAN`, `IN_RANGE`, `IN`, `CONTAIN`); `execution_spec.execution_type` ∈ `NOTIFICATION`, `PAUSE`, `UNPAUSE`, `CHANGE_BUDGET`, `CHANGE_BID`, `REBALANCE_BUDGET`, `PING_ENDPOINT`. Schedule cadence via `schedule_spec.schedule_type` (`DAILY`/`HOURLY`/`SEMI_HOURLY`/`CUSTOM`).
   - *Note:* rules POST to the `adrules_library` edge — this is the Ad Rules Engine. Trigger-based rules are **API-only** (not visible/editable in Ads Manager).

**Build specification:**
1. Extract and store the relevant API information (see above).
   - *Detail:* store campaign-level QA fields + ad-set-level fields + Insights `spend`/`impressions`/`results` for spend-vs-budget checks (remember minor-unit currency).
2. Create a programmatic rules sets (codifying best practices) and schedule rule set evaluation (e.g. CRON job).
   - *Detail:* the Ad Rules Engine has built-in scheduling (`schedule_spec`) and bounds via `execution_count_limit`/`action_frequency`, so it can replace an external CRON. Example rules: PAUSE on overspend (`daily_ratio_spent` filter), NOTIFICATION on `effective_status IN [DISAPPROVED, PENDING_REVIEW]`, trigger on `daily_budget` change.
3. Create a user interface.
   - Create a complete user interface showcasing key fields which require a user to check the accuracy for quality assurance.
   - *Detail:* surface API-only trigger rules in your own UI since they aren't shown in Ads Manager.
