// utils/interfaces.ts
export type DateTimeString = string;

export interface ShowingTimeBlock {
	start: DateTimeString; // Format: MM/DD/YYYY HH:MM AM/PM
	end: DateTimeString;
 }
 
 export interface ShowingRequest {
	id: string;
	propertyId: string;
	clientId: string;
	realtorId: string;
	requestedBlocks: ShowingTimeBlock[];
	confirmedBlockIndex: number | null;
	status: "pending" | "confirmed" | "declined";
	clientNotes?: string;
	agentNotes?: string | null;
	createdAt: DateTimeString;
	updatedAt: DateTimeString;
 }

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
	signupLocation?: {
		latitude: number;
		longitude: number;
		accuracy: number | null;
	} | null;
	signupLocationCapturedAt?: any;
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
	role: string;
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
	id: string;
	price: number | null;
	address: string;
	beds: number | null;
	baths: number | null;
	year_built?: number | null;
	property_age?: number | null;
	is_foreclosure?: boolean | null;
	is_new_construction?: boolean | null;
	latitude: number | null;
	longitude: number | null;
	listingId: string;
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

// Standalone PropertyDetails interface matching API response (not extending Property)
export interface PropertyDetails {
	id: string;
	listing_id?: string | null;
	status?: string | null;
	href?: string | null;
	list_date?: string | null;
	last_update_date?: string | null;
	last_price_change_date?: string | null;
	last_price_change_amount?: number | null;
	list_price?: number | null;
	list_price_min?: number | null;
	list_price_max?: number | null;
	price_per_sqft?: number | null;
	address?: string;
	beds?: number | null;
	baths?: number | null;
	latitude?: number | null;
	longitude?: number | null;
	lot_sqft?: number | null;
	sqft?: number | null;
	type?: string | null;
	photos?: { href: string; type?: string | null }[];
	primaryPhoto?: string | null;
	primary_photo?: { href?: string | null } | null;
	hoa:string;
	community?: {
		name?: string; 
		description?: string; 
	}
	flood?: {
		flood_factor_score: number;
		flood_insurance_text: string;
		flood_trend_paragraph: string;
	}
	noise?: {
		type: string;
		text: string | null;
		score: string | null;
	}
	mortgage?: {
		property_tax_rate?: number | null;
		rates_url?: string | null;
		estimate?: {
			loan_amount?: number | null;
			monthly_payment?: number | null;
			total_payment?: number | null;
			down_payment?: number | null;
			average_rate?: {
				loan_type?: {
					term?: number | null;
					loan_id?: string | null;
				};
				rate?: number | null;
			};
			monthly_payment_details?: {
				type: string;
				amount: number;
				display_name: string;
			}[];
			average_rates?: {
				loan_type?: {
					term?: number | null;
					loan_id?: string | null;
				};
				rate?: number | null;
			}[];
		};
	};
	description?: {
		baths_consolidated?: string | null;
		baths?: number | null;
		baths_min?: number | null;
		baths_max?: number | null;
		heating?: string | null;
		cooling?: string | null;
		beds?: number | null;
		beds_min?: number | null;
		beds_max?: number | null;
		garage?: number | null;
		garage_min?: number | null;
		garage_max?: number | null;
		pool?: boolean | null;
		sqft?: number | null;
		sqft_min?: number | null;
		sqft_max?: number | null;
		styles?: string[] | null;
		lot_sqft?: number | null;
		units?: number | null;
		stories?: number | null;
		type?: string | null;
		text?: string | null;
		year_built?: number | null;
		name?: string | null;
		pet_policy?: string | null;
	};
	nearby_schools?: {
		schools?: {
			__typename?: string;
			id: string;
			name: string | null;
			rating: number | null;
			student_count: number | null;
			distance_in_miles: number | null;
			funding_type: string | null;
			education_levels: string[];
			grades: string[];
			coordinate?: {
				lat: number | null;
				lon: number | null;
			};
			district?: {
				id: string | null;
				name: string | null;
			};
		}[];
	};
	flags?: {
		is_contingent?: boolean | null;
		is_new_construction?: boolean | null;
		is_pending?: boolean | null;
		is_foreclosure?: boolean | null;
		is_deal_available?: boolean | null;
		is_subdivision?: boolean | null;
		is_plan?: boolean | null;
		is_price_reduced?: boolean | null;
		is_new_listing?: boolean | null;
		is_coming_soon?: boolean | null;
		is_usda_eligible?: boolean | null;
	};
	details?: { category: string; text: string[] }[];
	location?: {
		address?: {
			line: string | null;
			city: string | null;
			state_code: string | null;
			postal_code: string | null;
			state?: string | null;
			country?: string | null;
		};
		coordinate?: {
			lat: number | null;
			lon: number | null;
		};
		street_view_url?: string | null;
		neighborhoods?: string[] | null;
	};
	branding?: {
		type?: string | null;
		name?: string | null;
		phone?: string | null;
		photo?: string | null;
		href?: string | null;
	}[];
	photo_count?: number | null;
	property_history?: any;
	local?: {
		flood?: {
			fsid?: string | null;
			flood_factor_score?: number | null;
			flood_trend_paragraph?: string | null;
			firststreet_url?: string | null;
			fema_zone?: string[] | null;
			flood_insurance_text?: string | null;
		};
	};
	home_tours?: {
		virtual_tours?: { href: string; label?: string | null; category?: string | null }[];
	};
	virtual_tours?: { href: string; label?: string | null; category?: string | null }[] | null;
	message?: string;
	api_status?: boolean;
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

export type SellBranchType = 'Realty2Cash' | 'Traditional';

export type ListingStatus = 'Submitted' | 'Assigned' | 'Contacted' | 'In Review' | 'Closed';

export type PreferredContactMethod = 'Call' | 'Text' | 'Email';

export interface AvailabilityWindow {
	dayOfWeek: string;
	startTime: string;
	endTime: string;
}

export interface ClientPropertyListing {
	id?: string;
	clientId: string;
	assignedAgentId: string | null;
	branchType: SellBranchType;
	status: ListingStatus;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	postalCode: string;
	propertyType?: string;
	bedrooms?: number | null;
	bathrooms?: number | null;
	squareFeet?: number | null;
	lotSizeSqft?: number | null;
	yearBuilt?: number | null;
	timelineToSell?: string;
	notes?: string;
	preferredContactMethod: PreferredContactMethod;
	contactPhone?: string;
	contactEmail?: string;
	availability: AvailabilityWindow[];
	createdAt?: any;
	updatedAt?: any;
	submittedAt?: any;
}

export interface AgentAssignedClientPropertyListing extends ClientPropertyListing {
	id: string;
	clientName: string;
	clientEmail: string;
	clientPhoneNumber?: string;
}

// Calendar event types returned by getCalendarEvents cloud function
export interface CalendarEventRange {
	startDate: string; // YYYY-MM-DD
	endDate: string;   // YYYY-MM-DD
	type: "due_diligence";
	color: string;
	title: string;
	description?: string;
	sourceId: string;
}

export interface CalendarEventPoint {
	date: string; // YYYY-MM-DD
	type: "inspection" | "closing" | "showing";
	color: string;
	title: string;
	description?: string;
	time?: string;
	sourceId: string;
}

export interface GetCalendarEventsResponse {
	ranges: CalendarEventRange[];
	points: CalendarEventPoint[];
}