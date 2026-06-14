import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const C = {
  orange: '#FF6B2C',
  night: '#1A1A2E',
  muted: '#5A5A7A',
  cream: '#FFF5EE',
  border: '#EBEBEB',
  lightBg: '#F7F7FA',
};

const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CustomDateTimePicker({ visible, initialDate, onClose, onConfirm }) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  
  // Date states
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());

  // Time states
  const [hour, setHour] = useState(currentDate.getHours() % 12 || 12);
  const [minute, setMinute] = useState(currentDate.getMinutes());
  const [period, setPeriod] = useState(currentDate.getHours() >= 12 ? 'PM' : 'AM');

  // Reset state when visible or initialDate changes
  useEffect(() => {
    if (visible) {
      const d = initialDate || new Date();
      setCurrentDate(d);
      setSelectedDay(d.getDate());
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
      setHour(d.getHours() % 12 || 12);
      setMinute(Math.floor(d.getMinutes() / 5) * 5); // Round to nearest 5
      setPeriod(d.getHours() >= 12 ? 'PM' : 'AM');
    }
  }, [visible, initialDate]);

  const changeMonth = (offset) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    
    // Ensure selected day is valid in new month
    const daysInNewMonth = getDaysInMonth(newMonth, newYear);
    if (selectedDay > daysInNewMonth) {
      setSelectedDay(daysInNewMonth);
    }
  };

  const handleConfirm = () => {
    let finalHour = hour;
    if (period === 'PM' && hour !== 12) finalHour += 12;
    if (period === 'AM' && hour === 12) finalHour = 0;

    const finalDate = new Date(currentYear, currentMonth, selectedDay, finalHour, minute);
    onConfirm(finalDate);
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const renderCalendar = () => {
    const blanks = Array.from({ length: firstDay }, (_, i) => (
      <View key={`blank-${i}`} style={styles.dayCell} />
    ));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const isSelected = selectedDay === dayNum;
      
      return (
        <TouchableOpacity
          key={`day-${dayNum}`}
          style={[styles.dayCell, isSelected && styles.selectedDayCell]}
          onPress={() => setSelectedDay(dayNum)}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
            {dayNum}
          </Text>
        </TouchableOpacity>
      );
    });

    return [...blanks, ...days];
  };

  const generateTimeOptions = (type) => {
    const isHour = type === 'hour';
    const max = isHour ? 12 : 55;
    const step = isHour ? 1 : 5;
    const options = [];
    for (let i = isHour ? 1 : 0; i <= max; i += step) {
      options.push(i);
    }
    return options;
  };

  if (!visible) return null;

  const Glass = Platform.OS === 'ios' ? BlurView : View;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Glass intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Schedule Call</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
              <Feather name="chevron-left" size={20} color={C.night} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
              <Feather name="chevron-right" size={20} color={C.night} />
            </TouchableOpacity>
          </View>

          {/* Days Header */}
          <View style={styles.daysHeader}>
            {DAYS.map(day => (
              <Text key={day} style={styles.dayHeaderText}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {renderCalendar()}
          </View>

          <View style={styles.divider} />

          {/* Time Selector */}
          <View style={styles.timeSection}>
            <Text style={styles.timeTitle}>Time</Text>
            <View style={styles.timePickersRow}>
              
              {/* Hour */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll} contentContainerStyle={styles.timeScrollContent}>
                {generateTimeOptions('hour').map(h => (
                  <TouchableOpacity key={`h-${h}`} onPress={() => setHour(h)} style={[styles.timeOption, hour === h && styles.selectedTimeOption]}>
                    <Text style={[styles.timeText, hour === h && styles.selectedTimeText]}>
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.colon}>:</Text>

              {/* Minute */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll} contentContainerStyle={styles.timeScrollContent}>
                {generateTimeOptions('minute').map(m => (
                  <TouchableOpacity key={`m-${m}`} onPress={() => setMinute(m)} style={[styles.timeOption, minute === m && styles.selectedTimeOption]}>
                    <Text style={[styles.timeText, minute === m && styles.selectedTimeText]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* AM/PM */}
              <View style={styles.periodToggle}>
                <TouchableOpacity onPress={() => setPeriod('AM')} style={[styles.periodBtn, period === 'AM' && styles.selectedPeriodBtn]}>
                  <Text style={[styles.periodText, period === 'AM' && styles.selectedPeriodText]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPeriod('PM')} style={[styles.periodBtn, period === 'PM' && styles.selectedPeriodBtn]}>
                  <Text style={[styles.periodText, period === 'PM' && styles.selectedPeriodText]}>PM</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: C.night,
  },
  closeBtn: {
    padding: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.night,
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: C.lightBg,
    borderRadius: 12,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: C.muted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  selectedDayCell: {
    backgroundColor: C.orange,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.night,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 20,
  },
  timeSection: {
    marginBottom: 20,
  },
  timeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeScroll: {
    flex: 1,
    backgroundColor: C.lightBg,
    borderRadius: 12,
  },
  timeScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  timeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  selectedTimeOption: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.muted,
  },
  selectedTimeText: {
    color: C.orange,
    fontWeight: '800',
  },
  colon: {
    fontSize: 18,
    fontWeight: '800',
    color: C.night,
    marginHorizontal: 8,
  },
  periodToggle: {
    marginLeft: 12,
    backgroundColor: C.lightBg,
    borderRadius: 12,
    padding: 4,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectedPeriodBtn: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
  },
  selectedPeriodText: {
    color: C.night,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: C.lightBg,
  },
  cancelBtnText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: C.orange,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
