import { mapStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import { PropertyDetails } from '@/utils/interfaces';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { db } from '../../components/firebaseConfig';

function toHttpsUrl(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

function getRdcpixPhotoCandidates(url: string | null | undefined): string[] {
  if (!url) return [];
  const cleaned = toHttpsUrl(url.trim().replace(/"+$/g, ''));
  if (!cleaned.includes('rdcpix.com')) return [cleaned];
  const [base, query] = cleaned.split('?');
  const withQuery = (v: string) => (query ? `${v}?${query}` : v);
  const candidates: string[] = [];
  const webp1280 = base.replace(/-m(\d+)s\.jpg$/i, '-m$1rd-w1280_h960.webp');
  const nonSmallJpg = base.replace(/-m(\d+)s\.jpg$/i, '-m$1.jpg');
  if (webp1280 !== base) candidates.push(withQuery(webp1280));
  if (nonSmallJpg !== base) candidates.push(withQuery(nonSmallJpg));
  candidates.push(withQuery(base));
  return Array.from(new Set(candidates));
}

function toPhotoArray(photos: any, primaryPhoto: string | null): { href: string }[] {
  if (Array.isArray(photos) && photos.length > 0) {
    const normalized = photos
      .map((p: any) => {
        if (typeof p === 'string') return { href: p };
        if (p && typeof p.href === 'string') return { href: p.href };
        return null;
      })
      .filter(Boolean) as { href: string }[];
    if (normalized.length > 0) return normalized;
  }
  return primaryPhoto ? [{ href: primaryPhoto }] : [];
}


const PropertyDetailsScreen = () => {
  const { propertyId } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const propertyIdStr = Array.isArray(propertyId) ? propertyId[0] : propertyId;
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPropertyDetails, setShowPropertyDetails] = useState(true);
  const [showSchools, setShowSchools] = useState(false);
  const [showMortgage, setShowMortgage] = useState(false);
  const [showTaxHistory, setShowTaxHistory] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [failedEnhancedPhotoUrls, setFailedEnhancedPhotoUrls] = useState<Record<string, true>>({});
  const [showCommunity, setShowCommunity] = useState(false);
  const [showLocal, setShowLocal] = useState(false);

  const photos = useMemo(() => {
    if (!propertyDetails) return [] as { href: string }[];
    return toPhotoArray(propertyDetails.photos, (propertyDetails as any).primary_photo?.href ?? null);
  }, [propertyDetails]);

  useEffect(() => {
    if (authLoading) return;
    if (!propertyIdStr) return;

    const fetchProperty = async () => {
      setLoading(true);
      // console.log("[PropertyDetailsScreen] Getting Property Details.", propertyIdStr)
      try {
        // console.log('[PropertyDetailsScreen] Checking for property details.', propertyIdStr)
        const query = doc(db,'propertyDetails', propertyIdStr);
        const snap = await getDoc(query);

        if (snap.exists()) {
          const raw = snap.data() as any;
          const propertyData = (raw?.data ?? raw) as PropertyDetails;
          // console.log('[PropertyDetailsScreen] Property details found:', propertyData);
          setPropertyDetails(propertyData);
        } else {
          const idToken = await user?.getIdToken();
          const fnResponse = await fetch(
            'https://us-central1-leading-edge-realty-app.cloudfunctions.net/getPropertyDetailsHttp',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({ propertyIdStr }),
            }
          );
          if (!fnResponse.ok) {
            const errText = await fnResponse.text();
            throw new Error(`Property details fetch failed: ${fnResponse.status} ${errText}`);
          }
          const raw = await fnResponse.json();
          const fetchedDetails = (raw?.data ?? raw) as PropertyDetails;
          setPropertyDetails(fetchedDetails);
        }


      } catch (error) {
        console.error("[PropertyDetailsScreen] Error in fetching property details:", error);
      }
      setLoading(false);
    };
    fetchProperty();
  }, [propertyIdStr, authLoading, user]);

  if (loading || authLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }
  if (!propertyDetails) {
    return <Text style={{ flex: 1, textAlign: 'center', marginTop: 40 }}>Property not found.</Text>;
  }


  const schools = [...(propertyDetails.nearby_schools?.schools ?? [])].sort((a, b) => {
    const aDist = a.distance_in_miles ?? Infinity;
    const bDist = b.distance_in_miles ?? Infinity;
    return aDist - bDist;
  });
  const estimate = propertyDetails.mortgage?.estimate;
  const monthlyPaymentDetails = estimate?.monthly_payment_details ?? [];
  const averageRates = estimate?.average_rates ?? [];
  const taxHistory = (propertyDetails as any).tax_history ?? [];
  const taxChartData = [...taxHistory]
    .filter((item: any) => typeof item?.year === 'number' && typeof item?.tax === 'number')
    .sort((a: any, b: any) => a.year - b.year)
    .slice(-10);
  const maxTaxValue = taxChartData.reduce((max: number, item: any) => Math.max(max, item.tax || 0), 0);
  const lineChartWidth = 320;
  const lineChartHeight = 150;
  const lineChartLeftPadding = 6;
  const lineChartRightPadding = 6;
  const lineChartTopPadding = 18;
  const lineChartBottomPadding = 28;
  const linePoints = taxChartData.map((item: any, index: number) => {
    const x = taxChartData.length > 1
      ? lineChartLeftPadding + (index / (taxChartData.length - 1)) * (lineChartWidth - lineChartLeftPadding - lineChartRightPadding)
      : lineChartWidth / 2;
    const ratio = maxTaxValue > 0 ? (item.tax || 0) / maxTaxValue : 0;
    const y = (lineChartHeight - lineChartBottomPadding) - ratio * (lineChartHeight - lineChartTopPadding - lineChartBottomPadding);
    return { x, y, item };
  });
  const linePointsString = linePoints.map((p) => `${p.x},${p.y}`).join(' ');
  
  const community = propertyDetails.community;
  const flood = propertyDetails.flood ?? propertyDetails.local?.flood;
  const noise = propertyDetails.noise ?? (propertyDetails.local as any)?.noise;
  const hoa = (propertyDetails as any).hoa;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Photo Gallery */}
        {(() => {
          const clampedIndex = Math.min(currentPhotoIndex, Math.max(photos.length - 1, 0));
          const currentHref = photos[clampedIndex]?.href ?? null;
          const candidates = getRdcpixPhotoCandidates(currentHref);
          const photoUri = candidates.find((uri) => !failedEnhancedPhotoUrls[uri]) ?? candidates[0] ?? null;
          return photos.length > 0 ? (
            <View style={[mapStyles.photoContainer, { height: 300 }]}>
              <Image
                source={{ uri: photoUri ?? photos[clampedIndex].href }}
                style={mapStyles.photo}
                resizeMode="contain"
                onError={() => {
                  if (!photoUri) return;
                  setFailedEnhancedPhotoUrls((prev) => {
                    if (prev[photoUri]) return prev;
                    return { ...prev, [photoUri]: true };
                  });
                }}
              />
              {photos.length > 1 && (
                <View style={mapStyles.photoNavigation}>
                  <TouchableOpacity
                    onPress={() => setCurrentPhotoIndex(Math.max(0, clampedIndex - 1))}
                    disabled={clampedIndex === 0}
                    style={[mapStyles.navButton, clampedIndex === 0 && mapStyles.navButtonDisabled]}
                  >
                    <Text style={mapStyles.navButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={mapStyles.photoCounter}>{clampedIndex + 1} / {photos.length}</Text>
                  <TouchableOpacity
                    onPress={() => setCurrentPhotoIndex(Math.min(photos.length - 1, clampedIndex + 1))}
                    disabled={clampedIndex === photos.length - 1}
                    style={[mapStyles.navButton, clampedIndex === photos.length - 1 && mapStyles.navButtonDisabled]}
                  >
                    <Text style={mapStyles.navButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={mapStyles.noPhotoContainer}>
              <Text style={mapStyles.noPhotoText}>No photos available</Text>
            </View>
          );
        })()}
        {/* Property Details (Expanded by default) */}
        <TouchableOpacity onPress={() => setShowPropertyDetails((v) => !v)} style={{ padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Property Details {showPropertyDetails ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showPropertyDetails && (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{propertyDetails.location?.address?.line || 'Address not available'}</Text>
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>{propertyDetails.location?.address?.city}, {propertyDetails.location?.address?.state_code} {propertyDetails.location?.address?.postal_code}</Text>
            <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 8 }}>${propertyDetails.list_price?.toLocaleString() || 'N/A'}</Text>
            <Text style={{ fontSize: 16, marginBottom: 8 }}>{propertyDetails.beds || propertyDetails.description?.beds} Beds • {propertyDetails.baths || propertyDetails.description?.baths} Baths • {propertyDetails.sqft || propertyDetails.description?.sqft} Sqft</Text>
            {/* Status badges */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {propertyDetails.flags?.is_new_construction && <Text style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>New Construction</Text>}
              {propertyDetails.flags?.is_plan && <Text style={{ backgroundColor: '#e3f2fd', color: '#1565c0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>Ready to Build</Text>}
            </View>
            {/* Branding */}
            {(propertyDetails.branding ?? []).length > 0 && (
              <Text style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Builder: {propertyDetails.branding?.[0]?.name}</Text>
            )}
            {/* Favorite & Showing Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
                <Ionicons name="heart-outline" size={20} color="#e74c3c" />
                <Text style={{ marginLeft: 8, color: '#333', fontWeight: '600' }}>Save as Favorite</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
                <Ionicons name="calendar-outline" size={20} color="#2980b9" />
                <Text style={{ marginLeft: 8, color: '#333', fontWeight: '600' }}>Request Showing</Text>
              </TouchableOpacity>
            </View>
            {/* Details List */}
            <View style={{ marginBottom: 24 }}>
              {(propertyDetails.details ?? []).length > 0 && (propertyDetails.details ?? []).map((d, idx) => (
                <View key={idx} style={{ marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold' }}>{d.category}</Text>
                  {d.text && d.text.map((t, i) => (
                    <Text key={i} style={{ color: '#444' }}>{t}</Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Community Section (Collapsed by default) */}
        <TouchableOpacity onPress={() => setShowCommunity((v) => !v)} style={{ padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Community Information {showCommunity ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showCommunity && (community?.name || community?.description) && (
          <View style={{ padding: 16 }}>
            
          </View>
        )}

        {/* Schools Section (Collapsed by default) */}
        <TouchableOpacity onPress={() => setShowSchools((v) => !v)} style={{ padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Schools {showSchools ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showSchools && schools.length > 0 && (
          <View style={{ padding: 16, gap: 12 }}>
            {schools.map((school, idx) => (
              <View key={idx} style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 14,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 1,
                borderColor: '#eee',
              }}>
                {/* Name + Rating row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, flex: 1, marginRight: 8 }}>{school.name}</Text>
                  {school.rating != null && (
                    <View style={{
                      backgroundColor: '#e0e0e0',
                      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
                    }}>
                      <Text style={{ color: '#444', fontWeight: '700', fontSize: 13 }}>★ {school.rating}</Text>
                    </View>
                  )}
                </View>
                {/* Detail pills row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {school.funding_type && (
                    <View style={{
                      backgroundColor: school.funding_type.toLowerCase() === 'private' ? '#1e3a5f' : '#f5f5f5',
                      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 12, textTransform: 'capitalize', color: school.funding_type.toLowerCase() === 'private' ? '#fff' : '#555' }}>{school.funding_type}</Text>
                    </View>
                  )}
                  {school.grades?.length > 0 && (
                    <View style={{ backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, color: '#3a5bc7' }}>Grades: {school.grades.join(', ')}</Text>
                    </View>
                  )}
                  {school.distance_in_miles != null && (
                    <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, color: '#555' }}>{school.distance_in_miles} mi away</Text>
                    </View>
                  )}
                  {school.student_count != null && (
                    <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, color: '#555' }}>{school.student_count} students</Text>
                    </View>
                  )}
                </View>
                {school.district?.name && (
                  <Text style={{ fontSize: 12, color: '#888' }}>District: {school.district.name}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Mortgage Section (Collapsed by default) */}
        <TouchableOpacity onPress={() => setShowMortgage((v) => !v)} style={{ padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Mortgage {showMortgage ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showMortgage && (
          <View style={{ padding: 16 }}>
            {/* Mortgage data */}
            {estimate && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Loan Amount: ${estimate.loan_amount?.toLocaleString() ?? 'N/A'}</Text>
                <Text>Monthly Payment: ${estimate.monthly_payment?.toLocaleString() ?? 'N/A'}</Text>
                <Text>Total Payment: ${estimate.total_payment?.toLocaleString() ?? 'N/A'}</Text>
                <Text>Down Payment: ${estimate.down_payment?.toLocaleString() ?? 'N/A'}</Text>
              </View>
            )}
            {monthlyPaymentDetails.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Monthly Payment Breakdown:</Text>
                {monthlyPaymentDetails.map((item, idx) => (
                  <Text key={idx}>{item.display_name}: ${item.amount?.toLocaleString() ?? 'N/A'}</Text>
                ))}
              </View>
            )}
            {averageRates.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Average Rates:</Text>
                {averageRates.map((rate, idx) => (
                  <Text key={idx}>{rate.loan_type?.loan_id}: {rate.rate ? (rate.rate * 100).toFixed(2) + '%' : 'N/A'}</Text>
                ))}
              </View>
            )}
            {propertyDetails.mortgage?.rates_url && (
              <Text style={{ color: '#2980b9', marginTop: 8 }}>More rates: {propertyDetails.mortgage.rates_url}</Text>
            )}
          </View>
        )}

        {/* Tax History Section (Collapsed by default) */}
        <TouchableOpacity onPress={() => setShowTaxHistory((v) => !v)} style={{ padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Tax History {showTaxHistory ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showTaxHistory && taxHistory.length > 0 && (
          <View style={{ padding: 16 }}>
            {taxChartData.length > 0 && (
              <View style={{
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#eee',
                borderRadius: 12,
                padding: 10,
                marginBottom: 14,
              }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>Tax Trend</Text>
                <Svg width="100%" height={lineChartHeight} viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`}>
                  {linePoints.map((point, idx) => {
                    const shouldShowValue = idx % 2 === 0 || idx === linePoints.length - 1;
                    return (
                      <View key={idx}>
                        <Line
                          x1={point.x}
                          y1={lineChartTopPadding}
                          x2={point.x}
                          y2={lineChartHeight - lineChartBottomPadding + 6}
                          stroke="#d9e2ec"
                          strokeWidth="1"
                        />
                        {shouldShowValue && (
                          <SvgText
                            x={point.x}
                            y={Math.max(12, point.y - 8)}
                            fontSize="10"
                            fill="#5b6570"
                            textAnchor="middle"
                          >
                            ${Math.round(point.item.tax).toLocaleString()}
                          </SvgText>
                        )}
                        <SvgText
                          x={point.x}
                          y={lineChartHeight - 6}
                          fontSize="10"
                          fill="#6b7280"
                          textAnchor="middle"
                        >
                          {point.item.year}
                        </SvgText>
                      </View>
                    );
                  })}
                  <Polyline
                    points={linePointsString}
                    fill="none"
                    stroke="#1f5e9c"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {linePoints.map((p, idx) => (
                    <Circle key={idx} cx={p.x} cy={p.y} r="3" fill="#1f5e9c" />
                  ))}
                </Svg>
                <Text style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  Showing the last {taxChartData.length} years of available tax data.
                </Text>
              </View>
            )}
            {/* Tax history text data */}
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ flex: 1, fontWeight: 'bold' }}>Year</Text>
              <Text style={{ flex: 1, fontWeight: 'bold' }}>Tax</Text>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>Assessment</Text>
            </View>
            {taxHistory.map((item: any, idx: number) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <Text style={{ flex: 1 }}>{item.year}</Text>
              <Text style={{ flex: 1 }}>${item.tax?.toLocaleString() ?? 'N/A'}</Text>
              <Text style={{ flex: 2 }}>Bldg: ${item.assessment?.building?.toLocaleString() ?? 'N/A'}, {'\n'}
                                        Land: ${item.assessment?.land?.toLocaleString() ?? 'N/A'}, {'\n'}
                                        <Text style={{fontWeight: 'bold' }}>Total: ${item.assessment?.total?.toLocaleString() ?? 'N/A'}</Text></Text>
            </View>
            ))}
          </View>
        )}
        {/*
          Notes:
          - Property Details is expanded by default, others are collapsed.
          - Each section can be toggled by tapping the header.
          - Add more sections as needed using the same pattern.
          - For full type safety, update PropertyDetails interface in utils/interfaces.ts.
        */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PropertyDetailsScreen;
