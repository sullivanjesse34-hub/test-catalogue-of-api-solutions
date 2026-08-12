## Audience Uploader

**Solution overview:** Scale upload of first-party audiences by leveraging the Audience API.

**Strategic opportunity:** Enhanced audience strategy; no handling of personally identifiable information on local machines.

**KPIs:** time saved.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Audience API](https://developers.facebook.com/docs/marketing-api/audiences/) | Create, update and delete audiences. See [Customer file custom audiences](https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/). |
| [Custom Audience Terms of Service](https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/reference/custom-audience-terms-of-service) | Information related to custom audience terms of service. |

**How to use (API specification):**
1. Create a custom audience (the API returns an ID): `act_<AD_ACCOUNT_ID>/customaudiences?name="My new Custom Audience"&subtype="CUSTOM"&customer_file_source="USER_PROVIDED_ONLY"…`.
   - *Detail:* `customer_file_source` enum: `USER_PROVIDED_ONLY`, `PARTNER_PROVIDED_ONLY`, `BOTH_USER_AND_PARTNER_PROVIDED`. Optional `description`, `audience_labels`, `is_value_based=1` (value-based audiences).
2. Prepare the customer file (per the customer file custom audience documentation), then upload via the Audience API: `<AUDIENCE_ID>/users?…`.
   - *Detail:* this is a `POST <CUSTOM_AUDIENCE_ID>/users` with body params `payload` + `session` (not a query string).
     - `payload = {"schema": <key|[keys]>, "data": [[...row...], …]}` — `data` aligns positionally to `schema`.
     - `session = {"session_id", "batch_seq", "last_batch_flag", "estimated_num_total"}` (`session_id` required; `batch_seq` starts at 1; `last_batch_flag` required on the final batch).
   - *Hashing/normalisation (in scope):* SHA-256, lowercase hex. Key names: `EMAIL`, `PHONE`, `GEN` (`m`/`f`), `DOBY`/`DOBM`/`DOBD`, `LN`, `FN`, `FI`, `CT`, `ST`, `ZIP`, `COUNTRY`, plus un-hashed `MADID`, `EXTERN_ID`, `PAGEUID`. Normalise before hashing (trim/lowercase email; strip phone symbols + add country code; `COUNTRY` ISO alpha-2). Multi-key uploads improve match rate.
   - *Response:* `num_received`, `num_invalid_entries`, `invalid_entry_samples`. Error subcode `1870090` = Custom Audience Terms not accepted.

**Build specification:**
1. Using the audience API (see above), successfully upload customer files to customer file custom audiences.
   - *Detail:* keep a consistent `schema` across all batches of a session (changing it mid-session errors).
2. Once the data is prepared, the data may be used in targeting or creating look-alike audiences.
   - *Detail:* lookalike via `POST act_<AD_ACCOUNT_ID>/customaudiences` with `subtype=LOOKALIKE`, `origin_audience_id=<SEED>`, `lookalike_spec={"type":"similarity"|"reach","ratio":…}` (seed needs ≥100 members). Note: `lookalike_spec.country`/`location_spec` are being removed — set location at ad-set creation.
3. Build a user interface in order to handle the upload of customer data at scale.
4. In the back-end, ensure a proper mechanism is leveraged in order to retry uploads (upon fail) and that batch sizes are limited to 10,000 records.
   - *Detail:* confirmed 10,000/request cap; for larger uploads reuse one `session_id`, increment `batch_seq` from 1, set `last_batch_flag=true` on the final batch (a session auto-terminates ~90 min after the first batch). Retriable signals: `num_invalid_entries > 0` (re-check hashing).
5. In cases, custom audience terms of service may need to be accepted (either on behalf of the advertiser or as an agency). This is explained [here](https://developers.facebook.com/docs/marketing-api/audiences/reference/custom-audience-terms-of-service/).
   - *Detail:* check programmatically via `GET act_<AD_ACCOUNT_ID>?fields=tos_accepted` → `{"tos_accepted":{"custom_audience_tos":1}}`. The API rejects create/edit of customer-file audiences until accepted; system users require a non-system user to accept first.
   - *Detail:* system users cannot accept custom audience terms of service. A real user has to accept. `GET act_<AD_ACCOUNT_ID>?fields=tos_accepted` can be called to check if an ad account has the terms of accepted (a value of `"custom_audience_tos": 1` means they have been signed).
6. Opportunity to expand functionality: this solution is introductory; expand it using the Custom Audience API and other targeting options such as Advantage targeting. Consider combining customer file custom audiences with audience suggestions, and pairing this with **Targeting & Reach Estimate** to better forecast reach estimates.
