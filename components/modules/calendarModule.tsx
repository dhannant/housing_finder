import { fetchOfferDatabyID } from "@/utils/functions";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useAuth } from "../../contexts/AuthContext";

type MarkedDates = {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    color?: string;
    startingDay?: boolean;
    endingDay?: boolean;
    activeOpacity?: number;
  };
};

interface Offer {
  id: string;
  closingDate?: string;
  dueDiligenceStart?: string;
  dueDiligenceEnd?: string;
  inspectionDate?: string;
}

interface CalendarModuleProps {
  role: "agent" | "client";
  activeOfferId?: string | null;
}

function formatDate(date: any): string | undefined {
  if (!date) return undefined;
  if (typeof date === "string") return date.split("T")[0];
  if (date instanceof Date) return date.toISOString().split("T")[0];
  if (date.seconds) return new Date(date.seconds * 1000).toISOString().split("T")[0];
  return undefined;
}

const CalendarModule: React.FC<CalendarModuleProps> = ({ role, activeOfferId }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuth();

  function getColorByOverlapCount(count: number) {
    // More overlaps = darker color
    if (count === 1) return '#FFF9C4';
    if (count === 2) return '#FFE082';
    if (count === 3) return '#FFD54F';
    if (count >= 4) return '#FFC107';
    return '#FFF9C4';
  }

  useEffect(() => {
    const fetchOffers = async () => {
      if (role === "agent") {
        const db = getFirestore();
        const q = query(collection(db, "clientOffers"), where("agentId", "==", user?.uid));
        const snapshot = await getDocs(q);
        const offers: Offer[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            closingDate: formatDate(data.closingDate),
            dueDiligenceStart: formatDate(data.dueDiligenceStart),
            dueDiligenceEnd: formatDate(data.dueDiligenceEnd),
            inspectionDate: formatDate(data.inspectionDate),
          };
        });
        setOffers(offers);
        const dateOverlapCount: { [date: string]: number } = {};
        const dateDots: { [date: string]: { key: string; color: string }[] } = {};
        offers.forEach((offer, idx) => {
          if (offer.dueDiligenceStart && offer.dueDiligenceEnd) {
            let current = new Date(offer.dueDiligenceStart);
            const endDate = new Date(offer.dueDiligenceEnd);
            while (current <= endDate) {
              const dateStr = current.toISOString().split('T')[0];
              dateOverlapCount[dateStr] = (dateOverlapCount[dateStr] || 0) + 1;
              current.setDate(current.getDate() + 1);
            }
          }
          if (offer.inspectionDate) {
            if (!dateDots[offer.inspectionDate]) dateDots[offer.inspectionDate] = [];
            dateDots[offer.inspectionDate].push({ key: `inspection${idx}`, color: '#1976D2' });
          }
          if (offer.closingDate) {
            if (!dateDots[offer.closingDate]) dateDots[offer.closingDate] = [];
            dateDots[offer.closingDate].push({ key: `closing${idx}`, color: '#F44336' });
          }
        });
        const marks: MarkedDates = {};
        Object.keys({ ...dateOverlapCount, ...dateDots }).forEach(dateStr => {
          const overlap = dateOverlapCount[dateStr] || 0;
          const dots = dateDots[dateStr] || [];
          let color: string | undefined = undefined;
          if (overlap > 1) {
            color = getColorByOverlapCount(overlap);
          } else if (overlap === 1) {
            color = '#FFF9C4'; // light yellow for single period
          }
          marks[dateStr] = {
            startingDay: false,
            endingDay: false,
            color,
            marked: dots.length > 0,
            dotColor: dots.length > 0 ? dots[0].color : undefined,
          };
        });
        setMarkedDates(marks);
      } else if (role === "client" && activeOfferId) {
        const offerData = await fetchOfferDatabyID(activeOfferId);
        if (!offerData) {
          setOffers([]);
          setMarkedDates({});
          return;
        }
        setOffers([{ 
          id: offerData.offerId || activeOfferId || '',
          closingDate: formatDate(offerData.closingDate),
          dueDiligenceStart: formatDate(offerData.dueDiligenceStart),
          dueDiligenceEnd: formatDate(offerData.dueDiligenceEnd),
          inspectionDate: formatDate(offerData.inspectionDate)
        }]);
        const dateOverlapCount: { [date: string]: number } = {};
        const dateDots: { [date: string]: { key: string; color: string }[] } = {};
        const offer = offerData;
        if (offer.dueDiligenceStart && offer.dueDiligenceEnd) {
          let current = new Date(formatDate(offer.dueDiligenceStart)!);
          const endDate = new Date(formatDate(offer.dueDiligenceEnd)!);
          while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            dateOverlapCount[dateStr] = (dateOverlapCount[dateStr] || 0) + 1;
            current.setDate(current.getDate() + 1);
          }
        }
        if (offer.inspectionDate) {
          const dateStr = formatDate(offer.inspectionDate)!;
          if (!dateDots[dateStr]) dateDots[dateStr] = [];
          dateDots[dateStr].push({ key: 'inspection', color: '#1976D2' });
        }
        if (offer.closingDate) {
          const dateStr = formatDate(offer.closingDate)!;
          if (!dateDots[dateStr]) dateDots[dateStr] = [];
          dateDots[dateStr].push({ key: 'closing', color: '#F44336' });
        }
        const marks: MarkedDates = {};
        Object.keys({ ...dateOverlapCount, ...dateDots }).forEach(dateStr => {
          const overlap = dateOverlapCount[dateStr] || 0;
          const dots = dateDots[dateStr] || [];
          let color: string | undefined = undefined;
          if (overlap > 1) {
            color = getColorByOverlapCount(overlap);
          } else if (overlap === 1) {
            color = '#FFF9C4'; // light yellow for single period
          }
          marks[dateStr] = {
            startingDay: false,
            endingDay: false,
            color,
            marked: dots.length > 0,
            dotColor: dots.length > 0 ? dots[0].color : undefined,
          };
        });
        setMarkedDates(marks);
      } else {
        setOffers([]);
        setMarkedDates({});
      }
    };
    if (user?.uid) fetchOffers();
  }, [role, user, activeOfferId]);

  // Handler for day press
  function handleDayPress(day: { dateString: string }) {
    const dateStr = day.dateString;
    const details: any[] = [];
    // Use consistent date format for comparison
    offers.forEach(offer => {
      if (offer.dueDiligenceStart && offer.dueDiligenceEnd) {
        const start = formatDate(offer.dueDiligenceStart);
        const end = formatDate(offer.dueDiligenceEnd);
        if (dateStr >= start! && dateStr <= end!) {
          details.push({ type: 'Due Diligence', start, end });
        }
      }
      if (offer.inspectionDate && formatDate(offer.inspectionDate) === dateStr) {
        details.push({ type: 'Inspection', date: dateStr });
      }
      if (offer.closingDate && formatDate(offer.closingDate) === dateStr) {
        details.push({ type: 'Closing', date: dateStr });
      }
    });
    setSelectedDay(dateStr);
    setSelectedDayDetails(details);
    setModalVisible(true);
  }

  // Modal for day details
  function renderDayDetails() {
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 20, minWidth: 300 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Details for {selectedDay}</Text>
            {selectedDayDetails.length === 0 ? (
              <Text>No events or periods for this day.</Text>
            ) : (
              selectedDayDetails.map((detail, idx) => (
                <View key={idx} style={{ marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold' }}>{detail.type}</Text>
                  {detail.start && detail.end && <Text>Period: {detail.start} to {detail.end}</Text>}
                  {detail.date && <Text>Date: {detail.date}</Text>}
                </View>
              ))
            )}
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#1976D2', marginTop: 8 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View>
      <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 8 }}>Offer Calendar</Text>
      <Calendar
        markedDates={markedDates}
        markingType="period"
        onDayPress={handleDayPress}
      />
      {renderDayDetails()}
      {offers.length === 0 && (
        <Text style={{ marginTop: 16, color: "#888" }}>No offer events found for your account.</Text>
      )}
    </View>
  );
};

export default CalendarModule;
