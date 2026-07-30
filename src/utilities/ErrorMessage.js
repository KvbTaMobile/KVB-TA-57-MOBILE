const ErrorMessage = (status, detail = "") => {
    switch (status) {
      case 400:
        return detail || "Bad request. Please check your input.";
  
        case 401:
          return "Access denied. Token expired. Login again.";
    
        case 403:
          return "Access denied. Token expired. Login again.";
  
      case 404:
        return "Requested resource not found.";
  
      case 405:
        return "Method not allowed.";
  
      case 407:
        return "Session expired. Please login again.";
  
      case 408:
        return "Request timeout. Please try again.";
  
      case 409:
        return "Conflict occurred. Please retry.";
  
      case 422:
        return detail || "Validation failed. Please check the details.";
  
      case 429:
        return "Too many requests. Please slow down.";
  
      case 500:
        return "Internal server error. Please try later.";
  
      case 502:
        return "Bad gateway. Server not responding.";
  
      case 503:
        return "Service unavailable. Please try later.";
  
      case 504:
        return "Gateway timeout. Please try later.";
  
      default:
        return detail || "Something went wrong. Please try again.";
    }
  };
  
  export default ErrorMessage;
  