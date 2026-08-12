## Reservation Planner

**Solution overview:** A reservation planner which simulates reservation predictions which are then
used to activate reservation campaigns (fka reach & frequency campaigns). This solution enables:
reservation prediction curves at scale, automated workflow to activate reservation buying campaigns
and processing of reservation predictions. Generating reservation predictions at scale enables the user to make an informed decision on which prediction is most cost-efficient.

**Strategic opportunity:** Stronger campaign performance due to earlier lock-in of CPMs, increased targeting options, improved workflow management.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/capabilities/v22.0) | Check the ad account's capabilities and activate ad sets. |
| [Reservation API](https://developers.facebook.com/docs/marketing-api/reservation) | Create and reserve reservation predictions. |
| [Reservation API (reading)](https://developers.facebook.com/docs/marketing-api/reference/reach-frequency-prediction#Reading) | Reading reservation predictions. |

**How to use (API specification):**
1. Use the `reachfrequencypredictions` node to predict and use reservation predictions.
2. Check if an ad account has the `CAN_USE_REACH_AND_FREQUENCY` capability: `act_<AD_ACCOUNT_ID>?fields=capabilities`.
   - *Detail:* also read `act_<AD_ACCOUNT_ID>?fields=rf_spec` for per-country `min_reach_limits`, `min_campaign_duration`, `max_campaign_duration`. Defaults: audience ≥300k, min reach ≥200k, ad set 1–90 days.
3. Create `reachfrequencypredictions` at scale.
   - *Detail:* creation is a `POST act_<AD_ACCOUNT_ID>/reachfrequencypredictions` with `target_spec`, `start_time`, `end_time`, `frequency_cap`, `reach`, `budget`, `destination_id`(s), `prediction_mode`, `objective`. Poll `GET <PREDICTION_ID>?fields=status` until ≠ pending (1 = SUCCESS).
4. Read `reachfrequencypredictions` at scale.
   - *Detail:* you can retrieve `frequency_distribution_map_agg` which is similar to `frequency_distribution_map`. It contains a list of key-value pairs where each key is a predictable number of people reached by your ad. Each value is a list of 10 numbers, each representing the number of people reached greater than or equal to 1 time, 2 times and so on. The last number represents the number of people reached greater than or equal to 10 times.
5. Reserve prediction: `act_<AD_ACCOUNT_ID>/reachfrequencypredictions?action=reserve&rf_prediction_id=<RF_PREDICTION_ID>`.
   - *Detail:* to reserve a specific point on the curve, pass `reach`+`budget`+`impression` together. Reservation is async; after reserving you have ~1 hour to assign an ad set. Hourly rate-limit error code: `613`.
6. Once reservation has been made, assign to ad set: `<AD_SET_ID>?rf_prediction_id=<RF_PREDICTION_ID>`.
   - *Detail:* `POST <AD_SET_ID>`; the parent campaign must have `buying_type=RESERVED`, and the ad set must NOT set `start_time`/`end_time`/`targeting`/`bid_amount`/`optimization_goal`/`budget` (all derived from the prediction). Detach predictions from ad sets with `rf_prediction_id=0`.

**Build specification:**
1. Build a configurable prediction engine, which is able to generate `reachfrequencypredictions` at scale and with different inputs of: prediction mode, budgets, targeting specification and start/end time.
   - *Detail:* honour `rf_spec` country limits and default min reach/audience before submitting.
2. Plot the prediction curves.
   - *Detail:* the field `frequency_distribution_map_agg` provides a distribution map of reach and frequency (i.e., "hold frequency aside, how does reach grow with budget?"). The curve field `curve_budget_reach` provides a budget and reach distribution map (i.e., "hold budget fixed, how is reach distributed across frequencies?"); build status-code handling around the prediction `status` table (e.g. budget/reach too low, insufficient inventory, below country min reach).
3. Enable the user to reserve the prediction and assign to an ad set.
   - *Detail:* the user should be able to make an informed decision to which prediction is best for their campaign.

---

### Reservation-specific status & error codes

**Response status codes.** Read the prediction `status` field (`GET <PREDICTION_ID>?fields=status`). This shows possible status results in `reachfrequencyprediction`. Initial limitations appear when applicable, however they may vary per ad account or by country in the future:

| Code | Status | Description |
| --- | --- | --- |
| 1 | SUCCESS | Prediction successful |
| 2 | PENDING | Prediction still being produced |
| 3 | FAIL | Unreachable audience. Too high reach or budget. |
| 4 | FAIL | Prediction settings invalid, for example, duration |
| 5 | FAIL | `targeting_spec` invalid |
| 6 | FAIL | Budget or bid for given reach too low |
| 7 | FAIL | Too short ad set length |
| 8 | FAIL | Too long ad set length |
| 9 | FAIL | Ad set end date too far in future |
| 10 | FAIL | Frequency cap not specified |
| 11 | FAIL | Ad placement not supported, such as mixed RHS and Feed |
| 12 | FAIL | Ad set dates issues (start time and/or end time): Start time in past, not midnight, or not full day. End time in past, exceeds 90 days of start time or doesn't end after 6AM. |
| 13 | FAIL | Targeted country not yet supported |
| 14 | FAIL | Ad set dates include blackout days |
| 15 | FAIL | Insufficient inventory, unable to reserve. See Reserving a Prediction. |
| 16 | FAIL | Minimum reach required for account not achieved. See Getting Account Restrictions |
| 17 | FAIL | Actual reach available for this prediction is less than the minimum reach of the targeted country, usually 200,000 for most countries. |
| 18 | FAIL | Invalid day parting schedule provided. |
| 19 | FAIL | Target CPM unachievable. |
| 20 | FAIL | Frequency cap too low for blended delivery |
| 21 | FAIL | Ads inventory changed significantly enough for inaccurate prediction. |
| 23 | FAIL | Frequency cap interval not supported in target country. |
| 24 | FAIL | Holdout Lift Study ad set under account or campaign group not consistent with reservation prediction. |
| 25 | FAIL | Frequency cap can't exceed the number of days your campaign runs. |
| 26 | FAILURE_EMPTY_AUDIENCE | Selected audience empty and unusable. |
| 27 | FAIL | No modification allowed on your running campaign. |
| 28 | FAIL | Cannot modify running campaign created with Insertion Order. |
| 29 | FAIL | Cannot modify running campaign due to time constraints. |
| 30 | FAIL | To edit a running reservation ad set, choose a budget higher than current spend. |
| 31 | FAIL | Lift Study for account or campaign group starts after campaign starts. |
| 32 | FAIL | Lift study for account or campaign group ends before campaign ends. |
| 35 | FAIL | Cannot set Reservation campaign start time to be in the past. |
| 36 | FAIL | Please make sure the duration of the Reservation ad set is longer than one day and the campaign start/end time is valid. |
| 37 | FAIL | The objective isn't supported by Audience Network with the reservation buying type. |
| 39 | FAIL | Selected placements combination can't be used when buying with reservation. |
| 40 | FAIL | Specific mobile OS versions can't be targeted with the reservation buying type. |
| 41 | FAIL | Friends of connections can't be targeted with the reservation buying type. |
| 42 | FAIL | Reservation campaigns are not able to run when Audience Network is selected as the only placement. Please select the Audience Network placement with either Facebook Feed or Instagram Feed as additional placements. |
| 44 | FAIL | Reservation doesn't support Facebook Story. |
| 45 | FAIL | To use Facebook Stories as a placement, please also select either Facebook Feeds or Instagram Stories. |
| 50 | FAIL | Selected placements combination can't be used when buying with Reservation. For Reservation IO buying, please ensure the objective is Video Views. Otherwise, to use Facebook In-Stream, please select the Facebook Feeds placement. |
| 53 | FAIL | The in-stream video placement is available only for audiences in the US, the UK, Australia, New Zealand, Ireland, Thailand, Mexico, Peru, France, Germany, Argentina, Colombia, Spain, Chile, Ecuador, Dominican Republic, Guatemala, Bolivia, Honduras, El Salvador, Norway, Sweden, the Netherlands, Belgium, Poland, Portugal, Denmark, India, Malaysia, the Philippines, Indonesia, and Vietnam. To continue, edit your audience to include only people in those countries. |
| 60 | FAIL | To use Facebook Marketplace, please select the Facebook Feeds placement. |
| 66 | FAIL | Facebook Right Column Placement Cannot Be Combined with Other Placements. |
| 69 | FAIL | If you would like your ad shown on the Explore section of Instagram, you will also need to select Instagram Feed as a placement. |
| 100+ | FATAL | System failure, no user fault. Retry. |
