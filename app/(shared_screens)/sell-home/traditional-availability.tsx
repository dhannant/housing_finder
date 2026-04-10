import { useAuth } from '@/contexts/AuthContext';
import { submitClientPropertyListing } from '@/utils/functions';
import { PreferredContactMethod } from '@/utils/interfaces';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function toNullableNumber(value: string | string[] | undefined): number | null {
	const v = Array.isArray(value) ? value[0] : value;
	if (!v || !String(v).trim()) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

const daysOfWeek = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayLabels: Record<string, string> = {
	Sunday: 'Sun',
	Monday: 'Mon',
	Tuesday: 'Tue',
	Wednesday: 'Wed',
	Thursday: 'Thu',
	Friday: 'Fri',
	Saturday: 'Sat',
};

const calendarSlots = [
	{ label: '8–9 AM',   startTime: '08:00 AM', endTime: '09:00 AM' },
	{ label: '9–10 AM',  startTime: '09:00 AM', endTime: '10:00 AM' },
	{ label: '10–11 AM', startTime: '10:00 AM', endTime: '11:00 AM' },
	{ label: '11 AM–12', startTime: '11:00 AM', endTime: '12:00 PM' },
	{ label: '12–1 PM',  startTime: '12:00 PM', endTime: '01:00 PM' },
	{ label: '1–2 PM',   startTime: '01:00 PM', endTime: '02:00 PM' },
	{ label: '2–3 PM',   startTime: '02:00 PM', endTime: '03:00 PM' },
	{ label: '3–4 PM',   startTime: '03:00 PM', endTime: '04:00 PM' },
	{ label: '4–5 PM',   startTime: '04:00 PM', endTime: '05:00 PM' },
];

function buildSlotId(dayOfWeek: string, startTime: string, endTime: string): string {
	return `${dayOfWeek}|${startTime}|${endTime}`;
}

function parseSlotId(id: string): { dayOfWeek: string; startTime: string; endTime: string } | null {
	const [dayOfWeek, startTime, endTime] = id.split('|');
	if (!dayOfWeek || !startTime || !endTime) return null;
	return { dayOfWeek, startTime, endTime };
}

const daySortOrder: Record<string, number> = {
	Sunday: 0,
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
};

function timeToMinutes(time: string): number {
	const match = String(time).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
	if (!match) return Number.MAX_SAFE_INTEGER;

	let hour = Number(match[1]);
	const minutes = Number(match[2]);
	const period = match[3].toUpperCase();

	if (period === 'AM') {
		if (hour === 12) hour = 0;
	} else if (hour !== 12) {
		hour += 12;
	}

	return hour * 60 + minutes;
}

function sortAvailability(
	windows: { dayOfWeek: string; startTime: string; endTime: string }[],
): { dayOfWeek: string; startTime: string; endTime: string }[] {
	return [...windows].sort((a, b) => {
		const dayDelta = (daySortOrder[a.dayOfWeek] ?? 999) - (daySortOrder[b.dayOfWeek] ?? 999);
		if (dayDelta !== 0) return dayDelta;

		const startDelta = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
		if (startDelta !== 0) return startDelta;

		return timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
	});
}

export default function TraditionalAvailabilityScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const { user } = useAuth();
	const insets = useSafeAreaInsets();
	const [submitting, setSubmitting] = useState(false);
	const [preferredContactMethod, setPreferredContactMethod] = useState<PreferredContactMethod>('Call');
	const [notes, setNotes] = useState('');
	const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
	const [availability, setAvailability] = useState<{ dayOfWeek: string; startTime: string; endTime: string }[]>([]);

	const visibleSlotIds = useMemo(() => {
		const ids: string[] = [];
		for (const slot of calendarSlots) {
			for (const day of daysOfWeek) {
				ids.push(buildSlotId(day, slot.startTime, slot.endTime));
			}
		}
		return ids;
	}, []);

	const committedSlotIds = useMemo(() => {
		const ids = new Set<string>();
		for (const window of availability) {
			ids.add(buildSlotId(window.dayOfWeek, window.startTime, window.endTime));
		}
		return ids;
	}, [availability]);

	const requiredAddress = useMemo(() => {
		const addressLine1 = Array.isArray(params.address) ? params.address[0] : params.address;
		const city = Array.isArray(params.city) ? params.city[0] : params.city;
		const postalCode = Array.isArray(params.postalCode) ? params.postalCode[0] : params.postalCode;
		return { addressLine1: addressLine1 || '', city: city || '', postalCode: postalCode || '' };
	}, [params.address, params.city, params.postalCode]);

	const toggleSlot = (slotId: string) => {
		setSelectedSlotIds((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
	};

	const toggleSelectAll = () => {
		setSelectedSlotIds((prev) => {
			const allVisibleSelected = visibleSlotIds.every((id) => prev.includes(id));
			if (allVisibleSelected) {
				return prev.filter((id) => !visibleSlotIds.includes(id));
			}
			return Array.from(new Set([...prev, ...visibleSlotIds]));
		});
	};

	const clearSelected = () => {
		setSelectedSlotIds([]);
	};

	const removeAvailabilityWindow = (windowToRemove: { dayOfWeek: string; startTime: string; endTime: string }) => {
		setAvailability((prev) =>
			prev.filter(
				(window) =>
					!(
						window.dayOfWeek === windowToRemove.dayOfWeek &&
						window.startTime === windowToRemove.startTime &&
						window.endTime === windowToRemove.endTime
					)
			)
		);
	};

	const toggleDayColumn = (day: string) => {
		const daySlotIds = calendarSlots.map((slot) => buildSlotId(day, slot.startTime, slot.endTime));
		setSelectedSlotIds((prev) => {
			const allSelected = daySlotIds.every((id) => prev.includes(id));
			if (allSelected) {
				return prev.filter((id) => !daySlotIds.includes(id));
			}
			return Array.from(new Set([...prev, ...daySlotIds]));
		});
	};

	const toggleTimeRow = (startTime: string, endTime: string) => {
		const rowSlotIds = daysOfWeek.map((day) => buildSlotId(day, startTime, endTime));
		setSelectedSlotIds((prev) => {
			const allSelected = rowSlotIds.every((id) => prev.includes(id));
			if (allSelected) {
				return prev.filter((id) => !rowSlotIds.includes(id));
			}
			return Array.from(new Set([...prev, ...rowSlotIds]));
		});
	};

	const addWindow = () => {
		if (selectedSlotIds.length === 0) {
			Alert.alert('No slots selected', 'Tap one or more calendar cells before adding.');
			return;
		}

		const parsed = selectedSlotIds.map(parseSlotId).filter((v): v is { dayOfWeek: string; startTime: string; endTime: string } => Boolean(v));
		if (parsed.length === 0) {
			Alert.alert('Invalid selection', 'Please reselect your availability slots.');
			return;
		}

		setAvailability((prev) => {
			const seen = new Set(prev.map((w) => buildSlotId(w.dayOfWeek, w.startTime, w.endTime)));
			const next = [...prev];
			for (const window of parsed) {
				const id = buildSlotId(window.dayOfWeek, window.startTime, window.endTime);
				if (!seen.has(id)) {
					seen.add(id);
					next.push(window);
				}
			}
			return sortAvailability(next);
		});

		setSelectedSlotIds([]);
	};

	const submit = async () => {
		if (!user?.uid) {
			Alert.alert('Sign in required', 'Please sign in again and retry.');
			return;
		}
		if (!requiredAddress.addressLine1 || !requiredAddress.city || !requiredAddress.postalCode) {
			Alert.alert('Missing details', 'Address details were not found. Please restart this flow.');
			return;
		}
		if (availability.length === 0) {
			Alert.alert('Availability required', 'Add at least one viewing window.');
			return;
		}

		setSubmitting(true);
		try {
			const orderedAvailability = sortAvailability(availability);
			await submitClientPropertyListing({
				clientId: user.uid,
				branchType: 'Traditional',
				addressLine1: requiredAddress.addressLine1,
				city: requiredAddress.city,
				postalCode: requiredAddress.postalCode,
				propertyType: (Array.isArray(params.propertyType) ? params.propertyType[0] : params.propertyType) || '',
				bedrooms: toNullableNumber(params.bedrooms),
				bathrooms: toNullableNumber(params.bathrooms),
				squareFeet: toNullableNumber(params.squareFeet),
				yearBuilt: toNullableNumber(params.yearBuilt),
				timelineToSell: (Array.isArray(params.timelineToSell) ? params.timelineToSell[0] : params.timelineToSell) || '',
				notes,
				preferredContactMethod,
				availability: orderedAvailability,
			});
			Alert.alert('Submitted', 'Your sell-home request was sent to your assigned agent.', [
				{ text: 'OK', onPress: () => router.replace('/client/(tabs)/client-dashboard') },
			]);
		} catch (error: any) {
			Alert.alert('Submit failed', error?.message || 'Could not submit your request.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: 36 + insets.bottom }]}>
				<Text style={styles.title}>Contact + Viewing Availability</Text>
				<Text style={styles.subtitle}>Add the best way to reach you and times your home can be shown.</Text>

				<Text style={styles.label}>Preferred Contact Method</Text>
				<View style={styles.contactRow}>
					{(['Call', 'Text', 'Email'] as PreferredContactMethod[]).map((method) => (
						<TouchableOpacity
							key={method}
							style={[styles.chip, preferredContactMethod === method && styles.chipActive]}
							onPress={() => setPreferredContactMethod(method)}
						>
							<Text style={[styles.chipText, preferredContactMethod === method && styles.chipTextActive]}>{method}</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything your agent should know" multiline /> */}
				<Text style={styles.label}>Notes:</Text>
				<TextInput style={[styles.input, {minHeight:100, textAlignVertical:'top'}]} placeholder='notes' onChangeText={setNotes} multiline/>

				<View style={styles.calendarHeaderRow}>
					<Text style={styles.label}>Weekly Availability Calendar</Text>
					<Text style={styles.calendarHint}>Tap cells, day headers, or time labels</Text>
				</View>

				<View style={styles.calendarActionsRow}>
					<TouchableOpacity style={styles.smallActionButton} onPress={toggleSelectAll}>
						<Text style={styles.smallActionText}>Select Visible</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.smallActionButton} onPress={clearSelected}>
						<Text style={styles.smallActionText}>Clear Selected</Text>
					</TouchableOpacity>
				</View>

				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScrollContent}>
					<View style={styles.calendarGrid}>
						<View style={styles.calendarTopRow}>
							<View style={styles.timeHeaderCell}>
								<Text style={styles.timeHeaderText}>Time</Text>
							</View>
							{daysOfWeek.map((day) => (
								<TouchableOpacity key={day} style={styles.dayHeaderCell} onPress={() => toggleDayColumn(day)}>
									<Text style={styles.dayHeaderText}>{dayLabels[day]}</Text>
								</TouchableOpacity>
							))}
						</View>

						{calendarSlots.map((slot) => (
							<View key={slot.label} style={styles.calendarRow}>
								<TouchableOpacity style={styles.timeLabelCell} onPress={() => toggleTimeRow(slot.startTime, slot.endTime)}>
									<Text style={styles.timeLabelText}>{slot.label}</Text>
								</TouchableOpacity>
								{daysOfWeek.map((day) => {
									const slotId = buildSlotId(day, slot.startTime, slot.endTime);
									const isCommitted = committedSlotIds.has(slotId);
									const isSelected = !isCommitted && selectedSlotIds.includes(slotId);
									return (
										<TouchableOpacity
											key={slotId}
											style={[
												styles.calendarCell,
												isCommitted && styles.calendarCellCommitted,
												isSelected && styles.calendarCellSelected,
											]}
											onPress={() => toggleSlot(slotId)}
										/>
									);
								})}
							</View>
						))}
					</View>
				</ScrollView>

				<Text style={styles.selectionCount}>Selected slots: {selectedSlotIds.length}</Text>
				<TouchableOpacity style={styles.secondaryButton} onPress={addWindow}>
					<Text style={styles.secondaryButtonText}>Add Selected Slots</Text>
				</TouchableOpacity>

				{availability.map((a) => (
					<View key={`${a.dayOfWeek}-${a.startTime}-${a.endTime}`} style={styles.windowItem}>
						<Text style={styles.windowItemText}>{a.dayOfWeek}: {a.startTime} - {a.endTime}</Text>
						<TouchableOpacity
							onPress={() => removeAvailabilityWindow(a)}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
							style={styles.windowItemRemoveButton}
						>
							<Text style={styles.windowItemRemove}>x</Text>
						</TouchableOpacity>
					</View>
				))}

				<TouchableOpacity style={styles.submitButton} onPress={submit} disabled={submitting}>
					<Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
				</TouchableOpacity>
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
		padding: 20,
		gap: 10,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1C3A2C',
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: '#4F5D56',
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2A3E33',
	},
	inputGroup: {
		gap: 6,
	},
	input: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#D8DED8',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#24362D',
	},
	inputMultiline: {
		minHeight: 88,
		textAlignVertical: 'top',
	},
	contactRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 4,
	},
	chip: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#C9D2CD',
		backgroundColor: '#FFFFFF',
	},
	chipActive: {
		borderColor: '#2C5F2D',
		backgroundColor: '#EAF4EA',
	},
	chipText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#4E5D55',
	},
	chipTextActive: {
		color: '#1F4A2A',
	},
	secondaryButton: {
		backgroundColor: '#E6ECE7',
		borderRadius: 10,
		paddingVertical: 10,
		alignItems: 'center',
	},
	secondaryButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1F4A2A',
	},
	calendarHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4,
	},
	calendarHint: {
		fontSize: 12,
		color: '#5C6C64',
	},
	calendarActionsRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 4,
		marginBottom: 6,
	},
	smallActionButton: {
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9D2CD',
		backgroundColor: '#FFFFFF',
	},
	smallActionText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#2F4438',
	},
	calendarScrollContent: {
		paddingBottom: 2,
	},
	calendarGrid: {
		borderWidth: 1,
		borderColor: '#D8DED8',
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: '#FFFFFF',
	},
	calendarTopRow: {
		flexDirection: 'row',
		backgroundColor: '#EFF4EF',
	},
	timeHeaderCell: {
		width: 76,
		paddingVertical: 8,
		paddingHorizontal: 8,
		borderRightWidth: 1,
		borderRightColor: '#D8DED8',
	},
	timeHeaderText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2E4137',
	},
	dayHeaderCell: {
		width: 34,
		paddingVertical: 8,
		alignItems: 'center',
		justifyContent: 'center',
		borderRightWidth: 1,
		borderRightColor: '#D8DED8',
	},
	dayHeaderText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2E4137',
	},
	calendarRow: {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderTopColor: '#E2E7E2',
	},
	timeLabelCell: {
		width: 76,
		paddingVertical: 10,
		paddingHorizontal: 8,
		justifyContent: 'center',
		borderRightWidth: 1,
		borderRightColor: '#E2E7E2',
	},
	timeLabelText: {
		fontSize: 12,
		color: '#3D5146',
	},
	calendarCell: {
		width: 34,
		height: 36,
		borderRightWidth: 1,
		borderRightColor: '#E2E7E2',
		backgroundColor: '#FFFFFF',
	},
	calendarCellSelected: {
		backgroundColor: '#CDE7D0',
	},
	calendarCellCommitted: {
		backgroundColor: '#C0D8F5',
	},
	selectionCount: {
		fontSize: 12,
		fontWeight: '600',
		color: '#395042',
		marginTop: 6,
	},
	windowItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: '#F0F5F1',
	},
	windowItemText: {
		fontSize: 13,
		color: '#304438',
	},
	windowItemRemoveButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E0EAE3',
	},
	windowItemRemove: {
		fontSize: 14,
		fontWeight: '700',
		color: '#355343',
	},
	submitButton: {
		marginTop: 10,
		backgroundColor: '#2C5F2D',
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
	},
	submitButtonText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
});
