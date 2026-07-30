import React from 'react';
import { View, StyleSheet ,Text} from 'react-native';
import LottieView from 'lottie-react-native';
import { CustomColors } from '../CustomColors';

const rotating = () => {
  return (
    <View >
    <LottieView
      source={require('../../assets/lottie/rotating.json')} 
      autoPlay
      loop={true}
      style={{ width: 100, height: 100,borderRadius:20, }}
    />
  </View>
  )
}

export default rotating;

const styles = StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor:CustomColors.textBlack,
      zIndex:-1,

    },
  });
