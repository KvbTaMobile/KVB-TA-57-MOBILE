import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Environment } from "../../environment/Environment";

export const baseQuery = fetchBaseQuery({
  baseUrl: Environment.crmServiceUrl,
  timeout: 30000,
  prepareHeaders: (headers, { getState, endpoint }) => {

    // Public APIs
    if (["login", "getEntity", "getCaptacha"].includes(endpoint)) {
      headers.set("Content-Type", "application/json");
      return headers;
    }

    

    const state = getState();
    const token = state?.auth?.token;
    const csrfToken = state?.auth?.csrfToken;
    const csrfCookie = state?.auth?.csrfCookie;
    console.log("token-->",token)

    if (token) {
      headers.set("Authorization", `Token ${token}`);
    }

    if (csrfToken && csrfCookie) {
      headers.set("X-CSRFToken", csrfToken);
      headers.set("X-CSRFCookie", csrfCookie);
    }

    headers.set("Content-Type", "application/json");
    return headers;
  },
});
