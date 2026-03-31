import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>PRIVACY POLICY</Text>
      <Text style={styles.date}>Last Updated: March 28, 2026</Text>
      <Text style={styles.sectionTitle}>App Description:</Text>
      <Text style={styles.text}>
        A mobile app designed to improve communication between Leading Edge Realty Agents and Clients. Clients are able to select a realtor of their choice, search for properties near their current location or using a map, save favorites, and view key dates/timelines. Agents handle assigning favorites to a Client, creating offers, updating key dates, and managing timelines.
      </Text>
      <Text style={styles.sectionTitle}>1. WHAT INFORMATION DO WE COLLECT?</Text>
      <Text style={styles.text}><Text style={styles.bold}>Personal Information Provided by You.</Text> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the features you use. The personal information we collect may include the following:</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Your Name</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Phone Number</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Email Address</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Password</Text></View>
      </View>
      <Text style={styles.text}><Text style={styles.bold}>Sensitive Information.</Text> We collect the following sensitive information if you choose to provide us with access or permission:</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Geolocation Information. We may request access or permission to track location-based information from your mobile device while you are using the App, to allow certain location-based features. We do not store your location or property search queries; this information is used only to provide requested features and is sent directly to third-party APIs. You may revoke the App's permissions at any time in your device’s settings.</Text></View>
      </View>
      <Text style={styles.text}><Text style={styles.bold}>Application Data.</Text> If you use the App, we also may collect the following information if you choose to provide us with access or permission:</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Mobile Device Access. We may request access or permission to certain features from your mobile device, including your reminders, storage, camera, and calendar. You may revoke the App's permissions at any time in your device’s settings.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Push Notifications. We may request to send you push notifications regarding your account or certain features of the App. If you wish to opt out from receiving these communications, you may turn them off in your device’s settings.</Text></View>
      </View>
      <Text style={styles.sectionTitle}>2. HOW DO WE PROCESS YOUR INFORMATION?</Text>
      <Text style={styles.text}>We process your personal information for multiple reasons, depending on how you interact with the App, including:</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Facilitating account creation.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Delivering services to the user.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Responding to user inquiries / offering support.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Enabling user-to-user communications.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Requesting feedback.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Evaluating the App’s service, usage, and general experience.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Identifying usage trends.</Text></View>
      </View>
      <Text style={styles.sectionTitle}>3. USE OF THIRD PARTY SERVICES</Text>
      <Text style={styles.text}>The App uses the following APIs and Services:</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Google Firebase: For authentication, user registration, login, storing user data, files, and backend features. Data is stored and processed by Google. See Google’s Privacy Policy: https://policies.google.com/privacy</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Google Maps Platform: For map display and geolocation features. Your location and map usage data may be shared with Google. See Google’s Privacy Policy: https://policies.google.com/privacy and Terms: https://policies.google.com/terms</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>RapidAPI (Realtor API): Property data is fetched from a third-party provider. No direct personal identifiers (such as your name or email) are sent to RapidAPI. However, property search queries—such as when you use features like "I'm at a home I love" or request help—may include your geolocation data, which is considered personal information. This geolocation data may be processed by RapidAPI's servers to provide relevant property results. When using the ‘Request Help’ feature, your location will be sent to your Agent for assistance.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Expo Push API: Device tokens are used to send push notifications for account activity, updates, or reminders.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Expo Insights: We use Expo Insights to collect anonymous analytics about app usage, feature engagement, and crash reports. This helps us improve the app’s performance and user experience. No personal identifiers are collected by Expo Insights.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Google Analytics: We do not currently use Google Analytics, but may add it in the future. If added, this policy will be updated to reflect its use.</Text></View>
      </View>
      <Text style={styles.sectionTitle}>4. WHERE IS YOUR DATA STORED?</Text>
      <Text style={styles.text}>
        Your information may be transferred to and processed in countries other than your own, including the United States, where our servers or those of our service providers (such as Google Firebase) are located.
      </Text>
      <Text style={styles.sectionTitle}>5. DO WE SHARE YOUR PERSONAL INFORMATION?</Text>
      <Text style={styles.text}>
        We do not externally share or sell your information other than what is outlined in the USE OF THIRD PARTY SERVICES section. Third-party providers process data only as necessary to provide their services and are contractually obligated to protect it. User data is shared internally between Agents and Clients. Clients are blocked from viewing other Clients’ information.
      </Text>
      <Text style={styles.sectionTitle}>6. COOKIES AND TRACKING TECHNOLOGIES</Text>
      <Text style={styles.text}>
        The App does not directly use cookies. Third-party services (those listed in the USE OF THIRD PARTY SERVICES section) may use cookies or similar technologies to collect data for analytics, security, and app functionality.
      </Text>
      <Text style={styles.sectionTitle}>7. HOW DO WE USE YOUR INFORMATION?</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Provide and improve the App’s features and services, including property search, favorites, offers, and communication between agents and clients.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Authenticate users and manage account access.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Enable location-based features, such as searching for properties near your current location or requesting help.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Send push notifications for account activity, updates, or reminders.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Respond to user inquiries and provide support.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Maintain the security and integrity of the App and its data.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Analyze usage trends and troubleshoot issues to improve the App’s performance and reliability.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Comply with legal obligations and enforce our terms.</Text></View>
      </View>
      <Text style={styles.text}>We do not use your information for advertising or marketing purposes, nor do we share it with third parties except as described in this policy.</Text>
      <Text style={styles.sectionTitle}>8. HOW DO WE PROTECT YOUR INFORMATION?</Text>
      <Text style={styles.text}>We take the security of your personal information seriously. The App uses Google Firebase and Firestore, which provide industry-standard security features, including:</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Authentication: Only authenticated users can access their own data. Sensitive operations require a valid login.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Security Rules: We enforce strict, server-side rules to ensure users can only access data they are authorized to view or modify.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Encryption: All data is encrypted in transit (using HTTPS) and at rest by Firebase/Firestore.</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Access Controls: We regularly review and update our security rules to limit access to only what is necessary for each user role.</Text></View>
      </View>
      <Text style={styles.text}>We do not store sensitive information in client code, and API keys or secrets are never exposed in the app. We also monitor for suspicious activity and update our security practices as needed.</Text>
      <Text style={styles.sectionTitle}>9. HOW LONG DO WE KEEP YOUR INFORMATION?</Text>
      <Text style={styles.text}>
        Generally, your personal information is stored with us as long as you have an account with us. You may delete your account and associated information at any time on the App’s ‘Profile’ page or by contacting us directly at dhannant@hitsolutionsllc.com.
      </Text>
      <Text style={styles.sectionTitle}>10. DO WE COLLECT INFORMATION FROM MINORS?</Text>
      <Text style={styles.text}>
        The App is not intended for children or minors under the age of 18. We do not knowingly collect, solicit data from, or market to children under 18 years of age. In the event we become aware of storing such data, we will immediately delete such data from our records. If users are aware of any such data, you may reach out to us at dhannant@hitsolutionsllc.com for immediate action.
      </Text>
      <Text style={styles.sectionTitle}>11. WHAT ARE YOUR OPTIONS?</Text>
      <Text style={styles.text}>You may review, change, or terminate your account at any time by doing one of the following:</Text>
      <View style={styles.bulletBlock}>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Use the ‘Delete Profile’ function on the App’s profile page (Login and use the profile tab)</Text></View>
        <View style={styles.bulletRow}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.bulletText}>Contact us for account deletion at dhannant@hitsolutionsllc.com (please allow up to 15 days for receipt/deletion).</Text></View>
      </View>
      <Text style={styles.sectionTitle}>12. CHANGES TO THIS POLICY.</Text>
      <Text style={styles.text}>
        We may update this policy. All changes will be posted in the App, or directly linked to the online version for viewing.
      </Text>
      <Text style={styles.sectionTitle}>13. CONTACT US</Text>
      <Text style={styles.text}>
        For questions or concerns, please contact us at dhannant@hitsolutionsllc.com.
      </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  date: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 6,
  },
  text: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
  bulletBlock: {
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  bullet: {
    fontSize: 18,
    marginRight: 8,
    lineHeight: 22,
    color: '#222',
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#222',
  },
});
