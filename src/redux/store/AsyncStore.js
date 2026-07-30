import AsyncStorage from "@react-native-async-storage/async-storage";

export const storeAsyncData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {}
};

export const getAsyncData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch (e) {}
};

export const clearAsyncStorage = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {}
};

export const clearTokenAsyncData = async () => {
  try {
    await AsyncStorage.removeItem("token");
  } catch (e) {}
};

export const checkTokenAsyncDataExists = async () => {
  try {
    const value = await AsyncStorage.getItem("token");
    return value !== null;
  } catch (e) {
    return false;
  }
};
