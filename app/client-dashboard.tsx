import { auth, db } from '@/components/firebaseConfig';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { UserCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Realtor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  selectedRealtorId?: string;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [selectedRealtorId, setSelectedRealtorId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchRealtors();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          setSelectedRealtorId(data.selectedRealtorId || null);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchRealtors = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'Realtor'));
      const querySnapshot = await getDocs(q);
      
      const realtorsList: Realtor[] = [];
      querySnapshot.forEach((doc) => {
        realtorsList.push({
          id: doc.id,
          ...doc.data(),
        } as Realtor);
      });
      
      setRealtors(realtorsList);
    } catch (error) {
      console.error('Error fetching realtors:', error);
      Alert.alert('Error', 'Failed to load realtors');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRealtor = async (realtorId: string) => {
    setRequesting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Create a client request for the realtor
      await addDoc(collection(db, 'clientRequests'), {
        clientId: user.uid,
        clientName: `${userData?.firstName} ${userData?.lastName}`,
        clientEmail: userData?.email,
        realtorId: realtorId,
        status: 'pending',
        createdAt: new Date(),
      });

      setSelectedRealtorId(realtorId);
      Alert.alert('Success', 'Your request has been sent to the realtor!');
    } catch (error) {
      console.error('Error selecting realtor:', error);
      Alert.alert('Error', 'Failed to send request to realtor');
    } finally {
      setRequesting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C5F2D" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <UserCircle color="#2C5F2D" size={32} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Client Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Welcome, {userData?.firstName || 'Client'}!
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Realtor</Text>
          <Text style={styles.sectionDescription}>
            Choose a realtor to work with. They will be able to view your requests and help you find your dream property.
          </Text>
        </View>

        {realtors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No realtors available at the moment.</Text>
          </View>
        ) : (
          <View style={styles.realtorsContainer}>
            {realtors.map((realtor) => (
              <View key={realtor.id} style={styles.realtorCard}>
                <View style={styles.realtorInfo}>
                  <View style={styles.realtorAvatar}>
                    <Text style={styles.realtorInitials}>
                      {realtor.firstName[0]}
                      {realtor.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.realtorDetails}>
                    <Text style={styles.realtorName}>
                      {realtor.firstName} {realtor.lastName}
                    </Text>
                    <Text style={styles.realtorEmail}>{realtor.email}</Text>
                    {realtor.phoneNumber && (
                      <Text style={styles.realtorPhone}>{realtor.phoneNumber}</Text>
                    )}
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    selectedRealtorId === realtor.id && styles.selectedButton,
                    requesting && styles.disabledButton,
                  ]}
                  onPress={() => handleSelectRealtor(realtor.id)}
                  disabled={requesting || selectedRealtorId === realtor.id}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      selectedRealtorId === realtor.id && styles.selectedButtonText,
                    ]}
                  >
                    {selectedRealtorId === realtor.id ? 'Request Sent' : 'Select Realtor'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => router.push('/(tabs)/map')}
        >
          <Text style={styles.navigateButtonText}>Browse Properties</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    marginHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  realtorsContainer: {
    paddingHorizontal: 16,
  },
  realtorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  realtorInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  realtorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C5F2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  realtorInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  realtorDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  realtorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  realtorEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  realtorPhone: {
    fontSize: 14,
    color: '#666666',
  },
  selectButton: {
    backgroundColor: '#2C5F2D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.6,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedButtonText: {
    color: '#FFFFFF',
  },
  navigateButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
