## Leads Retrieval Set-up & Checker

**Solution overview:** A checker to evaluate the end-to-end workflow of setting up leads retrieval,
creating lead ads and retrieving leads. This project enables more efficient troubleshooting of
leads retrieval issues.

**Strategic opportunity:** Reduction in number of lead ads issues, increased quality of leads.

**KPIs:** increased campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/reference/business/adspixels/) | The Business Management API enables the reading of pixel IDs. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write changes to campaign structures. |
| [App API](https://developers.facebook.com/docs/graph-api/reference/application/) | Read and write changes to developer apps. |
| [Pages API](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-pages) | Install apps (webhook connections) enabling leads retrieval. |

> *Note:* [sample apps](https://developers.facebook.com/docs/graph-api/webhooks/sample-apps/) are provided on GitHub.

**How to use (API specification):**

Perform end-to-end checks on lead ads workflows:
1. [Check app permissions](https://developers.facebook.com/docs/graph-api/reference/application/permissions/): `<APP_ID>/permissions`.
2. [Configure webhooks on app](https://developers.facebook.com/docs/graph-api/webhooks/subscriptions-edge): `<APP_ID>/subscriptions`.
   - *Detail:* subscribe `object = page`, `field = leadgen`. The leadgen webhook payload carries `leadgen_id`, `page_id`, `form_id`, `adgroup_id`, `ad_id`, `created_time`.
3. If using webhooks, [install the webhooks-configured app onto the page](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-pages#install-app): `<PAGE_ID>/subscribed_apps`.
   - [Check if the page subscription is successful](https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/#Reading): `<PAGE_ID>/subscribed_apps`.
4. [Create and read a test lead](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/testing-troubleshooting): `<FORM_ID>/test_leads`.
   - *Detail:* `POST <FORM_ID>/test_leads` (customise via `field_data`); read via `GET <FORM_ID>/test_leads`. Only **one test lead per form** — delete (`DELETE <LEAD_ID>`) before recreating.
5. [Retrieve leads (bulk read)](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving#bulk-read): the `leads` edge lives on the **ad (ad group)** and **form** nodes, not the ad set — use `<AD_ID>/leads` or `<FORM_ID>/leads` (form-level returns more, since a form is reused across ads). Read a single lead via `<LEAD_ID>`. Recommended `fields=created_time,id,ad_id,form_id,field_data`; filter with `filtering=[{field:"time_created", operator:"GREATER_THAN", value:<unix>}]`. Custom disclaimer answers come from `<LEAD_ID>?fields=custom_disclaimer_responses`.

**Build specification:**
1. For a given client, perform end-to-end checks on lead ads workflows and display in a scorecard interface.
   - *Detail:* ground each check to a signal — test-lead round-trip (with delete-before-recreate), webhook health (pending→success→failed status, failures expose `error_code`), and retrievability via `<AD_ID>/leads` / `<FORM_ID>/leads`. Bulk-read rate limit: `200 × 24 × (leads created in past 90 days)` per Page per 24h — pace scoring accordingly.
