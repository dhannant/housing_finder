import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { auth, db } from "./firebaseConfig";

export default function RegisterForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [firstName, setFirstName] = useState<string>("");
	const [lastName, setLastName] = useState<string>("");
	const [phoneNumber, setPhoneNumber] = useState<string>("");
	const [role, setRole] = useState<"Client" | "Agent">("Client"); // Will be set automatically
	const [is_active, setIsActive] = useState<boolean>(true);

	async function getSignupLocation(): Promise<{
		latitude: number;
		longitude: number;
		accuracy: number | null;
	} | null> {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				return null;
			}

			const position = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			return {
				latitude: position.coords.latitude,
				longitude: position.coords.longitude,
				accuracy: position.coords.accuracy ?? null,
			};
		} catch (locationError) {
			console.warn("[Register] Unable to capture signup location:", locationError);
			return null;
		}
	}

	function formatPhoneNumber(value: string) {
		// Remove all non-digit characters
		const cleaned = value.replace(/\D/g, "");
		const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
		if (!match) return value;
		let formatted = "";
		if (match[1]) {
			formatted = `(${match[1]}`;
		}
		if (match[2]) {
			formatted += match[2].length === 3 ? `) ${match[2]}` : match[2];
		}
		if (match[3]) {
			formatted += match[3] ? `-${match[3]}` : "";
		}
		return formatted;
	}

	// Helper to determine role based on email domain
	function getRoleFromEmail(email: string): "Client" | "Agent" {
		// Accepts any domain like leadingedge*.com (e.g., leadingedgega.com, leadingedgeatl.com)
		const match = email
			.trim()
			.toLowerCase()
			.match(/@leadingedge[a-z0-9-]*\.com$/);
		return match ? "Agent" : "Client";
	}

	/**
	 * Handles user registration by creating a new user with email and password authentication,
	 * then saving additional user information to Firestore.
	 *
	 * Steps:
	 * 1. Registers the user using Firebase Auth.
	 * 2. Stores extra user details (first name, last name, phone number, email, role, creation date) in Firestore.
	 * 3. Sets success or error messages based on the operation outcome.
	 *
	 * @async
	 * @returns {Promise<void>} Resolves when registration and Firestore write are complete.
	 */
	const handleRegister = async () => {
		setError("");
		setSuccess("");
		try {
			const signupLocation = await getSignupLocation();

			// Step 1: Register user with Auth
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;

			// Step 2: Determine role from email
			const detectedRole = getRoleFromEmail(user.email || email);
			setRole(detectedRole);

			// Step 3: Save extra info to Firestore
			await setDoc(doc(db, "users", user.uid), {
				firstName,
				lastName,
				phoneNumber,
				email: user.email,
				role: detectedRole,
				is_active: true,
				signupLocation,
				signupLocationCapturedAt: signupLocation ? new Date() : null,
				createdAt: new Date(),
			});

			setSuccess("Registration successful!");
			// Redirect to login after a short delay
			setTimeout(() => {
				router.replace("/login");
			}, 1200);
		} catch (err: any) {
			setError(err.message);
			console.log("Firebase registration error:", err);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Register</Text>
			<Text style={styles.fieldLabel}>First Name</Text>
			<TextInput
				style={styles.input}
				placeholder="First Name"
				placeholderTextColor="#6B7280"
				value={firstName}
				onChangeText={setFirstName}
				autoCapitalize="words"
				keyboardType="default"
			/>
			<Text style={styles.fieldLabel}>Last Name</Text>
			<TextInput
				style={styles.input}
				placeholder="Last Name"
				placeholderTextColor="#6B7280"
				value={lastName}
				onChangeText={setLastName}
				autoCapitalize="words"
				keyboardType="default"
			/>
			<Text style={styles.fieldLabel}>Phone Number</Text>
			<TextInput
				style={styles.phoneNumber}
				placeholder="Phone Number"
				placeholderTextColor="#6B7280"
				// here we need to convert number to string for TextInput
				value={phoneNumber?.toString() || ""}
				// but unlike email and password, we convert string back to number
				onChangeText={(text: string) => setPhoneNumber(formatPhoneNumber(text))}
				keyboardType="phone-pad"
				maxLength={14}
			/>
			{/* Role selection removed; now set automatically based on email */}
			<Text style={styles.fieldLabel}>Email</Text>
			<TextInput
				style={styles.input}
				placeholder="Email"
				placeholderTextColor="#6B7280"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
			/>
			<Text style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Role will be set automatically based on your email domain.</Text>
			<Text style={styles.fieldLabel}>Password</Text>
			<TextInput
				style={styles.input}
				placeholder="Password"
				placeholderTextColor="#6B7280"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
			<Button
				title="Register"
				onPress={handleRegister}
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{success ? <Text style={styles.success}>{success}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { padding: 20, backgroundColor: "#fff", borderRadius: 8, margin: 20, elevation: 2 },
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
	fieldLabel: { fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 6 },
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 4,
		padding: 10,
		marginBottom: 12,
		backgroundColor: "#fff",
		color: "#111827",
	},
	error: { color: "red", marginTop: 10, textAlign: "center" },
	success: { color: "green", marginTop: 10, textAlign: "center" },
	phoneNumber: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 4,
		padding: 10,
		marginBottom: 12,
		backgroundColor: "#fff",
		color: "#111827",
	},
	pickerContainer: { borderWidth: 1, borderColor: "#ccc", borderRadius: 4, marginBottom: 12 },
	pickerLabel: { fontSize: 14, fontWeight: "600", color: "#333", paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
	picker: { height: 50 },
});
