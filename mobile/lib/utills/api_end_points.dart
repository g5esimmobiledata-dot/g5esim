class ApiEndPoints {
  // ---------LoginEndpoint-------------------
  static const String LOGIN = "auth/app/send-otp";
  static const String FIREBASE_LOGIN = "auth/app/login-with-google";

  static const String VERIFYEMAIL = "auth/app/verify-otp";
  static const String LOGOUT = "auth/logout";
  static const String USERPROFILE = "auth/me";
  static const String UPDATEPROFILE = "customer/profile";
  static String COUNTRYLIST = "destinations/with-pricing";
  static String REGIONS = "regions/with-pricing";
  static String PACKAGELIST = "unified-packages/by-destination";
  static String REGIONLIST = "unified-packages/by-region";
  static String PACKAGE_DETAIL = "unified-packages";
  static const String DEVICE_INFO = "devices";
  static const String BANNERS = "banner";
  static const String KYCFORM = "customer/kyc/upload";
  static const String GETCURRENCY = "currencies";
  static const String DELETE_ACCOUNT = "user/account";
  static const String VOUCHER_APPLY = "validate-promo-code";
  static const String ORDERS = "orders/my-orders";
  static const String REFERRALS_MYPROGRAM = "referrals/my-program";
  static const String REFERRALS_HISTORY = "referrals/my-referrals";
  // static const String MY_GIFT_CARD_HISTORY = "referrals/my-gift-cards";
  static const String CONVERT_TO_GIFTCARD = "referrals/redeem-to-gift-card";
  static const String SET_PASSWORD = "auth/app/set-password";
  static const String LOGIN_PASSWORD = "auth/app/login-password";
  static const String RESET_PASSWORD_VERIFY = "auth/reset-password";
  static const String RESET_QUERY = "auth/forgot-password";
  static const String GET_USAGE = "customer/my-esims-usages";

  // ---------notifications api-------------------
  static const String NOTIFICATION = "notifications";
  static const String NOTIFICATION_DELETE =
      "notifications/delete-all-notification";

  //-------------Customer Support-------------------
  static const String GET_TICKETS = "customer/tickets"; //create ticket
  static const String GET_FAQ = "faqs";
  static const String GET_LANGUAGE = "languages";
  static const String GET_TRANSLATION = "translations";

  // ---------Purchase esim details-------------------

  static const String GETESIM_INSTRUCTIONS = "esims";
  static const String TOPUP_LIST = "esims/";
  static const String GATEWAYLIST = "payments/gateways";
  static const String PAYMENTINITIATE = "payments/init";
  static const String WALLET_REDEEM_VOUCHER = "wallet/redeem-voucher";
  static const String WALLET_TOPUP_INIT = "wallet/topup/init";
  static const String WALLET_TOPUP_CONFIRM = "wallet/topup/confirm";
  static const String WALLET_TRANSACTIONS = "wallet/transactions";

  static const String IAP_INITIATE = "iap/init";
  static const String IAP_VERIFY = "iap/verify";

  // ---------OLD APIS-------------------
  static const String PRIVACY_TREMSANDCONDITION = "pages";

  // ---------Payment apis-------------------
  static const String PAYMENTVERIFY = "payment/verifyPayment";
  static const String PAYMENTCANCELED = "payment/cancel";

  ///review -- rating
  static const String SUBMIT_REVIEW = "reviews";
  static const String GET_REVIEW = "reviews";
  static const String CREATE_GIFTCARD = "payments/init-gift-card";
  static const String RECEIVED_GIFT_CARD = "gift-cards/my-cards";
  static const String CONFIRM_PAYMENT = "confirm-payment";
  static const String CONFIRM_PAYMENT_GUEST = "guest/confirm-payment";
}
