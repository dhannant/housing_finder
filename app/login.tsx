import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Button, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../components/firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setMessage('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role;
        
        setMessage('Login successful!');
        
        // Route based on user role
        if (userRole === 'Realtor') {
          router.push('/realtor-dashboard');
        } else {
          router.push('/client-dashboard');
        }
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
            {
              text: 'Register',
              onPress: () => {
                setLoading(false);
                router.push('/register');
              },
            },
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
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title={loading ? 'Please wait...' : 'Login'} onPress={handleLogin} disabled={loading} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Text style={{ marginTop: 16, textAlign: 'center' }}>
          Don't have an account?{' '}
          <Text style={{ color: '#007AFF' }} onPress={() => router.push('/register')}>Register</Text></Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 20,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  message: {
    marginTop: 10,
    textAlign: 'center',
    color: '#007AFF',
  },
});
