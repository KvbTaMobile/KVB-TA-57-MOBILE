import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { useGetChatSummaryQuery, } from '../../redux/rtk_query/apiSlice';
import Loading from '../../styles/Lottie/loading';
import { getCustomColors } from '../../styles/CustomColors';
import { useLayoutEffect } from 'react';
import {
  horizontalScale,
  verticalScale,
  moderateScale,
} from "../../globalstyles/Metrics";
import { useSelector } from 'react-redux';
import * as styless from "../../styles/StyleSheet";
export default function MessageScreen({ navigation }) {
  const [page, setPage] = useState(1);
  const [chatData, setChatData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isFetching, refetch } = useGetChatSummaryQuery(
    { page },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const styles = StyleSheet.create({
    card: {
      padding: moderateScale(16),
      borderBottomWidth: 1,
      borderColor: CustomColors.backgroundGray,
      backgroundColor: CustomColors.backgroundWhite,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
    },

    tour: {
      fontWeight: "bold",
      fontSize: moderateScale(16),
      color: CustomColors.accentGreen,
    },

    msg: {
      color: CustomColors.textDark,
      marginTop: verticalScale(4),
      fontSize: moderateScale(15),
    },

    meta: {
      color: CustomColors.textGray,
      fontSize: moderateScale(12),
      marginTop: verticalScale(2),
    },

    badge: {
      backgroundColor: CustomColors.backgroundRed,
      borderRadius: moderateScale(14),
      minWidth: horizontalScale(28),
      paddingHorizontal: horizontalScale(6),
      paddingVertical: verticalScale(2),
      justifyContent: "center",
      alignItems: "center",
      marginLeft: horizontalScale(10),
    },

    badgeText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(12),
      fontWeight: "bold",
    },

    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: CustomColors.appScreenColor
    },
  });
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: CustomColors.appThemeColor,
      },
      headerTintColor: CustomColors.textWhite,
      headerTitleStyle: {
        ...globalStyles.headerTitle,
        fontSize: moderateScale(20),   // ✅ FONT SIZE HERE
        fontWeight: '600',             // optional
      },
    });
  }, [navigation, isDark]);



  // 🟡 Load or merge data when fetched
  useEffect(() => {
    if (data?.data) {
      if (page === 1 || refreshing) {
        setChatData(data.data); // replace if first page or refresh
      } else {
        setChatData(prev => [...prev, ...data.data]); // append more
      }
      setRefreshing(false); // stop refresh once data is set
    }
  }, [data]);

  // 🟢 Handle pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    refetch();   // optional force call
  };

  // 🟢 Load more when reaching bottom
  const loadMore = () => {
    if (data?.pagination?.has_next && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  // 🟢 Show initial loading spinner
  if (isFetching && page === 1 && !refreshing) {
    return <View style={globalStyles.loadingContainer}>
      <ActivityIndicator size="large" color={CustomColors.appThemeColor} />
      <Text allowFontScaling={false} style={globalStyles.loadingText}>Please wait...</Text>
    </View>
  }





  return (
    <View style={{ flex: 1, backgroundColor: CustomColors.appScreenColor }}>
      <FlatList
        data={chatData}
        keyExtractor={item => item.Chats.travel_id.toString()}
        renderItem={({ item }) => {
          const c = item.Chats;
          const comment = c.comment.replace(/<\/?[^>]+>/g, '');
          const hasUnread = c.unread_message > 0;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                // Clear unread locally
                setChatData(prev =>
                  prev.map(chat =>
                    chat.Chats.travel_id === c.travel_id
                      ? {
                        ...chat,
                        Chats: {
                          ...chat.Chats,
                          unread_message: 0,
                        },
                      }
                      : chat
                  )
                );
                navigation.navigate('chat', {
                  tourid: c.travel_id,
                  tourCode: c.code,
                  chatid: c.chatid,
                });
              }}
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text allowFontScaling={false} style={styles.tour}>Tour: {c.travel_id}</Text>
                  <Text allowFontScaling={false} style={styles.msg} numberOfLines={1}>{comment}</Text>
                  <Text allowFontScaling={false} style={styles.meta}>
                    {c.employee_name} • {c.created_date}
                  </Text>
                </View>

                {hasUnread && (
                  <View style={styles.badge}>
                    <Text allowFontScaling={false} style={styles.badgeText}>{c.unread_message}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.8}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={() =>
          data?.pagination?.has_next && isFetching ? (
            <View style={{ backgroundColor: CustomColors.appScreenColor }}>
              <Loading />
            </View>
          ) : null
        }
      />
    </View>
  );
}


