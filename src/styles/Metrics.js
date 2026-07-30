// styles/Metrics.js
import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

// iPhone X guideline sizes
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const horizontalScale = (size) => Math.round((width / guidelineBaseWidth) * size);
const verticalScale = (size) => Math.round((height / guidelineBaseHeight) * size);
const moderateScale = (size, factor = 0.4) => Math.round(size + (horizontalScale(size) - size) * factor);
const scaleFont = (size) => moderateScale(size, 0.35); // Specifically for fonts

export { horizontalScale, verticalScale, moderateScale, scaleFont };
