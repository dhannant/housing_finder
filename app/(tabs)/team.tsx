import { useRouter } from 'expo-router';
import { Users, Phone, Mail, ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StyleSheet,
  Linking,
} from 'react-native';

import { teamMembers, TeamMember } from '@/constants/team-data';

export default function TeamScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Users color="#2C5F2D" size={32} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Meet Our Team</Text>
            <Text style={styles.headerSubtitle}>
              Award-winning real estate professionals
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            With more than 30 years of experience in real estate and deep roots in the North
            Georgia area, the Leading Edge Real Estate team is continuously impressing satisfied
            clients.
          </Text>
          <Text style={styles.awardText}>
            🏆 2020 White County Readers' Choice Award Winner
          </Text>
        </View>

        {teamMembers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            isExpanded={expandedId === member.id}
            onToggle={() => toggleExpanded(member.id)}
            onCall={member.phone ? () => handleCall(member.phone!) : undefined}
            onEmail={member.email ? () => handleEmail(member.email!) : undefined}
          />
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Ready to Work With Us?</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Linking.openURL('tel:+17062002210')}
          >
            <Phone color="#FFFFFF" size={20} />
            <Text style={styles.contactButtonText}>(706) 200-2210</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactButton, styles.emailButton]}
            onPress={() => Linking.openURL('mailto:info@leadingedgega.com')}
          >
            <Mail color="#2C5F2D" size={20} />
            <Text style={[styles.contactButtonText, styles.emailButtonText]}>
              info@leadingedgega.com
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface TeamMemberCardProps {
  member: TeamMember;
  isExpanded: boolean;
  onToggle: () => void;
  onCall?: () => void;
  onEmail?: () => void;
}

function TeamMemberCard({ member, isExpanded, onToggle, onCall, onEmail }: TeamMemberCardProps) {
  const bioPreview = member.bio.split('\n\n')[0];
  const hasMoreContent = member.bio.split('\n\n').length > 1;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.9}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: member.imageUrl }} style={styles.memberImage} />
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.name}</Text>
            {member.role && <Text style={styles.memberRole}>{member.role}</Text>}
            <View style={styles.expandIndicator}>
              <Text style={styles.expandText}>
                {isExpanded ? 'Read less' : 'Read more'}
              </Text>
              <ChevronRight
                color="#2C5F2D"
                size={16}
                style={{
                  transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                }}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.bioContainer}>
        <Text style={styles.bioText}>{isExpanded ? member.bio : bioPreview}</Text>
      </View>

      {(onCall || onEmail) && (
        <View style={styles.contactActions}>
          {onCall && (
            <TouchableOpacity style={styles.actionButton} onPress={onCall}>
              <Phone color="#2C5F2D" size={18} />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {onEmail && (
            <TouchableOpacity style={styles.actionButton} onPress={onEmail}>
              <Mail color="#2C5F2D" size={18} />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  introSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444444',
    marginBottom: 16,
  },
  awardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F2D',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#F0F7F0',
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  memberImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E5E5E5',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#2C5F2D',
    fontWeight: '600',
    marginBottom: 8,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  expandText: {
    fontSize: 13,
    color: '#2C5F2D',
    fontWeight: '600',
    marginRight: 4,
  },
  bioContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#444444',
  },
  contactActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F0F7F0',
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F2D',
    marginLeft: 6,
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C5F2D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    marginBottom: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emailButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2C5F2D',
  },
  emailButtonText: {
    color: '#2C5F2D',
  },
});
