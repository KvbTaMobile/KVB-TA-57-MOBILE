// store/themeSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Appearance } from "react-native";
import { storeAsyncData, getAsyncData } from "../store/AsyncStore";

const THEME_KEY = "themeMode";

// Async thunk to load theme from AsyncStorage
export const loadTheme = createAsyncThunk("theme/loadTheme", async () => {
    const savedTheme = await getAsyncData(THEME_KEY);
    return savedTheme || "auto"; // default to auto
});

// Async thunk to save theme to AsyncStorage
export const saveTheme = createAsyncThunk("theme/saveTheme", async (mode) => {
    await storeAsyncData(THEME_KEY, mode);
    return mode;
});

const themeSlice = createSlice({
    name: "theme",
    initialState: {
        isDark: Appearance.getColorScheme() === "dark",
        mode: "auto", // "auto" | "light" | "dark"
    },
    reducers: {
        toggleTheme: (state) => {
            state.isDark = !state.isDark;
            state.mode = state.isDark ? "dark" : "light";
        },
        setTheme: (state, action) => {
            const mode = action.payload;
            state.mode = mode;

            if (mode === "auto") {
                const systemScheme = Appearance.getColorScheme();
                state.isDark = systemScheme === "dark";
            } else {
                state.isDark = mode === "dark";
            }
        },
        updateSystemTheme: (state, action) => {
            // called when system theme changes
            if (state.mode === "auto") {
                state.isDark = action.payload === "dark";
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loadTheme.fulfilled, (state, action) => {
            const mode = action.payload;
            state.mode = mode;

            if (mode === "auto") {
                const systemScheme = Appearance.getColorScheme();
                state.isDark = systemScheme === "dark";
            } else {
                state.isDark = mode === "dark";
            }
        });

        builder.addCase(saveTheme.pending, (state, action) => {
            const mode = action.meta.arg;
            state.mode = mode;
            if (mode === "auto") {
                const systemScheme = Appearance.getColorScheme();
                state.isDark = systemScheme === "dark";
            } else {
                state.isDark = mode === "dark";
            }
        });

        builder.addCase(saveTheme.fulfilled, (state, action) => {
            state.mode = action.payload;
            if (action.payload === "auto") {
                const systemScheme = Appearance.getColorScheme();
                state.isDark = systemScheme === "dark";
            } else {
                state.isDark = action.payload === "dark";
            }
        });
    },
});

export const { toggleTheme, setTheme, updateSystemTheme } = themeSlice.actions;
export default themeSlice.reducer;
