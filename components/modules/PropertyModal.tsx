import { mapStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import * as Functions from '@/utils/functions';
import type { Property , ClientData } from '@/utils/interfaces';
import { useRouter } from 'expo-router';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

type PropertyDetails = Property & {
	id?: string;
	propertyId?: string;
	listingId?: string;
	listing_id?: string;
};

interface PropertyModalProps {
	visible: boolean;
	property: PropertyDetails | null;
	onClose: () => void;
	headerRight?: React.ReactNode;
	user?: any;
	role?: string;
}

function toHttpsUrl(url: string): string {
	return url.replace(/^http:\/\//i, 'https://');
}

function getRdcpixPhotoCandidates(url: string | null | undefined): string[] {
	if (!url) return [];
	const cleaned = toHttpsUrl(url.trim().replace(/"+$/g, ''));
	if (!cleaned.includes('rdcpix.com')) return [cleaned];

	const [base, query] = cleaned.split('?');
	const withQuery = (value: string) => (query ? `${value}?${query}` : value);

	const candidates: string[] = [];
	const webp1280 = base.replace(/-m(\d+)s\.jpg$/i, '-m$1rd-w1280_h960.webp');
	const nonSmallJpg = base.replace(/-m(\d+)s\.jpg$/i, '-m$1.jpg');

	if (webp1280 !== base) candidates.push(withQuery(webp1280));
	if (nonSmallJpg !== base) candidates.push(withQuery(nonSmallJpg));
	candidates.push(withQuery(base));

	return Array.from(new Set(candidates));
}

function toPhotoArray(photos: any, primaryPhoto: string | null): { href: string }[] {
	if (Array.isArray(photos) && photos.length > 0) {
		const normalized = photos
			.map((photo) => {
				if (typeof photo === 'string') return { href: photo };
				if (photo && typeof photo.href === 'string') return { href: photo.href };
				return null;
			})
			.filter(Boolean) as { href: string }[];
		if (normalized.length > 0) return normalized;
	}
	return primaryPhoto ? [{ href: primaryPhoto }] : [];
}

export default function PropertyModal({
	visible,
	property,
	onClose,
	headerRight,
	user,
	role,
}: PropertyModalProps) {
	// Redact sensitive tokens from user object in logs
	const safeUser = user && typeof user === 'object' ? JSON.parse(JSON.stringify(user, (key, value) => {
		if (key === 'accessToken' || key === 'refreshToken') return '[REDACTED]';
		return value;
	})) : user;
	const router = useRouter();
	const { user: authUser } = useAuth();
	const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
	const [failedEnhancedPhotoUrls, setFailedEnhancedPhotoUrls] = useState<Record<string, true>>({});
	const [localFavorite, setLocalFavorite] = useState(false);
	// Agent assignment modal state
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [eligibleClients, setEligibleClients] = useState<ClientData[]>([]);
	const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

	useEffect(() => {
		if (!visible) {
			setCurrentPhotoIndex(0);
			setFailedEnhancedPhotoUrls({});
		}
	}, [visible, property?.id, property?.propertyId]);

	useEffect(() => {
		const hydrateFavorite = async () => {
			if (!visible || !property) return;
			const propertyId = String(property.propertyId ?? property.id ?? '').trim();
			const uid = user?.uid || authUser?.uid;
			if (!uid || !propertyId) {
				setLocalFavorite(false);
				return;
			}
			try {
				const status = await Functions.checkIfFavorite(uid, propertyId);
				setLocalFavorite(status);
			} catch {
				setLocalFavorite(false);
			}
		};
		hydrateFavorite();
	}, [visible, property, user?.uid, authUser?.uid]);

	// Main favorite/star handler

	const handleFavoritePress = async () => {
		if (!property) {
			return;
		}
		const uid = user?.uid || authUser?.uid;
		if (!uid) {
			Alert.alert('Please log in', 'You must be logged in to save favorites.');
			return;
		}

		// If agent, fetch assigned clients and their user data, then show modal
		if (role === 'Agent') {
			setSelectedClientId(null);
			setEligibleClients([]);

			try {
				const assignedClients = await Functions.fetchAssignedClients(uid);
				// Fetch user data for each clientId
				const clientUserDatas = await Promise.all(
					assignedClients.map(async (req) => {
						let firstName = '';
						let lastName = '';
						try {
							// Try to get from req.client, fallback to fetchUserData
							if (req.client && req.client.firstName) {
								firstName = req.client.firstName;
								lastName = req.client.lastName || '';
							} else if (req.clientId) {
								const userData = await Functions.fetchUserData(req.clientId);
								firstName = userData?.firstName || '';
								lastName = userData?.lastName || '';
							}
						} catch {}
						return {
							clientId: req.clientId,
							firstName,
							lastName,
						};
					})
				);
				const eligible = clientUserDatas.filter(c => c.clientId && c.firstName);
				if (eligible.length === 0) {
					Alert.alert('No assigned clients', 'You have no assigned clients to assign this favorite to.');
					return;
				}
				setEligibleClients(eligible);
				setShowAssignModal(true);
			} catch (err) {
				Alert.alert('Error', 'Could not load your assigned clients.');
			}
			return;
		}

		// Normal client favorite logic
		const canonicalPropertyId = String(property.propertyId ?? property.id ?? '').trim();
		if (!canonicalPropertyId) return;

		try {
			const propertyForFavorite = { ...property, id: canonicalPropertyId } as Property;
			const newStatus = await Functions.toggleFavorite(uid, propertyForFavorite);
			setLocalFavorite(newStatus);
		} catch (error) {
			Alert.alert('Error', 'Failed to update favorite status.');
			console.error('Error toggling favorite:', error);
		}
	};

	const photos = useMemo(() => {
		if (!property) return [] as { href: string }[];
		return toPhotoArray(property.photos, property.primaryPhoto);
	}, [property]);

	if (!property) return null;

	const clampedPhotoIndex = Math.min(currentPhotoIndex, Math.max(photos.length - 1, 0));
	const currentPhotoHref = photos[clampedPhotoIndex]?.href ?? null;
	const currentPhotoCandidates = getRdcpixPhotoCandidates(currentPhotoHref);
	const currentPhotoUri =
		currentPhotoCandidates.find((uri) => !failedEnhancedPhotoUrls[uri]) ??
		currentPhotoCandidates[0] ??
		null;

	return (
		<>
			<Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
				<View style={mapStyles.modalContainer}>
					<View style={mapStyles.modalHeader}>
						<TouchableOpacity onPress={onClose} style={mapStyles.closeButton}>
							<Text style={mapStyles.closeButtonText}>✕</Text>
						</TouchableOpacity>
						<Text style={mapStyles.modalTitle}>{property.address}</Text>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							<TouchableOpacity
								onPress={handleFavoritePress}
								style={mapStyles.starButton}
							>
								<Text style={mapStyles.starButtonText}>{localFavorite ? '⭐' : '☆'}</Text>
							</TouchableOpacity>
							{headerRight}
						</View>
					</View>

					{photos.length > 0 ? (
						<View style={mapStyles.photoContainer}>
							<Image
								source={{ uri: currentPhotoUri ?? photos[clampedPhotoIndex].href }}
								style={mapStyles.photo}
								resizeMode="contain"
								onError={() => {
									if (!currentPhotoUri) return;
									setFailedEnhancedPhotoUrls((prev) => {
										if (prev[currentPhotoUri]) return prev;
										return { ...prev, [currentPhotoUri]: true };
									});
								}}
							/>

							{photos.length > 1 && (
								<View style={mapStyles.photoNavigation}>
									<TouchableOpacity
										onPress={() => setCurrentPhotoIndex(Math.max(0, clampedPhotoIndex - 1))}
										disabled={clampedPhotoIndex === 0}
										style={[mapStyles.navButton, clampedPhotoIndex === 0 && mapStyles.navButtonDisabled]}
									>
										<Text style={mapStyles.navButtonText}>←</Text>
									</TouchableOpacity>

									<Text style={mapStyles.photoCounter}>
										{clampedPhotoIndex + 1} / {photos.length}
									</Text>

									<TouchableOpacity
										onPress={() => setCurrentPhotoIndex(Math.min(photos.length - 1, clampedPhotoIndex + 1))}
										disabled={clampedPhotoIndex === photos.length - 1}
										style={[mapStyles.navButton, clampedPhotoIndex === photos.length - 1 && mapStyles.navButtonDisabled]}
									>
										<Text style={mapStyles.navButtonText}>→</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					) : (
						<View style={mapStyles.noPhotoContainer}>
							<Text style={mapStyles.noPhotoText}>No photos available</Text>
						</View>
					)}

					<View style={mapStyles.detailsContainer}>
						<Text style={mapStyles.price}>${property.price?.toLocaleString() || 'N/A'}</Text>
						<Text style={mapStyles.details}>
							{property.beds || '?'} beds • {property.baths || '?'} baths
						</Text>
						<Text style={mapStyles.details}>
							Type: {property.type ? property.type.replace(/_/g, ' ') : 'N/A'}
						</Text>
						<Text style={mapStyles.details}>
							Sqft: {property.sqft !== null ? property.sqft.toLocaleString() : 'N/A'} • Lot: {property.lot_sqft !== null ? property.lot_sqft.toLocaleString() : 'N/A'}
						</Text>
						<Text style={mapStyles.status}>Status: {property.status?.replace('_', ' ') || 'N/A'}</Text>
						<TouchableOpacity
							onPress={() => {
								const propertyId = property.propertyId ?? property.id;
								const listingId = property.listingId ?? property.listing_id;
								onClose();
								if (!propertyId) return;
								const query = listingId
									? `propertyId=${encodeURIComponent(propertyId)}&listingId=${encodeURIComponent(listingId)}`
									: `propertyId=${encodeURIComponent(propertyId)}`;
								router.push((`/(shared_screens)/property_details?${query}`) as any);
							}}
							style={{
								marginTop: 14,
								backgroundColor: '#2C5F2D',
								paddingVertical: 12,
								paddingHorizontal: 14,
								borderRadius: 8,
								alignItems: 'center',
							}}
						>
							<Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Open Full Property Details</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Agent Assign Modal */}
			{showAssignModal && (
				<Modal
					visible={showAssignModal}
					animationType="slide"
					transparent={true}
					onRequestClose={() => setShowAssignModal(false)}
				>
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
						<View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, alignItems: 'center' }}>
							<Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Assign Favorite to Client</Text>
							<Text style={{ marginBottom: 12 }}>Select a client to assign this favorite:</Text>
							<View style={{ width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, overflow: 'hidden' }}>
								<Picker
									selectedValue={selectedClientId || 'placeholder'}
									onValueChange={(itemValue) => {
										if (itemValue !== 'placeholder') setSelectedClientId(itemValue);
									}}
									style={{ width: '100%' }}
								>
									<Picker.Item label="Select Client" value="placeholder" enabled={false} color="#888" />
									{eligibleClients.map((client) => (
										<Picker.Item
											key={client.clientId}
											label={`${client.firstName} ${client.lastName}`}
											value={client.clientId}
										/>
									))}
								</Picker>
							</View>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
								<TouchableOpacity
									style={{ backgroundColor: '#2C5F2D', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6, marginRight: 12, opacity: (!selectedClientId || selectedClientId === 'placeholder') ? 0.5 : 1 }}
									disabled={!selectedClientId || selectedClientId === 'placeholder'}
									onPress={async () => {
										if (!selectedClientId || selectedClientId === 'placeholder' || !property) return;
										try {
											await Functions.toggleFavorite(selectedClientId, property, {
												assignedByAgentId: user?.uid || authUser?.uid || undefined,
											});
											setShowAssignModal(false);
											Alert.alert('Success', 'Favorite assigned to client.');
										} catch (err) {
											console.error('[Assign Favorite] Error assigning favorite:', err);
											Alert.alert('Error', 'Failed to assign favorite.');
										}
									}}
								>
									<Text style={{ color: '#fff', fontWeight: 'bold' }}>Assign</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{ backgroundColor: '#ccc', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 }}
									onPress={() => setShowAssignModal(false)}
								>
									<Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>
			)}
		</>
	);
}
