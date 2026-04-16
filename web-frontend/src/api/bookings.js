import { API_BASE_URL } from './config.js';
import { apiPost, getAuthHeaders } from './client.js';

let razorpayScriptPromise = null;

export async function createBooking(payload) {
  return apiPost('/user/bookings', payload, true);
}

export function buildCheckoutUrl(baseUrl, returnUrl) {
  const url = new URL(baseUrl);
  if (returnUrl) {
    url.searchParams.set('return_url', returnUrl);
  }
  return url.toString();
}

function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

async function verifyPayment(bookingId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/user/bookings/${bookingId}/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : getAuthHeaders()),
    },
    body: JSON.stringify({
      booking_id: bookingId,
      razorpay_order_id: payload.razorpay_order_id,
      razorpay_payment_id: payload.razorpay_payment_id,
      razorpay_signature: payload.razorpay_signature,
    }),
  });

  if (!response.ok) {
    let message = 'Payment verification failed';
    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

export async function startRazorpayCheckout({
  bookingId,
  payment,
  token,
  returnUrl,
  name = 'Pandit Booking',
  description = 'Booking payment',
  prefillName,
}) {
  if (!payment?.checkout_url || !payment?.order_id) {
    return { opened: false, verified: false };
  }

  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    window.location.assign(buildCheckoutUrl(payment.checkout_url, returnUrl));
    return { opened: false, verified: false, fallback: true };
  }

  return new Promise((resolve, reject) => {
    const options = {
      key: payment.key_id,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      name,
      description,
      order_id: payment.order_id,
      prefill: {
        name: prefillName || '',
      },
      theme: {
        color: '#c75f23',
      },
      handler: async (response) => {
        try {
          const verifyResult = await verifyPayment(
            bookingId,
            response,
            token || localStorage.getItem('token')
          );
          resolve({ opened: true, verified: true, verifyResult });
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => resolve({ opened: true, verified: false, dismissed: true }),
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  });
}