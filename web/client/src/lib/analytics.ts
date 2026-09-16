import { apiRequest } from "./queryClient";

// Generate or get session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analyticsSessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('analyticsSessionId', sessionId);
  }
  return sessionId;
}

// Base tracking function
export const trackEvent = async (eventType: string, eventData?: any) => {
  try {
    await apiRequest("POST", "/api/analytics/track", {
      eventType,
      eventData: eventData ? JSON.stringify(eventData) : undefined,
      page: window.location.pathname,
      sessionId: getSessionId(),
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.error('Analytics tracking error:', error);
  }
};

// Page view tracking
export const trackPageView = () => {
  trackEvent('page_view');
};

// Package view tracking
export const trackPackageView = (packageId: string, packageName?: string) => {
  trackEvent('package_view', { packageId, packageName });
};

// Add to cart tracking
export const trackAddToCart = (packageId: string, packageName?: string, price?: number) => {
  trackEvent('add_to_cart', { packageId, packageName, price });
};

// Checkout start tracking
export const trackCheckoutStart = (packageId?: string, price?: number) => {
  trackEvent('checkout_start', { packageId, price });
};

// Purchase tracking
export const trackPurchase = (orderId: string, amount: number, currency?: string) => {
  trackEvent('purchase', { orderId, amount, currency });
};

// Search tracking
export const trackSearch = (query: string, resultsCount?: number) => {
  trackEvent('search', { query, resultsCount });
};

// Destination view tracking
export const trackDestinationView = (destinationId: string, destinationName?: string) => {
  trackEvent('destination_view', { destinationId, destinationName });
};

// Abandoned cart tracking
export const trackAbandonedCart = async (packageId: string, cartData: any) => {
  try {
    await apiRequest("POST", "/api/analytics/abandoned-cart", {
      packageId,
      cartData: JSON.stringify(cartData),
      sessionId: getSessionId(),
    });
  } catch (error) {
    console.error('Abandoned cart tracking error:', error);
  }
};
