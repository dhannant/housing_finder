// utils/interfaces.ts

export interface UserData {
	id: string,
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	phoneNumber?: string;
	createdAt?: any;
	selectedRealtorId?: string;
	is_active?: boolean;
}

export interface ClientData {
	id: string;
	firstName: string;
	lastName: string;
	role: string;
	email: string;
	phoneNumber?: string;
	createdAt?: any;
}

export interface RealtorData {
	id: string;
	firstName: string;
	lastName: string;
	role: string;
	email: string;
	phoneNumber?: string;
	createdAt?: any;
}

export interface AvailableClients {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber?: string;
	createdAt?: any;
}

export interface ClientRequest {
	id: string;
	clientId: string;
	realtorId: string;
	status: string;
	createdAt: any;
}

/**
 * Favorite Properties for a client.
 * @param id
 * @param userId
 * @param propertyId
 * @param address
 * @param price
 * @param beds
 * @param baths
 * @param status
 * @param savedAt
 */
export interface FavoriteProperty {
	id: string; // doc id
	userId: string;
	propertyId: string;
	address: string;
	price: number | null;
	beds: number | null;
	baths: number | null;
	status: string | null;
	savedAt?: any;
 }

 export interface OfferData {
	clientId: string,
   agentId: string,
   propertyId: string,
	offerId: string,
   status: "Offer Made",
   createdAt: Date,
   updatedAt: Date,
	dueDiligenceStart: Date | null,
	dueDiligenceEnd: Date | null,
	closingDate: Date | null,
	inspectionDate: Date | null,
	moveInDate: Date | null,
	earnestMoneyDueDate: Date | null,
	earnestMoneyAmountDue: number | null,
	notes: "",
	files: string
}

export interface Property {
	id: string;
	price: number | null;
	address: string;
	beds: number | null;
	baths: number | null;
	latitude: number | null;
	longitude: number | null;
	lot_sqft: number | null;
	status: string | null;
	sqft: number | null;
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