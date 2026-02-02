import { useRouter } from 'expo-router';
import { FileText, Home, MapPin, Users } from 'lucide-react-native';
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { landingStyles } from '@/constants/styles';

export default function LandingScreen() {
  const router = useRouter();

  // Handles user selection for each main action button
  const handleSelection = (type: 'buy' | 'sell' | 'preapproval' | 'geolocate') => {
    console.log(`User selected: ${type}`);
    
    if (type === 'geolocate' || type === 'buy') {
      router.push({
        pathname: '/(tabs)/map',
        params: { userType: type }
      });
    } else if (type === 'sell') {
      alert('Seller profile coming soon!');
    } else if (type === 'preapproval') {
      alert('Pre-approval form coming soon!');
    }
  };

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
          {/* Login button (navigates to login screen) */}
          <TouchableOpacity style={landingStyles.loginButton} onPress={() => router.push('/login')}>
            <Text style={landingStyles.loginButtonText}>Login</Text>
          </TouchableOpacity>
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
            onPress={() => handleSelection('preapproval')}
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
