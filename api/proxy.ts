import type { VercelRequest, VercelResponse } from "@vercel/node";

const fetch: any = (...args: any[]) => import("node-fetch").then((mod: any) => mod.default(...args));

export default async function handler(req: VercelRequest, res: VercelResponse) {
	// Parse location parameter (supports both ?search= and ?location=)
	const searchParam = typeof req.query.search === "string" ? req.query.search.trim() : "";
	const locationParam = typeof req.query.location === "string" ? req.query.location.trim() : "";
	const locationInput = locationParam || searchParam;
	if (!locationInput) {
		return res.status(400).json({ error: "Missing search or location parameter" });
	}

	// Auto-format location string (e.g., "commerce, ga" -> "city:commerce,GA")
	const locationValue = locationInput.includes(":") ? locationInput : `city:${locationInput}`;
	const params = new URLSearchParams({ location: locationValue });

	// Whitelist all supported realty-us API parameters
	const allowedParams = [
		"zoneId",
		"resultsPerPage",
		"page",
		"sortBy",
		"expandSearchArea",
		"propertyType",
		"prices",
		"bedrooms",
		"bathrooms",
		"homeSize",
		"lotSize",
		"homeAge",
		"hidePendingContingent",
		"newConstructionOnly",
		"hideHomesNotYetBuilt",
		"foreclosuresOnly",
		"hideForeclosures",
		"seniorCommunityOnly",
		"openHousesOnly",
		"priceRecentlyReducedOnly",
		"virtualToursOnly",
		"threeDtoursOnly",
		"maxHoaFeesPerMonth",
		"showHomesWhereHoaIsNotKnown",
		"daysOnRealtor",
		"garageParking",
		"heatingCooling",
		"homeFeatures",
		"lotFeatures",
		"communityFeatures",
		"nycAmenities",
		"minListDate",
		"maxListDate",
	];

	// Add any additional parameters from request query
	allowedParams.forEach((key) => {
		const value = req.query[key];
		if (typeof value === "string" && value.trim() !== "") {
			params.set(key, value.trim());
		} else if (Array.isArray(value) && value[0]?.trim()) {
			params.set(key, value[0].trim());
		}
	});

	// Fetch from RealtyUS API
	const rapidApiUrl = `https://realty-us.p.rapidapi.com/properties/search-buy?${params.toString()}`;

	const rapidApiRes = await fetch(rapidApiUrl, {
		headers: {
			"X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
			"X-RapidAPI-Host": "realty-us.p.rapidapi.com",
		},
	});

	if (!rapidApiRes.ok) {
		const errorText = await rapidApiRes.text();
		return res.status(rapidApiRes.status).json({ error: "RapidAPI request failed", details: errorText });
	}

	const apiData = await rapidApiRes.json();

	// Parse properties from response (handles multiple possible response shapes)
	const rawResults =
		(apiData?.properties && Array.isArray(apiData.properties) && apiData.properties) ||
		(apiData?.data?.home_search?.results && Array.isArray(apiData.data.home_search.results) && apiData.data.home_search.results) ||
		(apiData?.data?.home_search?.properties && Array.isArray(apiData.data.home_search.properties) && apiData.data.home_search.properties) ||
		[];

	// Normalize property data to consistent format
	const properties = rawResults.map((property: any) => {
		const latitude =
			property.location?.address?.coordinate?.lat ??
			property.location?.coordinates?.lat ??
			property.location?.latitude ??
			property.latitude ??
			null;
		const longitude =
			property.location?.address?.coordinate?.lon ??
			property.location?.coordinates?.lon ??
			property.location?.longitude ??
			property.longitude ??
			null;

		return {
			id: property.property_id ?? property.id ?? property.listing_id ?? "",
			price: property.list_price ?? property.price ?? property.price?.list_price ?? property.price?.value ?? null,
			address:
				property.location?.address?.line ||
				property.address?.line ||
				property.location?.address ||
				property.address ||
				"Address not available",
			beds: property.description?.beds ?? property.beds ?? null,
			baths: property.description?.baths ?? property.baths ?? null,
			latitude,
			longitude,
			status: property.status ?? property.status_code ?? null,
			type: property.description?.type ?? property.prop_type ?? property.type ?? null,
			photos: property.photos || property.photos?.list || [],
			primaryPhoto:
				property.primary_photo?.href ||
				property.primary_photo ||
				property.thumbnail ||
				property.photos?.[0]?.href ||
				null,
		};
	});

	return res.status(200).json({ source: "api", data: { properties }, debug: { apiDataKeys: Object.keys(apiData), fullResponse: apiData } });
}
