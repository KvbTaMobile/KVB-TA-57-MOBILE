import { baseQuery } from "./baseQuery";
import { logout, setCsrf } from "../../redux/slices/AuthSlice";
import ToastMessage from "../../TaComponents/toast/ToastMessage";
import ErrorMessage from "../../utilities/ErrorMessage";
import { NavigationService } from "../../navigator/NavigationService";
import { Alert, Platform } from "react-native";

export const baseQueryWithRefresh = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  const { data, error, meta } = result;

  const csrfToken = meta?.response?.headers?.get("X-CSRFToken");
  const csrfCookie = meta?.response?.headers?.get("X-CSRFCookie");

  console.log("csrfToken", csrfToken);
  console.log("csrfCookie", csrfCookie);

  if (csrfToken && csrfCookie) {
    api.dispatch(
      setCsrf({
        csrfToken,
        csrfCookie,
      })
    );
  }

  // Logs
  console.log("URL:", meta?.request?.url);
  console.log("Request Body:", meta?.request?._bodyText);
  console.log(data ? "Response:" : "Error:", data || error);

  // Handle backend business errors sent with HTTP 200
  if (data?.code === "UNEXPECTED_ERROR") {
    ToastMessage(
      data?.description ||
      data?.message ||
      "Something went wrong",
      true
    );

    return {
      error: {
        status: 200,
        data,
      },
      meta,
    };
  }
  if (error) {
    const isCanceled =
      error?.status === "FETCH_ERROR" &&
      (String(error?.error || "").toLowerCase().includes("cancel") ||
       String(error?.error || "").toLowerCase().includes("abort"));

    if (isCanceled) {
      return result;
    }

    const status = error?.status || "unknown";

    const backendMessage =
      error?.data?.error ||
      error?.data?.message ||
      error?.data?.detail;

    const fallbackMessage = ErrorMessage(status);

    const message = backendMessage || fallbackMessage;

    ToastMessage(message, true);

    const requestUrl = meta?.request?.url || "";
    const isAuthApi = requestUrl.includes("/auth_token") || requestUrl.includes("/get_public_key");

    if ((status === 401 || status === 403) && !isAuthApi) {
      api.dispatch(logout());

      setTimeout(() => {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Do you want to exit the app?",
          [
            {
              text: "Exit",
              style: "destructive",
              onPress: () => {
                if (Platform.OS === "android") {
                  // BackHandler.exitApp();
                  NavigationService.navigate("login");

                } else {
                  NavigationService.navigate("login");
                }
              },
            },
          ],
          { cancelable: false }
        );
      }, 1500);
    }
  }

  return result;
};