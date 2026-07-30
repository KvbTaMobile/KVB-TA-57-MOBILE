import * as Speech from "expo-speech";

let speechEnabled = false;

// Call this ONCE when app starts (optional)
export const initSpeechSetting = (value) => {
    speechEnabled = value === true || value === "true";
    if (!speechEnabled) Speech.stop();
};

export const enableSpeech = () => {
    speechEnabled = true;
};

export const disableSpeech = () => {
    speechEnabled = false;
    Speech.stop();
};

// ✅ Important (fixes your undefined error)
export const isSpeechEnabled = () => speechEnabled;

// Helper to remove emojis
const removeEmojis = (string) => {
    const regex =
        /\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}|\u200D|\uFE0F/gu;
    return string.replace(regex, "");
};

// 🔊 Main speak function
export const speak = (text) => {
    if (!speechEnabled || !text) return;

    let sanitizedText = text.replace(/["'_(),@#$%^&*`]/g, "");
    sanitizedText = removeEmojis(sanitizedText);

    if (!sanitizedText.trim()) return;

    Speech.stop();

    Speech.speak(sanitizedText, {
        language: "en",
        rate: 0.9,
        pitch: 1.0,
    });
};
