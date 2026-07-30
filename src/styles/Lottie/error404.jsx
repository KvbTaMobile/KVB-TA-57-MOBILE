import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const error404 = () => {
  return (
    <View style={styles.container}>
    <LottieView
      source={require('../../assets/lottie/error404.json')} 
      autoPlay
      loop
      style={{ width: 300, height: 300 }}
    />
  </View>
  )
}

export default error404;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
