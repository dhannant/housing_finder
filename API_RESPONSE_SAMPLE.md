# RealtyUS API Response Structure

This document shows the expected response structure from the `realty-us.p.rapidapi.com/properties/search-buy` endpoint.

## How to Use

1. Call `/api/api_test?location=city:Commerce,GA`
2. Check the Vercel logs for console output showing:
   - Total results count
   - A sample property object (full structure)
   - Response root keys

3. Update [app/(tabs)/map.tsx](app/(tabs)/map.tsx) `House` interface based on the fields you see.

## Example Response Structure

The API typically returns data in one of these structures:

```json
{
  "data": {
    "home_search": {
      "results": [
        {
          "property_id": "...",
          "listing_id": "...",
          "address": {
            "line": "123 Main St",
            "city": "Commerce",
            "state": "GA",
            "postal_code": "30529"
          },
          "location": {
            "address": {
              "line": "123 Main St",
              "coordinate": {
                "lat": 34.2029,
                "lon": -83.4627
              }
            }
          },
          "price": {
            "list_price": 350000,
            "value": 350000
          },
          "description": {
            "beds": 3,
            "baths": 2,
            "type": "single_family"
          },
          "photos": [
            {
              "href": "https://example.com/photo1.jpg"
            },
            {
              "href": "https://example.com/photo2.jpg"
            }
          ],
          "primary_photo": {
            "href": "https://example.com/primary.jpg"
          },
          "status": "for_sale",
          "status_code": "for_sale"
        }
      ],
      "total": 350,
      "page_num": 1
    }
  }
}
```

## Fields to Map to House Interface

From the sample above, these are the key fields:
- `property_id` / `listing_id` → `id`
- `price.list_price` or `price.value` → `price`
- `address.line` or `location.address.line` → `address`
- `description.beds` → `beds`
- `description.baths` → `baths`
- `location.address.coordinate.lat` → `latitude`
- `location.address.coordinate.lon` → `longitude`
- `status` / `status_code` → `status`
- `description.type` → `type`
- `primary_photo.href` → `primaryPhoto`
- `photos` array → `photos`

## Next Steps

1. Run the test endpoint and paste the console output below
2. Compare with this template
3. Update the `House` interface in map.tsx
4. Update the parsing logic in [api/properties.ts](api/properties.ts) if needed

---

## API Response Captured

_Below is where you'll paste the actual response structure once you run api_test_

```
[paste response here]
```
