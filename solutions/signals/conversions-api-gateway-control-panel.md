## Conversions API Gateway Control Panel

**Solution overview:** This solution enables the scaled control over a Conversions API Gateway
instance. This is particularly useful for agencies who have a significant investment into
Conversions API Gateway and wish to integrate the mechanisms of the instance into their internal
platform/s.

**Strategic opportunity:** Increased customised control of Conversions API Gateway, enables one-click integration into Gateway, more efficient workflows, saves time on repetitive tasks.

**KPIs:** standardisation of best practices.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Control Plane API](https://developers.facebook.com/docs/marketing-api/gateway-products/gateway-control-plane-api) | The Control Plane API enables the programmatic control of users, accounts and pixels with respect to a Gateway instance. |

**How to use (API specification):**
1. Enable the [initial integration](https://developers.facebook.com/docs/marketing-api/gateway-products/gateway-control-plane-api#integration-guide) with the Control Plane API.
   - *Detail:* the Control Plane API is **GraphQL** against your Gateway instance domain (not REST Graph API). Account/user mutations POST to `https://{capig_domain}/hub/graphql/`; pixel mutations POST to `https://{capig_domain}/capig/graphql/`. Obtain a token from `POST https://{capig_domain}/clients/token` (`client_id`, `client_secret`, `grant_type=client_credentials`) — it **expires every 10 hours**.
   - *Detail:* two integration paths — *Partial* (no advertiser auth; create account + usage) and *Full* (advertiser auth; full API set). "Accounts" are called **tenants** (`tenantId`).
2. Using the Control Plane API, manage [users](https://developers.facebook.com/docs/marketing-api/gateway-products/gateway-control-plane-api/user-management), [accounts](https://developers.facebook.com/docs/marketing-api/gateway-products/gateway-control-plane-api/account-management) and [pixels](https://developers.facebook.com/docs/marketing-api/gateway-products/gateway-control-plane-api/pixel-management).
   - *Accounts (tenants):* `tenantMutations.createTenant` / `updateTenant` / `deleteTenant`; query `tenant(tenantId)` and `tenantUsage(tenantId)` (`totalActivePixels`, `totalEventsReceived`, …).
   - *Users at scale:* `userMutations.addUserWithRole({email, roleName})` (returns `invitationLink`), `changeRoleForUser`, `sendInvitation`.
   - *Pixels:* connect via `signalMutations.setupPixelSignalConfig({businessId, pixelId, accessToken, externalId})`; `deleteDataSource`; list via `tenantQueries.account.signalConfigs`; toggle receiving/publishing via `updateSignalConfigEventsStatus` / `updateSignalConfigCapiPublish`.

**Build specification:**
1. Using the API specification, assess the needs for your business.
   - For example, the use of the Control Plane API may be incorporated into an existing holistic Signals Health dashboard.
   - *Detail:* `tenantUsage` and per-pixel `connectionStatus` (`lastReceived`, `totalEventsReceived`, `lastPublished`, `apiErrorCode`, `publishingEnabled`) give server-side health that complements the Dataset Quality metrics from the Signals Health Dashboard.
2. Integrate the features that your business will find most useful.
   - For example, incorporating a button into an existing platform which systematically connects a pixel to a Gateway instance (`setupPixelSignalConfig`).
   - Or, incorporating a button into an existing platform which systematically creates multiple users at scale (loop `addUserWithRole` / `sendInvitation`).
   - *Detail:* refresh the access token via `/clients/token` before batch operations (10-hour expiry).
