export interface Property {
  id: string;
  price: number | null;
  address: string;
  beds: number | null;
  baths: number | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  type: string | null;
  photos: any[];
  primaryPhoto: string | null;
}

export interface SearchOptions {
  location: string;
  zoneId?: string;
  resultsPerPage?: number;
  page?: number;
  sortBy?: string;
  expandSearchArea?: boolean;
  propertyType?: string;
  prices?: string;
  bedrooms?: string;
  bathrooms?: string;
  homeSize?: string;
  lotSize?: string;
  homeAge?: string;
  hidePendingContingent?: boolean;
  newConstructionOnly?: boolean;
  hideHomesNotYetBuilt?: boolean;
  foreclosuresOnly?: boolean;
  hideForeclosures?: boolean;
  seniorCommunityOnly?: boolean;
  openHousesOnly?: boolean;
  priceRecentlyReducedOnly?: boolean;
  virtualToursOnly?: boolean;
  threeDtoursOnly?: boolean;
  maxHoaFeesPerMonth?: number;
  showHomesWhereHoaIsNotKnown?: boolean;
  daysOnRealtor?: string;
  garageParking?: string;
  heatingCooling?: string;
  homeFeatures?: string;
  lotFeatures?: string;
  communityFeatures?: string;
  nycAmenities?: string;
  minListDate?: string;
  maxListDate?: string;
}

/**
 * Formats location string for RealtyUS API
 * Examples: "commerce, ga" -> "city:Commerce,GA"
 */
export function formatLocation(location: string): string {
  if (location.includes(":")) {
    return location; // Already formatted
  }
  
  // Convert "commerce, ga" to "city:Commerce,GA"
  const parts = location.split(",").map(s => s.trim());
  if (parts.length === 2) {
    const city = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const state = parts[1].toUpperCase();
    return `city:${city},${state}`;
  }
  
  return `city:${location}`;
}

/**
 * Builds the RealtyUS API URL with all parameters
 */
export function buildApiUrl(options: SearchOptions): string {
  const formattedLocation = formatLocation(options.location);
  const params = new URLSearchParams({ location: formattedLocation });

  // Add all optional parameters
  const optionalParams: (keyof Omit<SearchOptions, 'location'>)[] = [
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

  optionalParams.forEach((key) => {
    const value = options[key];
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return `https://realty-us.p.rapidapi.com/properties/search-buy?${params.toString()}`;
}

/**
 * Normalizes raw API property data to consistent format
 */
export function normalizeProperty(property: any): Property {
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
}

/**
 * Parses raw API response to extract properties array
 */
export function parsePropertiesFromResponse(apiData: any): any[] {
  // Try multiple possible response structures
  const rawResults =
    (apiData?.data?.results && Array.isArray(apiData.data.results) && apiData.data.results) ||  // RealtyUS actual path
    (apiData?.properties && Array.isArray(apiData.properties) && apiData.properties) ||
    (apiData?.data?.home_search?.results && Array.isArray(apiData.data.home_search.results) && apiData.data.home_search.results) ||
    (apiData?.data?.home_search?.properties && Array.isArray(apiData.data.home_search.properties) && apiData.data.home_search.properties) ||
    [];

  return rawResults;
}

/**
 * Main function to search for properties
 * This calls the Vercel proxy which adds the API key
 */
export async function searchProperties(options: SearchOptions): Promise<Property[]> {
  try {
    // Build the full RealtyUS API URL client-side
    const apiUrl = buildApiUrl(options);
    
    console.log('🔍 Searching properties with URL:', apiUrl);
    
    // Use the Vercel deployment URL (not relative path to avoid calling localhost)
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://leading-edge-realty.vercel.app';
    const proxyUrl = `${apiBaseUrl}/api/proxy?apiUrl=${encodeURIComponent(apiUrl)}`;
    console.log('🔗 Calling Vercel proxy at:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    console.log('📡 Response status:', response.status);
    console.log('📋 Content-Type:', response.headers.get('content-type'));
    
    // Get response as text first to see what we actually got
    const responseText = await response.text();
    console.log('📄 Raw response (first 200 chars):', responseText.substring(0, 200));
    
    if (!response.ok) {
      console.error('❌ Non-OK response. Full text:', responseText.substring(0, 500));
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        throw new Error(`Proxy failed with status ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }
      throw new Error(error.error || 'API request failed');
    }

    // Try to parse as JSON
    let rawData;
    try {
      rawData = JSON.parse(responseText);
      console.log('✅ Successfully parsed JSON');
      console.log('📦 Raw API response keys:', Object.keys(rawData));
    } catch (parseError: any) {
      console.error('💥 JSON PARSE ERROR:', parseError.message);
      console.error('📄 Received content type:', response.headers.get('content-type'));
      console.error('📄 Full response (first 1000 chars):', responseText.substring(0, 1000));
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }
    
    // Parse properties from response
    const rawProperties = parsePropertiesFromResponse(rawData);
    console.log(`📊 Found ${rawProperties.length} raw properties`);
    
    if (rawProperties.length > 0) {
      console.log('🏠 Sample property (raw):', rawProperties[0]);
    }
    
    // Normalize all properties
    const properties = rawProperties.map(normalizeProperty);
    console.log(`✅ Normalized ${properties.length} properties`);
    
    if (properties.length > 0) {
      console.log('🏡 Sample property (normalized):', properties[0]);
    }
    
    return properties;
    
  } catch (error) {
    console.error('💥 Error in searchProperties:', error);
    throw error;
  }
}
