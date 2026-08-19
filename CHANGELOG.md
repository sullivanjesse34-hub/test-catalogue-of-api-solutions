# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.1.0]: https://github.com/facebookincubator/catalogue-of-api-solutions/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/facebookincubator/catalogue-of-api-solutions/releases/tag/v1.0.0
