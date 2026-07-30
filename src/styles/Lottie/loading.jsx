import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const loading = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../assets/lottie/loading.json')}
        autoPlay
        loop={true}
        style={{ width: 100, height: 50 }}
      />
    </View>
  )
}

export default loading;

const styles = StyleSheet.create({
  container: {
    //   flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    //   backgroundColor:CustomColors.iconTextColor,
  },
});
