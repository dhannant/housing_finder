import ClientFavoritesList from '@/components/modules/ClientFavoritesListModule';
import { useLocalSearchParams } from 'expo-router';

export default function AgentClientFavorites() {
  const { clientId } = useLocalSearchParams();
  return <ClientFavoritesList clientId={clientId}/>;
}