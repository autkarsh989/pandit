import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { apiGetDailyQuotes, apiGetNotificationSettings } from '@/lib/api';

const STORE_KEY = 'daily_quote_store_v1';
const MIN_UNSENT_QUOTES = 10;
const FETCH_BATCH_SIZE = 20;
const SCHEDULE_DAYS_AHEAD = 3;

type QuoteItem = {
  id: string;
  text: string;
  sent: boolean;
  createdAt: string;
  sentAt?: string;
};

type ScheduledQuoteNotification = {
  notificationId: string;
  quoteId: string;
  slotLabel: string;
  dateKey: string;
  triggerAt: string;
};

type QuoteStore = {
  quotes: QuoteItem[];
  scheduled: ScheduledQuoteNotification[];
  sentSlots: Record<string, string[]>;
};

type SlotConfig = {
  label: string;
  hour: number;
  minute: number;
};

const DEFAULT_DAILY_SLOTS: SlotConfig[] = [
  { label: '05:00', hour: 5, minute: 0 },
  { label: '10:00', hour: 10, minute: 0 },
  { label: '17:00', hour: 17, minute: 0 },
];

const EMPTY_STORE: QuoteStore = {
  quotes: [],
  scheduled: [],
  sentSlots: {},
};

let initialized = false;
let syncInFlight: Promise<void> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function cloneStore(store: QuoteStore): QuoteStore {
  return {
    quotes: [...store.quotes],
    scheduled: [...store.scheduled],
    sentSlots: { ...store.sentSlots },
  };
}

function parseDailySlots(sendTimes: string[]): SlotConfig[] {
  const parsed: SlotConfig[] = [];

  for (const raw of sendTimes) {
    const value = (raw || '').trim();
    const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      continue;
    }

    parsed.push({
      label: value,
      hour: Number(match[1]),
      minute: Number(match[2]),
    });
  }

  const deduped = Array.from(new Map(parsed.map((slot) => [slot.label, slot])).values());
  deduped.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
  return deduped;
}

async function fetchNotificationSlots(): Promise<SlotConfig[]> {
  try {
    const response = await apiGetNotificationSettings();
    const slots = parseDailySlots(Array.isArray(response.send_times) ? response.send_times : []);
    if (slots.length > 0) {
      return slots;
    }
  } catch {
    // Fall back to local defaults if endpoint is unavailable.
  }

  return DEFAULT_DAILY_SLOTS;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function makeQuoteId(text: string, salt: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return `${hash}-${salt}`;
}

async function loadStore(): Promise<QuoteStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) {
      return cloneStore(EMPTY_STORE);
    }

    const parsed = JSON.parse(raw) as Partial<QuoteStore>;
    return {
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : [],
      sentSlots: parsed.sentSlots && typeof parsed.sentSlots === 'object' ? parsed.sentSlots : {},
    };
  } catch {
    return cloneStore(EMPTY_STORE);
  }
}

async function saveStore(store: QuoteStore): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function countUnsent(store: QuoteStore): number {
  return store.quotes.filter((quote) => !quote.sent).length;
}

function markSlotSent(store: QuoteStore, dateKey: string, slotLabel: string): void {
  const existing = store.sentSlots[dateKey] || [];
  if (!existing.includes(slotLabel)) {
    store.sentSlots[dateKey] = [...existing, slotLabel];
  }
}

function markQuoteSent(store: QuoteStore, quoteId: string, sentAtIso: string): void {
  const idx = store.quotes.findIndex((quote) => quote.id === quoteId);
  if (idx === -1) {
    return;
  }

  if (!store.quotes[idx].sent) {
    store.quotes[idx] = {
      ...store.quotes[idx],
      sent: true,
      sentAt: sentAtIso,
    };
  }
}

async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;

  if (finalStatus !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    finalStatus = asked.status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-quotes', {
      name: 'Daily Quotes',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  return true;
}

async function fetchAndAppendQuotes(store: QuoteStore, count = FETCH_BATCH_SIZE): Promise<void> {
  try {
    const response = await apiGetDailyQuotes(count);
    const incoming = Array.isArray(response.quotes) ? response.quotes : [];
    const existing = new Set(store.quotes.map((quote) => quote.text.toLowerCase().trim()));

    const createdAt = new Date().toISOString();
    let offset = 0;

    for (const text of incoming) {
      const normalized = text.toLowerCase().trim();
      if (!normalized || existing.has(normalized)) {
        continue;
      }

      const id = makeQuoteId(text, `${Date.now()}-${offset}`);
      store.quotes.push({
        id,
        text,
        sent: false,
        createdAt,
      });
      existing.add(normalized);
      offset += 1;
    }
  } catch {
    // Keep existing local quotes if network/endpoint fails.
  }
}

async function ensureUnsentMinimum(store: QuoteStore): Promise<void> {
  if (countUnsent(store) >= MIN_UNSENT_QUOTES) {
    return;
  }

  await fetchAndAppendQuotes(store, FETCH_BATCH_SIZE);
}

function pickQuote(store: QuoteStore, excludedIds: Set<string>): QuoteItem | null {
  const unsent = store.quotes.filter((quote) => !quote.sent && !excludedIds.has(quote.id));
  if (unsent.length > 0) {
    return randomItem(unsent);
  }

  const sent = store.quotes.filter((quote) => excludedIds.has(quote.id) === false);
  if (sent.length > 0) {
    return randomItem(sent);
  }

  return null;
}

function reconcilePastSchedules(store: QuoteStore, now: Date): void {
  const remaining: ScheduledQuoteNotification[] = [];

  for (const item of store.scheduled) {
    const triggerDate = new Date(item.triggerAt);
    if (triggerDate.getTime() <= now.getTime()) {
      markQuoteSent(store, item.quoteId, item.triggerAt);
      markSlotSent(store, item.dateKey, item.slotLabel);
      continue;
    }
    remaining.push(item);
  }

  store.scheduled = remaining;
}

async function sendCatchUpNotifications(store: QuoteStore, now: Date, dailySlots: SlotConfig[]): Promise<void> {
  const todayKey = toDateKey(now);
  const sentToday = new Set(store.sentSlots[todayKey] || []);

  for (const slot of dailySlots) {
    const slotTime = new Date(now);
    slotTime.setHours(slot.hour, slot.minute, 0, 0);

    if (slotTime.getTime() > now.getTime()) {
      continue;
    }

    if (sentToday.has(slot.label)) {
      continue;
    }

    const quote = pickQuote(store, new Set());
    if (!quote) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your Daily Quote',
        body: quote.text,
        sound: 'default',
      },
      trigger: null,
    });

    markQuoteSent(store, quote.id, new Date().toISOString());
    markSlotSent(store, todayKey, slot.label);
    sentToday.add(slot.label);

    if (countUnsent(store) < MIN_UNSENT_QUOTES) {
      await ensureUnsentMinimum(store);
    }
  }
}

async function clearManagedFutureSchedules(store: QuoteStore): Promise<void> {
  for (const item of store.scheduled) {
    try {
      await Notifications.cancelScheduledNotificationAsync(item.notificationId);
    } catch {
      // Ignore stale notification ids.
    }
  }

  store.scheduled = [];
}

async function scheduleUpcomingNotifications(store: QuoteStore, now: Date, dailySlots: SlotConfig[]): Promise<void> {
  const excluded = new Set<string>();

  for (let dayOffset = 0; dayOffset <= SCHEDULE_DAYS_AHEAD; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);

    const dateKey = toDateKey(day);
    const sentSlots = new Set(store.sentSlots[dateKey] || []);

    for (const slot of dailySlots) {
      if (sentSlots.has(slot.label)) {
        continue;
      }

      const triggerAt = new Date(day);
      triggerAt.setHours(slot.hour, slot.minute, 0, 0);

      if (triggerAt.getTime() <= now.getTime()) {
        continue;
      }

      if (countUnsent(store) < MIN_UNSENT_QUOTES) {
        await ensureUnsentMinimum(store);
      }

      const quote = pickQuote(store, excluded);
      if (!quote) {
        continue;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your Daily Quote',
          body: quote.text,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerAt,
          channelId: Platform.OS === 'android' ? 'daily-quotes' : undefined,
        },
      });

      store.scheduled.push({
        notificationId,
        quoteId: quote.id,
        slotLabel: slot.label,
        dateKey,
        triggerAt: triggerAt.toISOString(),
      });
      excluded.add(quote.id);
    }
  }
}

async function markDelivered(notificationId: string): Promise<void> {
  const store = await loadStore();
  const idx = store.scheduled.findIndex((item) => item.notificationId === notificationId);
  if (idx === -1) {
    return;
  }

  const item = store.scheduled[idx];
  markQuoteSent(store, item.quoteId, new Date().toISOString());
  markSlotSent(store, item.dateKey, item.slotLabel);

  store.scheduled.splice(idx, 1);
  await saveStore(store);
}

async function syncQuotesAndSchedules(): Promise<void> {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const permitted = await requestNotificationPermissions();
    if (!permitted) {
      return;
    }

    const now = new Date();
    const store = await loadStore();
    const dailySlots = await fetchNotificationSlots();

    reconcilePastSchedules(store, now);
    await ensureUnsentMinimum(store);
    await sendCatchUpNotifications(store, now, dailySlots);

    if (countUnsent(store) < MIN_UNSENT_QUOTES) {
      await ensureUnsentMinimum(store);
    }

    await clearManagedFutureSchedules(store);
    await scheduleUpcomingNotifications(store, new Date(), dailySlots);

    await saveStore(store);
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export function initializeDailyQuoteNotifications(): () => void {
  if (initialized) {
    return () => {};
  }
  initialized = true;

  if (Platform.OS !== 'web') {
    void syncQuotesAndSchedules();
  }

  const receivedSubscription = Notifications.addNotificationReceivedListener((event: Notifications.Notification) => {
    void markDelivered(event.request.identifier);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
    void markDelivered(response.notification.request.identifier);
  });

  let appState: AppStateStatus = AppState.currentState;
  const appStateSubscription = AppState.addEventListener('change', (nextState) => {
    const becameActive = appState.match(/inactive|background/) && nextState === 'active';
    appState = nextState;
    if (becameActive && Platform.OS !== 'web') {
      void syncQuotesAndSchedules();
    }
  });

  const interval = setInterval(() => {
    if (Platform.OS !== 'web') {
      void syncQuotesAndSchedules();
    }
  }, 15 * 60 * 1000);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
    appStateSubscription.remove();
    clearInterval(interval);
    initialized = false;
  };
}
