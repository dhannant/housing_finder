import { auth } from '@/components/firebaseConfig';
import { useAgentAssignedPropertyListings } from '@/hooks/useFunctions';
import type { AgentAssignedClientPropertyListing } from '@/utils/interfaces';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatDate = (value: any): string => {
	try {
		if (!value) return 'Unknown';
		if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
		if (value instanceof Date) return value.toLocaleString();
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return 'Unknown';
		return parsed.toLocaleString();
	} catch {
		return 'Unknown';
	}
};

const getAvailabilityByDay = (listing: AgentAssignedClientPropertyListing): { day: string; times: string[] }[] => {
	if (!Array.isArray(listing.availability) || listing.availability.length === 0) return [];

	const grouped: Record<string, string[]> = {};
	for (const slot of listing.availability) {
		const day = slot.dayOfWeek || 'Unknown';
		if (!grouped[day]) grouped[day] = [];
		grouped[day].push(`${slot.startTime} - ${slot.endTime}`);
	}

	return Object.entries(grouped)
		.sort(([dayA], [dayB]) => {
			const idxA = dayOrder.indexOf(dayA);
			const idxB = dayOrder.indexOf(dayB);
			if (idxA === -1 && idxB === -1) return dayA.localeCompare(dayB);
			if (idxA === -1) return 1;
			if (idxB === -1) return -1;
			return idxA - idxB;
		})
		.map(([day, times]) => ({ day, times }));
};

export default function AgentListingsTab() {
	const user = auth.currentUser;
	const { data, loading } = useAgentAssignedPropertyListings(user?.uid || null);
	const listings = data || [];
	const [expandedAvailability, setExpandedAvailability] = useState<Record<string, boolean>>({});

	const toggleAvailability = (listingId: string) => {
		setExpandedAvailability((prev) => ({
			...prev,
			[listingId]: !prev[listingId],
		}));
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.centerContent}>
					<ActivityIndicator size="large" color="#2C5F2D" />
					<Text style={styles.loadingText}>Loading assigned listings...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.title}>Assigned Client Listings</Text>
				<Text style={styles.subtitle}>Only listings assigned to you appear here.</Text>

				{listings.length === 0 ? (
					<View style={styles.emptyCard}>
						<Text style={styles.emptyTitle}>No listings yet</Text>
						<Text style={styles.emptyBody}>When assigned clients submit listing assistance requests, they will appear here.</Text>
					</View>
				) : (
					listings.map((listing) => {
						const phone = listing.clientPhoneNumber || listing.contactPhone || '';
						const email = listing.clientEmail || listing.contactEmail || '';
						const availabilityByDay = getAvailabilityByDay(listing);
						const isAvailabilityExpanded = !!expandedAvailability[listing.id];
						return (
							<View key={listing.id} style={styles.card}>
								<View style={styles.cardHeader}>
									<View style={styles.clientHeaderLeft}>
										<Text style={styles.clientName}>{listing.clientName}</Text>
										<View style={styles.contactLinksRow}>
											{phone ? (
												<TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)}>
													<Text style={styles.contactLink}>Call {phone}</Text>
												</TouchableOpacity>
											) : (
												<Text style={styles.contactLinkMuted}>No phone</Text>
											)}
											{email ? (
												<TouchableOpacity onPress={() => Linking.openURL(`mailto:${email}`)}>
													<Text style={styles.contactLink}>Email {email}</Text>
												</TouchableOpacity>
											) : (
												<Text style={styles.contactLinkMuted}>No email</Text>
											)}
										</View>
									</View>
									<Text style={styles.status}>{listing.status}</Text>
								</View>
								<Text style={styles.address}>{listing.addressLine1}, {listing.city} {listing.postalCode}</Text>
								<Text style={styles.meta}>Submitted: {formatDate(listing.submittedAt || listing.createdAt)}</Text>
								<Text style={styles.meta}>Preferred contact: {listing.preferredContactMethod}</Text>

								<View style={styles.availabilitySection}>
									<TouchableOpacity onPress={() => toggleAvailability(listing.id)} style={styles.availabilityHeader}>
										<Text style={styles.meta}>Availability</Text>
										<Text style={styles.availabilityToggleText}>{isAvailabilityExpanded ? 'Hide ▲' : 'Show ▼'}</Text>
									</TouchableOpacity>
									{isAvailabilityExpanded ? (
										availabilityByDay.length === 0 ? (
											<Text style={styles.availabilityEmpty}>No windows provided</Text>
										) : (
											availabilityByDay.map(({ day, times }) => (
												<View key={day} style={styles.dayCard}>
													<Text style={styles.dayCardTitle}>{day}</Text>
													<View style={styles.timePillsRow}>
														{times.map((timeRange) => (
															<View key={`${day}-${timeRange}`} style={styles.timePill}>
																<Text style={styles.timePillText}>{timeRange}</Text>
															</View>
														))}
													</View>
												</View>
											))
										)
									) : null}
								</View>
							</View>
						);
					})
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F7F8F5',
	},
	content: {
		padding: 16,
		gap: 10,
	},
	centerContent: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 10,
		fontSize: 14,
		color: '#304438',
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: '#1C3A2C',
	},
	subtitle: {
		fontSize: 13,
		color: '#4F5D56',
		marginBottom: 4,
	},
	emptyCard: {
		padding: 14,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#D8DED8',
	},
	emptyTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#2A3E33',
	},
	emptyBody: {
		marginTop: 4,
		fontSize: 13,
		color: '#4F5D56',
	},
	card: {
		padding: 12,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#D8DED8',
		gap: 6,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	clientHeaderLeft: {
		flex: 1,
		paddingRight: 8,
	},
	clientName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1C3A2C',
	},
	contactLinksRow: {
		marginTop: 3,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	contactLink: {
		fontSize: 12,
		fontWeight: '600',
		color: '#0D47A1',
		textDecorationLine: 'underline',
	},
	contactLinkMuted: {
		fontSize: 12,
		color: '#7A8680',
	},
	status: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2C5F2D',
	},
	address: {
		fontSize: 14,
		fontWeight: '600',
		color: '#2A3E33',
	},
	meta: {
		fontSize: 12,
		color: '#4F5D56',
	},
	availabilitySection: {
		marginTop: 2,
		gap: 6,
	},
	availabilityHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	availabilityToggleText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2C5F2D',
	},
	availabilityEmpty: {
		fontSize: 12,
		color: '#6B766F',
	},
	dayCard: {
		borderWidth: 1,
		borderColor: '#E2E8E3',
		borderRadius: 8,
		backgroundColor: '#FAFCFA',
		padding: 8,
		gap: 6,
	},
	dayCardTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1C3A2C',
	},
	timePillsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	timePill: {
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 999,
		backgroundColor: '#E8F3EC',
	},
	timePillText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1F4A2A',
	},
});
