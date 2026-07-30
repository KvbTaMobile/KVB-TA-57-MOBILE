import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { setEmployeeDetails } from '../../redux/slices/EmployeeSlice';
import {
  useGetFuelAllowanceAllQuery,
  useGetEmployeeDetailsForFuelQuery,
} from '../../redux/rtk_query/apiSlice';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';
import { useLayoutEffect } from 'react';
import * as styless from "../../styles/StyleSheet";




const FuelListSummary = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [allFuelItems, setAllFuelItems] = useState([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const styles = StyleSheet.create({
    heading: {
      fontSize: moderateScale(24),
      fontWeight: 'bold',
      color: CustomColors.textblue,
      paddingVertical: verticalScale(8),
    },
    stickyHeader: {
      backgroundColor: CustomColors.backgroundWhite,
      zIndex: 10,
      position: 'absolute',
      top: 0,
      width: '100%',
      paddingHorizontal: horizontalScale(16),
      paddingTop: verticalScale(20),
      paddingBottom: verticalScale(10),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: horizontalScale(5),
    },
    searchInput: {
      backgroundColor: CustomColors.backgroundGray,
      borderRadius: moderateScale(8),
      paddingHorizontal: horizontalScale(12),
      paddingVertical: verticalScale(8),
      color: CustomColors.textBlack,
      borderColor: CustomColors.textBlack
    },
    filterIcon: {
      padding: moderateScale(6),
      marginLeft: horizontalScale(10),
    },
    tabButton: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(16),
      borderRadius: moderateScale(10),
      alignItems: 'center',
    },
    cardWrapper: {
      marginHorizontal: horizontalScale(16),
      marginVertical: verticalScale(8),
      borderRadius: moderateScale(16),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(3),
      elevation: 2,
    },
    cardGradient: {
      padding: horizontalScale(16),
      borderRadius: moderateScale(16),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    cardTitle: {
      fontSize: moderateScale(16),
      fontWeight: 'bold',
      color: CustomColors.textBlue,
    },
    divider: {
      height: verticalScale(1),
      backgroundColor: CustomColors.backgroundWhite,
      marginVertical: verticalScale(8),
    },
    infoBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: verticalScale(6),
    },
    cardText: {
      marginLeft: horizontalScale(8),
      fontSize: moderateScale(14),
      color: CustomColors.textBlack,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: CustomColors.backgroundtransparent,
      justifyContent: 'flex-end',
      padding: 20
    },
    modalContainer: {
      backgroundColor: CustomColors.backgroundWhite,
      padding: horizontalScale(20),
      borderTopLeftRadius: moderateScale(16),
      borderTopRightRadius: moderateScale(16),
    },
  });
  const statusOptions = [
    { label: 'Pending', value: 2, color: CustomColors.statusBlue },
    { label: 'Approved', value: 3, color: CustomColors.statusGreen },
    { label: 'Rejected', value: 4, color: CustomColors.statusRed },
    { label: 'Returned', value: 5, color: CustomColors.statusYellow },
  ];
  const { data, error, isLoading, refetch } = useGetFuelAllowanceAllQuery({ page, status });
  const {
    data: emp,
    isLoading: loadingEmp,
    error: errorEmp,
  } = useGetEmployeeDetailsForFuelQuery();

  useEffect(() => {
    setPage(1);
    setAllFuelItems([]);
    refetch();
  }, [status]);

  useEffect(() => {
    if (emp) dispatch(setEmployeeDetails(emp));
  }, [emp]);

  useEffect(() => {
    const fuelItems = data?.data ?? [];
    if (page === 1) {
      setAllFuelItems(fuelItems);
    } else if (fuelItems.length > 0) {
      setAllFuelItems((prev) => [...prev, ...fuelItems]);
    }
  }, [data]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    refetch().finally(() => setRefreshing(false));
  };

  const filteredItems = allFuelItems.filter((item) =>
    item.emp_details?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.fcl_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

useLayoutEffect(() => {
  navigation.setOptions({
    headerStyle: {
      backgroundColor: CustomColors.appThemeColor,
    },

    headerTitle: () => (
      <Text
        allowFontScaling={false}
        style={{
          ...globalStyles.headerTitle,
          fontSize: moderateScale(20),
          fontWeight: "600",
          color: CustomColors.textWhite,
        }}
      >
        Fuel Allowance Summary
      </Text>
    ),

    headerTintColor: CustomColors.textWhite,
  });
}, [navigation, isDark]);










  return (
    <LinearGradient colors={[CustomColors.backgroundWhite, CustomColors.backgroundWhite]} style={{ flex: 1 }}>
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <TextInput allowFontScaling={false}
            placeholder="Search by name or FCL No..."
            placeholderTextColor={CustomColors.textGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { flex: 1 }]}
          />
          <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterIcon}>
            <Feather name="filter" size={24} color={CustomColors.textBlack} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.FlatList
        data={filteredItems}
        keyExtractor={(item) => item.tour_id.toString()}
        contentContainerStyle={{ paddingTop: 90, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('fuelaction', { tourId: item.tour_id, status: status, })}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={[CustomColors.backgroundWhite, CustomColors.backgroundWhite]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <Text allowFontScaling={false} style={styles.cardTitle}>FCL No: {item.fcl_no}</Text>
                <MaterialIcons name="keyboard-arrow-right" size={24} color={CustomColors.textBlack} />
              </View>

              <View style={styles.divider} />

              <View style={styles.infoBlock}>
                <Ionicons name="person-outline" size={18} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.cardText}>
                  {item.emp_details.full_name} ({item.emp_details.code})
                </Text>
              </View>

              <View style={styles.infoBlock}>
                <Ionicons name="briefcase-outline" size={18} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.cardText}>Branch: {item.emp_branch_details.name}</Text>
              </View>

              <View style={styles.infoBlock}>
                <Ionicons name="calendar-outline" size={18} color={CustomColors.textBlue} />
                <Text allowFontScaling={false} style={styles.cardText}>Month: {item.month_year}</Text>
              </View>

              <View style={styles.infoBlock}>
                <Ionicons name="cash-outline" size={18} color={CustomColors.textBlack} />
                <Text allowFontScaling={false} style={styles.cardText}>Claim: ₹{item.claim_amount ?? 'N/A'}</Text>
              </View>

              <View style={styles.infoBlock}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={CustomColors[item.status.name.toLowerCase()] ?? CustomColors.textBlue}
                />
                <Text allowFontScaling={false} style={styles.cardText}>Status: {item.status.name}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (data?.pagination?.has_next && !isFetchingMore) {
            setIsFetchingMore(true);
            setPage((prev) => prev + 1);
          }
        }}
        onMomentumScrollEnd={() => setIsFetchingMore(false)}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={{ marginVertical: 20 }}>
              <ActivityIndicator size="small" color={CustomColors.textBlue} />
            </View>
          ) : null
        }
      />

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text allowFontScaling={false} style={{ fontSize: 16, marginBottom: 10, }}>Choose Status</Text>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setStatus(option.value);
                  setFilterModalVisible(false);
                }}
                style={[styles.tabButton, {
                  backgroundColor: status === option.value ? option.color : CustomColors.textGray,
                  marginBottom: 10,
                }]}
              >
                <Text allowFontScaling={false} style={{ color: status === option.value ? CustomColors.textWhite : CustomColors.textBlack }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default FuelListSummary;

