import { auth, db } from '@/components/firebaseConfig';
import { agentDashboardStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchActiveOfferForClient,
  fetchAgentClientRequests,
  fetchClients,
  fetchPropertyData,
  fetchRealtors,
  formatDate,
} from '@/utils/functions';
import type { ClientRequest } from '@/utils/interfaces';
import { useRouter } from 'expo-router';
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';

type AdminAgentRow = {
  id: string;
  name: string;
  email: string;
  requests: {
    requestId: string;
    clientId: string;
    clientName: string;
    status: string;
    createdAt: any;
    activeOfferStatus?: string;
    activeOfferAddress?: string;
  }[];
  approvedCount: number;
  pendingCount: number;
  declinedCount: number;
};

type ClientListItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

type ClientListFilter = 'active' | 'inactive' | 'all';

type AdminApiStats = {
  totalBatchesForRun: number;
  lastRunId: string;
  lastRunStatus: string;
  lastPullStartedAt: string | null;
  lastPullEndedAt: string | null;
  expectedFromApi: number;
  receivedFromApi: number;
  acceptedForWrite: number;
  writtenToFirestore: number;
  skippedNoPropertyId: number;
  errors: number;
  failedBatches: number;
  failedPages: number;
  retriesPerformed: number;
  homesNotSeenAgain: number;
  totalTrackedHomes: number;
};

type AdminJourneyStats = {
  totalRegisteredClients: number;
  activeRegisteredClients: number;
  inactiveRegisteredClients: number;
  registeredClients: number;
  clientsWithOffers: number;
  clientsPurchased: number;
  clientsNotPurchased: number;
  clientsWithSavedHomes: number;
  inactiveClientsWithSavedHomes: number;
  unsuccessfulInactiveBuyers: number;
  purchasedWithSavedHomes: number;
  notPurchasedWithSavedHomes: number;
  totalSavedHomes: number;
};

const emptyApiStats: AdminApiStats = {
  totalBatchesForRun: 0,
  lastRunId: 'n/a',
  lastRunStatus: 'Unknown',
  lastPullStartedAt: null,
  lastPullEndedAt: null,
  expectedFromApi: 0,
  receivedFromApi: 0,
  acceptedForWrite: 0,
  writtenToFirestore: 0,
  skippedNoPropertyId: 0,
  errors: 0,
  failedBatches: 0,
  failedPages: 0,
  retriesPerformed: 0,
  homesNotSeenAgain: 0,
  totalTrackedHomes: 0,
};

const emptyJourneyStats: AdminJourneyStats = {
  totalRegisteredClients: 0,
  activeRegisteredClients: 0,
  inactiveRegisteredClients: 0,
  registeredClients: 0,
  clientsWithOffers: 0,
  clientsPurchased: 0,
  clientsNotPurchased: 0,
  clientsWithSavedHomes: 0,
  inactiveClientsWithSavedHomes: 0,
  unsuccessfulInactiveBuyers: 0,
  purchasedWithSavedHomes: 0,
  notPurchasedWithSavedHomes: 0,
  totalSavedHomes: 0,
};

export default function AdminDashboardScreen() {
  const { userData, role } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AdminAgentRow[]>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientListFilter, setClientListFilter] = useState<ClientListFilter>('active');
  const [apiStats, setApiStats] = useState<AdminApiStats>(emptyApiStats);
  const [journeyStats, setJourneyStats] = useState<AdminJourneyStats>(emptyJourneyStats);

  useEffect(() => {
    if (role && role !== 'Admin') {
      router.replace('/role-redirect');
    }
  }, [role, router]);

  useEffect(() => {
    async function loadApiStats(): Promise<AdminApiStats> {
      const stats: AdminApiStats = { ...emptyApiStats };

      const runsRef = collection(db, 'apiPullRuns');
      const latestRunQuery = query(runsRef, orderBy('startedAt', 'desc'), limit(1));
      const latestRunSnap = await getDocs(latestRunQuery);

      if (!latestRunSnap.empty) {
        const latestDoc = latestRunSnap.docs[0];
        const run = latestDoc.data() as Record<string, any>;

        const receivedFromApi = Number(run.receivedProperties ?? 0) || 0;
        const skippedNoPropertyId = Number(run.skippedNoPropertyId ?? 0) || 0;

        stats.lastRunId = latestDoc.id;
        stats.lastRunStatus = String(run.status ?? 'Unknown');
        stats.lastPullStartedAt = typeof run.startedAt === 'string' ? run.startedAt : null;
        stats.lastPullEndedAt = typeof run.endedAt === 'string' ? run.endedAt : null;
        stats.totalBatchesForRun = Number(run.totalBatches ?? 0) || 0;
        stats.expectedFromApi = Number(run.expectedPropertiesFromApiReported ?? 0) || 0;
        stats.receivedFromApi = receivedFromApi;
        stats.skippedNoPropertyId = skippedNoPropertyId;
        stats.acceptedForWrite = Math.max(receivedFromApi - skippedNoPropertyId, 0);
        stats.writtenToFirestore = Number(run.writes ?? 0) || 0;
        stats.errors = Number(run.errors ?? 0) || 0;
        stats.failedBatches = Number(run.failedBatches ?? 0) || 0;
        stats.failedPages = Number(run.failedPages ?? 0) || 0;
        stats.retriesPerformed = Number(run.retriesPerformed ?? 0) || 0;
      }

      const propertiesRef = collection(db, 'properties');
      const allPropertiesCount = await getCountFromServer(propertiesRef);
      stats.totalTrackedHomes = allPropertiesCount.data().count;

      if (stats.lastPullStartedAt) {
        const staleQuery = query(propertiesRef, where('apiLastSeenDate', '<', stats.lastPullStartedAt));
        const staleCount = await getCountFromServer(staleQuery);
        stats.homesNotSeenAgain = staleCount.data().count;
      }

      return stats;
    }

    async function loadAdminData() {
      try {
        setLoading(true);

        const [agentUsers, clientUsers, latestApiStats, offersSnap, favoritesSnap] = await Promise.all([
          fetchRealtors(),
          fetchClients(),
          loadApiStats(),
          getDocs(collection(db, 'clientOffers')),
          getDocs(collection(db, 'clientFavorites')),
        ]);

        setApiStats(latestApiStats);

        const clientNameMap = new Map<string, { name: string; email: string }>();
        clientUsers.forEach((client) => {
          clientNameMap.set(client.id, {
            name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown Client',
            email: client.email || '',
          });
        });

        const activeClientUsers = clientUsers.filter((client) => (client as any).is_active !== false);
        const inactiveClientUsers = clientUsers.filter((client) => (client as any).is_active === false);
        const allClientIdSet = new Set(clientUsers.map((client) => client.id));
        const activeClientIdSet = new Set(activeClientUsers.map((client) => client.id));
        const inactiveClientIdSet = new Set(inactiveClientUsers.map((client) => client.id));
        const inactiveRegisteredClients = Math.max(clientUsers.length - activeClientUsers.length, 0);

        const clientsWithOffers = new Set<string>();
        const clientsPurchased = new Set<string>();
        const clientsWithSavedHomes = new Set<string>();
        const inactiveClientsWithSavedHomes = new Set<string>();
        const clientsPurchasedAll = new Set<string>();

        offersSnap.forEach((offerDoc) => {
          const offer = offerDoc.data() as Record<string, any>;
          const clientId = typeof offer.clientId === 'string' ? offer.clientId : '';
          if (!clientId || !allClientIdSet.has(clientId)) return;

          if (offer.status === 'Closed') {
            clientsPurchasedAll.add(clientId);
          }

          if (!activeClientIdSet.has(clientId)) return;

          clientsWithOffers.add(clientId);
          if (offer.status === 'Closed') {
            clientsPurchased.add(clientId);
          }
        });

        let totalSavedHomes = 0;
        favoritesSnap.forEach((favoriteDoc) => {
          const favorite = favoriteDoc.data() as Record<string, any>;
          const userId = typeof favorite.userId === 'string' ? favorite.userId : '';
          if (!userId || !allClientIdSet.has(userId)) return;

          totalSavedHomes += 1;
          if (activeClientIdSet.has(userId)) {
            clientsWithSavedHomes.add(userId);
          }
          if (inactiveClientIdSet.has(userId)) {
            inactiveClientsWithSavedHomes.add(userId);
          }
        });

        const purchasedWithSavedHomes = Array.from(clientsPurchased).filter((clientId) => clientsWithSavedHomes.has(clientId)).length;
        const clientsNotPurchased = Math.max(activeClientUsers.length - clientsPurchased.size, 0);
        const notPurchasedWithSavedHomes = Math.max(clientsWithSavedHomes.size - purchasedWithSavedHomes, 0);
        const unsuccessfulInactiveBuyers = Array.from(inactiveClientsWithSavedHomes).filter((clientId) => !clientsPurchasedAll.has(clientId)).length;

        setJourneyStats({
          totalRegisteredClients: clientUsers.length,
          activeRegisteredClients: activeClientUsers.length,
          inactiveRegisteredClients,
          registeredClients: activeClientUsers.length,
          clientsWithOffers: clientsWithOffers.size,
          clientsPurchased: clientsPurchased.size,
          clientsNotPurchased,
          clientsWithSavedHomes: clientsWithSavedHomes.size,
          inactiveClientsWithSavedHomes: inactiveClientsWithSavedHomes.size,
          unsuccessfulInactiveBuyers,
          purchasedWithSavedHomes,
          notPurchasedWithSavedHomes,
          totalSavedHomes,
        });

        const agentRows: AdminAgentRow[] = [];

        for (const agent of agentUsers) {
          const requests = await fetchAgentClientRequests(agent.id);
          const uniqueClientIds = Array.from(new Set(requests.map((req) => req.clientId).filter(Boolean)));

          const activeOfferMap = new Map<string, { status: string; address: string }>();
          for (const clientId of uniqueClientIds) {
            try {
              const activeOffer = await fetchActiveOfferForClient(clientId);
              if (!activeOffer) continue;

              const status = activeOffer.status || 'Unknown';
              const propertyId = activeOffer.propertyId;
              let address = 'Property unavailable';

              if (propertyId) {
                const property = await fetchPropertyData(propertyId);
                if (property?.address) {
                  address = property.address;
                }
              }

              activeOfferMap.set(clientId, { status, address });
            } catch (offerError) {
              console.error(`[AdminDashboard] Failed to load active offer for client ${clientId}:`, offerError);
            }
          }

          const requestRows = requests.map((req: ClientRequest) => {
            const clientMeta = clientNameMap.get(req.clientId);
            const activeOffer = activeOfferMap.get(req.clientId);
            return {
              requestId: req.id,
              clientId: req.clientId,
              clientName: clientMeta?.name || req.clientId,
              status: req.status || 'Unknown',
              createdAt: req.createdAt,
              activeOfferStatus: activeOffer?.status,
              activeOfferAddress: activeOffer?.address,
            };
          });

          const approvedCount = requestRows.filter((r) => r.status === 'Approved').length;
          const pendingCount = requestRows.filter((r) => r.status === 'Pending').length;
          const declinedCount = requestRows.filter((r) => r.status === 'Declined').length;

          agentRows.push({
            id: agent.id,
            name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unknown Agent',
            email: agent.email || '',
            requests: requestRows,
            approvedCount,
            pendingCount,
            declinedCount,
          });
        }

        setAgents(agentRows);
        setClients(
          clientUsers.map((client) => ({
            id: client.id,
            name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown Client',
            email: client.email || '',
            isActive: (client as any).is_active !== false,
          })),
        );
      } catch (error) {
        console.error('[AdminDashboard] Failed loading admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userData?.role === 'Admin') {
      loadAdminData();
    }
  }, [userData?.role]);

  const filteredClients = useMemo(() => {
    if (clientListFilter === 'active') {
      return clients.filter((client) => client.isActive);
    }
    if (clientListFilter === 'inactive') {
      return clients.filter((client) => !client.isActive);
    }
    return clients;
  }, [clients, clientListFilter]);

  const apiVolumeChart = useMemo(() => {
    const expected = Math.max(apiStats.expectedFromApi, 0);
    const received = Math.max(apiStats.receivedFromApi, 0);
    const expectedBase = expected > 0 ? expected : received;
    const safeBase = expectedBase > 0 ? expectedBase : 1;

    const receivedWithinExpected = Math.min(received, expectedBase);
    const remainingExpected = Math.max(expectedBase - receivedWithinExpected, 0);
    const receivedPercent = receivedWithinExpected / safeBase;
    const remainingPercent = remainingExpected / safeBase;
    const overage = Math.max(received - expectedBase, 0);

    const radius = 58;
    const strokeWidth = 22;
    const circumference = 2 * Math.PI * radius;

    return {
      expected,
      received,
      expectedBase,
      overage,
      receivedPercent,
      remainingPercent,
      radius,
      strokeWidth,
      circumference,
      remainingExpected,
      receivedWithinExpected,
      receivedStroke: circumference * receivedPercent,
      remainingStroke: circumference * remainingPercent,
    };
  }, [apiStats.expectedFromApi, apiStats.receivedFromApi]);

  const apiHealthBars = useMemo(() => {
    const bars = [
      { key: 'runs', label: 'Total Batches (This Run)', value: Math.max(apiStats.totalBatchesForRun, 0), color: '#2C5F2D' },
      { key: 'errors', label: 'Errors', value: Math.max(apiStats.errors, 0), color: '#D64545' },
      { key: 'failedBatches', label: 'Failed Batches', value: Math.max(apiStats.failedBatches, 0), color: '#E57A1F' },
      { key: 'failedPages', label: 'Failed Pages', value: Math.max(apiStats.failedPages, 0), color: '#8C52FF' },
      { key: 'retries', label: 'Total Retries', value: Math.max(apiStats.retriesPerformed, 0), color: '#2176AE' },
    ];

    const maxValue = bars.reduce((max, item) => Math.max(max, item.value), 0);
    const safeMax = maxValue > 0 ? maxValue : 1;

    return bars.map((bar) => ({
      ...bar,
      widthPercent: `${Math.max((bar.value / safeMax) * 100, 4)}%` as `${number}%`,
    }));
  }, [apiStats.totalBatchesForRun, apiStats.errors, apiStats.failedBatches, apiStats.failedPages, apiStats.retriesPerformed]);

  const clientJourneyBars = useMemo(() => {
    const bars = [
      { key: 'registered', label: 'Active Registered Clients', value: journeyStats.activeRegisteredClients, color: '#2C5F2D' },
      { key: 'offers', label: 'Clients With Offers', value: journeyStats.clientsWithOffers, color: '#2176AE' },
      { key: 'purchased', label: 'Purchased (Closed)', value: journeyStats.clientsPurchased, color: '#1E9E63' },
      { key: 'notPurchased', label: 'Active, Not Purchased', value: journeyStats.clientsNotPurchased, color: '#C05555' },
      { key: 'saved', label: 'Clients With Saved Homes', value: journeyStats.clientsWithSavedHomes, color: '#8C52FF' },
      {
        key: 'inactiveUnsuccessful',
        label: 'Inactive + Saved + No Close',
        value: journeyStats.unsuccessfulInactiveBuyers,
        color: '#B24A00',
      },
    ];

    const maxValue = bars.reduce((max, bar) => Math.max(max, bar.value), 0);
    const safeMax = maxValue > 0 ? maxValue : 1;

    return bars.map((bar) => ({
      ...bar,
      widthPercent: `${Math.max((bar.value / safeMax) * 100, 4)}%` as `${number}%`,
    }));
  }, [journeyStats]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={agentDashboardStyles.container}>
        <View style={agentDashboardStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C5F2D" />
          <Text style={agentDashboardStyles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={agentDashboardStyles.container}>
      <View style={agentDashboardStyles.header}>
        <View style={agentDashboardStyles.headerContent}>
          <View style={agentDashboardStyles.headerTextContainer}>
            <Text style={agentDashboardStyles.headerTitle}>Admin Dashboard</Text>
            <Text style={agentDashboardStyles.headerSubtitle}>Oversight for agents and client assignments</Text>
          </View>
        </View>
        <TouchableOpacity style={agentDashboardStyles.logoutButton} onPress={handleLogout}>
          <Text style={agentDashboardStyles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={agentDashboardStyles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={agentDashboardStyles.section}>
          <Text style={agentDashboardStyles.sectionTitle}>API Pull Stats</Text>
          <Text style={agentDashboardStyles.sectionDescription}>Latest ingestion health and property coverage.</Text>

          <View style={agentDashboardStyles.pieChartContainer}>
            <Text style={agentDashboardStyles.chartTitle}>Received Progress (of Expected)</Text>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <G rotation={-90} origin="80, 80">
                <Circle
                  cx={80}
                  cy={80}
                  r={apiVolumeChart.radius}
                  stroke="#E8E8E8"
                  strokeWidth={apiVolumeChart.strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={80}
                  cy={80}
                  r={apiVolumeChart.radius}
                  stroke="#4A90E2"
                  strokeWidth={apiVolumeChart.strokeWidth}
                  fill="none"
                  strokeLinecap="butt"
                  strokeDasharray={`${apiVolumeChart.receivedStroke} ${apiVolumeChart.circumference}`}
                  strokeDashoffset={0}
                />
                <Circle
                  cx={80}
                  cy={80}
                  r={apiVolumeChart.radius}
                  stroke="#2C5F2D"
                  strokeWidth={apiVolumeChart.strokeWidth}
                  fill="none"
                  strokeLinecap="butt"
                  strokeDasharray={`${apiVolumeChart.remainingStroke} ${apiVolumeChart.circumference}`}
                  strokeDashoffset={-apiVolumeChart.receivedStroke}
                />
              </G>
            </Svg>

            <View style={agentDashboardStyles.chartLegend}>
              <View style={agentDashboardStyles.legendRow}>
                <View style={[agentDashboardStyles.legendSwatch, { backgroundColor: '#4A90E2' }]} />
                <Text style={agentDashboardStyles.legendText}>
                  Received: {apiVolumeChart.receivedWithinExpected.toLocaleString()} ({(apiVolumeChart.receivedPercent * 100).toFixed(1)}%)
                </Text>
              </View>
              <View style={agentDashboardStyles.legendRow}>
                <View style={[agentDashboardStyles.legendSwatch, { backgroundColor: '#2C5F2D' }]} />
                <Text style={agentDashboardStyles.legendText}>
                  Remaining: {apiVolumeChart.remainingExpected.toLocaleString()} ({(apiVolumeChart.remainingPercent * 100).toFixed(1)}%)
                </Text>
              </View>
              <Text style={agentDashboardStyles.legendText}>
                Expected total: {apiVolumeChart.expectedBase.toLocaleString()} | Raw received: {apiVolumeChart.received.toLocaleString()}
              </Text>
              {apiVolumeChart.overage > 0 ? (
                <Text style={agentDashboardStyles.legendText}>
                  Over expected by: {apiVolumeChart.overage.toLocaleString()}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EFEFEF' }}>
            <Text style={agentDashboardStyles.chartTitle}>Run Health Metrics</Text>
            {apiHealthBars.map((bar) => (
              <View key={bar.key} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: '#3D3D3D', fontWeight: '600' }}>{bar.label}</Text>
                  <Text style={{ fontSize: 13, color: '#3D3D3D', fontWeight: '700' }}>{bar.value.toLocaleString()}</Text>
                </View>
                <View style={{ height: 12, borderRadius: 999, backgroundColor: '#E9EDF2', overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 999, width: bar.widthPercent, backgroundColor: bar.color }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={agentDashboardStyles.section}>
          <Text style={agentDashboardStyles.sectionTitle}>Client Conversion & Engagement</Text>
          <Text style={agentDashboardStyles.sectionDescription}>
            Buyer-side lifecycle chart (active clients via is_active, plus inactive unsuccessful-buyer heuristic).
          </Text>

          <View style={{ marginTop: 14 }}>
            {clientJourneyBars.map((bar) => (
              <View key={bar.key} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: '#3D3D3D', fontWeight: '600' }}>{bar.label}</Text>
                  <Text style={{ fontSize: 13, color: '#3D3D3D', fontWeight: '700' }}>{bar.value.toLocaleString()}</Text>
                </View>
                <View style={{ height: 12, borderRadius: 999, backgroundColor: '#E9EDF2', overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 999, width: bar.widthPercent, backgroundColor: bar.color }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={agentDashboardStyles.section}>
          <Text style={agentDashboardStyles.sectionTitle}>Agent Assignments</Text>
          <Text style={agentDashboardStyles.sectionDescription}>Each agent with client request statuses.</Text>
        </View>

        <View style={agentDashboardStyles.requestsContainer}>
          {agents.map((agent) => (
            <View key={agent.id} style={agentDashboardStyles.requestCard}>
              <Text style={agentDashboardStyles.clientName}>{agent.name}</Text>
              <Text style={agentDashboardStyles.detailText}>{agent.email || agent.id}</Text>

              {agent.requests.length === 0 ? (
                <Text style={agentDashboardStyles.detailText}>No client records.</Text>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {agent.requests.map((req) => (
                    <View key={req.requestId} style={{ marginBottom: 8 }}>
                      <Text style={agentDashboardStyles.detailText}>{req.clientName}</Text>
                      <Text style={agentDashboardStyles.requestDate}>Status: {req.status} • {formatDate(req.createdAt, true)}</Text>
                      {req.activeOfferStatus ? (
                        <Text style={agentDashboardStyles.requestDate}>
                          Active Offer: {req.activeOfferStatus} • {req.activeOfferAddress || 'Property unavailable'}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={agentDashboardStyles.section}>
          <Text style={agentDashboardStyles.sectionTitle}>All Clients</Text>
          <Text style={agentDashboardStyles.sectionDescription}>
            Client list filter. Active is default.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => setClientListFilter('active')}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: clientListFilter === 'active' ? '#2C5F2D' : '#E9EDF2',
              }}
            >
              <Text style={{ color: clientListFilter === 'active' ? '#FFFFFF' : '#333333', fontSize: 12, fontWeight: '700' }}>
                Active
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setClientListFilter('inactive')}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: clientListFilter === 'inactive' ? '#2C5F2D' : '#E9EDF2',
              }}
            >
              <Text style={{ color: clientListFilter === 'inactive' ? '#FFFFFF' : '#333333', fontSize: 12, fontWeight: '700' }}>
                Inactive
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setClientListFilter('all')}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: clientListFilter === 'all' ? '#2C5F2D' : '#E9EDF2',
              }}
            >
              <Text style={{ color: clientListFilter === 'all' ? '#FFFFFF' : '#333333', fontSize: 12, fontWeight: '700' }}>
                All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={agentDashboardStyles.requestsContainer}>
          {filteredClients.map((client) => (
            <View key={client.id} style={agentDashboardStyles.requestCard}>
              <Text style={agentDashboardStyles.clientName}>{client.name}</Text>
              <Text style={agentDashboardStyles.detailText}>{client.email || client.id}</Text>
              <Text style={agentDashboardStyles.requestDate}>Status: {client.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          ))}
          {filteredClients.length === 0 ? (
            <View style={agentDashboardStyles.requestCard}>
              <Text style={agentDashboardStyles.detailText}>No clients in this filter.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
