import * as Application from 'expo-application';
import * as Device from 'expo-device';

export function getDeviceId() {
  if (Device.osName === 'Android') {
    return Application.getAndroidId();
  }
  return Application.getIosIdForVendorAsync(); 
}
