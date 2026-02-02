import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from './firebaseConfig';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');


function formatPhoneNumber(value: string) {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (!match) return value;
  let formatted = '';
  if (match[1]) {
    formatted = `(${match[1]}`;
  }
  if (match[2]) {
    formatted += match[2].length === 3 ? `) ${match[2]}` : match[2];
  }
  if (match[3]) {
    formatted += match[3] ? `-${match[3]}` : '';
  }
  return formatted;
}

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess('Registration successful!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registe44r</Text>
      <TextInput 
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize='words'
        keyboardType='default'
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize='words'
        keyboardType='default'
      />
      <TextInput
        style={styles.phoneNumber}
        placeholder='Phone Number'
        // here we need to convert number to string for TextInput
        value={phoneNumber?.toString() || ''}
        // but unlike email and password, we convert string back to number
        onChangeText={text => setPhoneNumber(formatPhoneNumber(text))}
        keyboardType='phone-pad'
        maxLength={14}
      />
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
      <Button title="Register" onPress={handleRegister} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
    </View>
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
  error: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  success: {
    color: 'green',
    marginTop: 10,
    textAlign: 'center',
  },
  phoneNumber: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  }
});
