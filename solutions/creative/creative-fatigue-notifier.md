## Creative Fatigue Notifier

**Solution overview:** This solution creates a system to receive creative fatigue notifications in a
real-time basis, using webhooks. Creative fatigue notifications are identical to [those which appear in Ads Manager](https://www.facebook.com/business/help/1346816142327858?id=561906377587030).

**Strategic opportunity:** Reactively and proactively identify creative fatigue issues, reduction in wasted budget, improved campaign performance.

**KPIs:** improved campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Extract ad account IDs within and across businesses. |
| [Creative Fatigue Webhook](https://developers.facebook.com/docs/graph-api/webhooks/reference/ad-account/) | Subscribe to creative fatigue as a webhook; notifies issues in real time via HTTPS. |
| [Ads API](https://developers.facebook.com/docs/marketing-api/reference/ad-account/) | Read and write of apps to ad-account subscriptions. |
| [Ad Copies API](https://developers.facebook.com/docs/marketing-api/reference/adgroup/copies/#-creative-parameters-) | Duplicate ads and change ad parameters. [Full list of ad creative parameters](https://developers.facebook.com/docs/marketing-api/reference/ad-account/adcreatives/#parameters-2). |

**How to use (API specification):**
1. Using the Business Management API, extract all ad account IDs within and across businesses: `<BUSINESS_ID>/owned_ad_accounts` (and `client_ad_accounts`).
2. Proactively search for creative fatigue notifications: using the Ads Performance Recommendations API, extract the ad IDs which have the `CREATIVE_FATIGUE` recommendation: `act_<AD_ACCOUNT_ID>/recommendations` or `<BUSINESS_ID>/recommendations?recommendation_names=CREATIVE_FATIGUE`
3. Set up a webhook via app dashboard: [get started with webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/).
   - *Detail:* stand up an HTTPS endpoint that handles the GET verification handshake and POST event payloads.
4. [Subscribe each ad account ID](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-ad-accounts) to the `ad_account` object: `act_<AD_ACCOUNT_ID>/subscribed_apps?app_id=<APP_ID>`.
5. [Subscribe the `creative_fatigue` field](https://developers.facebook.com/docs/graph-api/webhooks/subscriptions-edge) under `ad_account`: `<APP_ID>/subscriptions?object=ad_account&fields=creative_fatigue`.
   - *Note:* this step may be done via the [app dashboard user interface](https://developers.facebook.com/apps/<APP_ID>).
6. Test the webhook via the app dashboard user interface.
7. When a creative fatigue notification is received, duplicate the ad, change the creative, and [change creative parameters using the Ad Copies API](https://developers.facebook.com/docs/marketing-api/reference/adgroup/copies/#-creative-parameters-).
   - *Detail:* duplicate via `POST <AD_ID>/copies` (params commonly include `deep_copy`, `status_option`, `adset_id`). Note `<AD_ID>/copies` is an **ad-node** edge (no `act_`).
8. Opportunity to expand functionality: combine this solution with AI Creative Enhancer.

**Build specification:**
1. Integrate with the Performance Recommendations API (see above).
   - *Detail:* this is for proactive notifications of creative fatigue.
2. Create a server endpoint (which can receive HTTPS requests).
3. Set up the app dashboard (above) with the appropriate `creative_fatigue` subscription.
   - *Detail:* this is for reactive notifications of creative fatigue.
4. Incorporate notifications and creative changes into ways of working, ensuring this suits your organisation. Consider combining this with AI Creative Enhancer in order to generate new creatives and avoid creative fatigue.
