import { createSlice } from "@reduxjs/toolkit";

const settings = createSlice({
  name: "settings",
  initialState: {
    theme: null,
  },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload.data;
    },
  },
});

export const { setTheme } = settings.actions;
export default settings.reducer;
