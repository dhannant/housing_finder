import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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
	const [role, setRole] = useState<"Client" | "Agent" | "Admin">("Client"); // Will be set automatically
	const [is_active, setIsActive] = useState<boolean>(true);


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
	function getRoleFromEmail(email: string): "Client" | "Agent" | "Admin" {
		const normalized = email.trim().toLowerCase();

		if (normalized.endsWith('@hitsolutions.com')) {
			return "Admin";
		}

		// Accepts any domain like leadingedge*.com (e.g., leadingedgega.com, leadingedgeatl.com)
		const match = normalized.match(/@leadingedge[a-z0-9-]*\.com$/);
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
		const cleanEmail = email.trim().toLowerCase();
		try {
			// Check if registration is allowed (rate limiting)
			const functions = getFunctions();
			const verifyRegistrationAllowed = httpsCallable(functions, 'verifyRegistrationAllowed');
			const allowedResp: any = await verifyRegistrationAllowed({ email: cleanEmail });
			if (!allowedResp.data?.allowed) {
				const until = allowedResp.data?.lockoutUntil;
				let msg = 'Too many registration attempts. Please try again later.';
				if (until) {
					const date = new Date(until);
					msg += `\nYou can try again after: ${date.toLocaleString()}`;
				}
				setError(msg);
				return;
			}

			// Step 1: Register user with Auth
			let regSuccess = false;
			try {
				const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
				const user = userCredential.user;

				// Step 2: Determine role from email
				const detectedRole = getRoleFromEmail(user.email || cleanEmail);
				setRole(detectedRole);

				// Step 3: Save extra info to Firestore
				await setDoc(doc(db, "users", user.uid), {
					firstName,
					lastName,
					phoneNumber,
					email: user.email,
					role: detectedRole,
					is_active: true,
					createdAt: new Date(),
				});

				setSuccess("Registration successful!");
				regSuccess = true;
				// Redirect to login after a short delay
				setTimeout(() => {
					router.replace("/login");
				}, 1200);
			} catch (err: any) {
				setError(err.message);
				   // [REMOVED LOG]
			}

			// Record registration attempt (success or failure)
			const recordRegistrationAttempt = httpsCallable(functions, 'recordRegistrationAttempt');
			await recordRegistrationAttempt({ email: cleanEmail, success: regSuccess });
		} catch (err: any) {
			setError('An error occurred. Please try again.');
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
								value={phoneNumber?.toString() || ""}
								onChangeText={(text: string) => {
									// Only allow digits and valid phone symbols
									const cleaned = text.replace(/[^0-9+()\-\s]/g, "");
									setPhoneNumber(formatPhoneNumber(cleaned));
								}}
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
