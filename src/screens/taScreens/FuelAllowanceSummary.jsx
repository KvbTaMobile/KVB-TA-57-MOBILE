import React, { useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  RefreshControl, TouchableOpacity
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  setFuelData,
  setRefreshing,
  setPageNo,
  resetFuelData,
} from '../../redux/slices/FuelSummarySlice';
import { useGetFuelAllowanceSummaryQuery } from '../../redux/rtk_query/apiSlice';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EvilIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';
import Error from "../../styles/Lottie/error404";
import Nodatafound from "../../styles/Lottie/nodatafound";
import { LinearGradient } from 'expo-linear-gradient';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from "../../styles/CustomColors";
import * as styless from "../../styles/StyleSheet";



const FuelAllowanceSummary = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark)
  const [claimAmountFilter, setClaimAmountFilter] = React.useState('');
  const [formattedMonthYear, setFormattedMonthYear] = React.useState('');
  const [date, setDate] = React.useState(new Date());
  const [showPicker, setShowPicker] = React.useState(false);
  const modules = useSelector((state) => state.userModules.modules);
  const { data, count, pageNo, hasNext, refreshing } = useSelector(
    (state) => state.fuelSummary
  );

  const debouncedSetClaimAmountFilter = useRef(
    debounce((val) => {
      setClaimAmountFilter(val);
    }, 500)
  ).current;

  const { data: responseData, isLoading, error } = useGetFuelAllowanceSummaryQuery({
    page: pageNo,
    claim_amount: claimAmountFilter,
    month_year: formattedMonthYear,
  });
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.backgroundWhite,
    },
    filtercontainer: {
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(6),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: CustomColors.lightGray,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    dateText: {
      fontWeight: 'bold',
      fontSize: moderateScale(16),
      color: CustomColors.textGray,
    },
    input: {
      flex: 1,
      marginLeft: horizontalScale(10),
      borderWidth: 1,
      borderColor: CustomColors.appThemeColor,
      paddingVertical: verticalScale(8),
      paddingHorizontal: horizontalScale(12),
      borderRadius: moderateScale(10),
      color: CustomColors.textBlack,
      fontSize: moderateScale(14),
      backgroundColor: CustomColors.backgroundWhite,
    },
    card: {
      backgroundColor: CustomColors.backgroundWhite,
      marginVertical: verticalScale(8),
      marginHorizontal: horizontalScale(16),
      paddingHorizontal: horizontalScale(16),
      paddingVertical: verticalScale(16),
      borderRadius: moderateScale(12),
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
      borderLeftWidth: horizontalScale(6),
      borderLeftColor: CustomColors.appThemeColor,
    },
    error: {
      justifyContent: 'center',
      alignItems: "center",
      flex: 1,
    },

    error1: {
      justifyContent: 'center',
      alignItems: "center",
      flex: 1,
      backgroundColor: CustomColors.backgroundWhite,

    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(8),
      borderBottomWidth: 1,
      borderBottomColor: CustomColors.textGray,
      paddingBottom: verticalScale(6),
    },
    tourId: {
      fontWeight: 'bold',
      fontSize: moderateScale(18),
      color: CustomColors.primaryBlue,
    },
    status: {
      fontWeight: '600',
      fontSize: moderateScale(14),
      paddingHorizontal: horizontalScale(10),
      paddingVertical: verticalScale(4),
      borderRadius: moderateScale(12),
      overflow: 'hidden',
      color: 'white',
      textTransform: 'uppercase',
    },
    statusApproved: {
      backgroundColor: CustomColors.statusGreen,
    },
    statusPending: {
      backgroundColor: CustomColors.statusYellow,
    },
    statusDefault: {
      backgroundColor: CustomColors.statusDefault,
    },
    cardBody: {
      paddingLeft: horizontalScale(4),
    },
    label: {
      fontWeight: '600',
      fontSize: moderateScale(14),
      marginBottom: verticalScale(4),
      color: CustomColors.textDark,
    },
    value: {
      fontWeight: 'normal',
      color: CustomColors.textDark,

    },

  });
  useLayoutEffect(() => {
  navigation.setOptions({
    headerShown: true,

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

    headerRight: () => (
      <TouchableOpacity
        onPress={() => navigation.navigate("fuel_allowance_creation")}
        style={{ marginRight: 16 }}
      >
        <MaterialCommunityIcons
          name="book-plus-multiple-outline"
          size={24}
          color={CustomColors.textWhite}
        />
      </TouchableOpacity>
    ),
  });
}, [navigation, isDark]);

  useEffect(() => {
    if (responseData && responseData.pagination?.index === pageNo) {
      dispatch(
        setFuelData({
          data: responseData.data || [],   // 👈 important
          count: responseData.count,
          hasNext: responseData.pagination?.has_next,
          hasPrevious: responseData.pagination?.has_previous,
          isRefresh: refreshing,
        })
      );
    }
  }, [responseData, pageNo, dispatch, refreshing]);


  useEffect(() => {
    dispatch(resetFuelData());
    dispatch(setPageNo(1));
    dispatch(setRefreshing(true));
  }, [claimAmountFilter, formattedMonthYear, dispatch]);

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
    onSelect(currentDate);
  };

  const onSelect = (selectedDate) => {
    const year = selectedDate.getFullYear();
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    setFormattedMonthYear(`${monthNames[selectedDate.getMonth()]} ${year}`);
  };


  const showDatePicker = () => {
    setShowPicker(true);
  };

  const handleRefresh = () => {
    dispatch(setRefreshing(true));
    dispatch(setPageNo(1));
  };

  const handleEndReached = () => {
    if (hasNext && !isLoading && !refreshing) {
      dispatch(setPageNo(pageNo + 1));
    }
  };

  if (isLoading && pageNo === 1 && !refreshing)
    return <ActivityIndicator size="large" style={styles.loading} />;

  if (error) {
    return (<View style={styles.error}> <Error /> </View>);
  }

  // if (!isLoading && data.length === 0) {
  //   return (

  //     <View style={styles.error1}>
  //       <Nodatafound />
  //     </View>
  //   );
  // }

  const onCreatePress = () => {
    navigation.navigate('fuel_allowance_creation');
  }


  const filterGradientColors = [CustomColors.textGray, CustomColors.textWhite];

  return (
    <View style={styles.container}>
      <View style={styles.filtercontainer}>
        <View style={styles.filterRow}>
          <Text allowFontScaling={false} style={styles.dateText} onPress={showDatePicker}>
            <EvilIcons name="calendar" size={38} color={CustomColors.appThemeColor} />
          </Text>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onChange}
            />
          )}
        </View>

        <View style={styles.filterRow}>
          <TextInput allowFontScaling={false}
            style={styles.input}
            placeholder="Filter by amount..."
            keyboardType="numeric"
            placeholderTextColor={CustomColors.textGray}
            onChangeText={(text) => debouncedSetClaimAmountFilter(text)}
            defaultValue={claimAmountFilter}
          />
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.tour_id.toString()}
        renderItem={({ item }) => {
          const statusName = (typeof item.current_status === 'object' && item.current_status.name)
            ? item.current_status.name.toLowerCase().trim()
            : (typeof item.current_status === 'string' ? item.current_status.toLowerCase().trim() : '');

          const handleCardPress = () => {
            navigation.navigate('fuel_allowance_maker_summary_deep', {
              tourId: item.tour_id,
            });

          };

          return (
            <TouchableOpacity onPress={handleCardPress}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text allowFontScaling={false} style={styles.tourId}>Tour ID: {item.tour_id}</Text>
                  <Text allowFontScaling={false}
                    style={[
                      styles.status,
                      statusName === 'approved' ? styles.statusApproved :
                        statusName === 'pending' ? styles.statusPending :
                          styles.statusDefault
                    ]}
                  >
                    {typeof item.current_status === 'object' ? item.current_status.name : item.current_status || 'N/A'}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text allowFontScaling={false} style={styles.label}>Month: <Text allowFontScaling={false} style={styles.value}>{item.month_year}</Text></Text>
                  <Text allowFontScaling={false} style={styles.label}>Amount: <Text allowFontScaling={false} style={styles.value}>₹{item.claim_amount}</Text></Text>
                  <Text allowFontScaling={false} style={styles.label}>Requested by: <Text allowFontScaling={false} style={styles.value}>{item.emp_details?.code} {item.emp_details?.full_name}</Text></Text>
                  <Text allowFontScaling={false} style={styles.label}>Branch: <Text allowFontScaling={false} style={styles.value}>{item.emp_branch_details?.name}</Text></Text>
                  <Text allowFontScaling={false} style={styles.label}>Approver: <Text allowFontScaling={false} style={styles.value}>{item.approver_details?.code} {item.approver_details?.full_name}</Text></Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        onEndReachedThreshold={0.8}
        onEndReached={handleEndReached}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={() => {
          if (isLoading || refreshing) return null; // loading time-la kaatta vendam
          return (
            <View style={styles.error1}>
              <Nodatafound />
              <Text allowFontScaling={false} style={{ color: CustomColors.textGray, marginTop: 8 }}>
                No records found
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          hasNext && !isLoading && !refreshing ? (
            <ActivityIndicator style={{ margin: 16 }} color={CustomColors.appThemeColor} />
          ) : null
        }
      />

    </View>
  );
};

export default FuelAllowanceSummary;


