import CalendarModule from '@/components/modules/calendarModule';
import { agentDashboardStyles } from '@/constants/styles';
import { SafeAreaView, View } from 'react-native';

export default function AgentCalendarTab() {
  return (
    <SafeAreaView style={agentDashboardStyles.container}>
      <View style={{ padding: 16 }}>
        <CalendarModule role="agent" />
      </View>
    </SafeAreaView>
  );
}
