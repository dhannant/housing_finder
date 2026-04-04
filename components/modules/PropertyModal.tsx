import { mapStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import * as Functions from '@/utils/functions';
import type { Property } from '@/utils/interfaces';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Text, TouchableOpacity, View } from 'react-native';

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
}: PropertyModalProps) {
	const router = useRouter();
	const { user } = useAuth();
	const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
	const [failedEnhancedPhotoUrls, setFailedEnhancedPhotoUrls] = useState<Record<string, true>>({});
	const [localFavorite, setLocalFavorite] = useState(false);

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
			if (!user?.uid || !propertyId) {
				setLocalFavorite(false);
				return;
			}
			try {
				const status = await Functions.checkIfFavorite(user.uid, propertyId);
				setLocalFavorite(status);
			} catch {
				setLocalFavorite(false);
			}
		};
		hydrateFavorite();
	}, [visible, property, user?.uid]);

	const handleFavoritePress = async () => {
		if (!property) return;
		if (!user?.uid) {
			Alert.alert('Please log in', 'You must be logged in to save favorites.');
			return;
		}

		const canonicalPropertyId = String(property.propertyId ?? property.id ?? '').trim();
		if (!canonicalPropertyId) return;

		try {
			const propertyForFavorite = { ...property, id: canonicalPropertyId } as Property;
			const newStatus = await Functions.toggleFavorite(user.uid, propertyForFavorite);
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
		<Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
			<View style={mapStyles.modalContainer}>
				<View style={mapStyles.modalHeader}>
					<TouchableOpacity onPress={onClose} style={mapStyles.closeButton}>
						<Text style={mapStyles.closeButtonText}>✕</Text>
					</TouchableOpacity>
					<Text style={mapStyles.modalTitle}>{property.address}</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						<TouchableOpacity onPress={handleFavoritePress} style={mapStyles.starButton}>
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
	);
}
