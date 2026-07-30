import React from 'react';
import { View, Text, StyleSheet, Animated, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { horizontalScale, moderateScale, verticalScale } from '../../styles/Metrics';
import { getCustomColors } from '../../styles/CustomColors';
import * as styless from "../../styles/StyleSheet";

const ApprovalStep = ({ step, index, styles, CustomColors }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const isApproved = step.status === 3;
  const isRequested = step.status === 1;

  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={isApproved ? 'checkmark-circle' : isRequested ? 'time' : 'close-circle'}
          size={24}
          color={isApproved
            ? CustomColors.textGreen
            : isRequested
              ? CustomColors.textYellow
              : CustomColors.textRed}
        />
        {index < 2 && <View style={styles.verticalLine} />}
      </View>
      <View style={styles.detailContainer}>
        <Text allowFontScaling={false} style={styles.name}>{step.approvedby}</Text>
        <Text allowFontScaling={false} style={styles.meta}>
          {step.status_name} on {step.approveddate}
        </Text>
        <Text allowFontScaling={false} style={styles.comment}>“{step.comment || 'No comment'}”</Text>
        <Text allowFontScaling={false} style={styles.branch}>Branch: {step.branch_name}</Text>
      </View>
    </Animated.View>
  );
};

const FuelApprovalFlow = ({ data }) => {
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);
  const globalStyles = styless.styles(isDark);
  if (!data?.length) return null;
  const styles = StyleSheet.create({
    container: {
      marginBottom: verticalScale(16),
      padding: horizontalScale(16),
      backgroundColor: CustomColors.backgroundWhite,
      borderRadius: moderateScale(12),
      borderColor: CustomColors.backgroundGray,
      // borderWidth: 1,
    },
    title: {
      fontSize: moderateScale(18),
      fontWeight: '700',
      marginBottom: verticalScale(12),
      color: CustomColors.textDarkGray,
    },
    stepContainer: {
      flexDirection: 'row',
      marginBottom: verticalScale(24),
    },
    iconContainer: {
      alignItems: 'center',
      marginRight: horizontalScale(12),
    },
    verticalLine: {
      width: horizontalScale(2),
      height: verticalScale(40),
      backgroundColor: CustomColors.backgroundWhite,
      marginTop: verticalScale(2),
    },
    detailContainer: {
      flex: 1,
    },
    name: {
      fontWeight: '700',
      fontSize: moderateScale(16),
      color: CustomColors.darkGray,
    },
    meta: {
      color: CustomColors.textDarkGray,
      fontSize: moderateScale(14),
    },
    comment: {
      fontStyle: 'italic',
      marginTop: verticalScale(4),
      fontSize: moderateScale(14),
      color: CustomColors.textDarkGray,
    },
    branch: {
      marginTop: verticalScale(4),
      fontSize: moderateScale(13),
      color: CustomColors.textGray,
    },
  });
  return (
    <View style={styles.container}>
      <Text allowFontScaling={false} style={styles.title}>Approval Flow</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <ApprovalStep step={item} index={index} styles={styles} CustomColors={CustomColors} />
        )}
      />
    </View>
  );
};

export default FuelApprovalFlow;

