# RealtyUS API Response Structure

This document shows the expected response structure from the `realty-us.p.rapidapi.com/properties/search-buy` endpoint.

## How to Use

1. Call `/api/api_test?location=city:Commerce,GA`
2. Check Firebase Functions logs for console output showing:
   - Total results count
   - A sample property object (full structure)
   - Response root keys

3. Update [app/(tabs)/map.tsx](app/(tabs)/map.tsx) `House` interface based on the fields you see.

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

## Field Annotation Template (Keep / Maybe / Drop)

Use this section to quickly classify fields before finalizing normalization.

### `must_keep` (required for current app behavior)

- [Keep] `property.property_id` — Unique stable ID for upsert/doc ID
- [Keep] `property.status` — Active status and lifecycle tracking
- [Keep] `property.list_price`
- [Keep] `property.location.address.line`
- [Keep] `property.location.address.city`
- [Keep] `property.location.address.state_code`
- [Keep] `property.location.address.postal_code`
- [Keep] `property.location.address.coordinate.lat`
- [Keep] `property.location.address.coordinate.lon`
- [Keep] `property.description.beds`
- [Keep] `property.description.baths` (or fallback fields)
- [Keep] `property.primary_photo.href`
- [Keep] `property.photos[]`

### `nice_to_have` (high-value enhancements)

- [Keep] `property.is_new_construction`
- [Keep] `property.description.baths_full_calc`
- [Keep] `property.description.baths_partial_calc`
- [Keep] `property.list_date`
- [Keep] `property.location.county.name`
- [Keep] `property.description.type`
- [Keep] `property.photo_count`
- [Keep] `property.last_sold_date`
- [Keep] `property.last_sold_price`

### `raw_only` (store only in raw payload, do not map yet)

- [Drop] `property.flags`
- [Drop] `property.products`
- [Drop] `property.estimate`
- [Drop] `property.advertisers`
- [Drop] `property.branding`
- [Drop] `property.lead_attributes`
- [Maybe] `details[]`

### Notes / Decisions

- Date:
- Reviewer:
- Schema version tag (example: `v1-normalized-property`):
- Open questions:

## Next Steps

1. Run the test endpoint and paste the console output below
2. Compare with this template
3. Update the `House` interface in map.tsx
4. Update the parsing logic in [api/properties.ts](api/properties.ts) if needed

---

## API Response Captured

_Below is where you'll paste the actual response structure once you run api_test_

```json
{
  "details": [
    {
      "category": "Bedrooms",
      "text": ["Bedrooms: 3"]
    },
    {
      "category": "Bathrooms",
      "text": [
        "Total Bathrooms: 4",
        "Full Bathrooms: 3",
        "1/2 Bathrooms: 1"
      ]
    },
    {
      "category": "Interior Features",
      "text": ["Furnished: Yes"]
    },
    {
      "category": "Heating and Cooling",
      "text": [
        "Cooling Features: Central A/C",
        "Fireplace Features: Gas",
        "Number of Fireplaces: 1"
      ]
    },
    {
      "category": "Land Info",
      "text": [
        "Lot Size Acres: 0.1170799",
        "Lot Size Square Feet: 5100"
      ]
    },
    {
      "category": "Home Features",
      "text": ["View: City / Strip, Park"]
    },
    {
      "category": "Homeowners Association",
      "text": [
        "Association: Yes",
        "Association Fee: 7350",
        "Association Fee Frequency: Monthly",
        "Calculated Total Monthly Association Fees: 7350"
      ]
    },
    {
      "category": "Amenities and Community Features",
      "text": ["Doorman: Yes"]
    },
    {
      "category": "Other Property Info",
      "text": [
        "Source Listing Status: Active",
        "County: MANHATTAN",
        "Source Property Type: Condominium",
        "Property Subtype: condo",
        "Source Neighborhood: Upper East Side",
        "Postal City: New York",
        "Property Features: Elevator, Doorman",
        "Source System Name: C2C"
      ]
    },
    {
      "category": "Building and Construction",
      "text": [
        "Total Square Feet Living: 3000",
        "Year Built: 1925",
        "Building Area Total: 3000",
        "Building Area Units: Square Feet",
        "Property Age: 101",
        "House Style: Other Style",
        "Prewar: Yes",
        "Elevator: Yes"
      ]
    }
  ],
  "property": {
    "__typename": "SearchHome",
    "property_id": "4106882018",
    "listing_id": "2989030009",
    "status": "for_sale",
    "primary_photo": {
      "href": "https://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1307507934s.jpg"
    },
    "photo_count": 32,
    "photos": [
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1307507934s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m2907744271s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m2761899410s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m5854910s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m277219941s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m738351551s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3602121s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m442089063s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m2920724763s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m4023776372s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1183035405s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m681139593s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1059296735s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m64568663s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3861871092s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3004597929s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1404187469s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3493344094s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m2175081131s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1134642529s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m330045422s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3160950920s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m2965838079s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m2006809769s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m862556609s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3080688187s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3249013158s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m2775327828s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1660251321s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3533366841s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m3980526159s.jpg" },
      { "href": "http://ap.rdcpix.com/5c8b7c424989c9c565ab2cd590e081e8l-m1541831694s.jpg" }
    ],
    "location": {
      "county": { "name": "New York" },
      "neighborhoods": null,
      "address": {
        "line": "4 E 79th St",
        "unit": null,
        "street_number": "4",
        "street_name": "79th",
        "street_suffix": "St",
        "city": "New York",
        "postal_code": "10075",
        "state_code": "NY",
        "state": "New York",
        "country": "USA",
        "coordinate": {
          "lat": 40.776518,
          "lon": -73.963335
        },
        "street_view_url": "https://maps.googleapis.com/maps/api/streetview?channel=rdc-streetview&client=gme-movesalesinc&location=4%20E%2079th%20St%2C%20New%20York%2C%20NY%2010075&size=640x480&source=outdoor&signature=LuDRwt6KvqOL65cntR8At5CGyfw="
      }
    },
    "list_price": 68000000,
    "list_date": "2025-11-26T22:41:40.000000Z",
    "last_sold_date": "2024-09-12",
    "last_sold_price": 364000,
    "href": "https://www.realtor.com/realestateandhomes-detail/4-E-79th-St_New-York_NY_10075_M41068-82018",
    "products": ["core.agent", "core.broker", "co_broke"],
    "description": {
      "baths": 11,
      "baths_full_calc": 7,
      "baths_partial_calc": 4,
      "beds": 6,
      "type": "townhomes"
    },
    "branding": [
      {
        "type": "Office",
        "name": "Sotheby's International Realty - East Side Manhattan Brokerage"
      }
    ],
    "flags": {},
    "lead_attributes": {
      "opcity_lead_attributes": {
        "flip_the_market_enabled": false,
        "show_contact_an_agent": true
      }
    },
    "virtual_tours": null,
    "matterport": false,
    "advertisers": [
      {
        "fulfillment_id": "2166306",
        "name": "Serena Boardman",
        "type": "seller",
        "office": {
          "name": "Sotheby's International Realty - East Side Manhattan Brokerage"
        }
      }
    ],
    "source": {
      "type": "mls",
      "listing_id": "b1fa8c93-e87c-4523-883f-36810ddd2677"
    },
    "agents": [
      {
        "agent_name": "Serena Boardman"
      }
    ],
    "estimate": {
      "estimate": 19042800,
      "current_estimates": [
        { "estimate": 19042800, "isbest_homevalue": true },
        { "estimate": 714000, "isbest_homevalue": false }
      ]
    }
  }
}
```


