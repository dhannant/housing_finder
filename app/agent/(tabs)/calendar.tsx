import CalendarModule from '@/components/modules/calendarModule';
import { agentDashboardStyles } from '@/constants/styles';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AgentCalendarTab() {
  return (
    <SafeAreaView style={agentDashboardStyles.container}>
      <View style={{ flex: 1, padding: 16 }}>
        <CalendarModule role="agent" />
      </View>
    </SafeAreaView>
  );
}
