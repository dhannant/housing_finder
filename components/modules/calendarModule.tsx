import { useCalendarEvents } from "@/hooks/useFunctions";
import type { CalendarEventRange } from "@/utils/interfaces";
import React, { useEffect, useMemo, useState } from "react";
import type { TextStyle } from "react-native";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useAuth } from "../../contexts/AuthContext";

type MarkedDates = {
  [date: string]: {
    customStyles?: {
      container?: {
        backgroundColor?: string;
        borderWidth?: number;
        borderColor?: string;
        borderRadius?: number;
      };
      text?: Pick<TextStyle, "color" | "fontWeight">;
    };
  };
};

interface CalendarModuleProps {
  role: "agent" | "client";
  activeOfferId?: string | null;
}

function getColorByOverlapCount(count: number): string {
  if (count >= 4) return "#FFC107";
  if (count === 3) return "#FFD54F";
  if (count === 2) return "#FFE082";
  return "#FFF9C4";
}

const CalendarModule: React.FC<CalendarModuleProps> = ({ role, activeOfferId }) => {
  type DayDetail = {
    id: string;
    title: string;
    type: "due_diligence" | "point";
    time?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  };

  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayDetail[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { user } = useAuth();

  // Only invoke the hook once the user is authenticated
  const effectiveRole = user?.uid ? role : null;
  const { data: calendarData, loading: calendarLoading, error: calendarError } = useCalendarEvents(effectiveRole, activeOfferId);

  // Build a flat, sorted list of events visible in the currently displayed month
  type MonthlyEvent = {
    sortDate: string;
    sortTime: string;
    title: string;
    typLabel: string;
    color: string;
    description?: string;
    detail: string;
  };

  const monthlyEvents = useMemo((): MonthlyEvent[] => {
    if (!calendarData) return [];
    const [year, month] = currentMonth.split("-").map(Number);
    const firstDay = `${currentMonth}-01`;
    const lastDay = `${currentMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

    const events: MonthlyEvent[] = [];

    for (const range of calendarData.ranges) {
      if (range.startDate <= lastDay && range.endDate >= firstDay) {
        events.push({
          sortDate: range.startDate < firstDay ? firstDay : range.startDate,
          sortTime: "00:00",
          title: range.title,
          typLabel: "Due Diligence",
          color: range.color,
          description: range.description,
          detail: `${range.startDate} – ${range.endDate}`,
        });
      }
    }

    for (const point of calendarData.points) {
      if (point.date >= firstDay && point.date <= lastDay) {
        events.push({
          sortDate: point.date,
          sortTime: point.time ?? "99:99",
          title: point.title,
          typLabel: point.type.charAt(0).toUpperCase() + point.type.slice(1),
          color: point.color,
          description: point.description,
          detail: point.time ? `${point.date} at ${point.time}` : point.date,
        });
      }
    }

    events.sort((a, b) => {
      const d = a.sortDate.localeCompare(b.sortDate);
      return d !== 0 ? d : a.sortTime.localeCompare(b.sortTime);
    });
    return events;
  }, [calendarData, currentMonth]);

  // Build markedDates whenever the server data changes
  useEffect(() => {
    if (!calendarData) return;

    const { ranges, points } = calendarData;

    // Count how many due-diligence ranges cover each date (for overlap shading)
    const dateOverlapCount: Record<string, number> = {};
    for (const range of ranges) {
      let current = new Date(range.startDate);
      const end = new Date(range.endDate);
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        dateOverlapCount[dateStr] = (dateOverlapCount[dateStr] || 0) + 1;
        current.setDate(current.getDate() + 1);
      }
    }

    // Group point events by date so we can draw a border
    const dateDots: Record<string, { key: string; color: string }[]> = {};
    for (const point of points) {
      if (!dateDots[point.date]) dateDots[point.date] = [];
      dateDots[point.date].push({ key: point.sourceId, color: point.color });
    }

    const allDates = new Set([...Object.keys(dateOverlapCount), ...Object.keys(dateDots)]);
    const marks: MarkedDates = {};

    for (const dateStr of allDates) {
      const overlap = dateOverlapCount[dateStr] || 0;
      const dots = dateDots[dateStr] || [];
      const bgColor = overlap > 0 ? getColorByOverlapCount(overlap) : undefined;

      marks[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: bgColor,
            borderWidth: dots.length > 0 ? 2 : 0,
            borderColor: dots.length > 0 ? dots[0].color : undefined,
            borderRadius: 16,
          },
          text: {
            color: bgColor ? "#1a1a1a" : undefined,
            fontWeight: dots.length > 0 ? "700" : undefined,
          },
        },
      };
    }

    setMarkedDates(marks);
  }, [calendarData]);

  function isDateWithinRange(date: string, range: CalendarEventRange): boolean {
    return date >= range.startDate && date <= range.endDate;
  }

  function handleDayPress(day: { dateString: string }) {
    const dayRanges = (calendarData?.ranges ?? [])
      .filter((range) => isDateWithinRange(day.dateString, range))
      .map((range): DayDetail => ({
        id: `range-${range.sourceId}`,
        title: range.title,
        type: "due_diligence",
        description: range.description,
        startDate: range.startDate,
        endDate: range.endDate,
      }));

    const dayPoints = (calendarData?.points ?? [])
      .filter((p) => p.date === day.dateString)
      .map((point): DayDetail => ({
        id: `point-${point.sourceId}-${point.type}`,
        title: point.title,
        type: "point",
        description: point.description,
        time: point.time,
      }));

    setSelectedDay(day.dateString);
    setSelectedDayDetails([...dayRanges, ...dayPoints]);
    setModalVisible(true);
  }

  function renderDayDetails() {
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 8, padding: 20, minWidth: 300 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>
              Details for {selectedDay}
            </Text>
            {selectedDayDetails.length === 0 ? (
              <Text>No events for this day.</Text>
            ) : (
              selectedDayDetails.map((detail, idx) => (
                <View key={detail.id || idx} style={{ marginBottom: 8 }}>
                  <Text style={{ fontWeight: "bold" }}>{detail.title}</Text>
                  {detail.type === "due_diligence" && detail.startDate && detail.endDate ? (
                    <Text>Period: {detail.startDate} to {detail.endDate}</Text>
                  ) : null}
                  {detail.time ? <Text>Time: {detail.time}</Text> : null}
                  {detail.description
                    ? detail.description.split("\n").map((line, i) => (
                        <Text key={i}>{line}</Text>
                      ))
                    : null}
                </View>
              ))
            )}
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#1976D2", marginTop: 8 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const hasNoEvents =
    !calendarData ||
    (calendarData.ranges.length === 0 && calendarData.points.length === 0);

  // Month label for the list heading (e.g. "April 2026")
  const monthLabel = (() => {
    const [year, month] = currentMonth.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 8 }}>Offer Calendar</Text>
      {calendarError ? (
        <Text style={{ color: "#F44336", marginBottom: 8 }}>
          Failed to load calendar: {calendarError.message}
        </Text>
      ) : null}
      <Calendar
        markedDates={markedDates}
        markingType="custom"
        onDayPress={handleDayPress}
        onMonthChange={(month: { year: number; month: number }) => {
          setCurrentMonth(
            `${month.year}-${String(month.month).padStart(2, "0")}`
          );
        }}
      />
      {renderDayDetails()}
      {!calendarLoading && hasNoEvents && !calendarError && (
        <Text style={{ marginTop: 16, color: "#888" }}>No offer events found for your account.</Text>
      )}

      {/* Monthly appointments list */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 12, color: "#1A1A1A" }}>
          Appointments — {monthLabel}
        </Text>
        {calendarLoading ? (
          <Text style={{ color: "#888" }}>Loading…</Text>
        ) : monthlyEvents.length === 0 ? (
          <Text style={{ color: "#888" }}>No appointments this month.</Text>
        ) : (
          monthlyEvents.map((evt, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                backgroundColor: "#fff",
                borderRadius: 8,
                marginBottom: 10,
                padding: 12,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              {/* Color badge */}
              <View
                style={{
                  width: 4,
                  borderRadius: 2,
                  backgroundColor: evt.color,
                  alignSelf: "stretch",
                  marginRight: 12,
                }}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <Text style={{ fontWeight: "700", fontSize: 14, color: "#1A1A1A", flex: 1 }}>{evt.title}</Text>
                  <View style={{
                    backgroundColor: evt.color + "33",
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginLeft: 8,
                  }}>
                    <Text style={{ fontSize: 11, color: evt.color, fontWeight: "600" }}>{evt.typLabel}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: "#555", marginBottom: evt.description ? 4 : 0 }}>{evt.detail}</Text>
                {evt.description
                  ? evt.description.split("\n").map((line, i) => (
                      <Text key={i} style={{ fontSize: 12, color: "#666" }}>{line}</Text>
                    ))
                  : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default CalendarModule;

