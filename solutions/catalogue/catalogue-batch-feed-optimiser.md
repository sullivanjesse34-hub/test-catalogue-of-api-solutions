## Catalogue Batch & Feed Optimiser

**Solution overview:** A feed optimiser tool which enables the automated process of updating large
catalogue and checking the status and error handling of uploads.

**Strategic opportunity:** Increased quality of catalogues (increased product consistency), improved campaign performance, proactive reduction in errors.

**KPIs:** improved campaign performance.

**APIs & developer docs:**
| API | What it does |
| --- | --- |
| [Business Management API](https://developers.facebook.com/docs/marketing-api/business-asset-management/guides/catalog/) | Extract catalogue IDs within and across businesses. |
| [Catalogue Batch API](https://developers.facebook.com/docs/marketing-api/catalog-batch/) | Automated creation, update and deletion of product metadata. |
| [Feed API](https://developers.facebook.com/docs/marketing-api/catalog/guides/feed-api/#error_report) | Automated uploading and error handling of product feed uploads. |

**How to use (API specification):**
1. Using the Business Management API, extract all catalogue IDs within and across businesses: `<BUSINESS_ID>/owned_product_catalogs` (and `client_product_catalogs`).
2. Catalogue batch API (recommended for large commerce catalogues which require quick updates):
   - Update availability: `<CATALOG_ID>/items_batch?requests={"method": "UPDATE","data": {"availability": "out of stock","id": "123"}}`.
      - *Detail:* `items_batch` also requires the `item_type` parameter (e.g. `PRODUCT_ITEM`). `method` enum: `CREATE`/`UPDATE`/`DELETE`. Limits: ≤**5000 records** per request (recommend <3000), payload ≤28 MB. `allow_upsert` defaults `true`. For inventory, use `quantity_to_sell_on_facebook` for stock count.
      - *Detail:* response returns `handles` + per-item `validation_status`; poll `<CATALOG_ID>/check_batch_request_status` with the handle. Back off on error `80014` (too many batch uploads).
   - Create new items: special focus should be placed on `video` field for items as this relates to Catalog Product Video.
3. Feed API:
   - Fetch the feed ID/s: `<CATALOG_ID>/product_feeds`, then update the product feed: `<FEED_ID>/uploads?url="http://www.example.com/sample_feed.xml"`.
      - *Detail:* create a scheduled feed via `POST <CATALOG_ID>/product_feeds` with `schedule` (Replace — deletes items missing from the file) or `update_schedule` (Update — only updates/creates, never deletes; best for price/availability). Useful params: `delimiter`, `ingestion_source_type` (`PRIMARY_FEED`/`SUPPLEMENTARY_FEED`).
   - Extract sampled error reports: `<UPLOAD_SESSION_ID>/error_report`.
      - *Detail:* use `<UPLOAD_SESSION_ID>/error_report` for warnings and fatal errors. For status, `GET <FEED_ID>/uploads` returns `ProductFeedUpload` nodes (manual + scheduled).

**Build specification:**
1. Integrate with the APIs (see above) catering for specific use-cases:
   - *Detail:* for large commerce catalogues, upload items using the batch API. For monitoring of product feeds, use the feed API.
   - *Detail:* a special focus should be made to upload videos, which further enables for Product Catalog Video.
2. Schedule checks (e.g. CRON job) to ensure business practices are adhered.
   - *Detail:* after each batch poll `check_batch_request_status` and inspect `validation_status[].errors/warnings`; after each upload poll `GET <FEED_ID>/uploads`. Respect ≤5000/req and ≤28 MB; back off on `80014`.

---

### Additional Context: Catalog Product Video (CPV) — the priority for new item uploads

**Why it matters:** CPV lets you upload video at the **product/SKU level**; Meta's **Dynamic Media** then chooses, per impression, whether to serve a product's image or video based on what each viewer is likely to engage with.

**Attaching video via the Batch API (`items_batch`):**
- The product item field is **`video`** — an **array of objects**, each `{"url": "...", "tag": [...]}`. `url` must be a **direct download link** to the file (not a player/watch page, e.g. not a YouTube URL). Multiple videos per item are supported by adding entries to the array.
  - *Example:* `data: {"id":"SKU123","video":[{"url":"https://cdn.example.com/v1.mp4"},{"url":"https://cdn.example.com/v2.mp4"}]}`
- In **product feeds**, the equivalent columns are `video[0].url`, `video[1].url`, `video[2].url`, … (plus matching tag columns). *Do not* mix a legacy single `video` column with `video[N].url` columns in the same feed — it can break ingestion.

**Verifying ingestion — `video_fetch_status`:** poll the item (`GET <ITEM_ID>?fields=video_fetch_status,videos`). Observed enum values:
| Value | Meaning |
| --- | --- |
| `FETCHED` | all videos for the item downloaded OK |
| `PARTIAL_FETCH` | item had multiple videos; only some downloaded |
| `OUTDATED` | URL changed since last fetch; needs re-fetch |
| `NO_STATUS` | URL present but not yet downloaded — Meta fetches **reactively** when needed for delivery, so this is often expected right after upload |
| `FETCH_FAILED` | fetch attempt failed |
| `DIRECT_UPLOAD` | video was directly uploaded |
> *Caveats:* `video_fetch_status` reflects whether a **download was triggered**, not whether the advertiser supplied a video — don't use it as a "has video" filter. Reading URLs back: a `videos` read field was added in **Marketing API v23.0**; older `videos_metadata` returns only a video **ID**.
