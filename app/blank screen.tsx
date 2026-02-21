
import { bodyStyles, footerStyles, headerStyles, pageStyles } from '@/constants/styles';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlankScreen() {
	return (
		<SafeAreaView style={pageStyles.pageContainer}>
			{/* Header Section */}
			<View style={headerStyles.headerContainer}>
				<Text style={headerStyles.headerTitle}>Header</Text>
			</View>

			{/* Body Section */}
			<View style={bodyStyles.bodyContainer}>
				<Text style={bodyStyles.bodyText}>Body Content</Text>
			</View>

			{/* Footer Section */}
			<SafeAreaView style={footerStyles.footerContainer}>
				<Text style={footerStyles.footerText}>Footer</Text>
			</SafeAreaView>
		</SafeAreaView>
	);
}
