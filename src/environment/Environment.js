import { Platform } from "react-native";
const ENV = "DEV"; // DEV, SIT, UAT, PROD

const ENV_CONFIG = {
  DEV: {
    baseUrl: "https://kvbapi.vsolv.co.in",
    showCaptcha: false,
  },
  SIT: {
    baseUrl: "https://kvbsitapi.vsolv.net",
    showCaptcha: true,
  },
  UAT: {
    baseUrl: "https://kvbuatapi.vsolv.net",
    showCaptcha: true,
  },
  PROD: {
    baseUrl: "https://kvbprodapi.vsolv.net",
    showCaptcha: true,
  }
};
//  Base domains
const BASE_DOMAIN = ENV_CONFIG[ENV].baseUrl;
const USER_SERVICE_DOMAIN = ""; //  for Future different domain 

// Ports 
const PORTS = {
  USER: 1000,
  MASTER: 1001,
  DOC: 1002,
  VENDOR: 1003,
  PRPO: 1004,
  CRM: 1010,
  TA: 1019,
  HRMS: 1023,
  PROJECT: 1007,
  SALES: 1009,
  SMS: 1008,
  ENTRY: 1011,
};

// App version info
const aabVersion = "V 1.0";
const ipaVersion = "V 1.0";
const aabReleaseDate = "29-jul-2026";
const ipaReleaseDate = "29-jul-2026";

const buildUrl = (domain, port) =>
  domain ? `${domain}` : `${BASE_DOMAIN}`;

export const Environment = {
  baseUrl: BASE_DOMAIN,
  baseUrlUserService: USER_SERVICE_DOMAIN,
  showCaptcha: ENV_CONFIG[ENV].showCaptcha,
  // New service-specific base URLs
  userServiceUrl: buildUrl(USER_SERVICE_DOMAIN),
  crmServiceUrl: buildUrl(BASE_DOMAIN, PORTS.CRM),
  // fetServiceUrl: buildUrl(BASE_DOMAIN, PORTS.FET),
  docServiceUrl: buildUrl(BASE_DOMAIN, PORTS.DOC),
  hrmsServiceUrl: buildUrl(BASE_DOMAIN, PORTS.HRMS),
  taServiceUrl: buildUrl(BASE_DOMAIN, PORTS.TA),
  masterServiceUrl: buildUrl(BASE_DOMAIN, PORTS.MASTER),
  prpoServiceUrl: buildUrl(BASE_DOMAIN, PORTS.PRPO),
  vendorServiceUrl: buildUrl(BASE_DOMAIN, PORTS.VENDOR),
  projectServiceUrl: buildUrl(BASE_DOMAIN, PORTS.PROJECT),
  smsServiceUrl: buildUrl(BASE_DOMAIN, PORTS.SMS),
  salesServiceUrl: buildUrl(BASE_DOMAIN, PORTS.SALES),
entryServiceUrl: buildUrl(BASE_DOMAIN, PORTS.ENTRY), // Assuming entry service uses the same port as user service
  // Version info
  appVersion:
    Platform.OS === "android"
      ? aabVersion
      : Platform.OS === "ios"
        ? ipaVersion
        : "",

  releaseDate:
    Platform.OS === "android"
      ? aabReleaseDate
      : Platform.OS === "ios"
        ? ipaReleaseDate
        : "",
};
