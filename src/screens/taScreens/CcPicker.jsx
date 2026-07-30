// CcPicker.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useSelector } from 'react-redux';
import { useGetCcSegmentsQuery } from '../../redux/rtk_query/apiSlice';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';

const CcPicker = ({ onSelect, open, setOpen, bsId, selected }) => {
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const [value, setValue] = useState(selected?.id ?? null);
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState('');

  const prevQueryRef = useRef('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const prevBsIdRef = useRef(bsId);

  const shouldSkip = !bsId || (!hasNextPage && page !== 1);

  const { data, isFetching } = useGetCcSegmentsQuery(
    { query: searchText, bs_id: bsId, page },
    { skip: shouldSkip }
  );

  // Theme-aware styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      zIndex: 1000,
      borderWidth: 0,
      marginBottom: verticalScale(12),

    },
    openContainer: {
      height: verticalScale(250),
    },
    picker: {
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: moderateScale(8),
      backgroundColor: CustomColors.backgroundGray,
      elevation: 2,
      zIndex: 1000,
    },
    dropdownContainer: {
      borderWidth: 1,
      borderColor: CustomColors.textGray,
      borderRadius: moderateScale(8),
      backgroundColor: CustomColors.backgroundWhite,
      elevation: 3,
      zIndex: 1500,
    },
    noData: {
      textAlign: 'center',
      marginTop: verticalScale(10),
      color: CustomColors.textGray,
    },
  }), [CustomColors]);

  // Reset when BS changes
  useEffect(() => {
    if (bsId !== prevBsIdRef.current) {
      setItems([]);
      setValue(null);
      setPage(1);
      setHasNextPage(true);
      setSearchText('');
      prevQueryRef.current = '';
    }
    prevBsIdRef.current = bsId;
  }, [bsId]);

  // Sync selected
  useEffect(() => {
    if (selected === null) {
      setValue(null);
    } else if (selected && selected.id !== value) {
      setValue(selected.id);
    }
  }, [selected]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== prevQueryRef.current) {
        setPage(1);
        setHasNextPage(true);
        prevQueryRef.current = searchText;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Data append
  useEffect(() => {
    if (!data?.data) return;

    const mapped = data.data.map(seg => ({
      label: `${seg.name} (${seg.id})`,
      value: seg.id,
      description: seg.description,
    }));

    setItems(prev => (page === 1 ? mapped : [...prev, ...mapped]));
    setHasNextPage(data?.pagination?.has_next ?? false);
  }, [data, page]);

  const onEndReached = () => {
    if (hasNextPage && !isFetching) {
      setPage(p => p + 1);
    }
  };

  const handleChangeValue = (val) => {
    const selectedItem = items.find(item => item.value === val);
    if (selectedItem && onSelect) {
      onSelect({
        id: val,
        name: selectedItem.label.split(' (')[0],
        description: selectedItem.description,
      });
    }
    setValue(val);
  };

  return (
    <View style={[styles.container, open && styles.openContainer]}>
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={(val) => {
          const actualVal = typeof val === 'function' ? val(value) : val;
          handleChangeValue(actualVal);
        }}
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
        textStyle={{ color: CustomColors.textBlack, }}
        modalProps={{
          animationType: 'slide',
          presentationStyle: 'pageSheet',
        }}
        modalContentContainerStyle={{
          backgroundColor: CustomColors.backgroundWhite,    // ✅ modal bg
        }}

        setItems={setItems}
        searchable
        placeholder="-- Choose a segment --"
        listMode="MODAL"
        dropDownDirection="BOTTOM"
        dropDownMaxHeight={200}

        searchTextInputProps={{
          placeholder: 'Search segments...',
          value: searchText,
          onChangeText: setSearchText,
          placeholderTextColor: CustomColors.textGray,
          style: {
            color: CustomColors.textBlack,
            backgroundColor: 'transparent',
            width: "88%",
            ...Platform.select({
              android: { underlineColorAndroid: 'transparent' },
            }),
          },
        }}
        searchContainerStyle={{ borderWidth: 0, backgroundColor: CustomColors.backgroundWhite }}
        flatListProps={{
          keyboardShouldPersistTaps: 'handled',
          onEndReached,
          onEndReachedThreshold: 0.5,
          showsVerticalScrollIndicator: false,
          ListEmptyComponent: (
            <Text allowFontScaling={false} style={styles.noData}>
              No segments found
            </Text>
          ),
        }}
        loading={isFetching && page > 1}
      />
    </View>
  );
};

export default CcPicker;
