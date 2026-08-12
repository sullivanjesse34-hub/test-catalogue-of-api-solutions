## Value Rules Engine

**Solution overview:** A project to deploy, duplicate and edit Value Rules at scale.
*Note:* each ad account may have 6 Value Rule Sets, each containing 10 rules, and each rule may have up to 4 criteria.

**Strategic opportunity:** Opportunity to optimise towards client business objectives through adjusting bid caps and a reduction in time spent on rules management.

**KPIs:** improved campaign performance. *Note:* using Value Rules may increase CPMs, but the advertiser may gain increased business value by optimising towards more valuable users.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/reference/business/adspixels/) | Read ad account IDs. |
| [Value Rules API](https://developers.facebook.com/docs/marketing-api/bidding/value-rules) | Deploy and edit Value Rules. |

**How to use (API specification):**
1. Extract all ad account IDs within and across businesses: `<BUSINESS_ID>/owned_ad_accounts` (and `client_ad_accounts`).
2. Create value rule sets:
   - *Endpoints:* create `POST act_<AD_ACCOUNT_ID>/value_rule_set`; read `GET act_<AD_ACCOUNT_ID>/value_rule_set` or `GET <VALUE_RULE_SET_ID>`; update `POST <VALUE_RULE_SET_ID>` (GET existing objects first, re-POST including each object `id`); delete `POST <VALUE_RULE_SET_ID>/delete_rule_set`. To "duplicate", GET an existing set and create a new one (no dedicated duplicate endpoint).
   - *Example payload for POST:* `act_<AD_ACCOUNT_ID>/value_rule_set?"rules": [{"name": "XXX","adjust_sign": "INCREASE","adjust_value": 20,"criterias": [{"criteria_type": "AGE","operator":"CONTAINS","criteria_values": ["18-24"],"criteria_value_types": ["NONE"]}]}]`
   - *Rule schema:* `adjust_sign` (`INCREASE` 1–1000% / `DECREASE` 1–90%), `adjust_value` (int). `criteria.operator` is `CONTAINS` only. `criteria_type` enums: `AGE`, `GENDER`, `OS_TYPE`, `DEVICE_PLATFORM`, `LOCATION`, `PLACEMENT`, `OMNI_CHANNEL` (conversion location). On audience overlap, only the first applicable rule applies (ordering matters).
   - *Attach to ad set:* set `value_rule_set_id` (+ `value_rules_applied: true`) on the ad set; eligible only with auto-bid (`LOWEST_COST_WITHOUT_CAP`) or `COST_CAP` strategies.
   - *Detail:* the limit is **up to 4 criteria per rule**. You can add up to 4 criteria per rule. Rule sets with >2 criteria will not be editable (read only) in Ads Manager user interface, editing rule set is possible only via API.

**Build specification:**
1. Consult with client on what business objectives makes sense for their organisation. For example, market adoption, long-term value customers.
   - *Detail:* frame objectives as per-dimension bid adjustments (age/gender/OS/device/location/placement/conversion-location); people outside all rules get a non-adjusted bid.
2. Deploy value rules per ad account.
   - *Detail:* enforce documented limits in code (≤6 sets/account, 10 rules/set, 4 criteria/rule) and validate bid-strategy eligibility before attaching.
3. Build a user interface.
   - *Detail:* warn when a rule set will become **read-only in Ads Manager** (>2 criteria, custom age ranges, or certain placements) — those are API-edit-only.
   - *Detail:* enable the ability to duplicate rules from one ad account to another.
