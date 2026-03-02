"""
Python reference translation of `functions/src/index.ts`.

Purpose:
- Side-by-side readability comparison only
- Not wired for deployment/runtime

This file intentionally keeps comments to mirror the TypeScript source,
so you can compare total line count with comments included.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import json

import requests


# RapidAPI constants mirror the TS Firebase Functions file.
rapid_api_host = "realty-us.p.rapidapi.com"
rapid_api_base_url = "https://realty-us.p.rapidapi.com/properties/search-buy"
rapid_api_zip_codes = [
    "30102","30103","30114","30115","30120","30121","30123","30137","30139","30141","30142","30143","30188","30189",
    "30501","30503","30504","30506","30510","30512","30513","30514","30516","30517","30518","30519","30520","30522",
    "30523","30527","30528","30533","30534","30535","30540","30541","30542","30543","30547","30548","30554","30558",
    "30560","30567","30577","30580","30701","30705","30707","30710","30720","30721","30724","30725","30726","30728",
    "30732","30734","30736","30738","30739","30740","30741","30742","30750","30752","30755","30757","30760"
]


def chunk_array(array: List[Any], size: int) -> List[List[Any]]:
    # Split an array into fixed-size chunks.
    return [array[i:i + size] for i in range(0, len(array), size)]


def get_properties_array(data: Any) -> List[dict]:
    # Handle varying API response envelopes.
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        candidates = [
            data.get("properties"),
            data.get("results"),
            data.get("data", {}).get("results") if isinstance(data.get("data"), dict) else None,
            data.get("home_search", {}).get("results") if isinstance(data.get("home_search"), dict) else None,
            data.get("data", {}).get("home_search", {}).get("results")
            if isinstance(data.get("data"), dict)
            else None,
        ]
        for c in candidates:
            if isinstance(c, list):
                return c
    return []


def summarize_response_shape(data: Any) -> List[str]:
    # Return only top-level keys for lightweight diagnostics.
    if not isinstance(data, dict):
        return []
    return list(data.keys())[:12]


def extract_city_name(property_obj: Dict[str, Any]) -> str:
    # Try multiple location paths to avoid shape-specific failures.
    return (
        property_obj.get("location", {}).get("address", {}).get("city")
        or property_obj.get("address", {}).get("city")
        or property_obj.get("city")
        or "Unknown"
    )


def get_property_doc_id(property_obj: Dict[str, Any]) -> Optional[str]:
    # Normalize property_id into a Firestore-safe document ID.
    raw_property_id = property_obj.get("property_id")
    if raw_property_id is None:
        return None
    property_id = str(raw_property_id).strip()
    if not property_id:
        return None
    return property_id.replace("/", "_")


def get_api_reported_total(data: Dict[str, Any]) -> Optional[int]:
    # Probe multiple known fields where total counts may appear.
    candidates = [
        data.get("total"),
        data.get("count"),
        data.get("data", {}).get("total") if isinstance(data.get("data"), dict) else None,
        data.get("data", {}).get("count") if isinstance(data.get("data"), dict) else None,
        data.get("home_search", {}).get("total") if isinstance(data.get("home_search"), dict) else None,
        data.get("home_search", {}).get("count") if isinstance(data.get("home_search"), dict) else None,
        data.get("data", {}).get("home_search", {}).get("total") if isinstance(data.get("data"), dict) else None,
        data.get("data", {}).get("home_search", {}).get("count") if isinstance(data.get("data"), dict) else None,
        data.get("meta", {}).get("total") if isinstance(data.get("meta"), dict) else None,
        data.get("meta", {}).get("count") if isinstance(data.get("meta"), dict) else None,
    ]

    for value in candidates:
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())
    return None


def build_search_url(batch_zips: List[str], offset: int, limit: int) -> str:
    # Keep URL params aligned with TS implementation.
    location_param = f"zip: {','.join(batch_zips)}"
    return f"{rapid_api_base_url}?location={location_param}&offset={offset}&limit={limit}"


def get_rapid_api_error_message(error_text: str) -> str:
    # Best-effort extraction of nested RapidAPI error messages.
    try:
        parsed = json.loads(error_text)
        primary = (parsed.get("errors") or [None])[0] or {}
        return (
            primary.get("extensions", {}).get("data", {}).get("message")
            or primary.get("extensions", {}).get("message")
            or primary.get("message")
            or parsed.get("message")
            or error_text
        )
    except Exception:
        return error_text


def request_rapidapi(url: str, rapid_api_key: str) -> requests.Response:
    # Centralized request helper for consistent headers and timeout.
    return requests.get(
        url,
        headers={
            "X-RapidAPI-Key": rapid_api_key,
            "X-RapidAPI-Host": rapid_api_host,
        },
        timeout=30,
    )


def isolate_failed_zips(batch_zips: List[str], rapid_api_key: str) -> List[Dict[str, Any]]:
    # On batch failure, test each ZIP individually to isolate invalid ones.
    invalid_zips: List[Dict[str, Any]] = []
    for zip_code in batch_zips:
        url = build_search_url([zip_code], 0, 1)
        try:
            response = request_rapidapi(url, rapid_api_key)
            if response.status_code >= 400:
                invalid_zips.append(
                    {
                        "zip": zip_code,
                        "status": response.status_code,
                        "message": get_rapid_api_error_message(response.text)[:240],
                    }
                )
        except Exception as exc:
            invalid_zips.append({"zip": zip_code, "message": str(exc)})
    return invalid_zips


def upsert_properties_for_page(db: Any, properties: List[Dict[str, Any]], pull_date: str, run_id: str) -> Dict[str, int]:
    # Upsert one page of properties and track skipped records.
    #
    # Note: TS uses two write batches (first-seen + merge write). This Python
    # reference keeps one merge-style write path for readability comparison.
    upserted = 0
    skipped_no_property_id = 0

    for property_obj in properties:
        doc_id = get_property_doc_id(property_obj)
        if not doc_id:
            skipped_no_property_id += 1
            continue

        doc_payload = {
            **property_obj,
            "property_id": doc_id,
            "apiPullDate": pull_date,
            "apiFirstSeenDate": pull_date,
            "apiLastSeenDate": pull_date,
            "apiPullRunId": run_id,
            "apiSource": "rapidapi",
            "apiActive": True,
        }

        db.collection("properties").document(doc_id).set(doc_payload, merge=True)
        upserted += 1

    return {"upserted": upserted, "skippedNoPropertyId": skipped_no_property_id}


@dataclass
class FetchPropertyCountsResult:
    # Dataclass mirrors response payload shape from TS diagnostics endpoint.
    totalZipCodes: int
    totalBatches: int
    requestsAttempted: int
    successfulBatches: int
    failedBatches: int
    statusCounts: Dict[str, int]
    totalProperties: int
    totalApiReported: int
    sampleResponseKeys: List[str]
    sampleRapidApiHeaders: Dict[str, str]
    failedBatchDetails: List[Dict[str, Any]]
    invalidZipDetails: List[Dict[str, Any]]
    cityCounts: Dict[str, int]
    batchSummaries: List[Dict[str, Any]]
    runAt: str


def fetch_property_counts(rapid_api_key: str) -> FetchPropertyCountsResult:
    # Core diagnostics flow:
    # 1) Iterate ZIP batches
    # 2) Page through API results
    # 3) Aggregate status/city/shape telemetry
    city_counts: Dict[str, int] = {}
    batch_summaries: List[Dict[str, Any]] = []
    failed_batch_details: List[Dict[str, Any]] = []
    invalid_zip_details: List[Dict[str, Any]] = []
    status_counts: Dict[str, int] = {}

    total_properties = 0
    total_api_reported = 0
    failed_batches = 0
    successful_batches = 0
    requests_attempted = 0
    sample_response_keys: List[str] = []
    sample_rapidapi_headers: Dict[str, str] = {}

    page_size = 20
    max_pages_per_batch = 50
    batches = chunk_array(rapid_api_zip_codes, 10)

    for batch in batches:
        batch_property_count = 0
        batch_api_reported_total: Optional[int] = None
        pages_fetched = 0
        batch_failed = False

        for page in range(max_pages_per_batch):
            offset = page * page_size
            url = build_search_url(batch, offset, page_size)

            try:
                requests_attempted += 1
                response = request_rapidapi(url, rapid_api_key)
                status_key = str(response.status_code)
                status_counts[status_key] = status_counts.get(status_key, 0) + 1

                if not sample_rapidapi_headers:
                    sample_rapidapi_headers = {
                        "xRapidapiProxyResponse": response.headers.get("x-rapidapi-proxy-response", ""),
                        "xRapidapiRegion": response.headers.get("x-rapidapi-region", ""),
                        "xRapidapiVersion": response.headers.get("x-rapidapi-version", ""),
                        "xRateLimitRequestsLimit": response.headers.get("x-ratelimit-requests-limit", ""),
                        "xRateLimitRequestsRemaining": response.headers.get("x-ratelimit-requests-remaining", ""),
                    }

                if response.status_code >= 400:
                    # Preserve per-batch context and stop paging this batch.
                    failed_batches += 1
                    batch_failed = True
                    msg = get_rapid_api_error_message(response.text)
                    failed_batch_details.append(
                        {
                            "batchZips": batch,
                            "status": response.status_code,
                            "message": f"page={page + 1}, offset={offset}: {msg}"[:500],
                        }
                    )
                    if response.status_code == 400:
                        # 400 often indicates one or more problematic ZIP codes.
                        invalid_zips = isolate_failed_zips(batch, rapid_api_key)
                        if invalid_zips:
                            invalid_zip_details.append({"batchZips": batch, "invalidZips": invalid_zips})
                    break

                data = response.json()
                if not sample_response_keys:
                    sample_response_keys = summarize_response_shape(data)

                properties = get_properties_array(data)
                api_reported_total = get_api_reported_total(data)

                if batch_api_reported_total is None and api_reported_total is not None:
                    batch_api_reported_total = api_reported_total
                    total_api_reported += api_reported_total

                pages_fetched += 1
                batch_property_count += len(properties)
                total_properties += len(properties)

                for property_obj in properties:
                    city = extract_city_name(property_obj)
                    city_counts[city] = city_counts.get(city, 0) + 1

                if not properties:
                    # No more pages.
                    break

                if batch_api_reported_total is not None and batch_property_count >= batch_api_reported_total:
                    # Stop once collected count reaches API reported total.
                    break

            except Exception as exc:
                failed_batches += 1
                batch_failed = True
                failed_batch_details.append(
                    {
                        "batchZips": batch,
                        "message": f"page={page + 1}, offset={offset}: {exc}",
                    }
                )
                break

        if not batch_failed:
            successful_batches += 1

        batch_summaries.append(
            {
                "batchZips": batch,
                "pagesFetched": pages_fetched,
                "propertyCount": batch_property_count,
                "apiReportedTotal": batch_api_reported_total,
            }
        )

    return FetchPropertyCountsResult(
        totalZipCodes=len(rapid_api_zip_codes),
        totalBatches=len(batches),
        requestsAttempted=requests_attempted,
        successfulBatches=successful_batches,
        failedBatches=failed_batches,
        statusCounts=status_counts,
        totalProperties=total_properties,
        totalApiReported=total_api_reported,
        sampleResponseKeys=sample_response_keys,
        sampleRapidApiHeaders=sample_rapidapi_headers,
        failedBatchDetails=failed_batch_details,
        invalidZipDetails=invalid_zip_details,
        cityCounts=city_counts,
        batchSummaries=batch_summaries,
        runAt=datetime.now(timezone.utc).isoformat(),
    )


def count_properties_by_city_http(rapid_api_key: str) -> Dict[str, Any]:
    # HTTP-style wrapper around fetch_property_counts.
    result = fetch_property_counts(rapid_api_key)
    return {"ok": True, **result.__dict__}


def fetch_and_store_properties_sample_http(db: Any, rapid_api_key: str, batch_index: int = 0, max_pages: int = 1) -> Dict[str, Any]:
    # Sample ingestion endpoint equivalent:
    # - takes one ZIP batch
    # - limits pages for safe/manual testing
    batches = chunk_array(rapid_api_zip_codes, 10)
    if batch_index < 0 or batch_index >= len(batches):
        return {"ok": False, "message": f"batchIndex out of range. Must be between 0 and {len(batches) - 1}"}

    page_size = 20
    run_id = datetime.now(timezone.utc).isoformat()
    batch = batches[batch_index]
    max_pages = min(max(max_pages, 1), 10)

    requests_attempted = 0
    pages_fetched = 0
    upserted = 0
    skipped_no_property_id = 0
    api_reported_total: Optional[int] = None

    for page in range(max_pages):
        offset = page * page_size
        url = build_search_url(batch, offset, page_size)

        requests_attempted += 1
        response = request_rapidapi(url, rapid_api_key)
        if response.status_code >= 400:
            # Return API error details to caller.
            return {
                "ok": False,
                "batchIndex": batch_index,
                "batchZips": batch,
                "requestsAttempted": requests_attempted,
                "message": get_rapid_api_error_message(response.text),
            }

        data = response.json()
        properties = get_properties_array(data)
        if api_reported_total is None:
            api_reported_total = get_api_reported_total(data)

        if not properties:
            # Early stop when API page is empty.
            break

        pull_date = datetime.now(timezone.utc).isoformat()
        write_result = upsert_properties_for_page(db, properties, pull_date, run_id)
        upserted += write_result["upserted"]
        skipped_no_property_id += write_result["skippedNoPropertyId"]
        pages_fetched += 1

        if api_reported_total is not None and upserted >= api_reported_total:
            # Stop paging once expected total has been reached.
            break

    return {
        "ok": True,
        "runId": run_id,
        "batchIndex": batch_index,
        "batchZips": batch,
        "maxPages": max_pages,
        "requestsAttempted": requests_attempted,
        "pagesFetched": pages_fetched,
        "upserted": upserted,
        "skippedNoPropertyId": skipped_no_property_id,
        "apiReportedTotal": api_reported_total,
    }


def fetch_and_store_properties_scheduled(db: Any, rapid_api_key: str) -> Dict[str, Any]:
    # Scheduled ingestion equivalent:
    # - iterates all ZIP batches
    # - attempts up to max_pages_per_batch per batch
    batches = chunk_array(rapid_api_zip_codes, 10)
    page_size = 20
    max_pages_per_batch = 50
    run_id = datetime.now(timezone.utc).isoformat()

    total_upserted = 0
    total_skipped_no_property_id = 0

    for batch in batches:
        batch_stored = 0
        batch_skipped_no_property_id = 0
        batch_api_reported_total: Optional[int] = None

        for page in range(max_pages_per_batch):
            offset = page * page_size
            url = build_search_url(batch, offset, page_size)
            try:
                response = request_rapidapi(url, rapid_api_key)
                if response.status_code >= 400:
                    # Skip remaining pages for this batch on HTTP error.
                    break

                data = response.json()
                properties = get_properties_array(data)
                api_reported_total = get_api_reported_total(data)
                if batch_api_reported_total is None and api_reported_total is not None:
                    batch_api_reported_total = api_reported_total

                if not properties:
                    # No more records for this batch.
                    break

                pull_date = datetime.now(timezone.utc).isoformat()
                write_result = upsert_properties_for_page(db, properties, pull_date, run_id)
                batch_stored += write_result["upserted"]
                batch_skipped_no_property_id += write_result["skippedNoPropertyId"]

                if batch_api_reported_total is not None and batch_stored >= batch_api_reported_total:
                    # Avoid over-fetching when total is known.
                    break
            except Exception:
                break

        total_upserted += batch_stored
        total_skipped_no_property_id += batch_skipped_no_property_id

    return {
        "runId": run_id,
        "upserted": total_upserted,
        "skippedNoPropertyId": total_skipped_no_property_id,
    }


def run_deactivate_inactive_users(db: Any, auth_client: Any) -> Dict[str, Any]:
    # Functions and exports to mark users as is_active = false at different points.
    # TS currently uses 7 days (oneWeekAgo), with a commented 90-day alternative.
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    processed_users = 0
    deactivated_users = 0
    skipped_users = 0
    deactivated_user_ids: List[str] = []

    # Get all users from auth provider.
    list_users_result = auth_client.list_users()
    for user in list_users_result.users:
        processed_users += 1
        if getattr(user.metadata, "last_sign_in_time", None):
            last_sign_in = datetime.fromisoformat(user.metadata.last_sign_in_time)
            if last_sign_in < one_week_ago:
                db.collection("users").document(user.uid).update({"is_active": False})
                deactivated_users += 1
                deactivated_user_ids.append(user.uid)
            else:
                skipped_users += 1
        else:
            skipped_users += 1

    return {
        "processedUsers": processed_users,
        "deactivatedUsers": deactivated_users,
        "skippedUsers": skipped_users,
        "deactivatedUserIds": deactivated_user_ids,
        "runAt": datetime.now(timezone.utc).isoformat(),
    }


def deactivate_users_after_close_date_scheduled(db: Any) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    ten_days = timedelta(days=10)

    # Query all offers with a closingDate.
    offers_snapshot = db.collection("clientOffers").where("closingDate", ">", 0).stream()
    updates = 0

    for offer_doc in offers_snapshot:
        offer = offer_doc.to_dict()
        close_date = offer.get("closeDate")
        user_id = offer.get("userId")
        if close_date and user_id:
            close_date_dt = datetime.fromisoformat(str(close_date))
            if now - close_date_dt > ten_days:
                # Set is_active to false in users collection.
                db.collection("users").document(user_id).update({"is_active": False})
                updates += 1

    return {"updatedUsers": updates, "runAt": datetime.now(timezone.utc).isoformat()}
