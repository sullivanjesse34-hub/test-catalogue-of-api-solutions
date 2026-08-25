# Opportunity Score Dashboard — Solution Design

> How the four Opportunity Score Dashboard modules fit together, and the frameworks they share.
> Read this first, then build the modules in order. Each module file is self-contained and can be
> handed to a coding agent on its own; this file is the connective tissue between them.

| Module | What it adds | Access needed |
| --- | --- | --- |
| [Observe](observe.md) | Read-only extraction of `opportunity_score` and recommendations across the portfolio | `ads_read` or `ads_management` |
| [Specialise](specialise.md) | A filtering and prioritisation layer, so teams see only what matches their specialisms | `ads_read` or `ads_management` |
| [Apply](apply.md) | The write path — one-click adopt, Ads Manager deeplink, or custom workflow | `ads_management` |
| [Measure](measure.md) | An experimentation lens, proving adopted recommendations moved real outcomes | `ads_management` |

---

## Why it is modular

The full surface — read the portfolio, filter it, write changes back, then prove the changes worked
— is a large build to take on in one go, and each step carries a different risk profile. Splitting
it into four lets a team ship value early and add capability only when they are ready for it:

- **Observe** is read-only. It can ship against Standard Access with no App Review, and it already
  answers "where is the unrealised opportunity across my clients?".
- **Specialise** is still read-only. It makes Observe usable at portfolio scale, where a raw feed of
  35+ recommendation types across hundreds of accounts is noise rather than signal.
- **Apply** is the first module that writes to live ad objects. It needs `ads_management`, and it
  needs a considered view on who is allowed to change what.
- **Measure** spends client budget on a controlled test. It needs everything above plus a human
  review gate before anything launches.

A team can stop after any module and still have something useful. A team that intends to reach
Measure should still build them in order, because each module consumes what the one before produces.

## How the modules interlink

```
Observe ──────────► Specialise ──────────► Apply ──────────► Measure
extract the         filter to the          write the          prove the
raw feed            relevant subset        change back        change worked

opportunity_score   recommendation_names   recommendation_    ad_studies
recommendations     recommendation_stages  signature          cells
recommendation_     scopes                 extra_data         opportunity_score_
signature                                  object_selection   history + get_reason
```

- **Observe → Specialise.** Observe produces the raw recommendation feed. Specialise narrows it,
  using the same endpoints with filter parameters rather than a different data source.
- **Specialise → Apply.** Apply acts on the prioritised list Specialise produces. It re-fetches the
  `recommendation_signature` at the moment of applying rather than reusing the stored one.
- **Apply → Measure.** Measure takes a recommendation that Apply can adopt and, instead of rolling
  it out everywhere, applies it to a treatment cell only and compares against a held-back control.

## Shared frameworks

### Recommendation categorisation

Every module leans on the same seven-category classification of recommendation types. Observe uses
it to label the feed, Specialise to filter it, Apply to decide which types have an API write path,
and Measure to pick a candidate worth testing. Maintain it here, once.

| Category | Recommendation types |
| --- | --- |
| Audience | `ADVANTAGE_PLUS_AUDIENCE` |
| Creative | `APLUSC_STANDARD_ENHANCEMENTS_BUNDLE`, `AUTOMATIC_PLACEMENTS`, `CREATIVE_FATIGUE`, `CREATIVE_LIMITED`, `MUSIC`, `PERFORMANT_CREATIVE_REELS_OPT_IN`, `BACKGROUND_GENERATION`, `MULTI_TEXT`, `APLUSC_ADD_OVERLAYS`, `APLUSC_TEXT_IMPROVEMENTS`, `APLUSC_VISUAL_TOUCHUPS`, `AUTOFLOW_OPT_IN`, `GEN_AI_MVP`, `UNCROP_IMAGE` |
| Signals | `CAPI_CRM_GUIDANCE_V2`, `CAPI_CRM_SETUP`, `CAPI_PERFORMANCE_MATCH_KEY_V2`, `CONVERSION_LEADS_OPTIMIZATION`, `OFFSITE_CONVERSION`, `PIXEL_OPTIMIZATION_HIE`, `PIXEL_UPSELL`, `SIGNALS_GROWTH_CAPI_V2` |
| Campaign Optimisation | `LANDING_PAGE_VIEW_OPTIMIZATION_GOAL`, `SCALE_GOOD_CAMPAIGN`, `VALUE_OPTIMIZATION_GOAL`, `BUDGET_LIMITED`, `FRAGMENTATION_V3` |
| Catalog | `PRODUCT_SET_BOOSTING`, `ADVANTAGE_PLUS_CATALOG_IDS`, `SHOPS_ADS_SAOFF` |
| Partnership Ads | `PARTNERSHIP_ADS` |
| Messaging | `MESSAGING_EVENTS`, `MESSAGING_PARTNERS`, `CTX_CREATION_PACKAGE`, `UNIFIED_INBOX`, `WA_MESSAGING_PARTNERS` |

Meta adds recommendation types over time, so treat this as a snapshot rather than a closed set:
handle an unrecognised `type` by surfacing it uncategorised instead of dropping it.

### Recommendation stages

The `recommendation_stages` filter is the other axis, and it decides how a recommendation can be
adopted — which is why Apply routes on it:

| Stage | Meaning | Adoption route |
| --- | --- | --- |
| `pre_create_guidance` | Guidance offered before a campaign exists | Ads Manager creation flow |
| `pre_flight_recommendation` | Campaign built but not yet live | Ads Manager deeplink (`url`), **not** the apply API |
| `mid_flight_recommendation` | Campaign is live and delivering | Apply API, deeplink, or custom workflow |

### Core fields

The same objects travel through all four modules:

| Field | Where it comes from | Why it matters downstream |
| --- | --- | --- |
| `opportunity_score` | Ad account node, or `<BUSINESS_ID>/recommendations` | The 0–100 headline metric; ranks accounts in Specialise |
| `recommendation_signature` | Each recommendation | Required on every apply call. **Perishable** — re-fetch immediately before applying. Absent when a recommendation has no API write path, so it doubles as the applicability check |
| `object_ids` | Each recommendation | The ad/ad set/campaign the recommendation targets; becomes the cell membership in Measure |
| `opportunity_score_lift` | Each recommendation | Estimated score movement; drives prioritisation in Specialise |
| `lift_estimate`, `body` | Inside `recommendation_content` | Human-readable rationale. **Omitted by default** — request `fields=recommendation_content` |
| `url` | Each recommendation | Ads Manager deeplink; the adoption route wherever the apply API cannot be used |

### Access and permissions

Three separate gates. All three must pass before a call returns data.

**1. App permissions — which API are you calling?**

| What you need to do | Permission |
| --- | --- |
| Read only (Observe, Specialise) | `ads_read` |
| Read and apply (Apply, Measure) | `ads_read` and `ads_management`, or `ads_management` on its own |

`ads_management` covers reads as well as writes, so a single `ads_management` token is enough for
all four modules.



Advanced Access is required whenever you access assets you do not own. Standard Access is enough to
build and test against agency-owned accounts — including the
`POST act_<AD_ACCOUNT_ID>/recommendations` apply call carrying a `recommendation_signature` — so App
Review can run in parallel with the build rather than blocking it.

**3. Access and user permissions — has access been granted?**

The user or system user making the call needs a permission on the ad account itself: `Insights` to
read, `Full Control` to read and apply. For unattended portfolio-wide automation, apply it to a
Business System User.

### Human review before writes

Apply and Measure both write to live ad objects and spend real client budget. Neither should run
unattended — put configurable approval rules in front of both so a human stays in the loop. Apply
gates the one-click adopt on a practitioner choosing it; Measure goes further and creates the
experiment as a **shell** for a human to review and launch, because a running study's `start_time`,
`treatment_percentage` and cell membership can no longer be changed.

### Disclaimer

A high or rising Opportunity Score does not reflect actual or future performance. The score signals
where an opportunity exists; only the Measure module tells you what adopting it was worth.

## Shared API surface

| API | Used by |
| --- | --- |
| [Performance Recommendations API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations) | All four modules |
| [Performance Recommendations History API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations-history-api) | Apply, Measure |
| [Business Management API](https://developers.facebook.com/docs/business-management-apis/) | Observe, Specialise, Apply |
| [Ad Study API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-study) | Measure |

See [`CONVENTIONS.md`](../../../CONVENTIONS.md) for the conventions that apply across the whole
catalogue — Graph API base URL, the `act_` prefix rule, placeholders and pagination.
