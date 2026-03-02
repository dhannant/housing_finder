import { TeamMember, teamMembers } from '@/constants/team-data';
import React from 'react';
import { Image, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface SelectAgentModuleProps {
	realtors: any[];
	pendingRequestsRealtorId: any[] | null;
	requesting: boolean;
	onSelectRealtor: (realtorId: string) => void;
	styles: any;
}

function normalizeName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function getAgentImageUrl(realtor: any): string | null {
	const linkedTeamMember = getTeamMemberForRealtor(realtor);

	if (linkedTeamMember?.imageUrl) {
		return linkedTeamMember.imageUrl;
	}

	const directImage =
		realtor?.imageUrl ??
		realtor?.profileImageUrl ??
		realtor?.bioImageUrl ??
		realtor?.photoURL ??
		realtor?.avatarUrl ??
		null;

	if (typeof directImage === 'string' && directImage.trim().length > 0) {
		return directImage.trim();
	}

	const fullName = `${realtor?.firstName ?? ''} ${realtor?.lastName ?? ''}`.trim().toLowerCase();
	const teamMember = teamMembers.find((member) => member.name.trim().toLowerCase() === fullName);
	return teamMember?.imageUrl ?? null;
}

function getTeamMemberForRealtor(realtor: any): TeamMember | null {
	if (typeof realtor?.teamMemberId === 'string') {
		const linkedById = teamMembers.find((member) => member.id === realtor.teamMemberId);
		if (linkedById) return linkedById;
	}

	const firstName = normalizeName(String(realtor?.firstName ?? ''));
	const lastName = normalizeName(String(realtor?.lastName ?? ''));
	const fullName = normalizeName(`${realtor?.firstName ?? ''} ${realtor?.lastName ?? ''}`);

	const exactMatch = teamMembers.find((member) => normalizeName(member.name) === fullName);
	if (exactMatch) return exactMatch;

	if (firstName && lastName) {
		const looseMatch = teamMembers.find((member) => {
			const memberName = normalizeName(member.name);
			return memberName.includes(firstName) && memberName.includes(lastName);
		});
		if (looseMatch) return looseMatch;
	}

	return null;
}

export const SelectAgentModule: React.FC<SelectAgentModuleProps> = ({
	realtors,
	pendingRequestsRealtorId,
	requesting,
	onSelectRealtor,
	styles,
}) => {
	const [selectedTeamMember, setSelectedTeamMember] = React.useState<TeamMember | null>(null);

	const handleEmailPress = async (email?: string) => {
		if (!email) return;
		const url = `mailto:${email}`;
		const canOpen = await Linking.canOpenURL(url);
		if (canOpen) {
			await Linking.openURL(url);
		}
	};

	const handlePhonePress = async (phone?: string) => {
		if (!phone) return;
		const digits = phone.replace(/[^0-9+]/g, '');
		const url = `tel:${digits}`;
		const canOpen = await Linking.canOpenURL(url);
		if (canOpen) {
			await Linking.openURL(url);
		}
	};

	if (!realtors || realtors.length === 0) {
		return (
			<View style={styles.emptyState}>
				<Text style={styles.emptyStateText}>No realtors available at the moment.</Text>
			</View>
		);
	}

	return (
		<>
		<View style={styles.realtorsContainer}>
			{realtors.map((realtor: any) => {
				const hasPending = pendingRequestsRealtorId?.some((req: any) => req.realtorId === realtor.id);
				const hasAnyPendingOrApproved = pendingRequestsRealtorId?.some(
					(req: any) => req.status === 'Pending' || req.status === 'Approved'
				);
				const imageUrl = getAgentImageUrl(realtor);
				const teamMember = getTeamMemberForRealtor(realtor);

				return (
					<View key={realtor.id} style={styles.realtorCard}>
						<View style={styles.realtorInfo}>
							<View style={styles.realtorAvatar}>
								<TouchableOpacity
									style={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}
									activeOpacity={teamMember ? 0.8 : 1}
									onPress={() => {
										if (teamMember) setSelectedTeamMember(teamMember);
									}}
								>
									{imageUrl ? (
										<Image
											source={{ uri: imageUrl }}
											style={{ width: '100%', height: '100%', borderRadius: 30 }}
											resizeMode="cover"
										/>
									) : (
										<Text style={styles.realtorInitials}>
											{realtor.firstName?.[0]}{realtor.lastName?.[0]}
										</Text>
									)}
								</TouchableOpacity>
							</View>
							<View style={styles.realtorDetails}>
								<Text style={styles.realtorName}>{realtor.firstName} {realtor.lastName}</Text>
								<TouchableOpacity onPress={() => handleEmailPress(realtor.email)}>
									<Text style={styles.realtorEmail}>{realtor.email}</Text>
								</TouchableOpacity>
								{realtor.phoneNumber && (
									<TouchableOpacity onPress={() => handlePhonePress(realtor.phoneNumber)}>
										<Text style={styles.realtorPhone}>{realtor.phoneNumber}</Text>
									</TouchableOpacity>
								)}
							</View>
						</View>

						{hasPending ? (
							<View style={styles.requestSentBadge}>
								<Text style={styles.requestSentText}>Request Sent</Text>
							</View>
						) : (
							!hasAnyPendingOrApproved && (
								<TouchableOpacity
									style={[styles.selectButton, requesting && styles.disabledButton]}
									onPress={() => onSelectRealtor(realtor.id)}
									disabled={requesting}
								>
									<Text style={styles.selectButtonText}>Select Realtor</Text>
								</TouchableOpacity>
							)
						)}
					</View>
				);
			})}
		</View>

		<Modal
			visible={selectedTeamMember !== null}
			transparent={true}
			animationType="fade"
			onRequestClose={() => setSelectedTeamMember(null)}
		>
			<View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
				<View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, maxHeight: '80%', overflow: 'hidden' }}>
					{selectedTeamMember && (
						<ScrollView contentContainerStyle={{ padding: 16 }}>
							<Image
								source={{ uri: selectedTeamMember.imageUrl }}
								style={{ width: '100%', height: 260, borderRadius: 10, marginBottom: 12 }}
								resizeMode="cover"
							/>
							<Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>{selectedTeamMember.name}</Text>
							{selectedTeamMember.role && (
								<Text style={{ fontSize: 14, color: '#666666', marginBottom: 12 }}>{selectedTeamMember.role}</Text>
							)}
							<Text style={{ fontSize: 15, color: '#1A1A1A', lineHeight: 22 }}>{selectedTeamMember.bio}</Text>
						</ScrollView>
					)}

					<TouchableOpacity
						style={{ paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E0E0E0' }}
						onPress={() => setSelectedTeamMember(null)}
					>
						<Text style={{ color: '#2C5F2D', fontWeight: '600', fontSize: 16 }}>Close</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
		</>
	);
};
