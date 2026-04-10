import { auth } from '@/components/firebaseConfig';
import { useAgentAssignedPropertyListings } from '@/hooks/useFunctions';
import { AgentAssignedClientPropertyListing } from '@/utils/interfaces';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const renderAvailability = (listing: AgentAssignedClientPropertyListing): string => {
	if (!Array.isArray(listing.availability) || listing.availability.length === 0) return 'No windows provided';
	return listing.availability
		.map((slot) => `${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`)
		.join(', ');
};

export default function AgentListingsTab() {
	const user = auth.currentUser;
	const { data, loading } = useAgentAssignedPropertyListings(user?.uid || null);
	const listings = data || [];

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
						return (
							<View key={listing.id} style={styles.card}>
								<View style={styles.cardHeader}>
									<Text style={styles.clientName}>{listing.clientName}</Text>
									<Text style={styles.status}>{listing.status}</Text>
								</View>
								<Text style={styles.address}>{listing.addressLine1}, {listing.city} {listing.postalCode}</Text>
								<Text style={styles.meta}>Submitted: {formatDate(listing.submittedAt || listing.createdAt)}</Text>
								<Text style={styles.meta}>Preferred contact: {listing.preferredContactMethod}</Text>
								<Text style={styles.meta}>Availability: {renderAvailability(listing)}</Text>

								<View style={styles.contactRow}>
									<TouchableOpacity
										disabled={!phone}
										onPress={() => phone && Linking.openURL(`tel:${phone}`)}
										style={[styles.contactButton, !phone && styles.contactButtonDisabled]}
									>
										<Text style={styles.contactButtonText}>{phone ? `Call ${phone}` : 'No phone'}</Text>
									</TouchableOpacity>
									<TouchableOpacity
										disabled={!email}
										onPress={() => email && Linking.openURL(`mailto:${email}`)}
										style={[styles.contactButton, !email && styles.contactButtonDisabled]}
									>
										<Text style={styles.contactButtonText}>{email ? `Email ${email}` : 'No email'}</Text>
									</TouchableOpacity>
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
		alignItems: 'center',
	},
	clientName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1C3A2C',
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
	contactRow: {
		marginTop: 4,
		flexDirection: 'row',
		gap: 8,
	},
	contactButton: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: '#E6ECE7',
	},
	contactButtonDisabled: {
		opacity: 0.5,
	},
	contactButtonText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1F4A2A',
		textAlign: 'center',
	},
});
