import { ScrollView, StyleSheet, Text } from 'react-native';

export default function TermsOfServiceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>TERMS OF SERVICE</Text>
      <Text style={styles.date}>Last Updated: March 19, 2026</Text>

      <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
      <Text style={styles.text}>
        By accessing or using the Leading Edge Realty App (“the App”), you agree to these Terms of Service. If you do not agree, please do not use the App.
      </Text>

      <Text style={styles.sectionTitle}>2. Description of Service</Text>
      <Text style={styles.text}>
        The App provides real estate search tools, property information, and related features for clients and agents of Leading Edge Realty. It is designed to improve communication between Leading Edge Realty Agents and Clients. Clients can select a realtor, search for properties near their location or on a map, save favorites, and view key dates. Agents can assign favorites, create offers, update key dates, and manage timelines.
      </Text>

      <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
      <Text style={styles.text}>
        You agree to use the App only for lawful purposes. You will not:
        {'\n'}- Attempt to reverse engineer, copy, or modify the App
        {'\n'}- Use the App to distribute harmful or malicious content
        {'\n'}- Interfere with the App’s functionality or security
        {'\n'}- Misuse property data or agent information
      </Text>

      <Text style={styles.sectionTitle}>4. Accuracy of Information</Text>
      <Text style={styles.text}>
        Property listings, pricing, availability, and other information displayed in the App may come from third-party sources. While we strive for accuracy, we do not guarantee that all information is current, complete, or error-free. Always verify important details with a licensed agent.
      </Text>

      <Text style={styles.sectionTitle}>5. No Professional Advice</Text>
      <Text style={styles.text}>
        The App does not provide legal, financial, or real estate advice. All decisions related to property purchases, sales, or contracts should be made with qualified professionals.
      </Text>

      <Text style={styles.sectionTitle}>6. Privacy & Data Collection</Text>
      <Text style={styles.text}>
        Your use of the App is also governed by our Privacy Policy, which outlines how we collect, use, and protect your personal information. Please review the full Privacy Policy for details.
      </Text>

      <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
      <Text style={styles.text}>
        All content, code, design elements, and features of the App are the property of Leading Edge Realty or its developers. You may not copy, distribute, or reuse any part of the App without written permission.
      </Text>

      <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
      <Text style={styles.text}>
        The App uses the following third-party services:
        {'\n'}• Google Services: Includes Firebase for authentication and data storage, and Google Maps Platform for geolocation and mapping. Use of these services is subject to Google’s Terms of Service (https://policies.google.com/terms) and Privacy Policy (https://policies.google.com/privacy).
        {'\n'}• RapidAPI (Realty US API): Provides real estate property data. While no personal identifiers are shared, property search queries may include geolocation data.
        {'\n'}• Expo Push API: Used to send push notifications related to account activity, updates, or reminders.
      </Text>

      <Text style={styles.sectionTitle}>9. App Availability & Updates</Text>
      <Text style={styles.text}>
        We may update, modify, or discontinue parts of the App at any time without notice. We are not liable for downtime, data loss, or service interruptions.
      </Text>

      <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
      <Text style={styles.text}>
        To the fullest extent permitted by law:
        {'\n'}- The App is provided “as is” without warranties of any kind
        {'\n'}- We are not responsible for damages arising from your use of the App
        {'\n'}- We are not liable for errors in property data or third-party information
      </Text>

      <Text style={styles.sectionTitle}>11. Termination</Text>
      <Text style={styles.text}>
        We may suspend or terminate access to the App at any time for violations of these Terms or for any other reason deemed necessary.
      </Text>

      <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
      <Text style={styles.text}>
        We may update these Terms from time to time. Continued use of the App after changes are posted constitutes acceptance of the updated Terms.
      </Text>

      <Text style={styles.sectionTitle}>13. Contact Information</Text>
      <Text style={styles.text}>
        Leading Edge Realty
        {'\n'}Email: dhannant@hitsolutionsllc.com
      </Text>

       <Text style={styles.sectionTitle}>14. Account Security</Text>
       <Text style={styles.text}>
         You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please notify us immediately if you suspect unauthorized use of your account.
       </Text>

       <Text style={styles.sectionTitle}>15. Indemnification</Text>
       <Text style={styles.text}>
         You agree to indemnify and hold harmless Leading Edge Realty and its affiliates, employees, and agents from any claims, damages, liabilities, or expenses (including legal fees) arising from your use of the App or violation of these Terms.
       </Text>

       <Text style={styles.sectionTitle}>16. Severability</Text>
       <Text style={styles.text}>
         If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
       </Text>

       <Text style={styles.sectionTitle}>17. Children and Minors</Text>
       <Text style={styles.text}>
         The App is not intended for children or minors under the age of 18. We do not knowingly collect or solicit data from children under 18 years of age. If we become aware of such data, we will promptly delete it.
       </Text>

       <Text style={styles.sectionTitle}>18. Accessibility</Text>
       <Text style={styles.text}>
         We strive to make the App accessible to all users. If you encounter any accessibility barriers, please contact us so we can address your concerns.
       </Text>
    </ScrollView>
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
});
