## Opportunity Score Dashboard — Measure

> Part of the [Opportunity Score Dashboard](SOLUTION-DESIGN.md) solution set. The solution design
> covers the shared recommendation categorisation, field reference and access model. This module
> tests the recommendations adopted through [Apply](apply.md).

**Solution overview:** An experimentation lens over recommendation adoption. Rather than trusting the score alone, you run a controlled split test between ad sets with and without a recommendation applied, then use explainability to attribute the result — turning "Meta suggested this" into a measured outcome you can show a client. Because experiments spend real budget and are near-immutable once running, the tool composes each one as a shell for a human to review and launch.

**Agency strategic opportunity:** Proof of value to clients, evidence-based attribution of performance gains, ability to create benchmarked meta-analysis on multiple experiment outcomes.

**KPIs:** incremental lift (CPA / cost per result vs. control), win rate of tested recommendations, client retention backed by evidence.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Ad Study API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-study) | Create and run a controlled [split test](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/split-testing) (control vs. treatment cells) to measure the incremental effect of an applied recommendation on real business outcomes. |
| [Performance Recommendations API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations) | Apply the tested recommendation into the treatment cell and read the resulting `opportunity_score`. |
| [Performance Recommendations History API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations-history-api) | Use explainability (`get_reason`) to attribute the score change to the tested recommendation. |

> **Prerequisites:** an access token with `ads_read` and `ads_management`, or `ads_management` on its own — it covers the writes this module makes (creating studies, applying into the treatment cell) as well as the reads. **Standard Access** is enough for ad accounts the agency owns; ad accounts the advertiser owns need **Advanced Access**, via App Review. The user or system user must hold `Full Control` on the ad account. See the [solution design](SOLUTION-DESIGN.md#access-and-permissions) for the full model.

**How to use (API specification):**
1. Pick the recommendation to test and split the eligible objects into two groups.
   - *Detail:* take a recommendation from the Specialise/Apply flow (e.g. `CREATIVE_FATIGUE`) and the ad sets/campaigns it applies to (its `object_ids`); assign them to a control group (unchanged) and a treatment group (will receive the recommendation).
2. Assemble the study as a **shell for human review**, then create it: `POST <BUSINESS_ID>/ad_studies` with `type=SPLIT_TEST`, a `name`, `start_time` and `end_time` (unix seconds), and a `cells` array.
   - *Human in the loop:* never publish an experiment automatically. The tool composes the study — cells, split, window, objectives — and a practitioner reviews and confirms it before it launches. This is a hard gate, not a nicety: an experiment spends real client budget, and `start_time`, `treatment_percentage` and cell membership are effectively frozen once it is running (see the Build specification).
   - *Detail:* each cell needs a `name`, a `treatment_percentage` (min **10**; the sum across cells must be ≤ **100**), and at least one associated object (`adsets`, `campaigns`, or `adaccounts`). Put the control objects in one cell and the treatment objects in the other. Optionally attach `objectives` (e.g. an objective of `type=CONVERSIONS` with the relevant dataset/pixel) to define the success metric.
   - *Example cell array:* `cells=[{name:"Control",treatment_percentage:50,adsets:[<CTRL_ADSET_ID>]},{name:"Treatment",treatment_percentage:50,adsets:[<TREAT_ADSET_ID>]}]`.
   - *Returns:* the new `ad_study` `id` plus `cell_ids` and `objective_ids` (read-after-write).
3. Apply the recommendation to the treatment cell only.
   - *Detail:* `POST act_<AD_ACCOUNT_ID>/recommendations` with the `recommendation_signature` + type-specific `extra_data` for the treatment objects; leave the control objects unchanged so the only difference between cells is the recommendation.
4. Read the study results and compare outcomes.
   - *Detail:* `GET <AD_STUDY_ID>` for study status, and `GET <AD_STUDY_ID>/cells?fields=name,treatment_percentage,campaigns,adsets,adaccounts` to confirm cell composition; compare CPA / cost per result (and, for creative recommendations, frequency and CTR) between control and treatment to isolate the incremental lift. Note `results_first_available_date` for when results are ready.
5. Attribute the score movement.
   - *Detail:* pull `act_<AD_ACCOUNT_ID>/opportunity_score_history` with `get_reason=true` and point to the `changelog` entry tying the Opportunity Score increase to the tested recommendation.

**Build specification:**
1. Add an experiment manager that creates and tracks Ad Studies for selected recommendations.
   - *Detail:* `POST <BUSINESS_ID>/ad_studies` with `type=SPLIT_TEST` and control/treatment cells (each ≥1 object, `treatment_percentage` ≥10 summing to ≤100); store the returned `ad_study` id, `cell_ids` and window. Note post-launch limits: `start_time` and `treatment_percentage` can't be changed and associated objects can't be removed once running (you can extend `end_time` and add objects).
2. Gate every launch behind configurable approval rules that keep a human in the loop — the tool builds the experiment, a person launches it.
   - *Detail:* the experiment manager produces a **shell**: the proposed cells, object assignment, split, window and success metric, held in a reviewable state. A practitioner inspects it and explicitly confirms before anything goes live; no code path may publish a study unattended.
   - *Detail:* set `start_time` far enough ahead to leave room for that review, and surface the post-launch limits in the review screen so the reviewer knows what they can no longer change.
   - *Detail:* the same gate applies to step 3's apply call into the treatment cell — it writes to live ad objects and belongs behind the same confirmation.
3. Add an outcome-measurement view comparing control vs. treatment.
   - *Detail:* read the study and its cells, pull per-cell CPA / cost per result (plus creative metrics where relevant), and compute the incremental lift for client reporting.
4. Add an attribution view combining the experiment result with the `get_reason` changelog.
   - *Detail:* alongside the measured lift, show the changelog entry attributing the score movement to the tested recommendation.
5. Surface disclaimers appropriately.
   - *Detail:* a high or rising Opportunity Score does not reflect actual or future performance; the experiment measures the outcome, the score signals the opportunity.
