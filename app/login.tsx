import { login_styles } from '@/constants/styles';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../components/firebaseConfig';

export default function LoginScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	// Quick access login for testing
	const testUsers = [
		{ label: 'Test Client (1)`', email: 'client1@gmail.com', password: '123456' },
		{ label: 'Test Client (2)`', email: 'client2@gmail.com', password: '123456' },
		{ label: 'Test Client (3)`', email: 'client3@gmail.com', password: '123456' },
		{ label: 'Test Agent (1)', email: 'agent1@leadingedgega.com', password: '123456' },
		{ label: 'Test Agent (2)', email: 'agent2@leadingedgega.com', password: '123456' },
		{ label: 'Test Admin', email: 'admin@hitsolutions.com', password: '123456' },
	];

	const handleTestLogin = async (email: string, password: string) => {
		setMessage('');
		setLoading(true);
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;
			const userDoc = await getDoc(doc(db, 'users', user.uid));
			if (userDoc.exists()) {
				setMessage('Login successful!');
				router.push('/role-redirect');
			} else {
				setMessage('User data not found');
				setLoading(false);
			}
		} catch (err: any) {
			setMessage('Test login failed: ' + err.message);
			setLoading(false);
		} finally {
			if (!loading) setLoading(false);
		}
	};

	const handleLogin = async () => {
		setMessage('');
		setLoading(true);
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;
			
			// Fetch user role from Firestore
			const userDoc = await getDoc(doc(db, 'users', user.uid));
			if (userDoc.exists()) {        
				setMessage('Login successful!');
				router.push('/role-redirect');
			} else {
				setMessage('User data not found');
				setLoading(false);
			}
		} catch (err: any) {
			if (err.code === 'auth/user-not-found') {
				Alert.alert(
					'User not found',
					'No account found for this email. Would you like to register?',
					[
						{ text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
						{ text: 'Register', onPress: () => { setLoading(false); router.push('/register'); }, },
					]
				);
			} else {
				setMessage(err.message);
				setLoading(false);
			}
		} finally {
			if (!loading) setLoading(false);
		}
	};

	return (
		<SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: '#f2f2f2' }}>
			<View style={login_styles.container}>
				<Text style={login_styles.title}>Login</Text>
				<TextInput
					style={login_styles.input}
					placeholder="Email"
					placeholderTextColor="#6B7280"
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
					keyboardType="email-address"
				/>
				<TextInput
					style={login_styles.input}
					placeholder="Password"
					placeholderTextColor="#6B7280"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
				/>
				<Button title={loading ? 'Please wait...' : 'Login'} onPress={handleLogin} disabled={loading} />
				{message ? <Text style={login_styles.message}>{message}</Text> : null}
				<Text style={{ marginTop: 16, textAlign: 'center' }}>
					Don&apos;t have an account?{' '}
					<Text style={{ color: '#007AFF' }} onPress={() => router.push('/register')}>Register</Text></Text>

				{/* Quick access login buttons for testing */}
				<View style={{ marginTop: 24, marginBottom: 8 }}>
					<Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Quick Test Logins:</Text>
					{testUsers.map((user, idx) => (
						<View key={user.email} style={{ marginBottom: 8 }}>
							<Button
								title={user.label}
								onPress={() => handleTestLogin(user.email, user.password)}
								color="#2C5F2D"
								disabled={loading}
							/>
						</View>
					))}
				</View>
			</View>
		</SafeAreaView>
	);
}


