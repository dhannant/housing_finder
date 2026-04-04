import { login_styles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { Button, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../components/firebaseConfig';

export default function LoginScreen() {
	const { role } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	// Quick access login for testing
	// TODO: delete this before next deployment
	const testUsers = [
		{ label: 'Test Client (1)', 	email: 'client1@gmail.com', 				password: '123456' },
		{ label: 'Test Client (2)', 	email: 'client2@gmail.com', 				password: '123456' },
		{ label: 'Test Client (3)', 	email: 'client3@gmail.com', 				password: '123456' },
		{ label: 'Test Agent (1)', 	email: 'agent1@leadingedgega.com', 		password: '123456' },
		{ label: 'Test Agent (2)', 	email: 'agent2@leadingedgega.com', 		password: '123456' },
		{ label: 'Test Admin', 			email: 'admin@hitsolutionsllc.com', 	password: '123456' },
	];

	const handleTestLogin = async (email: string, password: string) => {
		setMessage('');
		setLoading(true);
		try {
			const cleanEmail = email.trim().toLowerCase();
			const cleanPassword = password.trim();
			await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
			setMessage('Login successful!');
			router.replace('/role-redirect');
		} catch (err: any) {
			setMessage('Test login failed. Please check your credentials and try again.');
			setLoading(false);
		} finally {
			if (!loading) setLoading(false);
		}
	};

	const handleLogin = async () => {
		setMessage('');
		setLoading(true);
		const cleanEmail = email.trim().toLowerCase();
		const cleanPassword = password.trim();
		try {
			// Check if login is allowed (rate limiting)
			const functions = getFunctions();
			const verifyLoginAllowed = httpsCallable(functions, 'verifyLoginAllowed');
			const allowedResp: any = await verifyLoginAllowed({ email: cleanEmail });
			if (!allowedResp.data?.allowed) {
				const until = allowedResp.data?.lockoutUntil;
				let msg = 'Too many failed attempts. Please try again later.';
				if (until) {
					const date = new Date(until);
					msg += `\nYou can try again after: ${date.toLocaleString()}`;
				}
				setMessage(msg);
				setLoading(false);
				return;
			}

			// Proceed with login
			await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
			setMessage('Login successful!');
			router.replace('/role-redirect');
			setLoading(false);
		} catch (err: any) {
			setMessage('An error occurred. Please try again.');
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f2' }}>
			<KeyboardAvoidingView style={{ flex: 1, paddingBottom: 32 }} 
										 behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
										 keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
				<View style={[login_styles.container, { flex: 1, justifyContent: 'center'}]}>
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
					
					<Text style={{marginTop: 16, textAlign: 'center'}}>
						<Text style={{color: '#007AFF'}} onPress={() => router.push('/terms-of-service')}>Terms of Service</Text>
						<Text style={{}}> / </Text>
						<Text style={{color: '#007AFF'}} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
					</Text>

					{/* Quick access login buttons for testing */}
					{/* <View style={{ marginTop: 24, marginBottom: 8 }}>
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
					</View> */}
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}


