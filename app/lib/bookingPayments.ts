import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { apiPost } from '@/lib/api';

type PaymentInfo = {
  provider: 'razorpay';
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  checkout_url: string;
};

type BookingCreateResponse = {
  msg: string;
  booking_id: string;
  payment_required?: boolean;
  payment?: PaymentInfo | null;
};

export type BookingPayload = {
  pandit_id: string;
  service_id: string;
  booking_date: string;
  service_address: string;
};

export function buildCheckoutUrl(baseUrl: string, returnUrl?: string) {
  const url = new URL(baseUrl);
  if (returnUrl) {
    url.searchParams.set('return_url', returnUrl);
  }
  return url.toString();
}

export async function openBookingCheckout(
  checkoutUrl: string,
  returnUrl: string = Linking.createURL('/(tabs)/bookings')
) {
  const url = buildCheckoutUrl(checkoutUrl, returnUrl);

  if (Platform.OS === 'web') {
    await WebBrowser.openBrowserAsync(url);
    return;
  }

  await WebBrowser.openAuthSessionAsync(url, returnUrl);
}

export async function createBookingWithPayment(
  payload: BookingPayload,
  token: string | null,
  returnUrl: string = Linking.createURL('/(tabs)/bookings')
) {
  const response = await apiPost<BookingCreateResponse>('/user/bookings', payload, token);

  if (response.payment_required && response.payment?.checkout_url) {
    const checkoutUrl = buildCheckoutUrl(response.payment.checkout_url, returnUrl);
    if (Platform.OS === 'web') {
      await WebBrowser.openBrowserAsync(checkoutUrl);
    } else {
      await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
    }
  }

  return response;
}