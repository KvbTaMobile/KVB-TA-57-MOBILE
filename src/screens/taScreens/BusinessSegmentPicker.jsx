import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetBusinessSegmentsQuery,
} from '../../redux/rtk_query/apiSlice';
import {
  setSearchQuery,
  setSelectedSegment,
  appendSegments,
  resetSegments,
  setPage,
  setHasNextPage,
} from '../../redux/slices/BusinessSegmentSlice';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';


const BusinessSegmentPicker = ({ onSelect, open, setOpen, selected }) => {
  const dispatch = useDispatch();
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const {
    searchQuery,
    segments,
    selectedSegment,
    page,
    hasNextPage,
  } = useSelector((state) => state.businessSegment);

  const [value, setValue] = useState(selected?.id ?? selectedSegment?.id ?? null);
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState(searchQuery);

  const prevQueryRef = useRef(searchQuery);
  const prevPageRef = useRef(page);

  useEffect(() => {
    if (!selected) {
      setValue(null);
    } else if (selected.id !== value) {
      setValue(selected.id);
    }
  }, [selected, value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== searchQuery) {
        dispatch(setSearchQuery(searchText));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (prevQueryRef.current !== searchQuery) {
      dispatch(resetSegments());
      dispatch(setPage(1));
      prevQueryRef.current = searchQuery;
    }
  }, [searchQuery]);

  const { data, isLoading, isFetching, error } = useGetBusinessSegmentsQuery(
    { query: searchQuery, page },
    { skip: !hasNextPage && page !== 1 }
  );

  useEffect(() => {
    if (data?.data?.length) {
      dispatch(appendSegments(data.data));
      dispatch(setHasNextPage(data.pagination?.has_next ?? false));
    } else {
      dispatch(setHasNextPage(false));
    }
  }, [data]);

  useEffect(() => {
    const mapped = segments.map((seg) => ({
      label: seg.name,
      value: seg.id,
    }));
    setItems(mapped);
  }, [segments]);

  useEffect(() => {
    if (
      segments.length < 20 &&
      hasNextPage &&
      !isFetching &&
      prevPageRef.current === page &&
      prevQueryRef.current === searchQuery
    ) {
      const nextPage = page + 1;
      prevPageRef.current = nextPage;
      dispatch(setPage(nextPage));
    }
  }, [segments, hasNextPage, isFetching, page]);
  const styles = StyleSheet.create({
    container: {
      zIndex: 1000,
      marginBottom: verticalScale(12),
    },
    openContainer: {
      height: verticalScale(250),
    },
    closedContainer: {
      height: undefined,
    },
    picker: {
      borderWidth: 1,
      paddingVertical: verticalScale(10),
      paddingHorizontal: horizontalScale(12),
      borderRadius: moderateScale(8),
      minHeight: verticalScale(48),
    },
    dropdownContainer: {
      borderWidth: 1,
      borderRadius: moderateScale(8),
      paddingVertical: verticalScale(6),
    },
  });

  const handleChangeValue = (val) => {
    setValue(val);
    const selectedItem = segments.find((s) => s.id === val);
    if (selectedItem) {
      dispatch(setSelectedSegment(selectedItem));
      if (onSelect) onSelect(selectedItem);
    } else {
      dispatch(setSelectedSegment(null));
      if (onSelect) onSelect(null);
    }
  };

  if (error) {
    return (
      <Text allowFontScaling={false} style={{ color: CustomColors.textRed, marginTop: 50 }}>
        Error loading data
      </Text>
    );
  }

  return (
    <View style={[styles.container, open ? styles.openContainer : styles.closedContainer]}>
      <DropDownPicker
        dropDownMaxHeight={250}
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={(cbOrVal) => {
          const newVal = typeof cbOrVal === 'function' ? cbOrVal(value) : cbOrVal;
          handleChangeValue(newVal);
        }}
        setItems={setItems}
        searchable={true}

        placeholder="-- Select a Segment --"
        placeholderStyle={{
          color: CustomColors.textGray,   // ✅ placeholder color
        }}

        style={[
          styles.picker,
          {
            backgroundColor: CustomColors.backgroundWhite,   // ✅ closed picker bg
            borderColor: CustomColors.textGray,
          },
        ]}

        dropDownContainerStyle={[
          styles.dropdownContainer,
          {
            backgroundColor: CustomColors.backgroundWhite,  // ✅ dropdown bg
            borderColor: CustomColors.borderGray,
          },
        ]}

        listItemContainerStyle={{
          borderBottomWidth: 0,
        }}

        listItemLabelStyle={{
          color: CustomColors.textBlack,     // ✅ item text
        }}

        selectedItemLabelStyle={{
          color: CustomColors.primaryBlue,       // ✅ selected text color
          fontWeight: '600',
        }}

        activeItemStyle={{
          backgroundColor: CustomColors.backgroundGray2,    // ✅ selected row bg
        }}

        modalProps={{
          animationType: 'slide',
          presentationStyle: 'pageSheet',
        }}

        modalContentContainerStyle={{
          backgroundColor: CustomColors.backgroundWhite,    // ✅ modal bg
        }}

        searchContainerStyle={{
          borderWidth: 0,
          backgroundColor: CustomColors.backgroundWhite,
        }}

        searchTextInputProps={{
          value: searchText,
          onChangeText: setSearchText,
          placeholder: 'Search business segments...',
          placeholderTextColor: CustomColors.textGray,       // ✅ search placeholder
          style: {
            backgroundColor: CustomColors.backgroundWhite,
            color: CustomColors.textBlack,
            borderRadius: moderateScale(8),
            paddingHorizontal: horizontalScale(12),
          },
        }}

        listMode="MODAL"

        onScrollEndReached={() => {
          if (!isFetching && hasNextPage) {
            dispatch(setPage(page + 1));
          }
        }}
        textStyle={{ color: CustomColors.textBlack, }}

        flatListProps={{
          showsVerticalScrollIndicator: false,
          keyboardShouldPersistTaps: 'handled',
          onEndReachedThreshold: 0.7,
          onEndReached: () => {
            if (!isFetching && hasNextPage) {
              dispatch(setPage(page + 1));
            }
          },
        }}
      />

    </View>
  );
};

export default BusinessSegmentPicker;




