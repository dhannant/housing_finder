import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellHomeIndexScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
			<View style={[styles.content, { paddingBottom: 20 + insets.bottom }]}>
				<Text style={styles.title}>I Want To Sell A Home</Text>
				<Text style={styles.subtitle}>
					Choose how you want to start and we will guide you through the next steps.
				</Text>

				<TouchableOpacity
					style={[styles.optionCard, styles.primaryOption]}
					onPress={() => router.push('/sell-home/traditional-details')}>
					<Text style={styles.optionTitle}>Traditional Listing</Text>
					<Text style={styles.optionText}>Work with your assigned agent to list and market your home.</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.optionCard}
					onPress={() => Alert.alert('Coming Soon', 'Realty2Cash flow will be available soon.')}
				>
					<Text style={styles.optionTitle}>Realty2Cash</Text>
					<Text style={styles.optionText}>Request a fast-cash style offer path (coming soon).</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F7F8F5',
	},
	content: {
		flex: 1,
		padding: 20,
		gap: 14,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1C3A2C',
	},
	subtitle: {
		fontSize: 15,
		lineHeight: 22,
		color: '#4B5A53',
		marginBottom: 6,
	},
	optionCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 16,
		borderWidth: 1,
		borderColor: '#D6DDD8',
	},
	primaryOption: {
		borderColor: '#2C5F2D',
		borderWidth: 2,
	},
	optionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#203C2B',
		marginBottom: 6,
	},
	optionText: {
		fontSize: 14,
		lineHeight: 20,
		color: '#52615A',
	},
});
