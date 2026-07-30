import { createSlice } from "@reduxjs/toolkit";
import { storeAsyncData, clearTokenAsyncData } from "../store/AsyncStore";
const initialState = {
  user: null,
  token: null,
  csrfToken: null,
  csrfCookie: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      // Save the full user object and token separately
      state.user = action.payload;
      state.token = action.payload.token;
      storeAsyncData("user", action.payload);
      storeAsyncData("token", action.payload.token);
    },
    setCsrf: (state, action) => {
      state.csrfCookie = action.payload.csrfCookie;
      state.csrfToken = action.payload.csrfToken;
      storeAsyncData("csrfToken", action.payload.csrfToken);
      storeAsyncData("csrfCookie", action.payload.csrfCookie);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.csrfToken = null;
      state.csrfCookie = null;
      clearTokenAsyncData();
    },
  },
});

export const { setUser, logout, setCsrf } = authSlice.actions;
export default authSlice.reducer;
