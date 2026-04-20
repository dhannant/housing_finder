import { auth } from '@/components/firebaseConfig';
import { landingStyles, profileModule_styles } from '@/constants/styles';
import { teamMembers } from '@/constants/team-data';
import { useAuth } from '@/contexts/AuthContext';
import { deleteOwnProfile, updateOwnProfile } from '@/utils/functions';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
const { user, userData, role } = useAuth();
		const [deleting, setDeleting] = useState(false);
		// Delete profile and all associated data
		const handleDeleteProfile = async () => {
			if (!user) return;
			let password = '';
			Alert.prompt(
				'Confirm Password',
				'For security, please re-enter your password to delete your profile. This cannot be undone.',
				[
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Delete',
						style: 'destructive',
						onPress: async (inputPassword: string | undefined) => {
							if (!inputPassword) {
								Alert.alert('Password Required', 'You must enter your password to delete your profile.');
								return;
							}
							if (!user.email) {
								Alert.alert('Email Missing', 'Your user account does not have an email address.');
								return;
							}
							setDeleting(true);
							try {
								// Re-authenticate
								const credential = EmailAuthProvider.credential(user.email, inputPassword);
								await reauthenticateWithCredential(user, credential);
								await deleteOwnProfile();
								await auth.signOut().catch(() => undefined);
								Alert.alert('Profile Deleted', 'Your profile and all associated data have been deleted.');
								router.replace('/login');
							} catch (error: any) {
								console.error('Delete profile error:', error);
								Alert.alert('Delete Failed', error?.message || 'Unable to delete your profile.');
							} finally {
								setDeleting(false);
							}
						},
						isPreferred: true,
					},
				],
				'secure-text'
			);
		};
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [phoneNumber, setPhoneNumber] = useState('');
	const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('');
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

		const dynamicUserData = userData as any;
		const savedTeamMemberId = typeof dynamicUserData?.teamMemberId === 'string' ? dynamicUserData.teamMemberId : '';
		const matchedByName = teamMembers.find((member) => {
			const memberName = member.name.trim().toLowerCase();
			const userFullName = `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim().toLowerCase();
			return memberName === userFullName;
		})?.id ?? '';

		setSelectedTeamMemberId(savedTeamMemberId || matchedByName || '');
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

		const selected = role === 'Agent' ? agentFields : clientFields;
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

			const selectedTeamMember =
				role === 'Agent'
					? teamMembers.find((member) => member.id === selectedTeamMemberId) ?? null
					: null;

			await updateOwnProfile({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: nextEmail,
				phoneNumber: phoneNumber.trim() || null,
				teamMemberId: selectedTeamMember ? selectedTeamMember.id : null,
				profileImageUrl: selectedTeamMember ? selectedTeamMember.imageUrl : null,
				bioImageUrl: selectedTeamMember ? selectedTeamMember.imageUrl : null,
			});
			await user.reload();

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
			<View style={profileModule_styles.loadingContainer}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<SafeAreaView style={landingStyles.container}>
			{/* Header with logo and delete button */}
			<View style={landingStyles.header}>
				<Text style={landingStyles.logoTitle}>{userData?.firstName} {userData?.lastName}&apos;s Profile</Text>
				<TouchableOpacity
					onPress={handleDeleteProfile}
					style={{ backgroundColor: '#FF4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginLeft: 12 }}
					disabled={deleting}
				>
					<Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{deleting ? 'Deleting...' : 'Delete Profile'}</Text>
				</TouchableOpacity>
			</View>
			<ScrollView contentContainerStyle={profileModule_styles.container}>
				<Text style={profileModule_styles.sectionTitle}>Profile Details</Text>
				<Text style={profileModule_styles.roleText}>{userData.role}</Text>

				{userData.role === 'Agent' && (
					<View style={profileModule_styles.fieldGroup}>
						<Text style={profileModule_styles.label}>Team Bio Profile</Text>
						<View style={profileModule_styles.input}>
							<Picker
								selectedValue={selectedTeamMemberId}
								onValueChange={(itemValue) => setSelectedTeamMemberId(String(itemValue))}
							>
								<Picker.Item label="Select your team profile" value="" />
								{teamMembers.map((member) => (
									<Picker.Item key={member.id} label={member.name} value={member.id} />
								))}
							</Picker>
						</View>
					</View>
				)}

				<View style={profileModule_styles.fieldGroup}>
					<Text style={profileModule_styles.label}>First Name</Text>
					<TextInput
						style={profileModule_styles.input}
						value={firstName}
						onChangeText={setFirstName}
						autoCapitalize="words"
					/>
				</View>

				<View style={profileModule_styles.fieldGroup}>
					<Text style={profileModule_styles.label}>Last Name</Text>
					<TextInput
						style={profileModule_styles.input}
						value={lastName}
						onChangeText={setLastName}
						autoCapitalize="words"
					/>
				</View>

				<View style={profileModule_styles.fieldGroup}>
					<Text style={profileModule_styles.label}>Email</Text>
					<TextInput
						style={profileModule_styles.input}
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						keyboardType="email-address"
					/>
				</View>

				<View style={profileModule_styles.fieldGroup}>
					<Text style={profileModule_styles.label}>Phone Number</Text>
										<TextInput
												style={profileModule_styles.input}
												value={phoneNumber}
												onChangeText={text => {
													// Only allow digits and valid phone symbols
													const cleaned = text.replace(/[^0-9+()\-\s]/g, "");
													setPhoneNumber(cleaned);
												}}
												keyboardType="phone-pad"
										/>
				</View>

				<TouchableOpacity
					style={[profileModule_styles.primaryButton, saving && profileModule_styles.disabledButton]}
					onPress={handleSave}
					disabled={saving}>
					<Text style={profileModule_styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
				</TouchableOpacity>

				{roleFields.length > 0 && (
					<View style={profileModule_styles.extraSection}>
						<Text style={profileModule_styles.sectionTitle}>Additional Details</Text>
						{roleFields.map((field) => (
							<View key={field.key} style={profileModule_styles.fieldRow}>
								<Text style={profileModule_styles.fieldLabel}>{field.label}</Text>
								<Text style={profileModule_styles.fieldValue}>{String((userData as any)[field.key])}</Text>
							</View>
						))}
					</View>
				)}

				<View style={profileModule_styles.extraSection}>
					<Text style={profileModule_styles.sectionTitle}>Change Password</Text>
					<View style={profileModule_styles.fieldGroup}>
						<Text style={profileModule_styles.label}>Current Password</Text>
						<TextInput
							style={profileModule_styles.input}
							value={currentPassword}
							onChangeText={setCurrentPassword}
							secureTextEntry
						/>
					</View>
					<View style={profileModule_styles.fieldGroup}>
						<Text style={profileModule_styles.label}>New Password</Text>
						<TextInput
							style={profileModule_styles.input}
							value={newPassword}
							onChangeText={setNewPassword}
							secureTextEntry
						/>
					</View>
					<View style={profileModule_styles.fieldGroup}>
						<Text style={profileModule_styles.label}>Confirm New Password</Text>
						<TextInput
							style={profileModule_styles.input}
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							secureTextEntry
						/>
					</View>
					<TouchableOpacity
						style={[profileModule_styles.primaryButton, passwordLoading && profileModule_styles.disabledButton]}
						onPress={handleChangePassword}
						disabled={passwordLoading}>
						<Text style={profileModule_styles.primaryButtonText}>
							{passwordLoading ? 'Updating...' : 'Update Password'}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={profileModule_styles.secondaryButton}
						onPress={handlePasswordResetEmail}>
						<Text style={profileModule_styles.secondaryButtonText}>Send Reset Email</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}