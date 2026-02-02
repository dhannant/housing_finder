import { SafeAreaView } from 'react-native';
import RegisterForm from '../components/registration_form';

export default function RegisterScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: '#f2f2f2' }}>
      <RegisterForm/>
    </SafeAreaView>
  );
}
