# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-24

### Changed

- Replace the single **Opportunity Score Dashboard** solution with a modularised four-part progression — **Observe**, **Specialise**, **Apply** and **Measure** — each a self-contained module that builds on the one before it, so a build can start read-only and add write and experimentation capability incrementally.
- Introduce the first **folder-per-solution** layout in the catalogue. The four modules live in `solutions/foundational/opportunity-score-dashboard/` as `observe.md`, `specialise.md`, `apply.md` and `measure.md`, superseding `solutions/foundational/opportunity-score-dashboard.md`.
- Write each module's Solution overview to stand on its own, so a single module file can be handed to a coding agent without the others. Cross-module context is a pointer to the solution design rather than a dependency baked into the overview.
- Re-frame the strategic opportunity of each module for an agency audience, with per-module KPIs (portfolio coverage, share of relevant recommendations surfaced, adoption rate, incremental lift) in place of the single solution's combined KPI line.
- Update the `README.md` index to a single Opportunity Score Dashboard row linking the solution design and the four modules, and document how to load a modular solution into an LLM.

### Added

- Add `solutions/foundational/opportunity-score-dashboard/SOLUTION-DESIGN.md`, holding what the four modules share: why the solution is modular, how the modules interlink, the recommendation categorisation, the `recommendation_stages` routing table, a core-field reference, the access and permissions model, the human-review requirement for writes, and the score disclaimer.
- Add **Observe**, the read-only foundation: reads `opportunity_score` per ad account (`act_<AD_ACCOUNT_ID>?fields=opportunity_score`) alongside `<BUSINESS_ID>/recommendations` for portfolio-wide extraction, and documents the `scopes` filter and the 100-accounts-per-page limit.
- Add **Specialise**, a filtering and prioritisation layer over Observe: maps agency specialisms onto recommendation categories and documents the `recommendation_names`, `recommendation_stages`, `scopes` and `locale` parameters.
- Add **Apply**, the write path: documents the three adoption routes (one-click `POST act_<AD_ACCOUNT_ID>/recommendations`, Ads Manager `url` deeplink, custom Campaign/Ad Set/Ad workflow), the type-specific `extra_data` shapes, and the requirement to re-fetch the perishable `recommendation_signature` immediately before applying.
- Add **Measure**, an experimentation lens built on the [Ad Study API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-study): documents `POST <BUSINESS_ID>/ad_studies` with `type=SPLIT_TEST`, control/treatment `cells` (`treatment_percentage` minimum 10, summing to at most 100), the post-launch immutability of `start_time` and `treatment_percentage`, and reading results via `GET <AD_STUDY_ID>/cells`.
- Require a **human review gate** in **Measure**: the tool composes each experiment as a shell — proposed cells, object assignment, split, window and success metric — which a practitioner reviews and explicitly launches. No code path may publish a study unattended, because a running study's `start_time`, `treatment_percentage` and cell membership can no longer be changed.
- Classify the 35+ recommendation types into Audience, Creative, Signals, Campaign Optimisation, Catalog, Partnership Ads and Messaging, as a shared reference in the solution design used by all four modules.
- Document the routing of pre-flight versus mid-flight recommendations — pre-flight recommendations are adopted through the Ads Manager campaign-creation flow via the `url` deeplink, not through the apply API — with a `recommendation_stages` routing table in the solution design.
- Document which recommendations can be applied via the API in **Apply**, with a reference table of the 14 types that have a documented `extra_data` shape — `ADVANTAGE_PLUS_AUDIENCE`, `APLUSC_STANDARD_ENHANCEMENTS_BUNDLE`, `AUTOFLOW_OPT_IN`, `AUTOMATIC_PLACEMENTS`, `BACKGROUND_GENERATION`, `CONVERSION_LEADS_OPTIMIZATION`, `CREATIVE_FATIGUE`, `LANDING_PAGE_VIEW_OPTIMIZATION_GOAL`, `MUSIC`, `PERFORMANT_CREATIVE_REELS_OPT_IN`, `PRODUCT_SET_BOOSTING`, `SCALE_GOOD_CAMPAIGN`, `SHOPS_ADS_SAOFF` and `UNCROP_IMAGE` — sourced from the [Recommendation-specific parameters](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/performance-recommendations#recommendation-specific-parameters) documentation, a much smaller set than the full recommendation-types table.
- Document that omitting an optional `object_selection` applies the recommendation to all IDs on the recommendation target, and that `recommendation_signature` sits outside `extra_data` and is required on every apply call.
- Document a runtime applicability check in **Apply**: `recommendation_signature` is absent for recommendations that cannot be resolved in the API, so gate the one-click path on its presence and fall back to the deeplink.
- Document the `opportunity_score_history` window constraints in **Apply**: `from_date` defaults to 14 days before `to_date` and must not precede it by more than 45 days, with the most recent ~2 days of data potentially missing. Chart the score over time as a line chart annotated with the `get_reason` `changelog` explanations.
- Document the access model once, in the solution design, as the three gates a call must pass: **app permissions** (`ads_read` to read; `ads_read` and `ads_management`, or `ads_management` alone, to read and apply — `ads_management` covers reads too), **ownership** (Standard Access for ad accounts the agency owns, Advanced Access via App Review for ad accounts the advertiser owns, since Advanced Access is required for any asset you do not own), and **user permissions** (`Insights` to read or `Full Control` to read and apply, applied to the user or system user). Standard Access can be used to test the apply `POST` carrying a `recommendation_signature`.
- Add a disclaimer in **Measure** that a high or rising Opportunity Score does not reflect actual or future performance — the experiment measures the outcome, the score signals the opportunity.

## [1.1.0] - 2026-08-19

### Changed

- Update **Recommended Creator Content** and **Partnership Ads Booster** to reference the [Partnership Ads Advertisable Content API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/partnership-ads/content-discovery-api) (Content Discovery API), which returns branded content, UGC, affiliate posts, collabs, product and reposted content across Instagram and Facebook from a single `<BUSINESS_ID>/partnership-ads-advertisable-content` call.
- Move eligibility and permission gating in both Creators solutions from `has_permission_for_partnership_ad` and `eligibility_errors` to `partnership_info{ad_eligibility,permission_status,permission_type,ad_code}`, and call out that `partnership_info` is an array with one entry per tagged partner, so callers must resolve the relevant entry rather than reading the first.

### Added

- Document the access-token permission model for the Content Discovery API: `business_management` plus at least one of `facebook_branded_content_ads_brand` or `instagram_branded_content_ads_brand`, with `instagram_basic` additionally required alongside the Instagram scope.
- Document the filter, sort and field-expansion parameters, including `is_recommended`, `sort_by`, `content_types`, `ad_eligibilities`, `ad_usages`, `platform_types`, `media_types`, `post_types`, `country_codes`, `start_date`/`end_date` and `search_key`.
- Document the `organic_insights` field for prioritising candidate content by organic performance before boosting.

### Deprecated

- Mark the platform-specific `branded_content_advertisable_medias` (Instagram) and `advertisable-posts` (Facebook) endpoints as superseded by the unified endpoint, and add migration guidance to both affected solutions.

## [1.0.0] - 2026-08-10

### Added

- Publish the **Catalogue of API Solutions** — a catalogue of buildable solutions that can be developed on top of the Meta Marketing API.
- Add `README.md` with the project overview, LLM-assisted usage guidance for generating MVP code and UI mock-ups, a Media/Product/Developer ownership matrix, top-level build conventions, and an index of all 22 solutions by category.
- Structure every solution as a self-contained blueprint covering the strategic opportunity (the "why"), a solution overview (the "what"), the API specification with endpoints and developer-doc links (the "how"), and a build specification of high-level steps to ship it.
- Add two Foundational solutions: Opportunity Score Dashboard and Quality Assurance.
- Add the Performance solution: Value Rules Engine.
- Add three Signals solutions: Signals Opportunity Dashboard, Signals Health Dashboard, and Conversions API Gateway Control Panel.
- Add the Leads solution: Leads Retrieval Set-up & Checker.
- Add two Catalogue solutions: Catalogue Health Dashboard and Catalogue Batch & Feed Optimiser.
- Add four Creators solutions: Instagram Creator Discovery, Facebook Creator Discovery, Recommended Creator Content, and Partnership Ads Booster.
- Add three Creative solutions: Reels Performant Creative Dashboard, AI Creative Enhancer, and Creative Fatigue Notifier.
- Add two Measurement solutions: Experiment Analysis and Marketing Mix Modelling (Robyn).
- Add four Miscellaneous solutions: Reservation Planner, Insights Data Warehouse & Dashboard, Targeting & Reach Estimate, and Audience Uploader.
- Add `CONVENTIONS.md`, a shared conventions and domain primer covering the ads entity hierarchy, Graph API mechanics, units/ID/status gotchas, the access and auth model, rate limits and data freshness, asynchronous Insights API jobs, error handling with common error codes, and a glossary.
- Establish shared build conventions across all solutions: Graph API base URL, the `act_` ad-account prefix rule, standard placeholder tokens, the owned/client portfolio enumeration scale pattern, and scheduled-job recommendations.

[1.2.0]: https://github.com/facebookincubator/catalogue-of-api-solutions/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/facebookincubator/catalogue-of-api-solutions/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/facebookincubator/catalogue-of-api-solutions/releases/tag/v1.0.0
