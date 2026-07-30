import React from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";
import { horizontalScale, verticalScale } from "../../styles/Metrics";
import { useSelector } from "react-redux";
import { getCustomColors } from "../../styles/CustomColors";

export function RowList({
  data,
  RenderItem,
  onPress = () => { },
  onChangeText,
  pickerData,
  selected,
  setSelected,
  refreshing = false,
  onRefresh = () => { },
  onPressDelete,
  noOfColumns = 1,
  onLongPress,
  setChecked,
  onLoadMore = () => { },
  isLoadingMore = false,
  hasMoreData = true,
}) {

  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const handleEndReached = () => {
    if (!isLoadingMore && hasMoreData) {
      onLoadMore(); // Load next page
    }
  };
  const styles = StyleSheet.create({
    contentContainer: {
      // paddingHorizontal: horizontalScale(16),
      // paddingBottom: verticalScale(20),
    },
    loadingFooter: {
      paddingVertical: verticalScale(16),
      alignItems: "center",
      justifyContent: "center",
    },
  });
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={CustomColors.appThemeColor} />
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      numColumns={noOfColumns}
      overScrollMode="never"
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.contentContainer}
      renderItem={({ item, index }) => (
        <RenderItem
          data={item}
          pickerData={pickerData}
          index={index}
          selected={selected}
          setSelected={setSelected}
          onPress={() => onPress(item)}
          onPressDelete={onPressDelete}
          onChangeText={onChangeText}
          onLongPress={onLongPress}
          setChecked={setChecked}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[CustomColors.bottomNavBarIconActiveColor]}
          tintColor={CustomColors.bottomNavBarIconActiveColor}
          title="Refreshing..."
          titleColor={CustomColors.bottomNavBarIconActiveColor}
        />
      }
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item, index) =>
        // item?.id?.toString() ||
        // item?.tourid?.toString() ||
        // item?.tour_no?.toString() ||
        index.toString()
      }
    />
  );
}


