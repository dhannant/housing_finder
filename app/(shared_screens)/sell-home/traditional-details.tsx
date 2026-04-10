import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TraditionalDetailsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [address, setAddress] = useState('');
	const [city, setCity] = useState('');
	const [postalCode, setPostalCode] = useState('');
	const [propertyType, setPropertyType] = useState('');
	const [bedrooms, setBedrooms] = useState('');
	const [bathrooms, setBathrooms] = useState('');
	const [squareFeet, setSquareFeet] = useState('');
	const [yearBuilt, setYearBuilt] = useState('');
	const [timelineToSell, setTimelineToSell] = useState('');

	const onNext = () => {
		if (!address.trim() || !city.trim() || !postalCode.trim()) {
			if (!address) Alert.alert('Missing Address');
			if (!city) Alert.alert('Missing City');
			if (!postalCode) Alert.alert('Missing Zip');
			Alert.alert('Missing info', 'Address, city, and ZIP are required.');
			return;
		}

		router.push({
			pathname: '/sell-home/traditional-availability',
			params: {
				address,
				city,
				postalCode,
				propertyType,
				bedrooms,
				bathrooms,
				squareFeet,
				yearBuilt,
				timelineToSell,
			},
		});
	};

	return (
		<SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
				<Text style={styles.title}>Traditional Listing Details</Text>
				<Text style={styles.subtitle}>Tell us about the home so your agent can prepare next steps.</Text>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Address:</Text>
					<TextInput style={styles.input} placeholder='adddress' onChangeText={setAddress}/>

					{/* 1 row, two different sized (left larger) columns */}
					<View style={{flexDirection: 'row',	gap: 10,}}>
						<View style={[styles.col, { flex: 2,}]}>
							<Text style={styles.label}>City:</Text>
							<TextInput style={styles.input} placeholder="Cleveland" onChangeText={setCity}/>
						</View>
					
						<View style={[styles.col, { flex: 1,}]}>	
							<View style={styles.col}>
								<Text style={styles.label}>Zip Code:</Text>
								<TextInput style={styles.input} placeholder='30528' onChangeText={setPostalCode} keyboardType='number-pad'/>
							</View>
						</View>
					</View>

						{/* 1 row, two equal columns */}
					<View style={{flexDirection: 'row',	gap: 10,}}>
						<View style={[styles.col, { flex: 1,}]}>
							<Text>Bedrooms:</Text>
							<View style={{borderWidth: 1, borderColor: '#D8DED8', borderRadius: 10, overflow: 'hidden', backgroundAttachment: '#fff'}}>
								<Picker selectedValue = {bedrooms} onValueChange = {(v) => setBedrooms}>
									<Picker.Item label='1'/>
									<Picker.Item label='2'/>
									<Picker.Item label='3'/>
									<Picker.Item label='4'/>
									<Picker.Item label='5+'/>
								</Picker>
							</View>
						</View>
						<View style={[styles.col, { flex: 1,}]}>
							<Text>Bathrooms:</Text>
							<View style={{borderWidth: 1, borderColor: '#D8DED8', borderRadius: 10, overflow: 'hidden', backgroundAttachment: '#fff'}}>
								<Picker selectedValue = {bathrooms} onValueChange = {(v) => setBathrooms}>
									<Picker.Item label='1'/>
									<Picker.Item label='2'/>
									<Picker.Item label='2.5'/>
									<Picker.Item label='3+'/>
								</Picker>
							</View>
						</View>
					</View>

					<View style={{flexDirection: 'row',	gap: 10,}}>
						<View style={[styles.col, { flex: 1,}]}>
							<Text style={styles.label}>Square Feet:</Text>
							<TextInput style={styles.input} placeholder='Square Feet' onChangeText={setSquareFeet} keyboardType='number-pad'/>
						</View>
						<View style={[styles.col, { flex: 1,}]}>
							<Text style={styles.label}>Year Built:</Text>
							<TextInput style={styles.input} placeholder='Year Built' onChangeText={setYearBuilt} keyboardType='number-pad'/>
						</View>
					</View>

					<Text>Property Type</Text>
					<View style={{borderWidth: 1, borderColor: '#D8DED8', borderRadius: 10, overflow: 'hidden', backgroundAttachment: '#fff'}}>
						<Picker selectedValue = {propertyType} onValueChange = {(v) => setPropertyType}>
							<Picker.Item label='Single Family' value='single_family'/>
							<Picker.Item label='Condo' value='condo'/>
							<Picker.Item label='Townhouse' value='townhouse'/>
							<Picker.Item label='Multi-Family' value='multi_family'/>
							<Picker.Item label='Manufactured / Mobile' value='manufactured_mobile'/>
							<Picker.Item label='Land Only' value='land'/>
						</Picker>
					</View>
										
					<Text>Timeline to Sell</Text>
					<View style={{borderWidth: 1, borderColor: '#D8DED8', borderRadius: 10, overflow: 'hidden', backgroundAttachment: '#fff'}}>
						<Picker selectedValue = {timelineToSell} onValueChange = {(v) => setTimelineToSell}>
							<Picker.Item label = 'ASAP'/>
							<Picker.Item label = '30-60 days'/>
							<Picker.Item label = '3+ months'/>
						</Picker>
					</View>
				</View>
				

				<TouchableOpacity style={styles.button} onPress={onNext}>
					<Text style={styles.buttonText}>Continue</Text>
				</TouchableOpacity>

			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: 10,
	},
	col: {
		minWidth: 0, // helps prevent overflow
	},
	container: {
		flex: 1,
		backgroundColor: '#F7F8F5',
	},
	content: {
		padding: 20,
		gap: 10,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1C3A2C',
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: '#4F5D56',
		marginBottom: 8,
	},
	inputGroup: {
		gap: 6,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2A3E33',
	},
	input: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#D8DED8',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#24362D',
	},
	button: {
		marginTop: 14,
		backgroundColor: '#2C5F2D',
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
	},
	buttonText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
});
