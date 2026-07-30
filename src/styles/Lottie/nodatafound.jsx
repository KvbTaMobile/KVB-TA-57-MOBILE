import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSelector } from 'react-redux';
import { getCustomColors } from '../CustomColors';

const Error404 = () => {
  const isDark = useSelector(state => state.theme.isDark);
  const CustomColors = getCustomColors(isDark);

  const lottieSource = isDark
    ? require('../../assets/lottie/nodatafound_dark.json')
    : require('../../assets/lottie/nodatafound_light.json');

  return (
    <View style={[styles.container,]}>
      <LottieView
        source={lottieSource}
        autoPlay
        loop
        resizeMode="contain"
        style={styles.lottie}
      />
    </View>
  );
};

export default Error404;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 260,
    height: 260,
  },
});
