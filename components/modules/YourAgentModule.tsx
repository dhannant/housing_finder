
import { fetchUserData } from '@/utils/functions';
import { UserData } from '@/utils/interfaces';
import { TeamMember, teamMembers } from '@/constants/team-data';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface YourAgentModuleProps {
  realtorId: string;
  styles: any;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const YourAgentModule: React.FC<YourAgentModuleProps> = ({ realtorId, styles }) => {
  const [realtor, setRealtor] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);

  const getTeamMemberForAgent = (agent: UserData | null): TeamMember | null => {
    if (!agent) return null;

    const dynamicAgent = agent as any;
    if (typeof dynamicAgent?.teamMemberId === 'string') {
      const linkedById = teamMembers.find((member) => member.id === dynamicAgent.teamMemberId);
      if (linkedById) return linkedById;
    }

    const firstName = normalizeName(String(agent.firstName ?? ''));
    const lastName = normalizeName(String(agent.lastName ?? ''));
    const fullName = normalizeName(`${agent.firstName ?? ''} ${agent.lastName ?? ''}`);

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
  };

  const getAgentImageUrl = (agent: UserData | null): string | null => {
    if (!agent) return null;

    const dynamicAgent = agent as any;
    const linkedTeamMember = getTeamMemberForAgent(agent);

    if (linkedTeamMember?.imageUrl) {
      return linkedTeamMember.imageUrl;
    }

    const directImage =
      dynamicAgent?.imageUrl ??
      dynamicAgent?.profileImageUrl ??
      dynamicAgent?.bioImageUrl ??
      dynamicAgent?.photoURL ??
      dynamicAgent?.avatarUrl ??
      null;

    if (typeof directImage === 'string' && directImage.trim().length > 0) {
      return directImage.trim();
    }

    const fullName = `${agent.firstName ?? ''} ${agent.lastName ?? ''}`.trim().toLowerCase();
    const teamMember = teamMembers.find((member) => member.name.trim().toLowerCase() === fullName);
    return teamMember?.imageUrl ?? null;
  };

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

  useEffect(() => {
    async function loadRealtor() {
      setLoading(true);
      const data = await fetchUserData(realtorId);
      setRealtor(data);
      setLoading(false);
    }
    if (realtorId) loadRealtor();
  }, [realtorId]);

  if (loading) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color="#2C5F2D" />
        <Text style={styles.loadingText}>Loading your agent...</Text>
      </View>
    );
  }

  if (!realtor) return null;

  const imageUrl = getAgentImageUrl(realtor);
  const teamMember = getTeamMemberForAgent(realtor);

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Agent</Text>
        <View style={styles.realtorCard}>
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
        </View>
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
