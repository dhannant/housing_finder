import { useAuth } from "@/contexts/AuthContext";
import { useClientShowingRequests, useUserData } from "@/hooks/useFunctions";
import { createShowingRequest } from "@/utils/functions";
import type { DateTimeString, ShowingTimeBlock } from "@/utils/interfaces";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

function parseTimeLabelToMinutes(timeLabel: string): number {
	const [time, meridiem] = timeLabel.split(" ");
	const [hourStr, minuteStr] = time.split(":");
	const hour = Number(hourStr);
	const minute = Number(minuteStr);
	let normalizedHour = hour % 12;
	if (meridiem === "PM") normalizedHour += 12;
	return normalizedHour * 60 + minute;
}

function buildDateTimeString(calendarDateStr: string, timeLabel: string): DateTimeString {
	const [year, month, day] = calendarDateStr.split("-");
	return `${month}/${day}/${year} ${timeLabel}`;
}

function toBlockLabel(block: ShowingTimeBlock): string {
	return `${block.start} – ${block.end}`;
}

function formatDisplayDate(dateStr: string): string {
	const [year, month, day] = dateStr.split("-").map(Number);
	const d = new Date(year, month - 1, day);
	return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function RequestShowingScreen() {
	const router = useRouter();
	const { propertyId } = useLocalSearchParams<{ propertyId?: string | string[] }>();
	const propertyIdValue = useMemo(() => (Array.isArray(propertyId) ? propertyId[0] : propertyId || ""), [propertyId]);
	const { user } = useAuth();
	const { data: userData } = useUserData(user?.uid || null);
	const { data: showingRequests = [], refetch } = useClientShowingRequests(user?.uid || null);

	const [blocks, setBlocks] = useState<ShowingTimeBlock[]>([]);
	const [notes, setNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	// Time-picker modal state
	const [timePickerVisible, setTimePickerVisible] = useState(false);
	const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
	const [startTimeSlot, setStartTimeSlot] = useState("09:00 AM");
	const [endTimeSlot, setEndTimeSlot] = useState("10:00 AM");

	const existingForProperty = useMemo(
		() => (showingRequests ?? []).filter((request) => request.propertyId === propertyIdValue),
		[showingRequests, propertyIdValue],
	);

	const timeSlots = useMemo(() => {
		const slots: string[] = [];
		for (let minutes = 8 * 60; minutes <= 20 * 60; minutes += 30) {
			const hour24 = Math.floor(minutes / 60);
			const minute = minutes % 60;
			const ampm = hour24 >= 12 ? "PM" : "AM";
			const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
			slots.push(`${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`);
		}
		return slots;
	}, []);

	// Build marked dates: dots on days that already have blocks added
	const markedDates = useMemo(() => {
		const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};
		for (const block of blocks) {
			const [datePart] = block.start.split(" ");
			const [mm, dd, yyyy] = datePart.split("/");
			const key = `${yyyy}-${mm}-${dd}`;
			marks[key] = { marked: true, dotColor: "#0F5132" };
		}
		if (selectedCalendarDate) {
			marks[selectedCalendarDate] = {
				...(marks[selectedCalendarDate] ?? {}),
				selected: true,
				selectedColor: "#0F5132",
				marked: !!(marks[selectedCalendarDate]?.marked),
				dotColor: "#FFFFFF",
			};
		}
		return marks;
	}, [blocks, selectedCalendarDate]);

	const onDayPress = (day: DateData) => {
		setSelectedCalendarDate(day.dateString);
		setStartTimeSlot("09:00 AM");
		setEndTimeSlot("10:00 AM");
		setTimePickerVisible(true);
	};

	const addBlock = () => {
		if (!selectedCalendarDate) return;
		if (parseTimeLabelToMinutes(startTimeSlot) >= parseTimeLabelToMinutes(endTimeSlot)) {
			Alert.alert("Invalid range", "End time must be after start time.");
			return;
		}
		const start = buildDateTimeString(selectedCalendarDate, startTimeSlot);
		const end = buildDateTimeString(selectedCalendarDate, endTimeSlot);
		setBlocks((prev) => [...prev, { start, end }]);
		setTimePickerVisible(false);
	};

	const removeBlock = (indexToRemove: number) => {
		setBlocks((prev) => prev.filter((_, index) => index !== indexToRemove));
	};

	const submit = async () => {
		if (!propertyIdValue) {
			Alert.alert("Missing property", "Property ID was not provided.");
			return;
		}
		if (blocks.length === 0) {
			Alert.alert("Add times", "Add at least one time block.");
			return;
		}
		setSubmitting(true);
		try {
			await createShowingRequest({
				propertyId: propertyIdValue,
				requestedBlocks: blocks,
				clientNotes: notes.trim(),
			});
			await refetch();
			Alert.alert("Request submitted", "Your showing request was sent to your agent.  Please wait for your Agent to confirm the appointment time.", [
				{ text: "OK", onPress: () => router.back() },
			]);
			setBlocks([]);
			setNotes("");
		} catch (error) {
			console.error("[RequestShowing] submit error:", error);
			Alert.alert("Error", "Failed to submit showing request.");
		} finally {
			setSubmitting(false);
		}
	};

	if (userData?.role?.toLowerCase() !== "client") {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.centered}>
					<Text style={styles.message}>Only clients can request showings.</Text>
				</View>
			</SafeAreaView>
		);
	}

	const today = new Date().toISOString().split("T")[0];

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.title}>Request a Showing</Text>
				<Text style={styles.subtitle}>Tap a date to pick a time slot</Text>

				{/* Calendar */}
				<View style={styles.calendarCard}>
					<Calendar
						onDayPress={onDayPress}
						minDate={today}
						markedDates={markedDates}
						theme={{
							todayTextColor: "#0F5132",
							selectedDayBackgroundColor: "#0F5132",
							arrowColor: "#0F5132",
							dotColor: "#0F5132",
						}}
					/>
				</View>

				{/* Added Blocks */}
				{blocks.length > 0 && (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Selected Time Blocks</Text>
						{blocks.map((block, index) => (
							<View key={`${block.start}-${index}`} style={styles.rowBetween}>
								<Text style={styles.blockLabel}>{toBlockLabel(block)}</Text>
								<TouchableOpacity onPress={() => removeBlock(index)}>
									<Text style={styles.removeText}>Remove</Text>
								</TouchableOpacity>
							</View>
						))}
					</View>
				)}

				<TextInput
					value={notes}
					onChangeText={setNotes}
					placeholder="Optional note for your agent"
					style={[styles.input, styles.notesInput]}
					multiline
				/>

				<TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
					<Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Submit Showing Request"}</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Text style={styles.backButtonText}>Cancel</Text>
				</TouchableOpacity>

				{existingForProperty.length > 0 && (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Existing Requests For This Property</Text>
						{existingForProperty.map((request) => (
							<View key={request.id} style={styles.existingRequest}>
								<Text style={styles.statusText}>Status: {request.status}</Text>
								{request.confirmedBlockIndex !== null && request.requestedBlocks[request.confirmedBlockIndex] ? (
									<Text style={styles.confirmedText}>
										Confirmed: {toBlockLabel(request.requestedBlocks[request.confirmedBlockIndex])}
									</Text>
								) : null}
							</View>
						))}
					</View>
				)}
			</ScrollView>

			{/* Time-slot picker bottom sheet modal */}
			<Modal
				visible={timePickerVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setTimePickerVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Pick a Time Slot</Text>
						{selectedCalendarDate ? (
							<Text style={styles.modalDate}>{formatDisplayDate(selectedCalendarDate)}</Text>
						) : null}

						<Text style={styles.modalHint}>Choose your start and end time for this date.</Text>

						<Text style={styles.pickerLabel}>Start Time</Text>
						<View style={styles.pickerContainer}>
							<Picker
								selectedValue={startTimeSlot}
								onValueChange={(value) => setStartTimeSlot(String(value))}
							>
								{timeSlots.map((slot) => (
									<Picker.Item key={`start-${slot}`} label={slot} value={slot} />
								))}
							</Picker>
						</View>

						<Text style={styles.pickerLabel}>End Time</Text>
						<View style={styles.pickerContainer}>
							<Picker
								selectedValue={endTimeSlot}
								onValueChange={(value) => setEndTimeSlot(String(value))}
							>
								{timeSlots.map((slot) => (
									<Picker.Item key={`end-${slot}`} label={slot} value={slot} />
								))}
							</Picker>
						</View>

						<TouchableOpacity style={styles.primaryButton} onPress={addBlock}>
							<Text style={styles.primaryButtonText}>Add Time Block</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.backButton} onPress={() => setTimePickerVisible(false)}>
							<Text style={styles.backButtonText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#F6F7F9" },
	content: { padding: 16, gap: 12 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	message: { fontSize: 16, color: "#374151" },
	title: { fontSize: 24, fontWeight: "700", color: "#102542" },
	subtitle: { fontSize: 14, color: "#516074" },
	calendarCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 12,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#E3E6EA",
	},
	card: {
		backgroundColor: "#FFFFFF",
		borderRadius: 10,
		padding: 12,
		borderWidth: 1,
		borderColor: "#E3E6EA",
		gap: 8,
	},
	sectionTitle: { fontSize: 15, fontWeight: "700", color: "#243447" },
	rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
	blockLabel: { flex: 1, fontSize: 13, color: "#334155" },
	removeText: { color: "#B91C1C", fontWeight: "700", fontSize: 13 },
	input: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#D7DBE0",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	notesInput: { minHeight: 90, textAlignVertical: "top" },
	primaryButton: { backgroundColor: "#0F5132", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
	primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
	backButton: { paddingVertical: 10, alignItems: "center" },
	backButtonText: { color: "#4B5563", fontWeight: "600" },
	existingRequest: { borderTopWidth: 1, borderTopColor: "#EEF1F4", paddingTop: 8 },
	statusText: { color: "#1F2937", fontWeight: "600", textTransform: "capitalize" },
	confirmedText: { color: "#0F5132", marginTop: 4 },
	// Modal bottom sheet
	modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
	modalCard: {
		backgroundColor: "#FFFFFF",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		gap: 10,
	},
	modalTitle: { fontSize: 20, fontWeight: "700", color: "#102542" },
	modalDate: { fontSize: 14, color: "#516074", marginBottom: 4 },
	modalHint: { fontSize: 13, color: "#334155", marginBottom: 6 },
	pickerLabel: { fontSize: 13, fontWeight: "600", color: "#243447", marginTop: 4 },
	pickerContainer: {
		borderWidth: 1,
		borderColor: "#D7DBE0",
		borderRadius: 10,
		overflow: "hidden",
		backgroundColor: "#FFFFFF",
	},
});
