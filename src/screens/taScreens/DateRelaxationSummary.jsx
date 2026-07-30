import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useGetDateRelaxationQuery, useUpdateDateRelaxationStatusMutation } from '../../redux/rtk_query/apiSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, EvilIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';
import { useSelector } from 'react-redux';
import * as styless from "../../styles/StyleSheet";
const SummaryScreen = () => {
  const navigation = useNavigation();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const [tourNo, setTourNo] = useState('');
  const [debouncedTourNo, setDebouncedTourNo] = useState('');
  const [queryParams, setQueryParams] = useState({ tour_no: '', page: 1 });
  const [allData, setAllData] = useState([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const { data, error, isLoading, isFetching, refetch } = useGetDateRelaxationQuery(queryParams);
  const [updateStatus, { isLoading: isUpdating }] = useUpdateDateRelaxationStatusMutation();
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: CustomColors.appScreenColor },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundWhite,
      margin: moderateScale(16),
      paddingHorizontal: horizontalScale(12),
      height: verticalScale(50),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: CustomColors.textBlack,
      elevation: 2,
    },
    inputField: { flex: 1, fontSize: moderateScale(16), color: CustomColors.textBlack },
    cardWrapper: {
      marginHorizontal: moderateScale(16),
      marginBottom: verticalScale(12),
      borderRadius: 12,
      elevation: 3,
      backgroundColor: CustomColors.backgroundGray2,
      overflow: 'hidden',
    },
    card: { flex: 1 },
    row: { flexDirection: 'row' },
    statusStrip: { width: 6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CustomColors.appliteThemecolor,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tourId: { color: CustomColors.appThemeColor, fontWeight: 'bold', marginLeft: 5, fontSize: moderateScale(13) },
    empName: { fontSize: moderateScale(16), fontWeight: '700', color: CustomColors.primaryBlue, marginTop: 8 },
    divider: { height: 1, backgroundColor: CustomColors.backgroundGray2, marginVertical: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    reasonText: { marginLeft: 8, color: CustomColors.textGray, fontSize: moderateScale(14) },
    dateContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    dateLabel: { fontSize: 10, color: CustomColors.Ambercolor, fontWeight: 'bold' },
    dateValue: { fontSize: 12, color: CustomColors.textBlack, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', marginTop: 50, color: CustomColors.textBlack }
  });
 useLayoutEffect(() => {
  navigation.setOptions({
    headerStyle: { backgroundColor: CustomColors.appThemeColor },

    headerTitle: () => (
      <Text
        allowFontScaling={false}
        style={{
          ...globalStyles.headerTitle,
          fontSize: moderateScale(16),
          fontWeight: "600",
          color: CustomColors.textWhite,
        }}
      >
        Date Relaxation Summary
      </Text>
    ),

    headerTintColor: CustomColors.textWhite,
  });
}, [navigation, isDark]);


  // 1. Debounce Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTourNo(tourNo);
    }, 500);
    return () => clearTimeout(timer);
  }, [tourNo]);

  // 2. Reset list when search changes
  useEffect(() => {
    setAllData([]); // Clear previous results immediately
    setQueryParams({ tour_no: debouncedTourNo, page: 1 });
  }, [debouncedTourNo]);

  // 3. Handle Data Merging
  useEffect(() => {
    if (data?.data) {
      if (queryParams.page === 1) {
        setAllData(data.data);
      } else {
        // Append unique items only
        setAllData(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewItems = data.data.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });
      }
      setIsFetchingMore(false);
    }
  }, [data]);

  const loadMoreData = () => {
    if (!isFetchingMore && data?.pagination?.has_next && !isFetching) {
      setIsFetchingMore(true);
      setQueryParams(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 1 ? 0 : 1;
    try {
      const payload = [{ id: item.id, status: newStatus, tour_id: item.tour_id }];
      const res = await updateStatus(payload).unwrap();

      if (res.status === 'success') {
        // Update local state so UI reflects change without a full reload
        refetch();

      }
    } catch (err) {
      Alert.alert("Update Failed", "Could not update status. Please try again.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <View

        style={styles.card}
      >
        <View style={styles.row}>
          {/* Status color strip */}
          <View style={[styles.statusStrip, { backgroundColor: item.status === 1 ? '#4CAF50' : '#F44336' }]} />

          <View style={{ flex: 1, padding: moderateScale(12) }}>
            <View style={styles.cardHeader}>
              <View style={styles.badge}>
                <Ionicons name="bus-outline" size={14} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.tourId}>Tour ID: {item.tour_id}</Text>
              </View>

              <TouchableOpacity onPress={() => handleToggleStatus(item)} disabled={isUpdating}>
                <MaterialCommunityIcons
                  name={item.status === 1 ? "toggle-switch" : "toggle-switch-off"}
                  size={40}
                  color={item.status === 1 ? "#4CAF50" : "#D1D1D1"}
                />
              </TouchableOpacity>
            </View>

            <Text allowFontScaling={false} style={styles.empName}>{item.employee_name} ({item.employee_code})</Text>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <FontAwesome5 name="file-alt" size={12} color="#7f8c8d" />
              <Text allowFontScaling={false} style={styles.reasonText}>{item.reason}</Text>
            </View>

            <View style={styles.dateContainer}>
              <View>
                <Text allowFontScaling={false} style={styles.dateLabel}>DURATION</Text>
                <Text allowFontScaling={false} style={styles.dateValue}>{item.from_date} - {item.to_date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text allowFontScaling={false} style={styles.dateLabel}>REQUESTED</Text>
                <Text allowFontScaling={false} style={styles.dateValue}>{item.request_date}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput allowFontScaling={false}
          placeholder="Enter Tour Number..."
          placeholderTextColor={CustomColors.textGray}
          value={tourNo}
          onChangeText={setTourNo}
          style={styles.inputField}
          keyboardType="numeric"
        />
        <TouchableOpacity onPress={() => setDebouncedTourNo(tourNo)}>
          <EvilIcons name="search" size={30} color={CustomColors.textBlue} />
        </TouchableOpacity>
      </View>

      {isLoading && queryParams.page === 1 ? (
        <View style={styles.center}><ActivityIndicator color={CustomColors.appThemeColor} size="large" /></View>
      ) : (
        <FlatList
          data={allData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={loadMoreData}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 50 }}
          ListEmptyComponent={<Text allowFontScaling={false} style={styles.emptyText}>No data found</Text>}
          ListFooterComponent={isFetchingMore ? <ActivityIndicator size="small" /> : null}
        />
      )}
    </View>
  );
};

export default SummaryScreen;

