import { createSeedData } from "../data/seedData";

export const DEMO_STORAGE_KEY = "washora-admin-demo-data-v1";

function normalizeDataShape(data) {
  const seed = createSeedData();

  return {
    orders: Array.isArray(data?.orders) ? data.orders : [],
    customers: Array.isArray(data?.customers) ? data.customers : [],
    expenses: Array.isArray(data?.expenses) ? data.expenses : [],
    priceItems: Array.isArray(data?.priceItems) ? data.priceItems : [],
    settings: data?.settings || seed.settings,
  };
}

export function readDemoStorageData() {
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return normalizeDataShape(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function getDemoStorageSummary() {
  const data = readDemoStorageData();
  if (!data) {
    return {
      exists: false,
      orders: 0,
      customers: 0,
      expenses: 0,
      priceItems: 0,
    };
  }

  return {
    exists: true,
    orders: data.orders.length,
    customers: data.customers.length,
    expenses: data.expenses.length,
    priceItems: data.priceItems.length,
  };
}
