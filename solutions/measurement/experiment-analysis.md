## Experiment Analysis

**Solution overview:** This project enables agencies to standardise read and write experiments
across businesses.

**Strategic opportunity:** Once experiments are standardised: increased speed to insights, increased analytical capabilities, better planning.

**KPIs:** increased campaign performance (through better analysis).

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Ad Studies API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-study) | Read and write to various experiment types. |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Extract ad account IDs within and across businesses. |

**How to use (API specification):**
1. Access should be granted to Business Portfolios as the Ad Studies API reads and writes at a business level.
2. Once access is granted, use the Ad Studies API to read various experiments:
   - Obtain the study ID: `<BUSINESS_ID>/ad_studies`.
   - For each study, obtain the objective ID: `<STUDY_ID>/objectives`.
   - For each objective ID, obtain the results: `<OBJECTIVE_ID>?fields=results`.
   - *Detail:* a study also exposes a `cells` edge (the treatment/control arms). A cell carries `adaccount_ids`/`adset_ids`/`campaign_ids` plus a `role` (treatment vs control), and there are dedicated `ad_study_cell` / `ad_study_objective` nodes.
3. *Note:*
   - Experiments may be created in a standardised method using the same endpoints using POST method.
   - The `type` parameter is used to denote different study types (lift studies, split tests). Results are not available for split tests. Demographic information is available for split tests.
      - *Detail:* if conducting creative testing, the `type` parameter should be populated with the value `SPLIT_TEST_V2`
      - *Detail:* the `type` parameter enums: `SPLIT_TEST` is split test, `LIFT` is conversion lift. Brand lift is not accessible via API.

**Build specification:**
1. Decide if read or write is the ambition of the project.
2. For read: standardise the test results which are intended to be benchmarked.
   - *Detail:* create a benchmark system whereby similar tests are aggregated to form standardised benchmark. This enables meta-analysis across test results which draws correlation across tests (where the tests are focused on causation).
   - *Context:* it is more than likely like-for-like tests cannot be immediately identified due to the way tests were conducted in the past. Typically, the naming convention of the test may be used, but a convention may not be developed nor adhered. It may be necessary to ask the user to categorise tests according to names and/or enable renaming of the tests to increase accuracy for benchmarking.
3. For write: standardise the test design and names before writing new experiments.
   - *Detail:* a written study defines cells (each with a `role` and its measured entities at one object level) plus objectives — standardise cell roles before writing.
4. Create benchmark user interface showcasing results and correlation analysis. If write functionality is to be built then enable the easy one-click creation of experiment drafts with standardisation of test design and naming convention.

---

### Additional Context: Creative testing — split testing steps

A **creative test** is a `SPLIT_TEST_V2` ad study created with a `creative_test_config`; it pins **one ad (creative variant) per cell** and reports per-ad.

1. **Create** — `POST <BUSINESS_AD_ACCOUNT_ID>/ad_studies` with:
   - `type=SPLIT_TEST_V2`, `name`, `start_time`, `end_time`.
   - `cooldown_start_time` (**must equal** `start_time`) and `observation_end_time` (**must equal** `end_time`) — both are required for `SPLIT_TEST_V2` (a start/end-only request fails).
   - `cells` — **2–5** cells, each `{"name":...,"treatment_percentage":N,"ads":["<AD_ID>"]}`; one ad per cell, and `treatment_percentage` must **sum to 100**.
   - `creative_test_config` — opts into creative testing and sets the budget: `{"daily_budget":1000}` **or** `{"lifetime_budget_percentage":10}`. Presence of this field is what marks it a creative test — you do **not** pass `test_variable=CREATIVE` in this flow.
   - *Example cells:* `[{"name":"group a","treatment_percentage":50,"ads":["689...34"]},{"name":"group b","treatment_percentage":50,"ads":["689...77"]}]`
2. **Read results** — `GET <AD_STUDY_ID>/cells` → `GET <CELL_ID>?fields=ad_ids` → Insights API per ad (so demographic/breakdown info **is** available, unlike legacy API split tests).

> *Note:* this is distinct from a classic `SPLIT_TEST` (v1) study, which uses `adsets:[...]`/`campaigns:[...]` cells and has no built-in reporting.
