import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useGetChatBoxQuery,
  usePostChatBoxMutation,
  usePostChatBoxViewMutation,
  useDeleteChatMutation
} from '../../redux/rtk_query/apiSlice';
import Loading from '../../styles/Lottie/loading';
import { getCustomColors } from '../../styles/CustomColors';
import { horizontalScale, moderateScale, verticalScale } from "../../globalstyles/Metrics";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from 'react-redux';
import * as styless from "../../styles/StyleSheet";
export default function ChatBubbleScreen({ route }) {
  const navigation = useNavigation();
  const { tourid, tourCode } = route.params;
  const [page, setPage] = useState(1);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  const { data, isFetching, refetch } = useGetChatBoxQuery({ tourid, page });
  const [postChat, { isLoading: isPosting }] = usePostChatBoxMutation();
  const [postChatView] = usePostChatBoxViewMutation();
  const [deleteChat] = useDeleteChatMutation()
  const flatListRef = useRef(null);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CustomColors.backgroundGray,
    },
    header: {
      flexDirection: 'row',
      paddingVertical: verticalScale(12),
      backgroundColor: CustomColors.appThemeColor,
      alignItems: 'center',
      paddingHorizontal: horizontalScale(10),
    },
    navIconContainer: {
      width: horizontalScale(40),
      height: verticalScale(40),
      justifyContent: 'center',
      alignItems: 'center',
    },
    navIconText: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(22),
      fontWeight: 'bold',
    },
    headerTextContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {

      ...globalStyles.headerTitle,
      fontSize: moderateScale(16),
      fontWeight: '600',

    },
    headerSubtitle: {
      color: CustomColors.textWhite,
      fontSize: moderateScale(12),
    },
    listContent: {
      paddingHorizontal: horizontalScale(12),
      paddingBottom: verticalScale(10),
    },
    msgRow: {
      flexDirection: 'row',
      marginVertical: verticalScale(6),
    },
    rowLeft: { justifyContent: 'flex-start' },
    rowRight: { justifyContent: 'flex-end' },
    bubble: {
      maxWidth: '85%',
      padding: moderateScale(12),
      borderRadius: moderateScale(15),
      elevation: 1,
      shadowColor: CustomColors.textBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
    },
    bubbleReceiver: {
      backgroundColor: CustomColors.backgroundWhite,
      borderBottomLeftRadius: 0,
    },
    bubbleSender: {
      backgroundColor: CustomColors.litegreen,
      borderBottomRightRadius: 0,
    },
    nameText: {
      fontSize: moderateScale(11),
      fontWeight: '700',
      marginBottom: verticalScale(2),
    },
    nameSender: {
      color: CustomColors.accentGreen,
      textAlign: 'right',
    },
    nameReceiver: {
      color: CustomColors.statusRed,
      textAlign: 'left',
    },
    msgText: {
      fontSize: moderateScale(15),
      color: CustomColors.textDark,
    },
    timestamp: {
      fontSize: moderateScale(9),
      color: CustomColors.textDarkGray,
      textAlign: 'right',
      marginTop: verticalScale(4),
    },
    inputContainer: {
      flexDirection: 'row',
      padding: moderateScale(10),
      backgroundColor: CustomColors.appScreenColor,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: CustomColors.backgroundGray,
    },
    input: {
      flex: 1,
      backgroundColor: CustomColors.backgroundGray2,
      borderRadius: moderateScale(25),
      paddingHorizontal: horizontalScale(15),
      paddingVertical: verticalScale(8),
      fontSize: moderateScale(15),
      maxHeight: verticalScale(100),
      color: CustomColors.textBlack
    },
    sendBtn: {
      marginLeft: horizontalScale(10),
      backgroundColor: CustomColors.appThemeColor,
      borderRadius: moderateScale(25),
      paddingHorizontal: horizontalScale(15),
      paddingVertical: verticalScale(10),
    },
    sendText: {
      color: CustomColors.textWhite,
      fontWeight: 'bold',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: CustomColors.backgroundGray
    },
  });
  useEffect(() => {
    if (tourid) {
      postChatView({ tourid }).catch(error => console.error(error));
    }
  }, [tourid]);

  useEffect(() => {
    if (data?.data) {
      setMessages(prev => {
        const merged = page === 1 ? data.data : [...prev, ...data.data];
        const unique = Array.from(
          new Map(merged.map(msg => [msg.chatid, msg])).values()
        );
        return unique;
      });
    }

    if (!isFetching) {
      setRefreshing(false);
    }
  }, [data, page, isFetching]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    refetch();
  };

  const loadMore = () => {
    if (data?.pagination?.has_next && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const formatChatDate = date => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthShort = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toTimeString().split(' ')[0];
    return `${day}-${monthShort} ${year} ${time}`;
  };
  const handleDelete = async (chatid) => {
    try {
      const res = await deleteChat({ chatid, tourid });

      if (res?.data?.status === "success") {
        setMessages(prev =>
          prev.map(msg =>
            msg.chatid === chatid
              ? { ...msg, is_deleted: true }
              : msg
          )
        );
      }
    } catch (error) {
      console.log("Delete Error:", error);
      Alert.alert("Error", "Delete failed");
    }
  };


  const sendMessage = async () => {
    if (!text.trim()) return;
    const comment = `<p>${text}</p>`;

    const newMessage = {
      chatid: Date.now(),
      comment,
      ismaker: 1,
      employee_name: "You",
      created_date: formatChatDate(new Date()),
    };

    setText('');
    setMessages(prev => [newMessage, ...prev]);

    const res = await postChat({ tourid, approver_id: '1', comment, type: 1 });
    if (res?.data?.status === 'success') {
      setPage(1);
      refetch();
    }
  };

  if (isFetching && page === 1 && !refreshing) {
    return (
      <View style={styles.center}>
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navIconContainer}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={CustomColors.iconWhite} />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text allowFontScaling={false} style={styles.headerTitle}>Tour Chat ({tourid})</Text>
          {/* <Text allowFontScaling={false} style={styles.headerSubtitle}>{tourCode} ID:({tourid})</Text> */}
        </View>

        <View style={styles.navIconPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={verticalScale(40)}
      >
        <FlatList
          ref={flatListRef}
          inverted
          data={messages}
          keyExtractor={item => item.chatid.toString()}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[CustomColors.appThemeColor]}
              tintColor={CustomColors.appThemeColor}
            />
          }
          renderItem={({ item }) => {
            const isSender = item.ismaker === 1;

            const isDeleted =
              item.is_deleted === true || item.comment === "" || item.comment === null;

            const plainText = item.comment?.replace(/<\/?[^>]+>/g, '') || '';

            const displayText = isDeleted
              ? "This message was deleted"
              : plainText;

            const onDelete = () => {
              Alert.alert(
                "Delete Message",
                "Are you sure you want to delete this message?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handleDelete(item.chatid),
                  },
                ]
              );
            };

            return (
              <View style={[styles.msgRow, isSender ? styles.rowRight : styles.rowLeft]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onLongPress={isSender && !isDeleted ? onDelete : null}
                >
                  <View
                    style={[
                      styles.bubble,
                      isSender ? styles.bubbleSender : styles.bubbleReceiver,
                      isDeleted && { opacity: 0.7 }
                    ]}
                  >
                    <Text allowFontScaling={false}
                      style={[
                        styles.nameText,
                        isSender ? styles.nameSender : styles.nameReceiver,
                      ]}
                    >
                      {item.employee_name}
                    </Text>

                    <Text allowFontScaling={false}
                      style={[
                        styles.msgText,
                        isDeleted && { fontStyle: 'italic', color: CustomColors.textDarkGray }
                      ]}
                    >
                      {displayText}
                    </Text>

                    <Text allowFontScaling={false} style={styles.timestamp}>{item.created_date}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}


          ListFooterComponent={isFetching && page > 1 ? <ActivityIndicator color={CustomColors.appThemeColor} /> : null}
        />

        <View style={styles.inputContainer}>
          <TextInput
            allowFontScaling={false}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={CustomColors.textGray}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.6 }]}
            onPress={sendMessage}
            disabled={isPosting || !text.trim()}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color={CustomColors.textWhite} />
            ) : (
              <Text allowFontScaling={false} style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

