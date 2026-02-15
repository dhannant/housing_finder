import { auth, db } from '@/components/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
	const { user, userData } = useAuth();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [phoneNumber, setPhoneNumber] = useState('');
	const [saving, setSaving] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordLoading, setPasswordLoading] = useState(false);

	useEffect(() => {
		if (!userData) return;
		setFirstName(userData.firstName || '');
		setLastName(userData.lastName || '');
		setEmail(userData.email || '');
		setPhoneNumber(userData.phoneNumber || '');
	}, [userData]);

	const roleFields = useMemo(() => {
		const extraFields = userData as Record<string, unknown> | null;
		if (!extraFields) return [] as { label: string; key: string }[];

		const agentFields = [
			{ label: 'License Number', key: 'licenseNumber' },
			{ label: 'Brokerage', key: 'brokerage' },
			{ label: 'Office Phone', key: 'officePhone' },
		];

		const clientFields = [
			{ label: 'Preferred Areas', key: 'preferredAreas' },
			{ label: 'Budget', key: 'budget' },
			{ label: 'Move Timeline', key: 'moveTimeline' },
		];

		const selected = userData?.role === 'Agent' ? agentFields : clientFields;
		return selected.filter((field) => Boolean(extraFields[field.key]));
	}, [userData]);

	const handleSave = async () => {
		if (!user) {
			Alert.alert('Error', 'You must be logged in to update your profile.');
			return;
		}

		if (!firstName.trim() || !lastName.trim() || !email.trim()) {
			Alert.alert('Missing Info', 'First name, last name, and email are required.');
			return;
		}

		setSaving(true);
		try {
			const nextEmail = email.trim();
			if (user.email !== nextEmail) {
				await updateEmail(user, nextEmail);
			}

			await updateDoc(doc(db, 'users', user.uid), {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: nextEmail,
				phoneNumber: phoneNumber.trim() || null,
			});

			Alert.alert('Saved', 'Your profile has been updated.');
		} catch (error: any) {
			console.error('Profile update error:', error);
			Alert.alert('Update Failed', error?.message || 'Unable to update your profile.');
		} finally {
			setSaving(false);
		}
	};

	const handleChangePassword = async () => {
		if (!user || !user.email) {
			Alert.alert('Error', 'You must be logged in to change your password.');
			return;
		}

		if (!currentPassword || !newPassword || !confirmPassword) {
			Alert.alert('Missing Info', 'Please fill out all password fields.');
			return;
		}

		if (newPassword !== confirmPassword) {
			Alert.alert('Password Mismatch', 'New password and confirmation do not match.');
			return;
		}

		setPasswordLoading(true);
		try {
			const credential = EmailAuthProvider.credential(user.email, currentPassword);
			await reauthenticateWithCredential(user, credential);
			await updatePassword(user, newPassword);
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			Alert.alert('Success', 'Your password has been updated.');
		} catch (error: any) {
			console.error('Password update error:', error);
			Alert.alert('Update Failed', error?.message || 'Unable to update your password.');
		} finally {
			setPasswordLoading(false);
		}
	};

	const handlePasswordResetEmail = async () => {
		const resetEmail = user?.email || email.trim();
		if (!resetEmail) {
			Alert.alert('Error', 'No email address available for reset.');
			return;
		}

		try {
			await sendPasswordResetEmail(auth, resetEmail);
			Alert.alert('Email Sent', 'Check your inbox for password reset instructions.');
		} catch (error: any) {
			console.error('Password reset error:', error);
			Alert.alert('Email Failed', error?.message || 'Unable to send reset email.');
		}
	};

	if (!userData) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.sectionTitle}>Profile Details</Text>
			<Text style={styles.roleText}>{userData.role}</Text>

			<View style={styles.fieldGroup}>
				<Text style={styles.label}>First Name</Text>
				<TextInput
					style={styles.input}
					value={firstName}
					onChangeText={setFirstName}
					autoCapitalize="words"
				/>
			</View>

			<View style={styles.fieldGroup}>
				<Text style={styles.label}>Last Name</Text>
				<TextInput
					style={styles.input}
					value={lastName}
					onChangeText={setLastName}
					autoCapitalize="words"
				/>
			</View>

			<View style={styles.fieldGroup}>
				<Text style={styles.label}>Email</Text>
				<TextInput
					style={styles.input}
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
					keyboardType="email-address"
				/>
			</View>

			<View style={styles.fieldGroup}>
				<Text style={styles.label}>Phone Number</Text>
				<TextInput
					style={styles.input}
					value={phoneNumber}
					onChangeText={setPhoneNumber}
					keyboardType="phone-pad"
				/>
			</View>

			<TouchableOpacity
				style={[styles.primaryButton, saving && styles.disabledButton]}
				onPress={handleSave}
				disabled={saving}>
				<Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
			</TouchableOpacity>

			{roleFields.length > 0 && (
				<View style={styles.extraSection}>
					<Text style={styles.sectionTitle}>Additional Details</Text>
					{roleFields.map((field) => (
						<View key={field.key} style={styles.fieldRow}>
							<Text style={styles.fieldLabel}>{field.label}</Text>
							<Text style={styles.fieldValue}>{String((userData as any)[field.key])}</Text>
						</View>
					))}
				</View>
			)}

			<View style={styles.extraSection}>
				<Text style={styles.sectionTitle}>Change Password</Text>
				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Current Password</Text>
					<TextInput
						style={styles.input}
						value={currentPassword}
						onChangeText={setCurrentPassword}
						secureTextEntry
					/>
				</View>
				<View style={styles.fieldGroup}>
					<Text style={styles.label}>New Password</Text>
					<TextInput
						style={styles.input}
						value={newPassword}
						onChangeText={setNewPassword}
						secureTextEntry
					/>
				</View>
				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Confirm New Password</Text>
					<TextInput
						style={styles.input}
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						secureTextEntry
					/>
				</View>
				<TouchableOpacity
					style={[styles.primaryButton, passwordLoading && styles.disabledButton]}
					onPress={handleChangePassword}
					disabled={passwordLoading}>
					<Text style={styles.primaryButtonText}>
						{passwordLoading ? 'Updating...' : 'Update Password'}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.secondaryButton}
					onPress={handlePasswordResetEmail}>
					<Text style={styles.secondaryButtonText}>Send Reset Email</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: '#F8F9FA',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8F9FA',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 8,
	},
	roleText: {
		fontSize: 14,
		color: '#666666',
		marginBottom: 16,
	},
	fieldGroup: {
		marginBottom: 14,
	},
	label: {
		fontSize: 14,
		color: '#555555',
		marginBottom: 6,
	},
	input: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		color: '#1A1A1A',
	},
	primaryButton: {
		backgroundColor: '#2C5F2D',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 8,
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600',
	},
	secondaryButton: {
		borderWidth: 1,
		borderColor: '#2C5F2D',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 10,
	},
	secondaryButtonText: {
		color: '#2C5F2D',
		fontSize: 15,
		fontWeight: '600',
	},
	disabledButton: {
		opacity: 0.6,
	},
	extraSection: {
		marginTop: 20,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
	},
	fieldRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	fieldLabel: {
		fontSize: 14,
		color: '#555555',
	},
	fieldValue: {
		fontSize: 14,
		color: '#1A1A1A',
	},
});
