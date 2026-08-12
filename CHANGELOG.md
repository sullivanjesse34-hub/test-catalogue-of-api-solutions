# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/facebookincubator/catalogue-of-api-solutions/releases/tag/v1.0.0
