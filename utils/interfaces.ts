// utils/interfaces.ts

export interface UserData {
	id: string,
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	phoneNumber?: string;
	teamMemberId?: string;
	profileImageUrl?: string;
	bioImageUrl?: string;
	createdAt?: any;
	selectedRealtorId?: string;
	is_active?: boolean;
	pushToken?: string;
	pushTokenPlatform?: string;
	pushTokenUpdatedAt?: any;
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


// Allowed offer statuses as a constant array
export const OFFER_STATUSES = [
	"Offer Made",
	"separator",
	"Offer Declined",
	"Offer Withdrawn",
	"separator",
	"Offer Accepted",	
	"Under Contract",
	"Closing Scheduled",
	"Closed"
] as const;

export type OfferStatus = typeof OFFER_STATUSES[number];

/**
 * Offer Data Interface to control typing
 */
export interface OfferData {
	clientId: string,	
	agentId: string,
	propertyId: string,
	offerId: string,			//This should be the document id
	status: OfferStatus,
	createdAt: Date,
	updatedAt: Date,
	dueDiligenceStart: Date | null,
	dueDiligenceEnd: Date | null,
	closingDate: Date | null,
	inspectionDate: Date | null,
	earnestMoneyDueDate: Date | null,
	earnestMoneyAmountDue: number | null,
	notes: "",
	files: string
}

/**
 * Property Interface
 */
export interface Property {
	favoriteId: string;
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
export interface FavoriteProperty extends Property {
	id: string; // doc id
	userId: string;
	propertyId: string;
	savedAt?: any;
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