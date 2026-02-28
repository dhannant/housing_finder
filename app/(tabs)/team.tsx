import { team_styles } from '@/constants/styles';
import { TeamMember, teamMembers } from '@/constants/team-data';
import { useRouter } from 'expo-router';
import { ChevronRight, Mail, Phone, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Linking, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

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
    <SafeAreaView style={team_styles.container}>
      <View style={team_styles.header}>
        <View style={team_styles.headerContent}>
          <Users color="#2C5F2D" size={32} />
          <View style={team_styles.headerTextContainer}>
            <Text style={team_styles.headerTitle}>{"Meet Our Team"}</Text>
            <Text style={team_styles.headerSubtitle}>{"Award-winning real estate professionals"}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={team_styles.scrollView} contentContainerStyle={team_styles.scrollContent}>
        <View style={team_styles.introSection}>
          <Text style={team_styles.introText}>
            {"With more than 30 years of experience in real estate and deep roots in the North" +
            " Georgia area, the Leading Edge Real Estate team is continuously impressing satisfied " +
            "clients."}
          </Text>
          <Text style={team_styles.awardText}>{"🏆 2020 White County Readers' Choice Award Winner"}</Text>
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

        <View style={team_styles.contactSection}>
          <Text style={team_styles.contactTitle}>{"Ready to Work With Us?"}</Text>
          <TouchableOpacity
            style={team_styles.contactButton}
            onPress={() => Linking.openURL('tel:+17062002210')}>
            <Phone color="#FFFFFF" size={20} />
            <Text style={team_styles.contactButtonText}>{"(706) 200-2210"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[team_styles.contactButton, team_styles.emailButton]}
            onPress={() => Linking.openURL('mailto:info@leadingedgega.com')}>
            <Mail color="#2C5F2D" size={20} />
            <Text style={[team_styles.contactButtonText, team_styles.emailButtonText]}>{"info@leadingedgega.com"}</Text>
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
    <View style={team_styles.card}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.9}>
        <View style={team_styles.cardHeader}>
          <Image source={{ uri: member.imageUrl }} style={team_styles.memberImage} />
          <View style={team_styles.memberInfo}>
            <Text style={team_styles.memberName}>{member.name}</Text>
            {member.role && <Text style={team_styles.memberRole}>{member.role}</Text>}
            <View style={team_styles.expandIndicator}>
              <Text style={team_styles.expandText}>
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

      <View style={team_styles.bioContainer}>
        <Text style={team_styles.bioText}>{isExpanded ? member.bio : bioPreview}</Text>
      </View>

      {(onCall || onEmail) && (
        <View style={team_styles.contactActions}>
          {onCall && (
            <TouchableOpacity style={team_styles.actionButton} onPress={onCall}>
              <Phone color="#2C5F2D" size={18} />
              <Text style={team_styles.actionButtonText}>{"Call"}</Text>
            </TouchableOpacity>
          )}
          {onEmail && (
            <TouchableOpacity style={team_styles.actionButton} onPress={onEmail}>
              <Mail color="#2C5F2D" size={18} />
              <Text style={team_styles.actionButtonText}>{"Email"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}