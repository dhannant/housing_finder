import { useRouter } from 'expo-router';
import { FileText, Home, MapPin, Users } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { landingStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingScreen() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/role-redirect');
    }
  }, [loading, user, router]);

  // Handles user selection for each main action button
  const handleSelection = (type: 'buy' | 'sell' | 'preapproval' | 'geolocate') => {
    // console.log(`User selected: ${type}`);
    
    if (type === 'geolocate') {
      router.push({
        pathname: '/(tabs)/map',
        params: { userType: type, zoomToUser: 'true' }
      });
    } else if (type === 'buy') {
      router.push({
        pathname: '/(tabs)/map',
        params: { userType: type, zoomToUser: 'false' }
      });
    } else if (type === 'sell') {
      alert('Seller profile coming soon!');
    } else if (type === 'preapproval') {
      // alert('Pre-approval form coming soon!');
    }
  };

  const handleAuthButton = async () => {
    if (user) {
      // User is logged in, log them out
      try {
        await logout();
        alert('Logged out successfully');
        router.push('/'); // Send the user back to the landing page
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout');
      }
    } else {
      // User is not logged in, navigate to login
      router.push('/login');
    }
  };

  const { role } = useAuth();
  const handleDashboard = async () => {
    if (!user || !role) return;
    if (role === 'Agent') { router.push('/agent/(tabs)/agent-dashboard') }
    else if (role === 'Client') { router.push('/client/(tabs)/client-dashboard') }
    else if (role === 'Admin') { router.push('/admin/dashboard') }
  };

  if (!loading && user) {
    return (
      <SafeAreaView style={landingStyles.container}>
        <View style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    // Main safe area for the landing screen
    <SafeAreaView style={landingStyles.container}>
      {/* Scrollable content for the landing page */}
      <ScrollView contentContainerStyle={landingStyles.scrollContent}>
        {/* Header with logo and login button */}
        <View style={landingStyles.header}>
          <View style={landingStyles.logoContainer}>
            <View style={landingStyles.logoIcon}>
              <Home color="#FFFFFF" size={28} />
            </View>
            <View>
              <Text style={landingStyles.logoTitle}>Leading Edge</Text>
              <Text style={landingStyles.logoSubtitle}>Real Estate</Text>
            </View>
          </View>
          {user && (
            <View>
              <TouchableOpacity style={landingStyles.dashboardButton} onPress={handleDashboard}>
                <Text style={landingStyles.dashboardButtonText}>Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Login/Logout button */}
          {!user && (
            <View>
              <TouchableOpacity style={landingStyles.loginButton} onPress={handleAuthButton}>
                <Text style={landingStyles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          )}
          
        </View>

        {/* Welcome section with logo and subtitle */}
        <View style={landingStyles.welcomeSection}>
          <Text style={landingStyles.welcomeTitle}> {"Welcome to"} </Text>
          <Image source={require('@/assets/images/LE_logo.png')} style={{width: 200, height: 90, marginBottom: 24}} />
          <Text style={landingStyles.welcomeSubtitle}> {"North Georgia's trusted real estate partner"} </Text>
        </View>

        {/* Main action buttons for user flows */}
        <View style={landingStyles.buttonsContainer}>
          {/* Buy button */}
          <TouchableOpacity
            style={[landingStyles.actionButton, landingStyles.buyButton]}
            onPress={() => handleSelection('buy')}
            activeOpacity={0.8}
          >
            <View style={landingStyles.buttonContent}>
              <View style={[landingStyles.iconCircle, landingStyles.buyIconCircle]}>
                <Home color="#FFFFFF" size={32} />
              </View>
              <View style={landingStyles.buttonTextContainer}>
                <Text style={landingStyles.buttonTitle}> {"I'm looking to buy a home/land"} </Text>
                <Text style={landingStyles.buttonSubtitle}>{"Create profile & start searching"}</Text>
              </View>
            </View>
            <Text style={landingStyles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Sell button */}
          <TouchableOpacity
            style={[landingStyles.actionButton, landingStyles.sellButton]}
            onPress={() => handleSelection('sell')}
            activeOpacity={0.8}
          >
            <View style={landingStyles.buttonContent}>
              <View style={[landingStyles.iconCircle, landingStyles.sellIconCircle]}>
                <Home color="#FFFFFF" size={32} />
              </View>
              <View style={landingStyles.buttonTextContainer}>
                <Text style={landingStyles.buttonTitle}>{"I'm looking to sell my home/land"}</Text>
                <Text style={landingStyles.buttonSubtitle}>{"Get pre-approved & list your property"}</Text>
              </View>
            </View>
            <Text style={landingStyles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Pre-approval button */}
          <TouchableOpacity
            style={[landingStyles.actionButton, landingStyles.preapprovalButton]}
            onPress={() => Linking.openURL('https://1799791.my1003app.com/339121/register?time=1730689393113')}
            activeOpacity={0.8}
          >
            <View style={landingStyles.buttonContent}>
              <View style={[landingStyles.iconCircle, landingStyles.preapprovalIconCircle]}>
                <FileText color="#FFFFFF" size={32} />
              </View>
              <View style={landingStyles.buttonTextContainer}>
                <Text style={landingStyles.buttonTitle}>{"I want to get pre-approved"}</Text>
                <Text style={landingStyles.buttonSubtitle}>{"Start your financing journey"}</Text>
              </View>
            </View>
            <Text style={landingStyles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Geolocate button */}
          <TouchableOpacity
            style={[landingStyles.actionButton, landingStyles.geolocateButton]}
            onPress={() => handleSelection('geolocate')}
            activeOpacity={0.8}
          >
            <View style={landingStyles.buttonContent}>
              <View style={[landingStyles.iconCircle, landingStyles.geolocateIconCircle]}>
                <MapPin color="#FFFFFF" size={32} />
              </View>
              <View style={landingStyles.buttonTextContainer}>
                <Text style={landingStyles.buttonTitle}>{"I'm at a home I love & need more info"}</Text>
                <Text style={landingStyles.buttonSubtitle}>{"Geo-locate property details"}</Text>
              </View>
            </View>
            <Text style={landingStyles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Info section with team link */}
        <View style={landingStyles.infoSection}>
          <Text style={landingStyles.infoText}>{"Not sure where to start? Our team is here to help guide you through every step."}</Text>
          
          {/* Meet Our Team button */}
          <TouchableOpacity
            style={landingStyles.teamButton}
            onPress={() => router.push('/team')}
            activeOpacity={0.8}
          >
            <Users color="#2C5F2D" size={20} />
            <Text style={landingStyles.teamButtonText}>{"Meet Our Team"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer with copyright */}
      <View style={landingStyles.footer}>
        <Text style={landingStyles.footerText}>{"© 2026 Leading Edge Real Estate. All rights reserved."}</Text>
      </View>
    </SafeAreaView>
  );
}
