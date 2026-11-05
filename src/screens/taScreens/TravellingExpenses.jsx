import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  Alert,
  FlatList,
  Modal,
} from 'react-native';

import CustomActionSheetPicker from '../../TaComponents/pickers/ActionSheetPicker';

import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import {
  useLazyGetTravelExpenseQuery,
  useTravelSubmitMutation,
  useApproveTravelExpenseMutation,
  useDeleteTravelExpenseMutation,
  useDeleteLodgingDependentMutation,
  useLazyCommonDropDownGetQuery,
  useLazySearchHsnQuery,
  useLazyValidateSupplierGstQuery,
  useLazyGetTourGradeDetailsQuery,
  useLazyGetExpenseDetailsQuery,
} from '../../redux/rtk_query/apiSlice';

import { useNavigation } from '@react-navigation/native';

import { getCustomColors } from '../../styles/CustomColors';

import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from '../../styles/Metrics';

import * as styless from '../../styles/StyleSheet';

import { Fonts } from '../../styles/Fonts';

import {
  setTravelExpenseDetails,
  clearTravelExpenseDetails,
} from '../../redux/slices/travelExpenseDetailsSlice';

import ToastMessage from '../../TaComponents/toast/ToastMessage';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

const SUPPLIER_GST_VALIDATE_API =
  'https://kvbapi.vsolv.co.in/venserv/validate';

const HSN_SEARCH_API = 'https://kvbapi.vsolv.co.in/mstserv/search_hsn';

const YES_NO_OPTIONS = [
  { name: 'Yes', value: '1' },
  { name: 'No', value: '0' },
];

const ACTUAL_MODE_OPTIONS = [
  { name: 'Road', value: 'Road' },
  { name: 'Train', value: 'Train' },
  { name: 'Air', value: 'Air' },
  { name: 'Sea', value: 'Sea' },
];

const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const DEFAULT_VENDOR_GST = '33AAACT3373J1ZD';
const DEFAULT_BANK_GST = '33AAACK2845K1ZT';

const TIME_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const TIME_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const formatTimeTo12HourForApi = (timeStr) => {
  if (!timeStr) return null;
  const trimmed = String(timeStr).trim();
  if (!trimmed) return null;

  // Case 1: Already has AM/PM, e.g. "07:00 AM", "7:00 pm", "12:30PM"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let rawHours = parseInt(ampmMatch[1], 10);
    if (rawHours === 0) rawHours = 12;
    else if (rawHours > 12) rawHours = rawHours % 12 || 12;
    const hours = String(rawHours).padStart(2, '0');
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();
    return `${hours}:${minutes} ${ampm}`;
  }

  // Case 2: 24-hour time e.g. "07:00", "19:30", "0:15", "13:45:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    let rawHours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    let h12 = rawHours % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  return trimmed;
};

/* ============================================================================
 * DATE / TIME HELPERS
 * ========================================================================== */

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString.replace(/-/g, '/'));

    if (isNaN(date.getTime())) {
      const monthMap = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const match = dateString.match(
        /^(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})$/
      );

      if (match) {
        const [, year, monthAbbr, day, hours, minutes] = match;
        const monthNum = monthMap[monthAbbr];

        if (monthNum !== undefined) {
          const parsedDate = new Date(
            year,
            monthNum,
            day,
            hours,
            minutes
          );

          if (!isNaN(parsedDate.getTime())) {
            return `${String(parsedDate.getDate()).padStart(
              2,
              '0'
            )}-${String(parsedDate.getMonth() + 1).padStart(
              2,
              '0'
            )}-${parsedDate.getFullYear()} ${String(
              parsedDate.getHours()
            ).padStart(2, '0')}:${String(
              parsedDate.getMinutes()
            ).padStart(2, '0')}`;
          }
        }
      }

      return dateString;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (error) {
    return dateString;
  }
};

const formatDateOnly = (dateString) => {
  if (!dateString) return 'N/A';

  const full = formatDateTime(dateString);

  return full === 'N/A' ? full : full.split(' ')[0];
};

const parseCustomDate = (dateString) => {
  if (!dateString || dateString === 'N/A') {
    return new Date();
  }

  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? new Date() : dateString;
  }

  const str = String(dateString).trim();

  // Match DD-MM-YYYY HH:mm or DD-MM-YYYY hh:mm AM/PM or DD-MM-YYYY
  let match = str.match(
    /^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(am|pm))?)?$/i
  );

  if (match) {
    const [, day, month, year, hoursStr, minutes, ampm] = match;
    let hours = hoursStr !== undefined ? Number(hoursStr) : 0;
    let mins = minutes !== undefined ? Number(minutes) : 0;
    if (ampm) {
      const isPm = ampm.toLowerCase() === 'pm';
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hours,
      mins,
      0,
      0
    );
  }

  // Match YYYY-MM-DD HH:mm or YYYY-MM-DD hh:mm AM/PM or YYYY-MM-DD
  match = str.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(am|pm))?)?$/i
  );

  if (match) {
    const [, year, month, day, hoursStr, minutes, ampm] = match;
    let hours = hoursStr !== undefined ? Number(hoursStr) : 0;
    let mins = minutes !== undefined ? Number(minutes) : 0;
    if (ampm) {
      const isPm = ampm.toLowerCase() === 'pm';
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hours,
      mins,
      0,
      0
    );
  }

  // Match DD-MMM-YYYY (e.g. 25-Sep-2026)
  const dmyMatch = str.match(
    /^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i
  );
  if (dmyMatch) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months.indexOf(dmyMatch[2].toLowerCase());
    if (month >= 0) {
      const hours = dmyMatch[4] ? Number(dmyMatch[4]) : 0;
      const mins = dmyMatch[5] ? Number(dmyMatch[5]) : 0;
      return new Date(Number(dmyMatch[3]), month, Number(dmyMatch[1]), hours, mins, 0, 0);
    }
  }

  try {
    const fallback = new Date(str.replace(/-/g, '/'));

    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
  } catch (error) { }

  return new Date();
};

const formatDateToCustomString = (date) => {
  if (!date) return null;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
};

const formatDateToYMD = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }
    const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
};

const calculateGstAmounts = (
  taxableAmountVal,
  hsnIgstRateVal,
  vendorGstVal,
  bankGstVal
) => {
  const taxAmt = parseFloat(taxableAmountVal) || 0;
  const igstRate = parseFloat(hsnIgstRateVal) || 0;
  const bGst = (bankGstVal || '').trim().toUpperCase();
  const vGst = (vendorGstVal || '').trim().toUpperCase();

  if (bGst && vGst && bGst === vGst) {
    ToastMessage('Bank GST and Vendor GST are Same');
    return {
      vendorgstno: '',
      gstno: '',
      validateGst: false,
      cgst: '0',
      sgst: '0',
      igst: '0',
      cgstp: 0,
      sgstp: 0,
      igstp: 0,
      invoiceamount: String(taxAmt),
    };
  }

  if (bGst && vGst && bGst !== vGst) {
    const bnkGstPrefix = bGst.slice(0, 2);
    const vendorGstPrefix = vGst.slice(0, 2);

    if (bnkGstPrefix === vendorGstPrefix) {
      // Intra-state: CGST = (tax_amt * (per/2))/100, SGST = CGST, IGST = 0
      const per = igstRate / 2;
      const amt = (taxAmt * per) / 100;
      const invAmt = taxAmt + amt + amt;
      return {
        vendorgstno: vGst,
        gstno: vGst,
        cgst: String(amt),
        sgst: String(amt),
        igst: '0',
        cgstp: per,
        sgstp: per,
        igstp: 0,
        invoiceamount: String(invAmt),
      };
    } else {
      // Inter-state: IGST = (tax_amt * per)/100, CGST = 0, SGST = 0
      const igstAmt = (taxAmt * igstRate) / 100;
      const invAmt = taxAmt + igstAmt;
      return {
        vendorgstno: vGst,
        gstno: vGst,
        cgst: '0',
        sgst: '0',
        igst: String(igstAmt),
        cgstp: 0,
        sgstp: 0,
        igstp: igstRate,
        invoiceamount: String(invAmt),
      };
    }
  }

  return {
    cgst: '0',
    sgst: '0',
    igst: '0',
    cgstp: 0,
    sgstp: 0,
    igstp: 0,
    invoiceamount: String(taxAmt),
  };
};

const parseDateForMinMaxRange = (
  dateString,
  isEndDate = false
) => {
  if (!dateString || dateString === 'N/A') return null;

  try {
    let date = null;
    if (dateString instanceof Date) {
      date = new Date(dateString.getTime());
    } else if (typeof dateString === 'string') {
      const trimmed = dateString.trim();
      const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) {
        date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      } else {
        const dmy = trimmed.match(/^(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{4})/);
        if (dmy) {
          const day = Number(dmy[1]);
          const monthStr = dmy[2];
          const year = Number(dmy[3]);
          let month = 0;
          if (isNaN(Number(monthStr))) {
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const idx = months.indexOf(monthStr.toLowerCase());
            month = idx >= 0 ? idx : 0;
          } else {
            month = Number(monthStr) - 1;
          }
          date = new Date(year, month, day);
        } else {
          const fallback = new Date(trimmed.replace(/-/g, '/'));
          if (!isNaN(fallback.getTime())) {
            date = fallback;
          }
        }
      }
    }

    if (!date || isNaN(date.getTime())) return null;

    if (isEndDate) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    return date;
  } catch (error) {
    return null;
  }
};

/* ============================================================================
 * CUSTOM FULL YEAR/MONTH DATE PICKER MODAL (Allows past & future months/years/dates)
 * ========================================================================== */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CURRENT_YEAR = new Date().getFullYear();
// Generate years from CURRENT_YEAR + 10 down to 1950 (both future and past years)
const ALL_YEARS = Array.from(
  { length: CURRENT_YEAR + 10 - 1950 + 1 },
  (_, i) => CURRENT_YEAR + 10 - i
);

const formatDateToYYYYMMDD = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CustomDatePickerModal = ({
  visible,
  initialDate,
  onClose,
  onConfirm,
}) => {
  const isDark = useSelector((state) => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const init = useMemo(() => {
    if (!initialDate) return new Date();
    const d = parseCustomDate(initialDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [initialDate]);

  const [selectedYear, setSelectedYear] = useState(init.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(init.getMonth());
  const [selectedDay, setSelectedDay] = useState(init.getDate());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'year' | 'month'

  useEffect(() => {
    if (visible) {
      const d = initialDate ? parseCustomDate(initialDate) : new Date();
      const valid = isNaN(d.getTime()) ? new Date() : d;
      setSelectedYear(valid.getFullYear());
      setSelectedMonth(valid.getMonth());
      setSelectedDay(valid.getDate());
      setViewMode('calendar');
    }
  }, [visible, initialDate]);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const firstDayWeekday = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleConfirm = () => {
    const finalDay = Math.min(selectedDay, daysInMonth);
    const d = new Date(selectedYear, selectedMonth, finalDay);
    onConfirm(formatDateToYYYYMMDD(d));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[dateModalStyles.overlay, { backgroundColor: CustomColors.backgroundtransparent }]}>
        <View style={[dateModalStyles.modalCard, { backgroundColor: CustomColors.cardBackground }]}>
          {/* Header */}
          <View style={[dateModalStyles.header, { backgroundColor: CustomColors.appThemeColor }]}>
            <Text allowFontScaling={false} style={dateModalStyles.headerYear}>
              {selectedYear}
            </Text>
            <Text allowFontScaling={false} style={dateModalStyles.headerDateText}>
              {MONTH_NAMES[selectedMonth]} {selectedDay}, {selectedYear}
            </Text>
          </View>

          {/* Navigation Toggle with Prev / Next arrows */}
          <View style={dateModalStyles.navBar}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={dateModalStyles.arrowBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-left" size={24} color={CustomColors.appThemeColor} />
            </TouchableOpacity>

            <View style={dateModalStyles.toggleGroup}>
              <TouchableOpacity
                onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
                style={[
                  dateModalStyles.viewToggleBtn,
                  viewMode === 'year' && { backgroundColor: CustomColors.primaryLight },
                ]}
              >
                <Text allowFontScaling={false} style={[dateModalStyles.viewToggleText, { color: CustomColors.appThemeColor }]}>
                  {selectedYear} ▾
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}
                style={[
                  dateModalStyles.viewToggleBtn,
                  viewMode === 'month' && { backgroundColor: CustomColors.primaryLight },
                ]}
              >
                <Text allowFontScaling={false} style={[dateModalStyles.viewToggleText, { color: CustomColors.appThemeColor }]}>
                  {MONTH_NAMES[selectedMonth]} ▾
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={dateModalStyles.arrowBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-right" size={24} color={CustomColors.appThemeColor} />
            </TouchableOpacity>
          </View>

          {/* VIEW: ALL YEARS GRID */}
          {viewMode === 'year' && (
            <ScrollView style={dateModalStyles.yearListContainer} showsVerticalScrollIndicator>
              <View style={dateModalStyles.yearGrid}>
                {ALL_YEARS.map((y) => {
                  const isCurrent = y === selectedYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[
                        dateModalStyles.yearButton,
                        isCurrent && { backgroundColor: CustomColors.appThemeColor },
                      ]}
                      onPress={() => {
                        setSelectedYear(y);
                        setViewMode('calendar');
                      }}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          dateModalStyles.yearButtonText,
                          { color: isCurrent ? '#FFF' : CustomColors.textDark },
                          isCurrent && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* VIEW: MONTHS GRID */}
          {viewMode === 'month' && (
            <View style={dateModalStyles.monthGrid}>
              {MONTH_NAMES.map((m, idx) => {
                const isCurrent = idx === selectedMonth;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      dateModalStyles.monthButton,
                      isCurrent && { backgroundColor: CustomColors.appThemeColor },
                    ]}
                    onPress={() => {
                      setSelectedMonth(idx);
                      setViewMode('calendar');
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        dateModalStyles.monthButtonText,
                        { color: isCurrent ? '#FFF' : CustomColors.textDark },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* VIEW: CALENDAR DAYS GRID */}
          {viewMode === 'calendar' && (
            <View style={dateModalStyles.calendarContent}>
              <View style={dateModalStyles.weekdaysRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                  <Text key={i} allowFontScaling={false} style={[dateModalStyles.weekdayText, { color: CustomColors.textGray }]}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={dateModalStyles.daysGrid}>
                {Array.from({ length: firstDayWeekday }, (_, i) => (
                  <View key={`empty-${i}`} style={dateModalStyles.dayCell} />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const isSelected = dayNum === selectedDay;
                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[
                        dateModalStyles.dayCell,
                        isSelected && [
                          dateModalStyles.selectedDayCell,
                          { backgroundColor: CustomColors.appThemeColor },
                        ],
                      ]}
                      onPress={() => setSelectedDay(dayNum)}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          dateModalStyles.dayCellText,
                          { color: isSelected ? '#FFF' : CustomColors.textDark },
                          isSelected && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={[dateModalStyles.footer, { borderTopColor: CustomColors.borderLight }]}>
            <TouchableOpacity onPress={onClose} style={dateModalStyles.cancelBtn}>
              <Text allowFontScaling={false} style={{ color: CustomColors.textDark, fontSize: moderateScale(15) }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={[dateModalStyles.confirmBtn, { backgroundColor: CustomColors.appThemeColor }]}
            >
              <Text allowFontScaling={false} style={dateModalStyles.confirmBtnText}>
                Set Date
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const dateModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: horizontalScale(20),
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    padding: moderateScale(18),
  },
  headerYear: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: moderateScale(14),
    fontFamily: Fonts.medium,
  },
  headerDateText: {
    color: '#FFF',
    fontSize: moderateScale(22),
    fontFamily: Fonts.bold,
    marginTop: verticalScale(2),
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  arrowBtn: {
    padding: moderateScale(4),
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(8),
  },
  viewToggleBtn: {
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
  },
  viewToggleText: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
  },
  yearListContainer: {
    height: 260,
    paddingHorizontal: horizontalScale(10),
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(10),
  },
  yearButton: {
    width: '30%',
    paddingVertical: verticalScale(10),
    marginVertical: verticalScale(4),
    alignItems: 'center',
    borderRadius: moderateScale(8),
  },
  yearButtonText: {
    fontSize: moderateScale(15),
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: moderateScale(16),
    height: 260,
  },
  monthButton: {
    width: '30%',
    paddingVertical: verticalScale(14),
    marginVertical: verticalScale(6),
    alignItems: 'center',
    borderRadius: moderateScale(8),
  },
  monthButtonText: {
    fontSize: moderateScale(14),
  },
  calendarContent: {
    padding: moderateScale(12),
    minHeight: 260,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(8),
  },
  weekdayText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.bold,
    width: '14.28%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: moderateScale(34),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(2),
  },
  selectedDayCell: {
    borderRadius: moderateScale(17),
  },
  dayCellText: {
    fontSize: moderateScale(14),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: moderateScale(14),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    marginRight: horizontalScale(10),
  },
  confirmBtn: {
    paddingHorizontal: horizontalScale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
  },
});

/* ============================================================================
 * REUSABLE ROW
 * ========================================================================== */

const EditableRow = React.memo(
  ({
    label,
    value,
    onChangeText,
    onBlur,
    isEditing,
    keyboardType = 'default',
    multiline = false,
    placeholder = '',
    isDisabled = false,
    isDatePicker = false,
    onPressDatePicker = null,
    isRequired = false,
    hasError = false,
    rightAdornment = null,
    styles,
    CustomColors,
  }) => {
    const showError = hasError && !isDisabled;

    return (
      <View style={styles.detailItemContainer}>
        <View style={styles.floatingLabelWrap}>
          <Text
            allowFontScaling={false}
            style={[
              styles.floatingLabelText,
              showError && styles.floatingLabelTextError,
            ]}
          >
            {label}

            {isRequired && (
              <Text style={{ color: CustomColors.dangerRed }}>
                {' '}
                *
              </Text>
            )}
          </Text>
        </View>

        {isEditing ? (
          isDatePicker ? (
            <TouchableOpacity
              onPress={onPressDatePicker}
              disabled={isDisabled}
              style={[
                styles.editableTextInput,
                isDisabled && styles.disabledInput,
                showError && styles.editableTextInputError,
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[
                  styles.actionSheetTriggerButtonText,
                  !value && styles.placeholderText,
                  isDisabled && styles.disabledText,
                ]}
              >
                {value && value !== 'N/A'
                  ? value
                  : placeholder}
              </Text>

              <MaterialIcons
                name="calendar-today"
                size={moderateScale(18)}
                color={
                  isDisabled
                    ? CustomColors.textLightGray
                    : CustomColors.textDarkGray
                }
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.editableTextInput,
                isDisabled && styles.disabledInput,
                showError && styles.editableTextInputError,
                { paddingVertical: 0 },
              ]}
            >
              <TextInput
                allowFontScaling={false}
                style={[
                  {
                    flex: 1,
                    paddingVertical: verticalScale(12),
                    fontSize: moderateScale(14),
                    color: CustomColors.textDark,
                    fontFamily: Fonts.regular,
                  },
                  multiline && styles.multilineInput,
                ]}
                value={
                  value !== undefined && value !== null
                    ? String(value)
                    : ''
                }
                onChangeText={onChangeText}
                onBlur={onBlur}
                keyboardType={keyboardType}
                multiline={multiline}
                textAlignVertical={
                  multiline ? 'top' : 'center'
                }
                placeholder={placeholder}
                placeholderTextColor={
                  CustomColors.textLightGray
                }
                editable={!isDisabled}
              />

              {rightAdornment}
            </View>
          )
        ) : (
          <View
            style={[
              styles.editableTextInput,
              isDisabled && styles.disabledInput,
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.detailValueText,
                isDisabled && styles.disabledText,
              ]}
            >
              {value || 'N/A'}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

/* ============================================================================
 * DROPDOWN ROW
 * ========================================================================== */

const DropdownRow = React.memo(
  ({
    label,
    valueLabel,
    onPress,
    isDisabled,
    isRequired,
    hasError,
    placeholder = 'Select',
    styles,
    CustomColors,
  }) => {
    const showError = hasError && !isDisabled;

    return (
      <View style={styles.detailItemContainer}>
        <View style={styles.floatingLabelWrap}>
          <Text
            allowFontScaling={false}
            style={[
              styles.floatingLabelText,
              showError && styles.floatingLabelTextError,
            ]}
          >
            {label}

            {isRequired && (
              <Text style={{ color: CustomColors.dangerRed }}>
                {' '}
                *
              </Text>
            )}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onPress}
          disabled={isDisabled}
          style={[
            styles.editableTextInput,
            isDisabled && styles.disabledInput,
            showError && styles.editableTextInputError,
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[
              styles.actionSheetTriggerButtonText,
              !valueLabel && styles.placeholderText,
              isDisabled && styles.disabledText,
            ]}
          >
            {valueLabel || placeholder}
          </Text>

          <MaterialIcons
            name="keyboard-arrow-down"
            size={moderateScale(20)}
            color={CustomColors.textDarkGray}
          />
        </TouchableOpacity>
      </View>
    );
  }
);

/* ============================================================================
 * CREATE EMPTY ITEM
 * ========================================================================== */

const createItem = ({
  tourId,
  comment,
  bankGst,
  eligibleClass,
}) => ({
  id: null,

  tempId: `temp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`,

  requestercomment: comment ?? null,

  expenseid: 1,

  tourid: tourId,

  claimedamount: '',

  depaturedate: '',
  depaturetime: '',
  depatureplace: '',

  arrivaldate: '',
  arrivaltime: '',

  placeofvisit: '',

  totaltkttamt: '0',

  tktrefno: '0',

  tktbybank: '0',

  actualtravel: '',

  eligibletravel: eligibleClass || '',

  priorpermission: '0',

  highermodeopted: '0',
  highermodereasons: '0',
  nooftickets: '0',

  classoftravel: '',

  noofdependents: 0,

  dependent: '0',

  dependencies_relation: [],
  dependencies: [],

  hsncode: '0000',
  hsnigstrate: 0,

  vendorname: '',
  vendorcode: '',
  bankgstno: bankGst || '',

  /* Supplier GST fields */
  suppliergstno: '',
  suppliergstvalidated: false,
  suppliergststatus: '',

  taxableamount: '0',

  invoiceamount: '0',

  address: '',

  vendorgstno: '',
  gstno: '',

  validateGst: false,

  igst: '0',

  cgst: '0',

  sgst: '0',

  igstp: 0,
  cgstp: 0,
  sgstp: 0,

  approvedamount: '0',

  invoicedate: '',

  invoiceno: '',

  billno: '',
});

/* ============================================================================
 * MAIN COMPONENT
 * ========================================================================== */

const TravelDetailsScreen = ({ route }) => {
  const expense = route?.params?.expense ?? {};
  const claimdata = route?.params?.claimdata ?? {};
  const from = route?.params?.from || '';

  const dispatch = useDispatch();

  const isDark = useSelector(
    (state) => state.theme.isDark
  );

  const CustomColors = getCustomColors(isDark);

  const globalStyles = styless.styles(isDark);

  const navigation = useNavigation();

  /*
   * TOUR ID FIX
   *
   * Important:
   * `expense.id` is NOT always the tour id.
   *
   * Example backend travel-expense response:
   *   id: 972       -> expense row id
   *   tourid: 4478  -> actual tour id
   *
   * Always prefer explicit tour-id fields first.
   * A bare `id` is only the final fallback for a screen opened directly
   * with a tour object.
   */
  const routeTourId =
    route?.params?.tourId ||
    route?.params?.tour_id ||
    route?.params?.tourid ||
    claimdata?.tourid ||
    claimdata?.tour_id ||
    claimdata?.tourgid ||
    claimdata?.id ||
    claimdata?.data?.[0]?.tourid ||
    claimdata?.data?.[0]?.tour_id ||
    claimdata?.maker_data?.tourid ||
    expense?.tourid ||
    expense?.tour_id ||
    expense?.tourgid ||
    expense?.id ||
    null;

  /*
   * Once the travel API responds, use the `tourid` returned by the backend
   * as the source of truth for all subsequent operations:
   * - submit
   * - approve
   * - dependent delete
   * - newly added expense rows
   */
  const [backendTourId, setBackendTourId] = useState(null);

  const tourId = backendTourId || routeTourId;

  const initialTourStartDate =
    claimdata?.tstartdate ||
    claimdata?.tour_startdate ||
    claimdata?.startdate ||
    claimdata?.start_date ||
    claimdata?.data?.[0]?.tour_startdate ||
    claimdata?.data?.[0]?.tstartdate ||
    expense?.tstartdate ||
    expense?.tour_startdate ||
    expense?.startdate ||
    expense?.start_date ||
    expense?.data?.[0]?.tour_startdate ||
    route?.params?.tourStartDate ||
    route?.params?.startDate ||
    null;

  const initialTourEndDate =
    claimdata?.tenddate ||
    claimdata?.tour_enddate ||
    claimdata?.enddate ||
    claimdata?.end_date ||
    claimdata?.data?.[0]?.tour_enddate ||
    claimdata?.data?.[0]?.tenddate ||
    expense?.tenddate ||
    expense?.tour_enddate ||
    expense?.enddate ||
    expense?.end_date ||
    expense?.data?.[0]?.tour_enddate ||
    route?.params?.tourEndDate ||
    route?.params?.endDate ||
    null;

  const [tourStartDate, setTourStartDate] = useState(initialTourStartDate);
  const [tourEndDate, setTourEndDate] = useState(initialTourEndDate);
  const [triggerGetExpenseDetails] = useLazyGetExpenseDetailsQuery();

  const [tourEmployeeCode, setTourEmployeeCode] = useState(
    expense?.employee_code ||
    claimdata?.employee_code ||
    claimdata?.maker_data?.code ||
    ''
  );

  const [tourEmployeeName, setTourEmployeeName] = useState(
    expense?.employee_name ||
    claimdata?.employee_name ||
    claimdata?.maker_data?.full_name ||
    ''
  );

  const [tourRequestNo, setTourRequestNo] = useState(
    claimdata?.requestno ||
    claimdata?.reqtourno ||
    expense?.requestno ||
    expense?.crn_no ||
    route?.params?.tourNo ||
    claimdata?.data?.[0]?.requestno ||
    'T2606000021'
  );

  const employeeCode =
    tourEmployeeCode ||
    expense?.employee_code ||
    claimdata?.employee_code ||
    claimdata?.maker_data?.code ||
    claimdata?.data?.[0]?.employee_code ||
    route?.params?.employeeCode ||
    '';

  const employeeName =
    tourEmployeeName ||
    expense?.employee_name ||
    claimdata?.employee_name ||
    claimdata?.maker_data?.full_name ||
    claimdata?.data?.[0]?.employee_name ||
    route?.params?.employeeName ||
    '';

  const initialEmployeeGrade =
    expense?.empgrade ||
    expense?.emp_grade ||
    expense?.employee_grade ||
    claimdata?.empgrade ||
    claimdata?.emp_grade ||
    claimdata?.employee_grade ||
    claimdata?.maker_data?.grade ||
    claimdata?.grade ||
    claimdata?.data?.[0]?.emp_grade ||
    claimdata?.data?.[0]?.empgrade ||
    route?.params?.employeeGrade ||
    route?.params?.empGrade ||
    '';

  const travelNo =
    (tourRequestNo && tourRequestNo !== 'T2606000021' ? tourRequestNo : null) ||
    claimdata?.requestno ||
    claimdata?.reqtourno ||
    expense?.requestno ||
    expense?.crn_no ||
    route?.params?.tourNo ||
    claimdata?.data?.[0]?.requestno ||
    claimdata?.id ||
    tourId ||
    '';

  const expenseid =
    expense?.expenseid ??
    expense?.expense_id ??
    null;

  const requestercomment =
    expense?.requestercomment ??
    null;

  const applevel =
    claimdata?.applevel ||
    expense?.applevel ||
    0;

  const statusid =
    claimdata?.claim_status_id ??
    expense?.claim_status_id;

  const approver =
    applevel === 1 ||
    applevel === 2 ||
    [2, 3, 4].includes(Number(statusid));

  const apuser_key = !!route?.params?.apuser_key;

  const [
    getTravelExpense,
    {
      isLoading: isLoadingTravel,
      isFetching: isFetchingTravel,
    },
  ] = useLazyGetTravelExpenseQuery();

  const [
    travelSubmit,
    { isLoading: isSubmitting },
  ] = useTravelSubmitMutation();

  const [
    approveTravelExpense,
    { isLoading: isApproving },
  ] = useApproveTravelExpenseMutation();

  const [deleteTravelExpense] = useDeleteTravelExpenseMutation();

  const [deleteLodgingDependent] = useDeleteLodgingDependentMutation();

  const [
    triggerTravelRoad,
    { data: roadData },
  ] = useLazyCommonDropDownGetQuery();

  const [
    triggerTravelTrain,
    { data: trainData },
  ] = useLazyCommonDropDownGetQuery();

  const [
    triggerTravelAir,
    { data: airData },
  ] = useLazyCommonDropDownGetQuery();

  const [
    triggerTravelSea,
    { data: seaData },
  ] = useLazyCommonDropDownGetQuery();

  const [triggerValidateSupplierGst] = useLazyValidateSupplierGstQuery();
  const [triggerTourGradeDetails] = useLazyGetTourGradeDetailsQuery();

  const [items, setItems] = useState([]);

  const [expandedItems, setExpandedItems] =
    useState({});

  const [
    dependentOpenState,
    setDependentOpenState,
  ] = useState({});

  const [
    activePickerId,
    setActivePickerId,
  ] = useState(null);

  const [pickerConfig, setPickerConfig] =
    useState(null);

  const [bankGst, setBankGst] = useState(
    claimdata?.branch_gst || expense?.branch_gst || DEFAULT_BANK_GST
  );

  const [eligibleClass, setEligibleClass] =
    useState('SLEEPER NON AC');

  const [employeeGrade, setEmployeeGrade] = useState(initialEmployeeGrade || 'S4');

  const initialEmployeeDesignation =
    expense?.empdesignation ||
    expense?.designation ||
    expense?.employeedesignation ||
    claimdata?.empdesignation ||
    claimdata?.designation ||
    claimdata?.employeedesignation ||
    claimdata?.maker_data?.designation ||
    claimdata?.maker_data?.empdesignation ||
    route?.params?.employeeDesignation ||
    'Manager-Branch Head';

  const [employeeDesignation, setEmployeeDesignation] = useState(
    initialEmployeeDesignation || 'Manager-Branch Head'
  );

  const isOnBehalf = Boolean(
    expense?.onbehalfof ||
    claimdata?.onbehalfof ||
    expense?.isonbehalf ||
    claimdata?.isonbehalf
  );

  const onBehalfEmpName =
    expense?.onbehalf_empName ||
    claimdata?.onbehalf_empName ||
    (isOnBehalf && (expense?.employee_code || claimdata?.employee_code)
      ? `(${expense?.employee_code || claimdata?.employee_code}) ${expense?.employee_name || claimdata?.employee_name}`
      : '');

  useEffect(() => {
    const g =
      expense?.empgrade ||
      expense?.emp_grade ||
      expense?.employee_grade ||
      claimdata?.empgrade ||
      claimdata?.emp_grade ||
      claimdata?.employee_grade ||
      claimdata?.maker_data?.grade ||
      claimdata?.grade ||
      claimdata?.data?.[0]?.emp_grade ||
      claimdata?.data?.[0]?.empgrade ||
      route?.params?.employeeGrade ||
      route?.params?.empGrade;
    if (g) {
      setEmployeeGrade(g);
    } else {
      setEmployeeGrade((prev) => prev || 'S4');
    }

    const d =
      expense?.empdesignation ||
      expense?.designation ||
      expense?.employeedesignation ||
      claimdata?.empdesignation ||
      claimdata?.designation ||
      claimdata?.employeedesignation ||
      claimdata?.maker_data?.designation ||
      claimdata?.maker_data?.empdesignation ||
      route?.params?.employeeDesignation;
    if (d) {
      setEmployeeDesignation(d);
    } else {
      setEmployeeDesignation((prev) => prev || 'Manager-Branch Head');
    }

    const r =
      claimdata?.requestno ||
      claimdata?.reqtourno ||
      expense?.requestno ||
      expense?.crn_no ||
      route?.params?.tourNo ||
      claimdata?.data?.[0]?.requestno;
    if (r) {
      setTourRequestNo(r);
    } else {
      setTourRequestNo((prev) => prev || 'T2606000021');
    }
  }, [expense, claimdata, route?.params]);

  const [
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ] = useState(false);

  const [
    isFetchingScreen,
    setIsFetchingScreen,
  ] = useState(true);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [customDatePickerConfig, setCustomDatePickerConfig] = useState({
    visible: false,
    tempId: null,
    field: null,
    initialDate: '',
  });

  const [timePickerVisible, setTimePickerVisible] =
    useState(false);
  const [timePickerItemId, setTimePickerItemId] =
    useState(null);
  const [timePickerField, setTimePickerField] =
    useState(null);
  const [selectedHour, setSelectedHour] = useState('00');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const [
    currentDateField,
    setCurrentDateField,
  ] = useState(null);

  const [
    currentItemIdForDate,
    setCurrentItemIdForDate,
  ] = useState(null);

  /* Supplier GST validation state */
  const [
    validatingSupplierGstId,
    setValidatingSupplierGstId,
  ] = useState(null);

  /* HSN Dropdown state */
  const [hsnModalVisible, setHsnModalVisible] = useState(false);
  const [hsnSearchQuery, setHsnSearchQuery] = useState('');
  const [hsnSuggestions, setHsnSuggestions] = useState([]);
  const [isHsnLoading, setIsHsnLoading] = useState(false);
  const [isHsnLoadingMore, setIsHsnLoadingMore] = useState(false);
  const [hsnPage, setHsnPage] = useState(1);
  const [hsnHasMore, setHsnHasMore] = useState(true);
  const [hsnTempId, setHsnTempId] = useState(null);
  const hsnSearchTimeout = useRef(null);

  const isItemEditableGlobally =
    !(approver || apuser_key);

  /* ==========================================================================
   * MIN / MAX DATE
   * ======================================================================== */

  const minDate = useMemo(() => {
    if (tourStartDate) {
      return (
        parseDateForMinMaxRange(
          tourStartDate,
          false
        ) || new Date(2000, 0, 1)
      );
    }

    return new Date(2000, 0, 1);
  }, [tourStartDate]);

  const maxDate = useMemo(() => {
    if (tourEndDate) {
      return (
        parseDateForMinMaxRange(
          tourEndDate,
          true
        ) ||
        new Date(
          2050,
          11,
          31,
          23,
          59,
          59
        )
      );
    }

    return new Date(
      2050,
      11,
      31,
      23,
      59,
      59
    );
  }, [tourEndDate]);

  /* ==========================================================================
   * DROPDOWNS
   * ======================================================================== */

  useEffect(() => {
    triggerTravelRoad('travel_Road');
    triggerTravelTrain('travel_Train');
    triggerTravelAir('travel_Air');
    triggerTravelSea('travel_Sea');
  }, [
    triggerTravelRoad,
    triggerTravelTrain,
    triggerTravelAir,
    triggerTravelSea,
  ]);

  const classOptionsForMode = useCallback(
    (mode) => {
      switch (mode) {
        case 'Road':
          return roadData || [];

        case 'Train':
          return trainData || [];

        case 'Air':
          return airData || [];

        case 'Sea':
          return seaData || [];

        default:
          return [];
      }
    },
    [roadData, trainData, airData, seaData]
  );

  /* ==========================================================================
   * LOAD DATA
   * ======================================================================== */

  const loadTravelExpense = useCallback(async () => {
    const requestTourId =
      backendTourId ||
      routeTourId;

    if (!requestTourId) {
      setIsFetchingScreen(false);
      ToastMessage(
        'Tour ID is missing for this claim. Please open the claim again.'
      );
      return;
    }

    let resTourStartDate = tourStartDate;
    let resTourEndDate = tourEndDate;

    try {
      setIsFetchingScreen(true);

      console.log(
        '[TravelDetails] Fetching travel expense with tourId:',
        requestTourId
      );

      // 1. Fetch Tour Grade & Details: GET /taserv/tourno_grade_get/:tourId
      let currentEligibleClass = eligibleClass;
      try {
        const gradeRes = await triggerTourGradeDetails(requestTourId).unwrap();
        if (gradeRes) {
          if (gradeRes.employee_code) setTourEmployeeCode(gradeRes.employee_code);
          if (gradeRes.employee_name) setTourEmployeeName(gradeRes.employee_name);
          if (gradeRes.employee_grade || gradeRes.grade) {
            setEmployeeGrade(gradeRes.employee_grade || gradeRes.grade);
          }
          if (gradeRes.gradelevel || gradeRes.designation) {
            setEmployeeDesignation(gradeRes.gradelevel || gradeRes.designation);
          }
          if (gradeRes.travelclass) {
            currentEligibleClass = gradeRes.travelclass;
            setEligibleClass(gradeRes.travelclass);
          }
          if (gradeRes.request_no) {
            setTourRequestNo(gradeRes.request_no);
          }
        }
      } catch (err) {
        console.log('[TravelDetails] Error fetching tour grade details:', err);
      }

      // 1b. Fetch Tour Dates from Claim Details: GET /taserv/claimreq/tour/:tourId
      try {
        const detailRes = await triggerGetExpenseDetails(requestTourId).unwrap();
        if (detailRes) {
          const sDate =
            detailRes.tstartdate ||
            detailRes.data?.[0]?.tour_startdate ||
            detailRes.data?.[0]?.tstartdate;
          const eDate =
            detailRes.tenddate ||
            detailRes.data?.[0]?.tour_enddate ||
            detailRes.data?.[0]?.tenddate;
          if (sDate) {
            resTourStartDate = sDate;
            setTourStartDate(sDate);
          }
          if (eDate) {
            resTourEndDate = eDate;
            setTourEndDate(eDate);
          }
        }
      } catch (err) {
        console.log('[TravelDetails] Error fetching expense details for tour dates:', err);
      }

      // 2. Fetch Existing Travel Expenses: GET /taserv/travel/tour/:tourId
      let result = null;
      try {
        result = await getTravelExpense(requestTourId).unwrap();
      } catch (fetchErr) {
        console.log('[TravelDetails] Error calling getTravelExpense:', fetchErr);
      }

      const travellist =
        Array.isArray(result?.data)
          ? result.data
          : [];

      /*
       * Backend response is authoritative.
       * Example:
       * result.data[0].tourid === 4478
       */
      const responseTourId =
        result?.data?.find(
          (item) =>
            (item?.tourid !== undefined && item?.tourid !== null) ||
            (item?.tour_id !== undefined && item?.tour_id !== null) ||
            (item?.tourgid !== undefined && item?.tourgid !== null)
        )?.tourid ??
        result?.data?.[0]?.tour_id ??
        result?.data?.[0]?.tourgid ??
        result?.tourid ??
        result?.tour_id ??
        result?.tourgid ??
        requestTourId;

      if (responseTourId !== undefined && responseTourId !== null) {
        setBackendTourId(
          String(responseTourId)
        );
      }

      const activeTourId =
        responseTourId ??
        requestTourId;

      console.log(
        '[TravelDetails] Backend tourId:',
        activeTourId
      );

      const branchGst =
        result?.branch_gst ||
        bankGst;

      setBankGst(branchGst);

      if (
        result?.employee_grade ||
        result?.empgrade ||
        result?.emp_grade ||
        result?.grade
      ) {
        setEmployeeGrade(
          result?.employee_grade ||
          result?.empgrade ||
          result?.emp_grade ||
          result?.grade
        );
      }

      if (
        result?.empdesignation ||
        result?.designation ||
        result?.employeedesignation
      ) {
        setEmployeeDesignation(
          result?.empdesignation ||
          result?.designation ||
          result?.employeedesignation
        );
      }

      let mapped = travellist.map((item) => ({
        id: item.id,

        tempId:
          item.id?.toString() ||
          `fetched-${Date.now()}-${Math.random()}`,

        requestercomment,

        expenseid: 1,

        tourid: activeTourId,

        claimedamount:
          item.claimedamount !== undefined
            ? String(item.claimedamount)
            : '',

        depaturedate:
          item.depaturedate || '',

        depaturetime:
          formatTimeTo12HourForApi(item.depaturetime) || item.depaturetime || '',

        depatureplace:
          item.depatureplace ||
          item.fromplace ||
          '',

        arrivaldate:
          item.arrivaldate || '',

        arrivaltime:
          formatTimeTo12HourForApi(item.arrivaltime) || item.arrivaltime || '',

        placeofvisit:
          item.placeofvisit || '',

        totaltkttamt:
          item.totaltkttamt !== undefined
            ? String(item.totaltkttamt)
            : '0',

        tktrefno:
          item.tktrefno !== undefined
            ? String(item.tktrefno)
            : '0',

        tktbybank:
          item.tktbybank !== undefined
            ? String(
              item.tktbybank?.value ??
              item.tktbybank
            )
            : '0',

        actualtravel:
          item.actualtravel?.value ??
          item.actualtravel ??
          '',

        eligibletravel:
          item.eligibletravel ||
          eligibleClass,

        priorpermission:
          item.priorpermission?.value ??
          item.priorpermission ??
          '0',

        highermodeopted:
          item.highermodeopted !== undefined
            ? String(item.highermodeopted)
            : '0',

        highermodereasons:
          item.highermodereasons !== undefined
            ? String(item.highermodereasons)
            : '0',

        nooftickets:
          item.nooftickets !== undefined
            ? String(item.nooftickets)
            : item.no_of_tickets !== undefined
              ? String(item.no_of_tickets)
              : '0',

        classoftravel:
          item.classoftravel?.value ??
          item.classoftravel ??
          '',

        noofdependents:
          item.dependencies?.length || 0,

        dependent:
          item.dependent ? '1' : '0',

        dependencies: [],

        dependencies_relation:
          (item.dependencies || []).map(
            (d) => ({
              id: d.id,
              name: d.name || '',
              relation: d.relation || '',
              tourid: activeTourId,
              expense_id: 1,
            })
          ),

        hsncode:
          typeof item.hsncode === 'object' && item.hsncode !== null
            ? (item.hsncode.code || item.hsncode.hsncode || '')
            : (item.hsncode || '0000'),

        hsnigstrate:
          typeof item.hsncode === 'object' && item.hsncode !== null && item.hsncode.igstrate !== undefined
            ? parseFloat(item.hsncode.igstrate) || 0
            : (item.hsnigstrate || item.igstrate || item.igst_rate || 0),

        vendorname:
          item.vendorname || '',

        vendorcode:
          item.vendorcode || '',

        bankgstno:
          branchGst || '',

        /* Supplier / Vendor GST mapping */
        suppliergstno:
          item.suppliergstno ||
          item.supplier_gst_no ||
          item.suppliergst ||
          item.vendorgstno ||
          item.gst_no ||
          '',

        suppliergstvalidated:
          !!(
            item.suppliergstvalidated ||
            item.supplier_gst_validated ||
            item.vendorgstno ||
            item.gst_no
          ),

        suppliergststatus:
          item.suppliergststatus ||
          item.supplier_gst_status ||
          '',

        taxableamount:
          item.taxable_amount !== undefined
            ? String(item.taxable_amount)
            : '0',

        invoiceamount:
          item.invoice_amount !== undefined
            ? String(item.invoice_amount)
            : '0',

        address:
          item.address || '',

        vendorgstno:
          item.vendorgstno || item.gst_no || item.suppliergstno || '',

        gstno:
          item.gstno || item.vendorgstno || item.gst_no || item.suppliergstno || '',

        validateGst:
          !!(item.vendorgstno || item.gst_no),

        igst:
          item.igst !== undefined
            ? String(item.igst)
            : '0',

        cgst:
          item.cgst !== undefined
            ? String(item.cgst)
            : '0',

        sgst:
          item.sgst !== undefined
            ? String(item.sgst)
            : '0',

        igstp:
          item.igstp !== undefined
            ? parseFloat(item.igstp) || 0
            : parseFloat(item.hsnigstrate || item.igstrate || item.igst_rate || 0),

        cgstp:
          item.cgstp !== undefined
            ? parseFloat(item.cgstp) || 0
            : 0,

        sgstp:
          item.sgstp !== undefined
            ? parseFloat(item.sgstp) || 0
            : 0,

        approvedamount:
          item.approvedamount !== undefined
            ? String(item.approvedamount)
            : '0',

        invoicedate:
          item.invoice_date ||
          item.invoicedate ||
          '',

        invoiceno:
          item.invoice_no ||
          item.invoiceno ||
          '',

        billno:
          item.billno ||
          item.invoice_no ||
          '',
      }));

      if (mapped.length === 0) {
        const defaultItem = createItem({
          tourId: activeTourId,
          comment: requestercomment,
          bankGst: branchGst,
          eligibleClass: currentEligibleClass || eligibleClass,
        });

        if (resTourStartDate) {
          const formattedStart = formatDateToYMD(resTourStartDate) || resTourStartDate;
          defaultItem.depaturedate = formattedStart;
          defaultItem.arrivaldate = formatDateToYMD(resTourEndDate || resTourStartDate) || (resTourEndDate || formattedStart);
        }

        mapped = [defaultItem];
      }

      setItems(mapped);

      setExpandedItems(
        mapped.reduce(
          (acc, item) => ({
            ...acc,
            [item.tempId]: true,
          }),
          {}
        )
      );

      dispatch(
        setTravelExpenseDetails(travellist)
      );

      setHasUnsavedChanges(false);
    } catch (error) {
      console.log('[TravelDetails] Error in loadTravelExpense:', error);
      setItems((prev) => {
        if (prev.length === 0) {
          const fallbackItem = createItem({
            tourId: requestTourId,
            comment: requestercomment,
            bankGst,
            eligibleClass,
          });
          if (resTourStartDate) {
            const formattedStart = formatDateToYMD(resTourStartDate) || resTourStartDate;
            fallbackItem.depaturedate = formattedStart;
            fallbackItem.arrivaldate = formatDateToYMD(resTourEndDate || resTourStartDate) || (resTourEndDate || formattedStart);
          }
          return [fallbackItem];
        }
        return prev;
      });
    } finally {
      setIsFetchingScreen(false);
    }
  }, [
    backendTourId,
    routeTourId,
    getTravelExpense,
    triggerTourGradeDetails,
    triggerGetExpenseDetails,
    dispatch,
    requestercomment,
    bankGst,
    eligibleClass,
    tourStartDate,
    tourEndDate,
  ]);

  useEffect(() => {
    loadTravelExpense();

    return () => {
      dispatch(clearTravelExpenseDetails());
    };
  }, [
    loadTravelExpense,
    dispatch,
  ]);

  /* ==========================================================================
   * HEADER
   * ======================================================================== */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,

      headerStyle: {
        backgroundColor:
          CustomColors.appThemeColor,
      },

      headerTintColor:
        CustomColors.white,

      headerTitle: () => (
        <Text
          allowFontScaling={false}
          style={[
            globalStyles.headerTitle,
            {
              fontSize:
                moderateScale(20),

              fontWeight: '600',

              color:
                CustomColors.white,
            },
          ]}
        >
          eClaim Traveling Expense
        </Text>
      ),
    });
  }, [
    navigation,
    CustomColors,
    globalStyles,
  ]);

  /* ==========================================================================
   * STYLES
   * ========================================================================== */

  const styles = StyleSheet.create({
    fullScreenContainer: {
      flex: 1,
      backgroundColor:
        CustomColors.appScreenColor,
    },

    sectionCard: {
      backgroundColor:
        CustomColors.cardBackground,

      borderRadius:
        moderateScale(15),

      padding:
        moderateScale(25),

      marginBottom:
        verticalScale(25),

      elevation: 5,

      borderLeftWidth:
        moderateScale(8),

      borderLeftColor:
        CustomColors.appThemeColor,

      margin:
        horizontalScale(10),
    },

    sectionTitle: {
      fontSize:
        moderateScale(22),

      fontWeight: '700',

      marginBottom:
        verticalScale(15),

      color:
        CustomColors.appThemeColor,

      borderBottomWidth: 1,

      borderBottomColor:
        CustomColors.lightGray,

      paddingBottom:
        verticalScale(10),

      fontFamily:
        Fonts.bold,
    },

    detailRow: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      marginBottom:
        verticalScale(12),

      justifyContent:
        'space-between',

      flexWrap: 'wrap',
    },

    plusicon: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'flex-end',
    },

    boldText: {
      fontWeight: '600',

      color:
        CustomColors.textDark,

      fontSize:
        moderateScale(15),

      marginRight:
        horizontalScale(10),

      minWidth:
        horizontalScale(120),

      fontFamily:
        Fonts.semiBold,
    },

    mainHeading: {
      fontSize:
        moderateScale(20),

      fontWeight: 'bold',

      color:
        CustomColors.appThemeColor,

      marginVertical:
        verticalScale(15),

      marginHorizontal:
        verticalScale(20),

      fontFamily:
        Fonts.bold,

      flex: 1,
    },

    expenseItemCard: {
      backgroundColor:
        CustomColors.cardBackground,

      borderRadius:
        moderateScale(12),

      marginBottom:
        verticalScale(15),

      elevation: 3,

      overflow: 'hidden',

      borderColor:
        CustomColors.lightGray,

      borderWidth: 1,
    },

    cardHeader: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      paddingVertical:
        verticalScale(18),

      paddingHorizontal:
        horizontalScale(20),

      backgroundColor:
        CustomColors.backgroundGray2,

      borderBottomWidth: 1,

      borderBottomColor:
        CustomColors.lightGray,
    },

    headerRightContainer: {
      flexDirection: 'row',

      alignItems: 'center',

      gap:
        horizontalScale(12),
    },

    cardTitle: {
      fontSize:
        moderateScale(17),

      fontWeight: '600',

      color:
        CustomColors.textDark,

      flex: 1,

      paddingRight:
        horizontalScale(10),

      fontFamily:
        Fonts.semiBold,
    },

    toggleIcon: {
      fontSize:
        moderateScale(22),

      color:
        CustomColors.appThemeColor,

      fontWeight: 'bold',
    },

    cardContent: {
      padding:
        moderateScale(20),

      paddingLeft:
        horizontalScale(25),

      borderLeftWidth:
        moderateScale(5),

      borderLeftColor:
        CustomColors.lightGray,
    },

    detailItemContainer: {
      marginTop:
        verticalScale(12),

      marginBottom:
        verticalScale(16),

      position: 'relative',
    },

    floatingLabelWrap: {
      position: 'absolute',

      top:
        -verticalScale(9),

      left:
        horizontalScale(12),

      zIndex: 2,

      backgroundColor:
        CustomColors.cardBackground,

      paddingHorizontal:
        horizontalScale(6),
    },

    floatingLabelText: {
      fontSize:
        moderateScale(12.5),

      fontWeight: '600',

      color:
        CustomColors.textDarkGray,

      fontFamily:
        Fonts.semiBold,
    },

    floatingLabelTextError: {
      color:
        CustomColors.dangerRed,
    },

    editableTextInput: {
      borderWidth: 1,

      borderColor:
        CustomColors.iconBlack || '#333',

      borderRadius:
        moderateScale(8),

      paddingVertical:
        verticalScale(12),

      paddingHorizontal:
        horizontalScale(12),

      fontSize:
        moderateScale(14),

      color:
        CustomColors.textDark,

      fontFamily:
        Fonts.regular,

      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      minHeight:
        verticalScale(46),

      backgroundColor:
        CustomColors.cardBackground,
    },

    editableTextInputError: {
      borderColor:
        CustomColors.dangerRed,
    },

    multilineInput: {
      minHeight:
        verticalScale(80),

      textAlignVertical: 'top',
    },

    detailValueText: {
      fontSize:
        moderateScale(15),

      color:
        CustomColors.textDark,

      flex: 1,

      fontFamily:
        Fonts.regular,
    },

    disabledInput: {
      backgroundColor:
        CustomColors.disableInput ||
        CustomColors.lightGray,

      borderColor:
        CustomColors.lightGray,
    },

    disabledText: {
      color:
        CustomColors.disableText ||
        CustomColors.textLightGray,
    },

    actionSheetTriggerButtonText: {
      fontSize:
        moderateScale(15),

      color:
        CustomColors.textDark,

      flex: 1,

      fontFamily:
        Fonts.regular,
    },

    placeholderText: {
      color:
        CustomColors.textLightGray,
    },

    noItemsText: {
      fontSize:
        moderateScale(16),

      color:
        CustomColors.textGray,

      textAlign: 'center',

      marginTop:
        verticalScale(20),

      fontStyle: 'italic',

      fontFamily:
        Fonts.Italic,
    },

    bottomActionBar: {
      position: 'absolute',

      bottom: 0,
      left: 0,
      right: 0,

      backgroundColor:
        CustomColors.bottomNavBarColor,

      paddingVertical:
        verticalScale(12),

      paddingHorizontal:
        horizontalScale(16),

      borderTopWidth: 1,

      borderTopColor:
        CustomColors.lightGray,

      elevation: 8,

      flexDirection: 'row',

      justifyContent:
        'space-between',

      gap:
        horizontalScale(12),

      height:
        verticalScale(75),
    },

    actionButton: {
      flex: 1,

      borderRadius:
        moderateScale(8),

      alignItems: 'center',

      justifyContent: 'center',

      height:
        verticalScale(48),
    },

    submitButton: {
      backgroundColor:
        CustomColors.appThemeColor,
    },

    approveButton: {
      backgroundColor:
        CustomColors.successGreen ||
        '#28A745',
    },

    backButton: {
      backgroundColor:
        CustomColors.mediumGray ||
        '#8C9BA5',
    },

    actionButtonText: {
      color:
        CustomColors.textWhite,

      fontWeight: '700',

      fontSize:
        moderateScale(16),

      fontFamily:
        Fonts.bold,
    },

    validateBtn: {
      marginLeft:
        horizontalScale(8),

      paddingHorizontal:
        horizontalScale(10),

      paddingVertical:
        verticalScale(6),

      borderRadius:
        moderateScale(6),

      backgroundColor:
        CustomColors.appThemeColor,
    },

    validateBtnDisabled: {
      backgroundColor:
        CustomColors.mediumGray ||
        '#8C9BA5',
    },

    validateBtnText: {
      color:
        CustomColors.white,

      fontSize:
        moderateScale(12),

      fontFamily:
        Fonts.semiBold,
    },

    gstSuccessText: {
      color:
        CustomColors.successGreen ||
        '#28A745',

      fontSize:
        moderateScale(11),

      marginTop:
        verticalScale(4),

      fontFamily:
        Fonts.semiBold,
    },

    dependentHeaderRow: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginTop:
        verticalScale(10),

      marginBottom:
        verticalScale(6),
    },

    dependentTitle: {
      fontSize:
        moderateScale(16),

      fontWeight: '600',

      color:
        CustomColors.appThemeColor,

      fontFamily:
        Fonts.semiBold,
    },

    dependentRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap:
        horizontalScale(8),
    },

    dependentField: {
      flex: 1,
    },

    deleteIconBtn: {
      padding:
        moderateScale(6),
    },

    timeModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },

    timeModalContent: {
      backgroundColor: CustomColors.cardBackground,
      borderTopLeftRadius: moderateScale(18),
      borderTopRightRadius: moderateScale(18),
      paddingHorizontal: horizontalScale(20),
      paddingTop: verticalScale(16),
      paddingBottom: verticalScale(24),
      minHeight: verticalScale(420),
    },

    timeModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },

    timeModalTitle: {
      fontSize: moderateScale(18),
      fontWeight: '700',
      color: CustomColors.textDark,
      fontFamily: Fonts.semiBold,
    },

    timeColumns: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: verticalScale(250),
    },

    timeColumn: {
      width: horizontalScale(110),
      height: verticalScale(250),
    },

    timeColumnLabel: {
      textAlign: 'center',
      fontSize: moderateScale(12),
      color: CustomColors.textDarkGray,
      marginBottom: verticalScale(6),
      fontFamily: Fonts.semiBold,
    },

    timeOption: {
      height: verticalScale(48),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: moderateScale(8),
      marginVertical: 0,
    },

    timeOptionSelected: {
      backgroundColor: CustomColors.appThemeColor,
    },

    timeOptionText: {
      fontSize: moderateScale(18),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
    },

    timeOptionSelectedText: {
      color: CustomColors.white,
      fontWeight: '700',
    },

    timeSeparator: {
      fontSize: moderateScale(24),
      fontWeight: '700',
      color: CustomColors.textDark,
      marginHorizontal: horizontalScale(8),
    },

    timeSelectedValue: {
      alignItems: 'center',
      marginTop: verticalScale(8),
      marginBottom: verticalScale(12),
    },

    timeSelectedValueText: {
      fontSize: moderateScale(22),
      fontWeight: '700',
      color: CustomColors.appThemeColor,
      fontFamily: Fonts.bold,
    },

    timeDoneButton: {
      height: verticalScale(48),
      borderRadius: moderateScale(8),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: CustomColors.appThemeColor,
    },

    timeDoneButtonText: {
      color: CustomColors.white,
      fontSize: moderateScale(16),
      fontWeight: '700',
      fontFamily: Fonts.bold,
    },

    actionSheetItem: {
      paddingVertical:
        verticalScale(15),

      paddingHorizontal:
        horizontalScale(20),

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        CustomColors.backgroundGray,
    },

    actionSheetItemSelected: {
      backgroundColor:
        CustomColors.primaryBlue + '15',
    },

    actionSheetItemText: {
      fontSize:
        moderateScale(16),

      color:
        CustomColors.textDark,

      fontFamily:
        Fonts.regular,
    },

    actionSheetItemSelectedText: {
      fontWeight: 'bold',

      color:
        CustomColors.primaryBlue,

      fontFamily:
        Fonts.bold,
    },

    loadingContainer: {
      flex: 1,

      justifyContent: 'center',

      alignItems: 'center',

      backgroundColor:
        CustomColors.appScreenColor,
    },

    loadingText: {
      marginTop:
        verticalScale(10),

      fontSize:
        moderateScale(16),

      color:
        CustomColors.textDark,

      fontFamily:
        Fonts.regular,
    },

    /* HSN Modal styles */
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },

    modalContent: {
      backgroundColor: CustomColors.cardBackground,
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
      paddingHorizontal: horizontalScale(20),
      paddingTop: verticalScale(20),
      paddingBottom: verticalScale(40),
      maxHeight: '70%',
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(15),
    },

    modalTitle: {
      fontSize: moderateScale(18),
      fontWeight: '600',
      color: CustomColors.textDark,
      fontFamily: Fonts.semiBold,
    },

    modalSearchInput: {
      borderWidth: 1,
      borderColor: CustomColors.lightGray,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(12),
      fontSize: moderateScale(14),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
      marginBottom: verticalScale(10),
      backgroundColor: CustomColors.cardBackground,
    },

    modalList: {
      maxHeight: verticalScale(300),
    },

    modalItem: {
      paddingVertical: verticalScale(12),
      paddingHorizontal: horizontalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CustomColors.lightGray,
    },

    modalItemText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
      fontFamily: Fonts.regular,
    },

    modalLoading: {
      paddingVertical: verticalScale(15),
      alignItems: 'center',
    },

    modalNoResults: {
      paddingVertical: verticalScale(15),
      alignItems: 'center',
    },

    modalNoResultsText: {
      fontSize: moderateScale(15),
      color: CustomColors.textLightGray,
      fontFamily: Fonts.regular,
    },

    closeModalButton: {
      padding: moderateScale(8),
    },

    footerLoader: {
      paddingVertical: verticalScale(10),
      alignItems: 'center',
    },
  });

  /* ==========================================================================
   * UPDATE ITEM
   * ======================================================================== */

  const updateItem = useCallback(
    (tempId, patch) => {
      setHasUnsavedChanges(true);

      setItems((prev) =>
        prev.map((item) =>
          item.tempId === tempId
            ? {
              ...item,
              ...patch,
            }
            : item
        )
      );
    },
    []
  );

  const getItem = useCallback(
    (tempId) =>
      items.find(
        (item) =>
          item.tempId === tempId
      ),
    [items]
  );

  /* ==========================================================================
   * EXPAND
   * ======================================================================== */

  const toggleExpand = useCallback(
    (tempId) => {
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut
      );

      setExpandedItems((prev) => ({
        ...prev,
        [tempId]: !prev[tempId],
      }));
    },
    []
  );

  /* ==========================================================================
   * DATE
   * ======================================================================== */

  const applyDateValue = useCallback(
    (tempId, field, selectedDate) => {
      const formatted =
        formatDateToCustomString(
          selectedDate
        );

      const item =
        getItem(tempId);

      if (!item) return;

      if (field === 'depaturedate') {
        updateItem(tempId, {
          depaturedate: formatted,
          arrivaldate: '',
        });

        return;
      }

      if (field === 'arrivaldate') {
        const depYMD = formatDateToYMD(item?.depaturedate);
        const arrYMD = formatted;

        if (depYMD && arrYMD && arrYMD < depYMD) {
          ToastMessage(
            'Arrival Date cannot be before Departure Date.'
          );

          return;
        }

        updateItem(tempId, {
          arrivaldate: formatted,
        });

        return;
      }

      if (field === 'invoicedate') {
        updateItem(tempId, {
          invoicedate: formatted,
        });
      }
    },
    [getItem, updateItem]
  );

  const openCustomDatePicker = useCallback(
    (tempId, field) => {
      const item = getItem(tempId);
      if (!item) return;

      const isTempItem = !item?.id;
      if (!isItemEditableGlobally && !isTempItem && field !== 'invoicedate') {
        return;
      }

      const currentVal = item?.[field];
      setCustomDatePickerConfig({
        visible: true,
        tempId,
        field,
        initialDate: currentVal || '',
      });
    },
    [getItem, isItemEditableGlobally]
  );

  const handleCustomDateConfirm = useCallback(
    (formattedDate) => {
      const { tempId, field } = customDatePickerConfig;
      if (!tempId || !field) return;

      updateItem(tempId, {
        [field]: formattedDate,
      });

      setCustomDatePickerConfig({
        visible: false,
        tempId: null,
        field: null,
        initialDate: '',
      });
    },
    [customDatePickerConfig, updateItem]
  );

  const showDatepicker = useCallback(
    (tempId, field) => {
      if (field === 'invoicedate') {
        openCustomDatePicker(tempId, 'invoicedate');
        return;
      }

      const item =
        getItem(tempId);

      const isTempItem =
        !item?.id;

      if (
        !isItemEditableGlobally &&
        !isTempItem
      ) {
        return;
      }

      setCurrentItemIdForDate(
        tempId
      );

      setCurrentDateField(
        field
      );

      let rowMin = minDate;
      let rowMax = maxDate;

      if (
        field === 'arrivaldate' &&
        item?.depaturedate
      ) {
        const depD = parseDateForMinMaxRange(item.depaturedate, false);
        if (depD && (!rowMin || depD > rowMin)) {
          rowMin = depD;
        }
      }

      if (
        field === 'depaturedate' &&
        item?.arrivaldate
      ) {
        const arrD = parseDateForMinMaxRange(item.arrivaldate, true);
        if (arrD && (!rowMax || arrD < rowMax)) {
          rowMax = arrD;
        }
      }

      if (field === 'invoicedate') {
        rowMin = undefined;
        rowMax = undefined;
      }

      // Ensure valid min/max boundaries
      if (rowMin && rowMax && rowMin.getTime() > rowMax.getTime()) {
        rowMax = undefined;
      }

      const rawVal = item?.[field];
      let currentVal = null;
      if (rawVal && rawVal !== 'N/A') {
        currentVal = parseCustomDate(rawVal);
      }
      if (!currentVal || isNaN(currentVal.getTime())) {
        currentVal = (field !== 'invoicedate' && rowMin && !isNaN(rowMin.getTime())) ? rowMin : new Date();
      }
      if (rowMin && currentVal < rowMin) currentVal = rowMin;
      if (rowMax && currentVal > rowMax) currentVal = rowMax;

      if (
        Platform.OS === 'android'
      ) {
        const pickerOptions = {
          value: currentVal,

          mode: 'date',

          is24Hour: true,

          display: 'default',

          onChange: (
            event,
            selectedDate
          ) => {
            if (
              event.type ===
              'dismissed' ||
              !selectedDate
            ) {
              return;
            }

            if (
              field ===
              'invoicedate'
            ) {
              applyDateValue(
                tempId,
                field,
                selectedDate
              );

              return;
            }

            applyDateValue(
              tempId,
              field,
              selectedDate
            );
          },
        };

        if (rowMin && !isNaN(rowMin.getTime())) {
          pickerOptions.minimumDate = new Date(
            rowMin.getFullYear(),
            rowMin.getMonth(),
            rowMin.getDate(),
            0,
            0,
            0,
            0
          );
        }

        if (rowMax && !isNaN(rowMax.getTime())) {
          pickerOptions.maximumDate = new Date(
            rowMax.getFullYear(),
            rowMax.getMonth(),
            rowMax.getDate(),
            23,
            59,
            59,
            999
          );
        }

        DateTimePickerAndroid.open(pickerOptions);
      } else {
        setShowDatePicker(true);
      }
    },
    [
      getItem,
      isItemEditableGlobally,
      minDate,
      maxDate,
      applyDateValue,
    ]
  );

  const handleDateChange = useCallback(
    (event, selectedDate) => {
      setShowDatePicker(
        Platform.OS === 'ios'
      );

      if (
        event.type === 'set' &&
        selectedDate &&
        currentItemIdForDate &&
        currentDateField
      ) {
        applyDateValue(
          currentItemIdForDate,
          currentDateField,
          selectedDate
        );
      }
    },
    [
      currentItemIdForDate,
      currentDateField,
      applyDateValue,
    ]
  );

  /* ==========================================================================
   * SCROLL TIME PICKER
   * ======================================================================== */

  const openTimePicker = useCallback(
    (tempId, field) => {
      const item = getItem(tempId);

      if (!item) return;

      const currentValue = String(item?.[field] || '00:00').trim();
      const ampmMatch = currentValue.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      let initialHour = '00';
      let initialMinute = '00';
      if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        const m = ampmMatch[2];
        const ampm = ampmMatch[3]?.toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        initialHour = String(h).padStart(2, '0');
        initialMinute = String(m).padStart(2, '0');
      }

      setTimePickerItemId(tempId);
      setTimePickerField(field);
      setSelectedHour(initialHour);
      setSelectedMinute(initialMinute);
      setTimePickerVisible(true);
    },
    [getItem]
  );

  const closeTimePicker = useCallback(() => {
    setTimePickerVisible(false);
    setTimePickerItemId(null);
    setTimePickerField(null);
  }, []);

  const applyTimeValue = useCallback(() => {
    if (!timePickerItemId || !timePickerField) return;

    const value24 = `${selectedHour}:${selectedMinute}`;
    const value = formatTimeTo12HourForApi(value24);
    const item = getItem(timePickerItemId);

    if (!item) {
      closeTimePicker();
      return;
    }

    if (timePickerField === 'arrivaltime' && item.depaturedate && item.arrivaldate) {
      const departureDate = parseCustomDate(
        `${formatDateOnly(item.depaturedate)} ${item.depaturetime || '12:00 AM'}`
      );
      const arrivalDate = parseCustomDate(
        `${formatDateOnly(item.arrivaldate)} ${value}`
      );

      if (arrivalDate.getTime() < departureDate.getTime()) {
        ToastMessage('Arrival Date/Time cannot be before Departure Date/Time.');
        return;
      }
    }

    if (timePickerField === 'depaturetime' && item.depaturedate && item.arrivaldate && item.arrivaltime) {
      const departureDate = parseCustomDate(
        `${formatDateOnly(item.depaturedate)} ${value}`
      );
      const arrivalDate = parseCustomDate(
        `${formatDateOnly(item.arrivaldate)} ${item.arrivaltime}`
      );

      if (departureDate.getTime() > arrivalDate.getTime()) {
        ToastMessage('Departure Date/Time cannot be after Arrival Date/Time.');
        return;
      }
    }

    updateItem(timePickerItemId, { [timePickerField]: value });
    closeTimePicker();
  }, [
    timePickerItemId,
    timePickerField,
    selectedHour,
    selectedMinute,
    getItem,
    updateItem,
    closeTimePicker,
  ]);

  /* ==========================================================================
   * HSN DROPDOWN PICKER (with Pagination)
   * ======================================================================== */

  const [searchHsn] = useLazySearchHsnQuery();
  const hsnPageRef = useRef(1);
  const hsnLoadingRef = useRef(false);
  const hsnSearchRequestRef = useRef(0);

  const fetchHsnSuggestions = useCallback(
    async (query = '', page = 1, append = false) => {
      const normalizedQuery = String(query || '').trim();

      // Do not send a one-character search. Empty query is valid and is used
      // when the HSN field is opened to load page 1.
      if (normalizedQuery.length === 1) {
        return;
      }

      if (hsnLoadingRef.current) {
        return;
      }

      hsnLoadingRef.current = true;
      if (page === 1) {
        setIsHsnLoading(true);
      } else {
        setIsHsnLoadingMore(true);
      }

      const requestId = ++hsnSearchRequestRef.current;

      try {
        const result = await searchHsn({
          query: normalizedQuery,
          page,
        }).unwrap();

        // Ignore an old response if the user has already started another
        // search/opened the picker again.
        if (requestId !== hsnSearchRequestRef.current) {
          return;
        }

        const suggestions = Array.isArray(result?.data) ? result.data : [];
        const pagination = result?.pagination || {};
        const hasNext = Boolean(pagination?.has_next);

        if (append) {
          setHsnSuggestions((prev) => {
            const existingIds = new Set(
              prev.map((item) => String(item?.id ?? item?.code ?? ''))
            );
            const newItems = suggestions.filter(
              (item) => !existingIds.has(String(item?.id ?? item?.code ?? ''))
            );
            return [...prev, ...newItems];
          });
        } else {
          setHsnSuggestions(suggestions);
        }

        // IMPORTANT: backend pagination.has_next is the source of truth.
        setHsnHasMore(hasNext);
        hsnPageRef.current = page;
        setHsnPage(page);
      } catch (error) {
        if (requestId === hsnSearchRequestRef.current) {
          console.log('HSN search error:', error);
          if (!append) {
            setHsnSuggestions([]);
          }
          setHsnHasMore(false);
        }
      } finally {
        if (requestId === hsnSearchRequestRef.current) {
          hsnLoadingRef.current = false;
          if (page === 1) {
            setIsHsnLoading(false);
          } else {
            setIsHsnLoadingMore(false);
          }
        }
      }
    },
    [searchHsn]
  );

  const openHsnPicker = useCallback(
    (tempId) => {
      if (!isItemEditableGlobally) {
        ToastMessage('This field cannot be modified.');
        return;
      }

      hsnSearchRequestRef.current += 1;
      hsnPageRef.current = 1;
      hsnLoadingRef.current = false;

      setHsnTempId(tempId);
      setHsnSearchQuery('');
      setHsnSuggestions([]);
      setHsnPage(1);
      setHsnHasMore(false);
      setHsnModalVisible(true);

      // Field click must immediately load backend page 1:
      // /search_hsn?query=&page=1
      fetchHsnSuggestions('', 1, false);
    },
    [isItemEditableGlobally, fetchHsnSuggestions]
  );

  const handleHsnSearchChange = useCallback(
    (text) => {
      const value = String(text || '');
      setHsnSearchQuery(value);

      if (hsnSearchTimeout.current) {
        clearTimeout(hsnSearchTimeout.current);
      }

      // Every new search starts from page 1. Invalidate the previous request
      // so an older response cannot overwrite this search result.
      hsnSearchRequestRef.current += 1;
      hsnPageRef.current = 1;
      hsnLoadingRef.current = false;
      setHsnPage(1);
      setHsnHasMore(false);

      if (value.trim().length === 1) {
        setHsnSuggestions([]);
        return;
      }

      hsnSearchTimeout.current = setTimeout(() => {
        fetchHsnSuggestions(value, 1, false);
      }, 300);
    },
    [fetchHsnSuggestions]
  );

  const selectHsnSuggestion = useCallback(
    (hsnItem) => {
      if (!hsnTempId) return;

      const hsnCode =
        hsnItem?.code ||
        hsnItem?.hsncode ||
        hsnItem?.value ||
        String(hsnItem || '');

      const hsnRate = parseFloat(hsnItem?.igstrate ?? hsnItem?.igst_rate ?? 0);
      const item = getItem(hsnTempId);

      const gstResults = calculateGstAmounts(
        item?.taxableamount,
        hsnRate,
        item?.vendorgstno,
        item?.bankgstno || bankGst
      );

      updateItem(hsnTempId, {
        hsncode: hsnCode,
        hsnigstrate: hsnRate,
        ...gstResults,
      });

      setHsnModalVisible(false);
      setHsnSearchQuery('');
      setHsnSuggestions([]);
      setHsnTempId(null);
      hsnPageRef.current = 1;
      setHsnPage(1);
      setHsnHasMore(false);
    },
    [hsnTempId, getItem, updateItem, bankGst]
  );

  const closeHsnModal = useCallback(() => {
    hsnSearchRequestRef.current += 1;
    hsnPageRef.current = 1;
    hsnLoadingRef.current = false;

    setHsnModalVisible(false);
    setHsnSearchQuery('');
    setHsnSuggestions([]);
    setHsnTempId(null);
    setHsnPage(1);
    setHsnHasMore(false);

    if (hsnSearchTimeout.current) {
      clearTimeout(hsnSearchTimeout.current);
      hsnSearchTimeout.current = null;
    }
  }, []);

  const handleHsnLoadMore = useCallback(() => {
    if (
      !hsnModalVisible ||
      hsnLoadingRef.current ||
      isHsnLoadingMore ||
      isHsnLoading ||
      !hsnHasMore
    ) {
      return;
    }

    const nextPage = hsnPageRef.current + 1;
    fetchHsnSuggestions(hsnSearchQuery, nextPage, true);
  }, [
    hsnModalVisible,
    isHsnLoadingMore,
    isHsnLoading,
    hsnHasMore,
    hsnSearchQuery,
    fetchHsnSuggestions,
  ]);

  /* ==========================================================================
   * VENDOR GST VALIDATION & CALCULATION
   * ======================================================================== */

  const [validatingVendorGstId, setValidatingVendorGstId] = useState(null);

  const handleVendorGstChange = useCallback(
    (tempId, text) => {
      const upperGst = (text || '').toUpperCase().replace(/\s/g, '');
      const item = getItem(tempId);
      const gstResults = calculateGstAmounts(
        item?.taxableamount,
        item?.hsnigstrate,
        upperGst,
        item?.bankgstno || bankGst
      );

      updateItem(tempId, {
        vendorgstno:
          gstResults.vendorgstno !== undefined
            ? gstResults.vendorgstno
            : upperGst,
        suppliergstno:
          gstResults.vendorgstno !== undefined
            ? gstResults.vendorgstno
            : upperGst,
        validateGst: false,
        suppliergstvalidated: false,
        vendorname: '',
        vendorcode: '',
        address: '',
        ...gstResults,
      });
    },
    [getItem, updateItem, bankGst]
  );

  const handleSupplierGstChange = handleVendorGstChange;

  const handleValidateGst = useCallback(
    async (tempId) => {
      const item = getItem(tempId);
      if (!item) return;

      let gst = (item.vendorgstno || item.suppliergstno || '')
        .trim()
        .toUpperCase();

      // Auto-fetch default vendor GST if not manually entered
      if (!gst) {
        gst = DEFAULT_VENDOR_GST;
      }

      if (!GST_REGEX.test(gst)) {
        ToastMessage('Please Enter Valid GST No');
        return;
      }

      if (validatingVendorGstId === tempId) return;

      try {
        setValidatingVendorGstId(tempId);

        let responseData = null;
        let validationStatus = null;

        try {
          const res = await triggerValidateSupplierGst({ value: gst }).unwrap();
          responseData = res;
          validationStatus = res?.validation_status;
        } catch (rtkErr) {
          console.log('RTK GST validate error, trying fallback fetch:', rtkErr);
          try {
            const url = `${SUPPLIER_GST_VALIDATE_API}?type=gst&value=${encodeURIComponent(
              gst
            )}`;
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
            });
            if (response.ok) {
              responseData = await response.json();
              validationStatus = responseData?.validation_status;
            }
          } catch (fetchErr) {
            console.log('Fallback fetch error:', fetchErr);
          }
        }

        if (
          !validationStatus ||
          validationStatus === false ||
          validationStatus === 'false'
        ) {
          updateItem(tempId, {
            validateGst: false,
            suppliergstvalidated: false,
            vendorname: '',
            vendorcode: '',
            address: '',
          });
          ToastMessage('Please Enter Valid GST No');
          return;
        }

        const statusObj =
          typeof validationStatus === 'object' && validationStatus !== null
            ? validationStatus
            : responseData;

        const resolvedGst =
          statusObj?.gstin ||
          responseData?.gstin ||
          statusObj?.GSTIN ||
          gst;

        const vendorName =
          statusObj?.tradeNam ||
          statusObj?.lgnm ||
          responseData?.tradeNam ||
          responseData?.name ||
          '';

        const vendorCode =
          statusObj?.ctjCd ||
          statusObj?.vendorcode ||
          statusObj?.vendorCode ||
          statusObj?.code ||
          '';

        const addr =
          statusObj?.pradr?.addr || responseData?.pradr?.addr;
        let vendorAddress = '';
        if (addr) {
          const addressParts = [
            addr?.bno,
            addr?.bnm,
            addr?.st,
            addr?.loc,
            addr?.city,
            addr?.dst,
            addr?.stcd,
            addr?.pncd,
          ].filter(Boolean);
          vendorAddress = addressParts.join(', ');
        } else if (typeof statusObj?.address === 'string') {
          vendorAddress = statusObj.address;
        } else if (typeof responseData?.address === 'string') {
          vendorAddress = responseData.address;
        }

        const effectiveBankGst =
          item.bankgstno || bankGst || DEFAULT_BANK_GST;
        const gstResults = calculateGstAmounts(
          item.taxableamount,
          item.hsnigstrate,
          resolvedGst,
          effectiveBankGst
        );

        updateItem(tempId, {
          vendorgstno: resolvedGst,
          suppliergstno: resolvedGst,
          validateGst: true,
          suppliergstvalidated: true,
          vendorname: vendorName,
          vendorcode: vendorCode,
          address: vendorAddress,
          ...gstResults,
        });

        Alert.alert(
          'Vendor GST Details',
          `GSTIN: ${resolvedGst}\nTrade Name: ${vendorName || 'N/A'}\nVendor Code: ${vendorCode || 'N/A'}\nAddress: ${vendorAddress || 'N/A'}`,
          [{ text: 'OK' }]
        );

        ToastMessage('Vendor GST & details auto-fetched and populated.');
      } catch (error) {
        console.log('Vendor GST Validation Error:', error);
        ToastMessage(
          error?.data?.description ||
          error?.message ||
          'Unable to validate GST No.'
        );
      } finally {
        setValidatingVendorGstId(null);
      }
    },
    [
      getItem,
      updateItem,
      validatingVendorGstId,
      bankGst,
      triggerValidateSupplierGst,
    ]
  );

  const handleValidateSupplierGst = handleValidateGst;

  /* ==========================================================================
   * DROPDOWN CHANGES
   * ======================================================================== */

  const handleActualTravelChange =
    useCallback(
      (tempId, value) => {
        updateItem(tempId, {
          actualtravel: value,
          classoftravel: '',
        });
      },
      [updateItem]
    );

  const handlePriorPermissionChange =
    useCallback(
      (tempId, value) => {
        updateItem(tempId, {
          priorpermission: value,

          highermodeopted:
            value === '0'
              ? '0'
              : getItem(tempId)
                ?.highermodeopted ||
              '',
        });
      },
      [updateItem, getItem]
    );

  const handleDependentToggleChange =
    useCallback(
      (tempId, value) => {
        if (value === '0') {
          updateItem(tempId, {
            dependent: value,

            dependencies_relation: [],

            noofdependents: 0,
          });

          setDependentOpenState(
            (prev) => ({
              ...prev,
              [tempId]: false,
            })
          );
        } else {
          updateItem(tempId, {
            dependent: value,
          });
        }
      },
      [updateItem]
    );

  /* ==========================================================================
   * DEPENDENT
   * ======================================================================== */

  const toggleDependentSection =
    useCallback(
      (tempId) => {
        setDependentOpenState(
          (prev) => {
            const next = {
              ...prev,
              [tempId]:
                !prev[tempId],
            };

            if (next[tempId]) {
              const item =
                getItem(tempId);

              if (
                !item
                  ?.dependencies_relation
                  ?.length
              ) {
                updateItem(tempId, {
                  dependencies_relation: [
                    {
                      name: '',
                      relation: '',
                    },
                  ],
                });
              }
            }

            return next;
          }
        );
      },
      [getItem, updateItem]
    );

  const addDependentRow =
    useCallback(
      (tempId) => {
        const item =
          getItem(tempId);

        if (!item) return;

        updateItem(tempId, {
          dependencies_relation: [
            ...item.dependencies_relation,
            {
              name: '',
              relation: '',
            },
          ],
        });
      },
      [getItem, updateItem]
    );

  const updateDependentField =
    useCallback(
      (
        tempId,
        depIndex,
        field,
        value
      ) => {
        const item =
          getItem(tempId);

        if (!item) return;

        const updated =
          item.dependencies_relation.map(
            (dep, index) =>
              index === depIndex
                ? {
                  ...dep,
                  [field]: value,
                }
                : dep
          );

        updateItem(tempId, {
          dependencies_relation:
            updated,
        });
      },
      [getItem, updateItem]
    );

  const removeDependentRow = useCallback(
    async (tempId, depIndex) => {
      const item = getItem(tempId);

      if (!item) return;

      const effectiveTourId =
        tourId ||
        routeTourId ||
        item?.tourid ||
        item?.tour_id;

      if (!effectiveTourId) {
        ToastMessage(
          'Tour ID is missing. Please reload the claim.'
        );
        return;
      }

      const dep = item.dependencies_relation?.[depIndex];

      if (dep?.id && typeof dep.id === 'number') {
        try {
          await deleteLodgingDependent(
            `id=${dep.id}&tour_id=${effectiveTourId}&expense_id=1&status=0`
          ).unwrap();
        } catch (err) {
          ToastMessage(
            err?.data?.description || 'Failed to delete dependent.'
          );
          return;
        }
      }

      const updated = item.dependencies_relation.filter(
        (_, index) => index !== depIndex
      );

      updateItem(tempId, {
        dependencies_relation: updated,
      });

      ToastMessage('Deleted Successfully.');
    },
    [getItem, updateItem, deleteLodgingDependent, tourId]
  );

  /* ==========================================================================
   * ADD ITEM
   * ======================================================================== */

  const handleAddItem =
    useCallback(() => {
      if (!isItemEditableGlobally) {
        ToastMessage(
          'This claim cannot be modified in its current status.'
        );

        return;
      }

      LayoutAnimation.easeInEaseOut();

      const newItem =
        createItem({
          tourId,

          comment:
            requestercomment,

          bankGst,

          eligibleClass,
        });

      setItems((prev) => [
        ...prev,
        newItem,
      ]);

      setExpandedItems(
        (prev) => ({
          ...prev,
          [newItem.tempId]: true,
        })
      );

      setHasUnsavedChanges(true);
    }, [
      isItemEditableGlobally,
      tourId,
      requestercomment,
      bankGst,
      eligibleClass,
    ]);

  /* ==========================================================================
   * DELETE ITEM
   * ======================================================================== */

  const handleDeleteItem = useCallback(
    (tempId) => {
      const item = getItem(tempId);
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this expense item?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },

          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (item?.id && typeof item.id === 'number') {
                try {
                  await deleteTravelExpense(item.id).unwrap();
                } catch (err) {
                  ToastMessage(
                    err?.data?.description || 'Failed to delete expense.'
                  );
                  return;
                }
              }

              setItems((prev) =>
                prev.filter((it) => it.tempId !== tempId)
              );

              setHasUnsavedChanges(true);

              ToastMessage('Deleted Successfully.');
            },
          },
        ]
      );
    },
    [getItem, deleteTravelExpense]
  );

  /* ==========================================================================
   * VALIDATION
   * ======================================================================== */

  const validateItems =
    useCallback((rows) => {
      for (
        let i = 0;
        i < rows.length;
        i++
      ) {
        const el = rows[i];

        const rowNo = i + 1;

        if (!el.depaturedate) {
          return `Row ${rowNo}: Please Select Departure Date`;
        }

        if (!el.depaturetime) {
          return `Row ${rowNo}: Please Enter Departure Time`;
        }

        if (!el.depatureplace) {
          return `Row ${rowNo}: Please Enter Departure Place`;
        }

        if (!el.arrivaldate) {
          return `Row ${rowNo}: Please Select Arrival Date`;
        }

        if (!el.arrivaltime) {
          return `Row ${rowNo}: Please Enter Arrival Time`;
        }

        const depD = parseDateForMinMaxRange(el.depaturedate, false);
        const arrD = parseDateForMinMaxRange(el.arrivaldate, false);

        if (tourStartDate && minDate && depD && depD < minDate) {
          return `Row ${rowNo}: Departure Date (${formatDateOnly(el.depaturedate)}) cannot be before Tour Start Date (${formatDateOnly(tourStartDate)})`;
        }

        if (tourEndDate && maxDate && depD && depD > maxDate) {
          return `Row ${rowNo}: Departure Date (${formatDateOnly(el.depaturedate)}) cannot be after Tour End Date (${formatDateOnly(tourEndDate)})`;
        }

        if (tourStartDate && minDate && arrD && arrD < minDate) {
          return `Row ${rowNo}: Arrival Date (${formatDateOnly(el.arrivaldate)}) cannot be before Tour Start Date (${formatDateOnly(tourStartDate)})`;
        }

        if (tourEndDate && maxDate && arrD && arrD > maxDate) {
          return `Row ${rowNo}: Arrival Date (${formatDateOnly(el.arrivaldate)}) cannot be after Tour End Date (${formatDateOnly(tourEndDate)})`;
        }

        const departureDate =
          parseCustomDate(
            `${formatDateOnly(
              el.depaturedate
            )} ${el.depaturetime}`
          );

        const arrivalDate =
          parseCustomDate(
            `${formatDateOnly(
              el.arrivaldate
            )} ${el.arrivaltime}`
          );

        if (
          departureDate.getTime() >
          arrivalDate.getTime()
        ) {
          return `Row ${rowNo}: Arrival Date and Time should be after Departure Date and Time`;
        }

        if (!el.placeofvisit) {
          return `Row ${rowNo}: Please Enter Place Of Visit`;
        }

        if (
          !el.totaltkttamt ||
          parseFloat(
            el.totaltkttamt
          ) <= 0
        ) {
          return `Row ${rowNo}: Total Ticket Amount should be greater than Zero`;
        }

        if (
          el.tktbybank === '1' &&
          (!el.tktrefno ||
            el.tktrefno === '0')
        ) {
          return `Row ${rowNo}: Please Enter Ticket Reference Number`;
        }

        if (!el.actualtravel) {
          return `Row ${rowNo}: Please Select Actual Mode of Travel`;
        }

        if (!el.classoftravel) {
          return `Row ${rowNo}: Please Select Class of Travel`;
        }

        if (
          el.priorpermission ===
          '1' &&
          !el.highermodeopted
        ) {
          return `Row ${rowNo}: Please Enter Higher Mode`;
        }

        if (
          !el.claimedamount ||
          parseFloat(
            el.claimedamount
          ) <= 0
        ) {
          return `Row ${rowNo}: Please Enter Claim Amount`;
        }

        if (
          parseFloat(
            el.invoiceamount || 0
          ) <
          parseFloat(
            el.claimedamount || 0
          )
        ) {
          return `Row ${rowNo}: Invoice Amount must be greater than or equal to Claim Amount`;
        }

        /* Supplier GST validation – must be validated if entered */
        if (
          el.suppliergstno &&
          !el.suppliergstvalidated
        ) {
          return `Row ${rowNo}: Please validate Supplier GST No`;
        }

        if (
          el.vendorgstno &&
          !el.validateGst
        ) {
          return `Row ${rowNo}: Please validate Vendor GST No`;
        }

        if (
          el.dependent === '1'
        ) {
          if (
            !el
              .dependencies_relation
              ?.length
          ) {
            return `Row ${rowNo}: Please add Dependent Data`;
          }

          for (
            let k = 0;
            k <
            el.dependencies_relation
              .length;
            k++
          ) {
            if (
              !el
                .dependencies_relation[k]
                .name
            ) {
              return `Row ${rowNo}: Please Enter Dependent Name`;
            }

            if (
              !el
                .dependencies_relation[k]
                .relation
            ) {
              return `Row ${rowNo}: Please Enter Dependent Relation`;
            }
          }
        }
      }

      return null;
    }, [minDate, maxDate, tourStartDate, tourEndDate]);

  /* ==========================================================================
   * BUILD PAYLOAD
   * ======================================================================== */

  const buildPayload = useCallback(
    (rows = []) => {
      const effectiveTourId =
        tourId ||
        routeTourId ||
        rows?.[0]?.tourid ||
        rows?.[0]?.tour_id ||
        rows?.[0]?.tourgid;

      return rows.map((el) => {
        const rawTourId =
          el?.tourid ??
          el?.tour_id ??
          el?.tourgid ??
          effectiveTourId;

        const itemTourId =
          Number(rawTourId) || rawTourId || null;

        const isDependent =
          el?.dependent === '1' ||
          el?.dependent === 1 ||
          el?.dependent === true;

        const depList = isDependent
          ? (Array.isArray(el?.dependencies_relation)
            ? el.dependencies_relation
            : []
          ).map((d) => ({
            id:
              d?.id !== undefined &&
                d?.id !== null &&
                d?.id !== '' &&
                !isNaN(Number(d.id))
                ? Number(d.id)
                : d?.id || null,
            name: d?.name || '',
            relation: d?.relation || '',
            tour_id: itemTourId,
            expense_id: 1,
          }))
          : [];

        const rawHsn =
          typeof el?.hsncode === 'object' && el?.hsncode !== null
            ? el.hsncode.code || el.hsncode.hsncode || null
            : el?.hsncode;

        const finalHsn =
          rawHsn !== undefined &&
            rawHsn !== null &&
            String(rawHsn).trim() !== ''
            ? String(rawHsn).trim()
            : null;

        const refNo = el?.tktrefno;
        const finalRefNo =
          refNo === undefined ||
            refNo === null ||
            String(refNo).trim() === '' ||
            String(refNo).trim() === '0'
            ? 0
            : isNaN(Number(refNo))
              ? String(refNo).trim()
              : Number(refNo);

        const claimed =
          parseFloat(el?.claimedamount) || 0;

        const approved =
          parseFloat(el?.approvedamount) || claimed;

        const rawId = el?.id;

        const rowId =
          rawId &&
            !isNaN(Number(rawId)) &&
            !String(rawId).startsWith('temp-') &&
            Number(rawId) > 0
            ? Number(rawId)
            : null;

        return {
          dependencies: [],
          dependent: isDependent ? 1 : 0,
          dependencies_relation: depList,
          requestercomment:
            el?.requestercomment ?? requestercomment ?? '',
          expenseid:
            Number(el?.expenseid ?? expenseid) || 1,
          tourid: itemTourId,
          ...(rowId ? { id: rowId } : {}),
          claimedamount: claimed,
          depaturedate:
            formatDateToYMD(el?.depaturedate),
          depaturetime:
            formatTimeTo12HourForApi(el?.depaturetime),
          depatureplace:
            el?.depatureplace || '',
          arrivaldate:
            formatDateToYMD(el?.arrivaldate),
          arrivaltime:
            formatTimeTo12HourForApi(el?.arrivaltime),
          placeofvisit:
            el?.placeofvisit || '',
          totaltkttamt:
            String(el?.totaltkttamt ?? '0'),
          tktrefno: finalRefNo,
          tktbybank:
            String(el?.tktbybank ?? '0'),
          actualtravel:
            String(
              el?.actualtravel?.value ??
              el?.actualtravel ??
              ''
            ),
          highermodereasons:
            String(el?.highermodereasons ?? '0'),
          priorpermission:
            String(el?.priorpermission ?? '0'),
          highermodeopted:
            String(el?.highermodeopted ?? '0'),
          classoftravel:
            String(
              el?.classoftravel?.value ??
              el?.classoftravel ??
              ''
            ),
          noofdependents:
            Number(el?.noofdependents) ||
            depList.length ||
            0,
          hsncode: finalHsn || '0000',
          vendorname:
            el?.vendorname || '',
          vendorcode:
            el?.vendorcode || '',
          bankgstno:
            el?.bankgstno || bankGst || '',
          taxableamount:
            parseFloat(el?.taxableamount) || 0,
          invoiceamount:
            parseFloat(el?.invoiceamount) || 0,
          address:
            el?.address || '',
          vendorgstno:
            el?.vendorgstno || '',
          igst:
            parseFloat(el?.igst) || 0,
          cgst:
            parseFloat(el?.cgst) || 0,
          sgst:
            parseFloat(el?.sgst) || 0,
          igstp:
            parseFloat(
              el?.igstp ?? el?.hsnigstrate ?? 0
            ) || 0,
          cgstp:
            parseFloat(
              el?.cgstp ??
              (el?.hsnigstrate
                ? el.hsnigstrate / 2
                : 0)
            ) || 0,
          sgstp:
            parseFloat(
              el?.sgstp ??
              (el?.hsnigstrate
                ? el.hsnigstrate / 2
                : 0)
            ) || 0,
          approvedamount: approved,
          gstno:
            el?.gstno || el?.vendorgstno || '',
          invoicedate:
            formatDateToYMD(el?.invoicedate) || null,
          invoiceno:
            el?.billno || el?.invoiceno || null,
        };
      });
    },
    [
      expenseid,
      tourId,
      routeTourId,
      bankGst,
      expense,
      requestercomment,
    ]
  );

  /* ==========================================================================
   * SUBMIT ALL CHANGES
   * ======================================================================== */

  const handleSubmitAllChanges =
    useCallback(async () => {
      if (!isItemEditableGlobally || isSubmitting) {
        return;
      }

      const effectiveTourId =
        tourId ||
        routeTourId ||
        items?.[0]?.tourid ||
        items?.[0]?.tour_id ||
        items?.[0]?.tourgid;

      if (!effectiveTourId) {
        ToastMessage(
          'Tour ID is missing for this claim. Please go back and open this claim again.'
        );
        return;
      }

      if (!Array.isArray(items) || items.length === 0) {
        ToastMessage('No travel expense details found.');
        return;
      }

      const validationError = validateItems(items);

      console.log(
        '[TravelDetails] Validation Error:',
        validationError
      );

      if (validationError) {
        ToastMessage(validationError);
        return;
      }

      try {
        const data = buildPayload(items);

        const payload = {
          data,
        };

        console.log(
          '[TravelDetails] Submit tour_id:',
          effectiveTourId
        );

        console.log(
          '[TravelDetails] Submit item count:',
          data.length
        );

        console.log(
          '[TravelDetails] FINAL SUBMIT PAYLOAD:',
          JSON.stringify(payload, null, 2)
        );

        const invalidRows = data.filter(
          (row) =>
            !row?.tourid ||
            !row?.expenseid
        );

        if (invalidRows.length > 0) {
          console.log(
            '[TravelDetails] INVALID PAYLOAD ROWS:',
            JSON.stringify(invalidRows, null, 2)
          );

          ToastMessage(
            'Travel payload is invalid. Please check the travel details.'
          );
          return;
        }

        const res = await travelSubmit(payload).unwrap();

        console.log(
          '[TravelDetails] SUBMIT RESPONSE:',
          JSON.stringify(res, null, 2)
        );

        if (
          res?.status === 'success' ||
          res?.message === 'Successfully Created' ||
          res?.message === 'Successfully Updated'
        ) {
          ToastMessage(
            res?.message || 'Successfully Created'
          );

          setHasUnsavedChanges(false);
          navigation.goBack();
          return;
        }

        console.log(
          '[TravelDetails] Backend rejected request:',
          JSON.stringify(res, null, 2)
        );

        ToastMessage(
          res?.description ||
          res?.message ||
          'Submission failed.'
        );
      } catch (error) {
        console.error(
          '[TravelDetails] Submit error FULL:',
          JSON.stringify(error, null, 2)
        );

        console.error(
          '[TravelDetails] Submit error data:',
          JSON.stringify(error?.data, null, 2)
        );

        console.error(
          '[TravelDetails] Submit error status:',
          error?.status
        );

        ToastMessage(
          error?.data?.description ||
          error?.data?.message ||
          error?.error ||
          error?.message ||
          'Submission failed.'
        );
      }
    }, [
      isItemEditableGlobally,
      isSubmitting,
      tourId,
      routeTourId,
      items,
      validateItems,
      buildPayload,
      travelSubmit,
      navigation,
      setHasUnsavedChanges,
    ]);

  /* ==========================================================================
   * APPROVE
   * ======================================================================== */

  const handleApprove = useCallback(async () => {
    const effectiveTourId =
      tourId ||
      routeTourId ||
      items[0]?.tourid ||
      items[0]?.tour_id ||
      items[0]?.tourgid;

    if (!effectiveTourId) {
      ToastMessage(
        'Tour ID is missing for this claim. Please go back and open this claim again.'
      );
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (
        !items[i].approvedamount ||
        parseFloat(items[i].approvedamount) <= 0
      ) {
        ToastMessage(`Row ${i + 1}: Please enter Approved Amount`);
        return;
      }
    }

    try {
      const applist = items.map((el) => ({
        id: el.id,
        amount: parseFloat(el.approvedamount) || 0,
        gst_no: el.vendorgstno || '',
        vendor_name: el.vendorname || '',
        invoice_no: el.billno || el.invoiceno || '',
        invoice_date: formatDateToYMD(el.invoicedate),
        vendor_code: el.vendorcode || '',
        vendor_address: el.address || '',
        hsn_code:
          typeof el.hsncode === 'object' && el.hsncode !== null
            ? (el.hsncode.code || el.hsncode.hsncode || '0000')
            : (el.hsncode || '0000'),
        taxable_amount: parseFloat(el.taxableamount) || 0,
        Cgst: parseFloat(el.cgst) || 0,
        Sgst: parseFloat(el.sgst) || 0,
        Igst: parseFloat(el.igst) || 0,
        invoice_amount: parseFloat(el.invoiceamount) || 0,
      }));

      console.log(
        '[TravelDetails] Approve tourId:',
        effectiveTourId,
        'payload:',
        applist
      );

      const res = await approveTravelExpense({
        tourId: effectiveTourId,
        payload: applist,
      }).unwrap();

      if (
        res?.status === 'success' ||
        res?.message === 'Successfully Created' ||
        res?.message === 'Successfully Updated'
      ) {
        ToastMessage('Approved successfully!');
        navigation.goBack();
      } else {
        ToastMessage(res?.description || 'Approval failed.');
      }
    } catch (error) {
      ToastMessage(
        error?.data?.description || 'Approval failed.'
      );
    }
  }, [tourId, routeTourId, items, approveTravelExpense, navigation]);

  /* ==========================================================================
   * PICKER
   * ======================================================================== */

  const openPicker =
    useCallback(
      (
        tempId,
        field,
        title,
        options
      ) => {
        setPickerConfig({
          tempId,
          field,
          title,
          options,
        });

        setActivePickerId(
          `${tempId}-${field}`
        );
      },
      []
    );

  const handlePickerSelect =
    useCallback(
      (selectedOption) => {
        if (!pickerConfig) {
          return;
        }

        const {
          tempId,
          field,
        } = pickerConfig;

        if (
          field ===
          'actualtravel'
        ) {
          handleActualTravelChange(
            tempId,
            selectedOption.value
          );
        } else if (
          field ===
          'priorpermission'
        ) {
          handlePriorPermissionChange(
            tempId,
            selectedOption.value
          );
        } else if (
          field ===
          'dependent'
        ) {
          handleDependentToggleChange(
            tempId,
            selectedOption.value
          );
        } else {
          updateItem(tempId, {
            [field]:
              selectedOption.value,
          });
        }
      },
      [
        pickerConfig,
        handleActualTravelChange,
        handlePriorPermissionChange,
        handleDependentToggleChange,
        updateItem,
      ]
    );

  const PickerItem =
    React.memo(
      ({
        options,
        onPress,
        setPickerStatus,
        selected,
      }) => (
        <TouchableOpacity
          style={[
            styles.actionSheetItem,
            selected ===
            options.value &&
            styles.actionSheetItemSelected,
          ]}
          onPress={() => {
            onPress(options);
            setPickerStatus(false);
          }}
        >
          <Text
            allowFontScaling={false}
            style={[
              styles.actionSheetItemText,
              selected ===
              options.value &&
              styles.actionSheetItemSelectedText,
            ]}
          >
            {options.name}
          </Text>
        </TouchableOpacity>
      )
    );

  const initialDatePickerDate = useMemo(() => {
    if (currentItemIdForDate && currentDateField) {
      const rawVal = getItem(currentItemIdForDate)?.[currentDateField];
      if (rawVal && rawVal !== 'N/A') {
        const parsed = parseCustomDate(rawVal);
        if (parsed && !isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      if (currentDateField !== 'invoicedate' && minDate && !isNaN(minDate.getTime())) {
        return minDate;
      }
    }
    return new Date();
  }, [currentItemIdForDate, currentDateField, getItem, minDate]);

  /* ==========================================================================
   * LOADING
   * ======================================================================== */

  if (
    isFetchingScreen ||
    isLoadingTravel ||
    isFetchingTravel
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={
            CustomColors.appThemeColor
          }
        />

        <Text
          allowFontScaling={false}
          style={
            styles.loadingText
          }
        >
          Please wait...
        </Text>
      </View>
    );
  }

  /* ==========================================================================
   * UI
   * ======================================================================== */

  return (
    <KeyboardAvoidingView
      style={
        styles.fullScreenContainer
      }
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? 90
          : verticalScale(110)
      }
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,

          paddingBottom:
            verticalScale(100),

          paddingHorizontal:
            horizontalScale(16),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ================================================================
         * ON BEHALF BANNER & TOUR DETAILS
         * ================================================================ */}

        {isOnBehalf && (
          <View
            style={{
              backgroundColor: CustomColors.cardBackground,
              borderRadius: moderateScale(12),
              padding: moderateScale(14),
              marginBottom: verticalScale(12),
              marginHorizontal: horizontalScale(10),
              borderLeftWidth: moderateScale(4),
              borderLeftColor: CustomColors.appThemeColor,
            }}
          >
            <Text
              allowFontScaling={false}
              style={{
                fontSize: moderateScale(16),
                fontFamily: Fonts.medium,
                color: CustomColors.textDark,
              }}
            >
              On Behalf Employee - {onBehalfEmpName}
            </Text>
          </View>
        )}

        <View
          style={styles.sectionCard}
        >
          <Text
            allowFontScaling={false}
            style={styles.sectionTitle}
          >
            Tour Details
          </Text>

          <View
            style={styles.detailRow}
          >
            <Text
              allowFontScaling={false}
              style={styles.boldText}
            >
              Tour No:
            </Text>

            <Text
              allowFontScaling={false}
              style={
                styles.detailValueText
              }
            >
              {travelNo || 'N/A'}
            </Text>
          </View>

          <View
            style={styles.detailRow}
          >
            <Text
              allowFontScaling={false}
              style={styles.boldText}
            >
              Employee Code:
            </Text>

            <Text
              allowFontScaling={false}
              style={
                styles.detailValueText
              }
            >
              {employeeCode || 'N/A'}
            </Text>
          </View>

          <View
            style={styles.detailRow}
          >
            <Text
              allowFontScaling={false}
              style={styles.boldText}
            >
              Employee Name:
            </Text>

            <Text
              allowFontScaling={false}
              style={
                styles.detailValueText
              }
            >
              {employeeName || 'N/A'}
            </Text>
          </View>

          <View
            style={styles.detailRow}
          >
            <Text
              allowFontScaling={false}
              style={styles.boldText}
            >
              Designation:
            </Text>

            <Text
              allowFontScaling={false}
              style={
                styles.detailValueText
              }
            >
              {employeeDesignation || 'N/A'}
            </Text>
          </View>

          <View
            style={styles.detailRow}
          >
            <Text
              allowFontScaling={false}
              style={styles.boldText}
            >
              Employee Grade:
            </Text>

            <Text
              allowFontScaling={false}
              style={
                styles.detailValueText
              }
            >
              {employeeGrade || 'N/A'}
            </Text>
          </View>
        </View>

        {/* ================================================================
         * EXPENSE TITLE
         * ================================================================ */}

        <View
          style={styles.detailRow}
        >
          <Text
            allowFontScaling={false}
            style={styles.mainHeading}
          >
            Travelling Expense Items
          </Text>

          {isItemEditableGlobally && (
            <TouchableOpacity
              onPress={handleAddItem}
              style={styles.plusicon}
            >
              <MaterialIcons
                name="add-circle"
                size={28}
                color={
                  CustomColors.appThemeColor
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ================================================================
         * EXPENSE ITEMS
         * ================================================================ */}

        {items.map(
          (item, index) => {
            const isTempItem =
              !item.id;

            const isRowEditable =
              isItemEditableGlobally ||
              isTempItem;

            const isExpanded =
              !!expandedItems[
              item.tempId
              ];

            const classOptions =
              classOptionsForMode(
                item.actualtravel
              );

            const showTktRef =
              item.tktbybank ===
              '1';

            const showApprovedAmount =
              approver &&
              Number(applevel) ===
              2;

            const isValidatingSupplierGst =
              validatingSupplierGstId ===
              item.tempId;

            return (
              <View
                key={item.tempId}
                style={
                  styles.expenseItemCard
                }
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <TouchableOpacity
                    onPress={() =>
                      toggleExpand(
                        item.tempId
                      )
                    }
                    style={{ flex: 1 }}
                  >
                    <Text
                      allowFontScaling={
                        false
                      }
                      style={
                        styles.cardTitle
                      }
                    >
                      Expense Item{' '}
                      {index + 1}
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={
                      styles.headerRightContainer
                    }
                  >
                    {!approver &&
                      !apuser_key && (
                        <TouchableOpacity
                          onPress={() =>
                            handleDeleteItem(
                              item.tempId
                            )
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={22}
                            color={
                              CustomColors.dangerRed ||
                              '#D93025'
                            }
                          />
                        </TouchableOpacity>
                      )}

                    <TouchableOpacity
                      onPress={() =>
                        toggleExpand(
                          item.tempId
                        )
                      }
                    >
                      <Text
                        allowFontScaling={
                          false
                        }
                        style={
                          styles.toggleIcon
                        }
                      >
                        {isExpanded
                          ? '▲'
                          : '▼'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isExpanded && (
                  <View
                    style={
                      styles.cardContent
                    }
                  >
                    {/* S.NO */}

                    <EditableRow
                      label="S.No"
                      value={index + 1}
                      isEditing={false}
                      isDisabled={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* DEPARTURE DATE */}

                    <EditableRow
                      label="Departure Date"
                      value={formatDateOnly(
                        item.depaturedate
                      )}
                      isEditing={true}
                      placeholder="Select Date"
                      isDatePicker={true}
                      onPressDatePicker={
                        isRowEditable
                          ? () =>
                            showDatepicker(
                              item.tempId,
                              'depaturedate'
                            )
                          : null
                      }
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      hasError={false}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* DEPARTURE TIME */}

                    <DropdownRow
                      label="Departure Time"
                      valueLabel={item.depaturetime}
                      onPress={() =>
                        isRowEditable
                          ? openTimePicker(item.tempId, 'depaturetime')
                          : null
                      }
                      isDisabled={!isRowEditable}
                      isRequired={true}
                      placeholder="Select Time"
                      styles={styles}
                      CustomColors={CustomColors}
                    />

                    {/* DEPARTURE PLACE */}

                    <EditableRow
                      label="Departure Place"
                      value={
                        item.depatureplace
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            depatureplace:
                              t,
                          }
                        )
                      }
                      isEditing={true}
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      hasError={false}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* ARRIVAL DATE */}

                    <EditableRow
                      label="Arrival Date"
                      value={formatDateOnly(
                        item.arrivaldate
                      )}
                      isEditing={true}
                      placeholder="Select Date"
                      isDatePicker={true}
                      onPressDatePicker={
                        isRowEditable
                          ? () =>
                            showDatepicker(
                              item.tempId,
                              'arrivaldate'
                            )
                          : null
                      }
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      hasError={false}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* ARRIVAL TIME */}

                    <DropdownRow
                      label="Arrival Time"
                      valueLabel={item.arrivaltime}
                      onPress={() =>
                        isRowEditable
                          ? openTimePicker(item.tempId, 'arrivaltime')
                          : null
                      }
                      isDisabled={!isRowEditable}
                      isRequired={true}
                      placeholder="Select Time"
                      styles={styles}
                      CustomColors={CustomColors}
                    />

                    {/* PLACE OF VISIT */}

                    <EditableRow
                      label="Place Of Visit"
                      value={
                        item.placeofvisit
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            placeofvisit:
                              t,
                          }
                        )
                      }
                      isEditing={true}
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      hasError={false}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* TOTAL TICKET AMOUNT */}

                    <EditableRow
                      label="Total Ticket Amount"
                      value={
                        item.totaltkttamt
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            totaltkttamt:
                              t.replace(
                                /[^0-9.]/g,
                                ''
                              ),
                          }
                        )
                      }
                      isEditing={true}
                      keyboardType="numeric"
                      placeholder="0"
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* TICKET BY BANK */}

                    <DropdownRow
                      label="Ticket By Bank"
                      valueLabel={
                        YES_NO_OPTIONS.find(
                          (option) =>
                            option.value ===
                            item.tktbybank
                        )?.name
                      }
                      onPress={() =>
                        openPicker(
                          item.tempId,
                          'tktbybank',
                          'Ticket By Bank',
                          YES_NO_OPTIONS
                        )
                      }
                      isDisabled={
                        !isRowEditable
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* TICKET REFERENCE */}

                    {showTktRef && (
                      <EditableRow
                        label="Ticket Reference Number"
                        value={
                          item.tktrefno
                        }
                        onChangeText={(
                          t
                        ) =>
                          updateItem(
                            item.tempId,
                            {
                              tktrefno:
                                t.replace(
                                  /[^0-9]/g,
                                  ''
                                ),
                            }
                          )
                        }
                        isEditing={true}
                        keyboardType="numeric"
                        isDisabled={
                          !isRowEditable
                        }
                        isRequired={true}
                        styles={styles}
                        CustomColors={
                          CustomColors
                        }
                      />
                    )}

                    {/* ACTUAL MODE */}

                    <DropdownRow
                      label="Actual Mode of Travel"
                      valueLabel={
                        ACTUAL_MODE_OPTIONS.find(
                          (option) =>
                            option.value ===
                            item.actualtravel
                        )?.name
                      }
                      onPress={() =>
                        openPicker(
                          item.tempId,
                          'actualtravel',
                          'Select Mode of Travel',
                          ACTUAL_MODE_OPTIONS
                        )
                      }
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      placeholder="Select Mode"
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* CLASS */}

                    <DropdownRow
                      label="Class Of Travel"
                      valueLabel={
                        classOptions.find(
                          (option) =>
                            option.value ===
                            item.classoftravel
                        )?.name
                      }
                      onPress={() => {
                        if (!item.actualtravel) {
                          ToastMessage(
                            'Please select Actual Mode of Travel first.'
                          );
                          return;
                        }

                        openPicker(
                          item.tempId,
                          'classoftravel',
                          'Select Class Of Travel',
                          classOptions
                        );
                      }}
                      isDisabled={false}
                      isRequired={true}
                      placeholder="Select Class"
                      styles={styles}
                      CustomColors={CustomColors}
                    />

                    {/* ELIGIBLE CLASS */}

                    <EditableRow
                      label="Eligible Class"
                      value={
                        item.eligibletravel
                      }
                      isEditing={false}
                      isDisabled={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* HIGHER MODE */}

                    <DropdownRow
                      label="Higher Mode Of Travel"
                      valueLabel={
                        YES_NO_OPTIONS.find(
                          (option) =>
                            option.value ===
                            item.priorpermission
                        )?.name
                      }
                      onPress={() =>
                        openPicker(
                          item.tempId,
                          'priorpermission',
                          'Higher Mode Of Travel',
                          YES_NO_OPTIONS
                        )
                      }
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      placeholder="Select Yes/No"
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    <EditableRow
                      label="Higher Mode"
                      value={
                        item.highermodeopted
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            highermodeopted:
                              t,
                          }
                        )
                      }
                      isEditing={true}
                      isDisabled={
                        !isRowEditable ||
                        item.priorpermission !==
                        '1'
                      }
                      isRequired={
                        item.priorpermission ===
                        '1'
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {item.priorpermission === '1' && (
                      <EditableRow
                        label="Higher Mode Reason"
                        value={
                          item.highermodereasons === '0'
                            ? ''
                            : item.highermodereasons
                        }
                        onChangeText={(t) =>
                          updateItem(item.tempId, {
                            highermodereasons: t || '0',
                          })
                        }
                        isEditing={true}
                        isDisabled={!isRowEditable}
                        isRequired={false}
                        placeholder="Enter Higher Mode Reason"
                        styles={styles}
                        CustomColors={CustomColors}
                      />
                    )}

                    {/* NO. OF TICKETS */}

                    <EditableRow
                      label="No. of Tickets"
                      value={item.nooftickets}
                      onChangeText={(t) =>
                        updateItem(item.tempId, {
                          nooftickets: t.replace(/[^0-9]/g, ''),
                        })
                      }
                      isEditing={true}
                      keyboardType="numeric"
                      placeholder="Enter No. of Tickets"
                      isDisabled={!isRowEditable}
                      isRequired={false}
                      styles={styles}
                      CustomColors={CustomColors}
                    />

                    {/* DEPENDENCIES */}

                    <DropdownRow
                      label="Dependencies"
                      valueLabel={
                        YES_NO_OPTIONS.find(
                          (option) =>
                            option.value ===
                            item.dependent
                        )?.name
                      }
                      onPress={() =>
                        openPicker(
                          item.tempId,
                          'dependent',
                          'Dependencies',
                          YES_NO_OPTIONS
                        )
                      }
                      isDisabled={
                        !isRowEditable
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {item.dependent ===
                      '1' && (
                        <View>
                          <TouchableOpacity
                            onPress={() =>
                              toggleDependentSection(
                                item.tempId
                              )
                            }
                            style={
                              styles.dependentHeaderRow
                            }
                          >
                            <Text
                              allowFontScaling={
                                false
                              }
                              style={
                                styles.dependentTitle
                              }
                            >
                              Dependent Data
                            </Text>

                            <MaterialIcons
                              name={
                                dependentOpenState[
                                  item.tempId
                                ]
                                  ? 'expand-less'
                                  : 'expand-more'
                              }
                              size={
                                moderateScale(
                                  24
                                )
                              }
                              color={
                                CustomColors.appThemeColor
                              }
                            />
                          </TouchableOpacity>

                          {dependentOpenState[
                            item.tempId
                          ] &&
                            (
                              item.dependencies_relation ||
                              []
                            ).map(
                              (
                                dep,
                                depIdx
                              ) => (
                                <View
                                  key={`${item.tempId}-dep-${depIdx}`}
                                  style={
                                    styles.dependentRow
                                  }
                                >
                                  <View
                                    style={
                                      styles.dependentField
                                    }
                                  >
                                    <EditableRow
                                      label="Dependent Name"
                                      value={
                                        dep.name
                                      }
                                      onChangeText={(t) =>
                                        updateDependentField(
                                          item.tempId,
                                          depIdx,
                                          'name',
                                          t
                                        )
                                      }
                                      isEditing={true}
                                      isDisabled={
                                        !isRowEditable
                                      }
                                      styles={styles}
                                      CustomColors={
                                        CustomColors
                                      }
                                    />
                                  </View>

                                  <View
                                    style={
                                      styles.dependentField
                                    }
                                  >
                                    <EditableRow
                                      label="Relationship"
                                      value={
                                        dep.relation
                                      }
                                      onChangeText={(t) =>
                                        updateDependentField(
                                          item.tempId,
                                          depIdx,
                                          'relation',
                                          t
                                        )
                                      }
                                      isEditing={true}
                                      isDisabled={
                                        !isRowEditable
                                      }
                                      styles={styles}
                                      CustomColors={
                                        CustomColors
                                      }
                                    />
                                  </View>

                                  {!approver &&
                                    !apuser_key && (
                                      <TouchableOpacity
                                        onPress={() =>
                                          removeDependentRow(
                                            item.tempId,
                                            depIdx
                                          )
                                        }
                                        style={
                                          styles.deleteIconBtn
                                        }
                                      >
                                        <MaterialIcons
                                          name="delete"
                                          size={moderateScale(
                                            22
                                          )}
                                          color={
                                            CustomColors.dangerRed ||
                                            '#D93025'
                                          }
                                        />
                                      </TouchableOpacity>
                                    )}
                                </View>
                              )
                            )}

                          {isRowEditable && (
                            <TouchableOpacity
                              onPress={() =>
                                addDependentRow(
                                  item.tempId
                                )
                              }
                              style={{
                                alignSelf:
                                  'flex-start',

                                marginTop:
                                  verticalScale(
                                    4
                                  ),
                              }}
                            >
                              <MaterialIcons
                                name="add-circle"
                                size={moderateScale(
                                  26
                                )}
                                color={
                                  CustomColors.appThemeColor
                                }
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                    {/* CLAIM AMOUNT */}

                    <EditableRow
                      label="Claim Amount"
                      value={
                        item.claimedamount
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            claimedamount:
                              t.replace(
                                /[^0-9.]/g,
                                ''
                              ),
                          }
                        )
                      }
                      isEditing={true}
                      keyboardType="numeric"
                      isDisabled={
                        !isRowEditable
                      }
                      isRequired={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* INVOICE DATE */}

                    <EditableRow
                      label="Invoice Date"
                      value={formatDateOnly(
                        item.invoicedate
                      )}
                      isEditing={true}
                      placeholder="Select Date"
                      isDatePicker={true}
                      onPressDatePicker={
                        isRowEditable
                          ? () =>
                            openCustomDatePicker(
                              item.tempId,
                              'invoicedate'
                            )
                          : null
                      }
                      isDisabled={
                        !isRowEditable
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* INVOICE NO */}

                    <EditableRow
                      label="Invoice No"
                      value={
                        item.billno
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            billno: t,
                          }
                        )
                      }
                      isEditing={true}
                      isDisabled={
                        !isRowEditable
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* BANK GST NO (read‑only) */}

                    <EditableRow
                      label="Bank Gst No"
                      value={
                        item.bankgstno
                      }
                      isEditing={true}
                      isDisabled={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* ======================================================
                     * VENDOR GST NO
                     * ==================================================== */}

                    <EditableRow
                      label="Vendor GST No"
                      value={item.vendorgstno}
                      onChangeText={(t) =>
                        handleVendorGstChange(
                          item.tempId,
                          t
                        )
                      }
                      isEditing={true}
                      isDisabled={!isRowEditable}
                      placeholder="Click Validate to auto-fetch GST"
                      styles={styles}
                      CustomColors={CustomColors}
                      rightAdornment={
                        isRowEditable ? (
                          <TouchableOpacity
                            style={[
                              styles.validateBtn,
                              item.validateGst && {
                                backgroundColor:
                                  CustomColors.successGreen ||
                                  '#28A745',
                              },
                              validatingVendorGstId === item.tempId &&
                              styles.validateBtnDisabled,
                            ]}
                            disabled={validatingVendorGstId === item.tempId}
                            onPress={() =>
                              handleValidateGst(item.tempId)
                            }
                          >
                            {validatingVendorGstId === item.tempId ? (
                              <ActivityIndicator
                                size="small"
                                color={CustomColors.white}
                              />
                            ) : (
                              <Text
                                allowFontScaling={false}
                                style={styles.validateBtnText}
                              >
                                {item.validateGst
                                  ? 'Validated'
                                  : 'Validate'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : null
                      }
                    />

                    {item.validateGst ? (
                      <Text
                        allowFontScaling={false}
                        style={styles.gstSuccessText}
                      >
                        ✓ Vendor GST Validated
                      </Text>
                    ) : null}

                    {/* VENDOR NAME */}

                    <EditableRow
                      label="Vendor Name"
                      value={
                        item.vendorname
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            vendorname: t,
                          }
                        )
                      }
                      isEditing={true}
                      isDisabled={
                        !isRowEditable ||
                        Boolean(item.vendorgstno) ||
                        Number(applevel) === 1
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* VENDOR CODE */}

                    <EditableRow
                      label="Vendor Code"
                      value={
                        item.vendorcode
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            vendorcode: t,
                          }
                        )
                      }
                      isEditing={true}
                      isDisabled={
                        !isRowEditable ||
                        Boolean(item.vendorgstno) ||
                        Number(applevel) === 1
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* ADDRESS */}

                    <EditableRow
                      label="Address"
                      value={
                        item.address
                      }
                      onChangeText={(t) =>
                        updateItem(
                          item.tempId,
                          {
                            address: t,
                          }
                        )
                      }
                      isEditing={true}
                      multiline={true}
                      isDisabled={
                        !isRowEditable ||
                        Boolean(item.vendorgstno) ||
                        Number(applevel) === 1
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* ======================================================
                     * HSN CODE (Dropdown Picker with Pagination)
                     * ==================================================== */}

                    <View style={styles.detailItemContainer}>
                      <View style={styles.floatingLabelWrap}>
                        <Text
                          allowFontScaling={false}
                          style={styles.floatingLabelText}
                        >
                          HSN Code
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => openHsnPicker(item.tempId)}
                        disabled={!isRowEditable}
                        style={[
                          styles.editableTextInput,
                          !isRowEditable && styles.disabledInput,
                        ]}
                      >
                        <Text
                          allowFontScaling={false}
                          style={[
                            styles.actionSheetTriggerButtonText,
                            !item.hsncode && styles.placeholderText,
                            !isRowEditable && styles.disabledText,
                          ]}
                        >
                          {(typeof item.hsncode === 'object' && item.hsncode !== null
                            ? item.hsncode.code || item.hsncode.hsncode
                            : item.hsncode) || 'Select HSN Code'}
                        </Text>

                        <MaterialIcons
                          name="keyboard-arrow-down"
                          size={moderateScale(20)}
                          color={CustomColors.textDarkGray}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* TAXABLE AMOUNT */}

                    <EditableRow
                      label="Taxable Amount"
                      value={
                        item.taxableamount
                      }
                      onChangeText={(t) => {
                        const taxableAmount = t.replace(/[^0-9.]/g, '');
                        const gstResults = calculateGstAmounts(
                          taxableAmount,
                          item.hsnigstrate,
                          item.vendorgstno,
                          item.bankgstno || bankGst
                        );
                        updateItem(
                          item.tempId,
                          {
                            taxableamount: taxableAmount,
                            ...gstResults,
                          }
                        );
                      }}
                      isEditing={true}
                      keyboardType="numeric"
                      placeholder="0"
                      isDisabled={
                        !isRowEditable ||
                        Number(applevel) ===
                        1
                      }
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* CGST */}

                    <EditableRow
                      label="CGST"
                      value={
                        item.cgst
                      }
                      isEditing={false}
                      isDisabled={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* SGST */}

                    <EditableRow
                      label="SGST"
                      value={
                        item.sgst
                      }
                      isEditing={false}
                      isDisabled={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* IGST */}

                    <EditableRow
                      label="IGST"
                      value={
                        item.igst
                      }
                      isEditing={false}
                      isDisabled={true}
                      styles={styles}
                      CustomColors={
                        CustomColors
                      }
                    />

                    {/* INVOICE AMOUNT */}

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <EditableRow
                          label="Invoice Amount"
                          value={
                            item.invoiceamount
                          }
                          isEditing={false}
                          isDisabled={true}
                          styles={styles}
                          CustomColors={
                            CustomColors
                          }
                        />
                      </View>

                      {isItemEditableGlobally && (
                        <TouchableOpacity
                          onPress={handleAddItem}
                          style={{
                            marginLeft: horizontalScale(10),
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name="add-circle"
                            size={moderateScale(32)}
                            color={
                              CustomColors.appThemeColor
                            }
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* APPROVED AMOUNT */}

                    {showApprovedAmount && (
                      <EditableRow
                        label="Approved Amount"
                        value={
                          item.approvedamount
                        }
                        onChangeText={(
                          t
                        ) =>
                          updateItem(
                            item.tempId,
                            {
                              approvedamount:
                                t.replace(
                                  /[^0-9.]/g,
                                  ''
                                ),
                            }
                          )
                        }
                        isEditing={true}
                        keyboardType="numeric"
                        isRequired={true}
                        isDisabled={
                          Number(
                            statusid
                          ) > 2
                        }
                        styles={styles}
                        CustomColors={
                          CustomColors
                        }
                      />
                    )}
                  </View>
                )}
              </View>
            );
          }
        )}
      </ScrollView>

      {/* ================================================================
       * BOTTOM BUTTONS
       * ================================================================ */}

      <Animated.View
        style={
          styles.bottomActionBar
        }
      >
        {approver &&
          Number(applevel) === 2 &&
          Number(statusid) === 2 && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.approveButton,
                isApproving && { opacity: 0.7 },
              ]}
              disabled={isApproving}
              onPress={handleApprove}
            >
              <Text
                allowFontScaling={false}
                style={
                  styles.actionButtonText
                }
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </Text>
            </TouchableOpacity>
          )}

        {!approver &&
          from !== 'Checker' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.submitButton,
                {
                  backgroundColor:
                    hasUnsavedChanges &&
                      !isSubmitting &&
                      isItemEditableGlobally &&
                      items.length > 0
                      ? CustomColors.appThemeColor
                      : CustomColors.mediumGray,
                },
              ]}
              onPress={
                handleSubmitAllChanges
              }
              disabled={
                !hasUnsavedChanges ||
                isSubmitting ||
                !isItemEditableGlobally ||
                items.length === 0
              }
            >
              <Text
                allowFontScaling={false}
                style={
                  styles.actionButtonText
                }
              >
                {isSubmitting
                  ? 'Submitting...'
                  : 'Submit'}
              </Text>
            </TouchableOpacity>
          )}

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.backButton,
          ]}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            allowFontScaling={false}
            style={
              styles.actionButtonText
            }
          >
            Back
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ================================================================
       * IOS DATE PICKER
       * ================================================================ */}

      {Platform.OS === 'ios' &&
        showDatePicker &&
        currentItemIdForDate && (
          <DateTimePicker
            value={
              initialDatePickerDate
            }
            mode="date"
            is24Hour={true}
            display="default"
            minimumDate={
              currentDateField === 'invoicedate'
                ? undefined
                : minDate
            }
            maximumDate={
              currentDateField === 'invoicedate'
                ? undefined
                : maxDate
            }
            onChange={
              handleDateChange
            }
          />
        )}

      {/* ================================================================
       * SCROLL TIME PICKER
       * ================================================================ */}
      <Modal
        visible={timePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closeTimePicker}
      >
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContent}>
            <View style={styles.timeModalHeader}>
              <Text style={styles.timeModalTitle}>
                {timePickerField === 'arrivaltime' ? 'Select Arrival Time' : 'Select Departure Time'}
              </Text>
              <TouchableOpacity onPress={closeTimePicker}>
                <Ionicons name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.timeColumns}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Hour</Text>
                <FlatList
                  data={TIME_HOURS}
                  keyExtractor={(item) => `h-${item}`}
                  showsVerticalScrollIndicator={false}
                  initialScrollIndex={Math.max(0, TIME_HOURS.indexOf(selectedHour))}
                  snapToInterval={verticalScale(48)}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({ length: verticalScale(48), offset: verticalScale(48) * index, index })}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.y / verticalScale(48));
                    if (TIME_HOURS[index]) setSelectedHour(TIME_HOURS[index]);
                  }}
                  renderItem={({ item: hour }) => (
                    <TouchableOpacity
                      style={[styles.timeOption, selectedHour === hour && styles.timeOptionSelected]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text style={[styles.timeOptionText, selectedHour === hour && styles.timeOptionSelectedText]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Minute</Text>
                <FlatList
                  data={TIME_MINUTES}
                  keyExtractor={(item) => `m-${item}`}
                  showsVerticalScrollIndicator={false}
                  initialScrollIndex={Math.max(0, TIME_MINUTES.indexOf(selectedMinute))}
                  snapToInterval={verticalScale(48)}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({ length: verticalScale(48), offset: verticalScale(48) * index, index })}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.y / verticalScale(48));
                    if (TIME_MINUTES[index]) setSelectedMinute(TIME_MINUTES[index]);
                  }}
                  renderItem={({ item: minute }) => (
                    <TouchableOpacity
                      style={[styles.timeOption, selectedMinute === minute && styles.timeOptionSelected]}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text style={[styles.timeOptionText, selectedMinute === minute && styles.timeOptionSelectedText]}>
                        {minute}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>

            <View style={styles.timeSelectedValue}>
              <Text style={styles.timeSelectedValueText}>{selectedHour}:{selectedMinute}</Text>
            </View>

            <TouchableOpacity style={styles.timeDoneButton} onPress={applyTimeValue}>
              <Text style={styles.timeDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================
       * HSN DROPDOWN MODAL (with Pagination)
       * ================================================================ */}

      <Modal
        visible={hsnModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeHsnModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeHsnModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select HSN Code</Text>
              <TouchableOpacity onPress={closeHsnModal} style={styles.closeModalButton}>
                <Ionicons name="close" size={24} color={CustomColors.textDark} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Type to search HSN..."
              value={hsnSearchQuery}
              onChangeText={handleHsnSearchChange}
              autoFocus
              placeholderTextColor={CustomColors.textLightGray}
            />

            {isHsnLoading && hsnSuggestions.length === 0 ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
              </View>
            ) : (
              <FlatList
                data={hsnSuggestions}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                renderItem={({ item: hsnItem }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => selectHsnSuggestion(hsnItem)}
                  >
                    <Text style={styles.modalItemText}>
                      {hsnItem.code || hsnItem.hsncode || hsnItem.value || String(hsnItem)}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalNoResults}>
                    <Text style={styles.modalNoResultsText}>
                      {hsnSearchQuery.length === 1 ? 'Type at least 2 characters' : 'No HSN records found'}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  isHsnLoadingMore ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
                    </View>
                  ) : null
                }
                style={styles.modalList}
                keyboardShouldPersistTaps="handled"
                onEndReached={handleHsnLoadMore}
                onEndReachedThreshold={0.3}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ================================================================
       * ACTION SHEET
       * ================================================================ */}

      {pickerConfig && (
        <CustomActionSheetPicker
          pickerStatus={
            !!activePickerId
          }
          setPickerStatus={() =>
            setActivePickerId(null)
          }
          title={
            pickerConfig.title
          }
          optionsData={
            pickerConfig.options
          }
          RenderItem={
            PickerItem
          }
          onPress={
            handlePickerSelect
          }
          selected={
            getItem(
              pickerConfig.tempId
            )?.[
            pickerConfig.field
            ]
          }
        />
      )}

      {/* ================================================================
       * CUSTOM FULL YEAR/MONTH DATE PICKER MODAL (Allows past & future months/years/dates)
       * ================================================================ */}
      <CustomDatePickerModal
        visible={customDatePickerConfig.visible}
        initialDate={customDatePickerConfig.initialDate}
        onClose={() =>
          setCustomDatePickerConfig({
            visible: false,
            tempId: null,
            field: null,
            initialDate: '',
          })
        }
        onConfirm={handleCustomDateConfirm}
      />
    </KeyboardAvoidingView>
  );
};

export default TravelDetailsScreen;