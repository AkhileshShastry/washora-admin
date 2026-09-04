import { useCallback, useEffect, useMemo, useState } from "react";
import { createSeedData } from "../data/seedData";
import {
  deleteDocument,
  importDataToFirestore,
  seedFirestore,
  subscribeToCollection,
  updateDocument,
  upsertDocument,
} from "../services/dataService";
import { parseWashoraWorkbook } from "../services/excelImport";
import { isDemoModeEnabled, isFirebaseConfigured, requiresFirebaseSetup } from "../services/firebase";
import {
  DEMO_STORAGE_KEY,
  getDemoStorageSummary,
  readDemoStorageData,
} from "../services/localStorageMigration";
import { calculateOrderTotals } from "../utils/calculations";
import { makeCustomerId, makeId } from "../utils/helpers";

function loadLocalData() {
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!stored) {
    return createSeedData();
  }

  try {
    return {
      ...createSeedData(),
      ...JSON.parse(stored),
    };
  } catch {
    return createSeedData();
  }
}

function emptyData() {
  return {
    orders: [],
    customers: [],
    expenses: [],
    priceItems: [],
    settings: createSeedData().settings,
  };
}

function useLocalDataState() {
  const [data, setData] = useState(() => (isDemoModeEnabled ? loadLocalData() : emptyData()));

  const saveData = useCallback((updater) => {
    setData((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (isDemoModeEnabled) {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  return [data, saveData];
}

function buildOrderPayload(order) {
  const totals = calculateOrderTotals(order.items || []);

  return {
    ...order,
    ...totals,
    updatedAt: new Date().toISOString(),
  };
}

export function useWashoraData({ enabled = true } = {}) {
  const [localData, setLocalData] = useLocalDataState();
  const [remoteData, setRemoteData] = useState(emptyData);
  const [loading, setLoading] = useState(isFirebaseConfigured && enabled);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    const collections = ["orders", "customers", "expenses", "priceItems", "settings"];
    const unsubscribers = collections.map((name) =>
      subscribeToCollection(
        name,
        (items) => {
          setRemoteData((current) => ({
            ...current,
            [name]: name === "settings" ? items.find((item) => item.id === "app") || current.settings : items,
          }));
          setLoading(false);
        },
        (caught) => {
          setError(caught.message || "Unable to load Firestore data.");
          setLoading(false);
        },
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [enabled]);

  const data = isFirebaseConfigured ? remoteData : isDemoModeEnabled ? localData : emptyData();

  const upsertOrder = useCallback(
    async (order) => {
      const id = order.id || makeId("order");
      const customerId =
        order.customerId || makeCustomerId(order.customerName, order.area || order.address, order.phone);
      const payload = buildOrderPayload({
        ...order,
        id,
        customerId,
      });

      const customer = {
        id: customerId,
        name: order.customerName,
        phone: order.phone,
        address: order.address,
        area: order.area,
        notes: order.customerNotes || "",
      };

      if (isFirebaseConfigured) {
        await upsertDocument("orders", id, payload);
        if (customer.name) {
          await upsertDocument("customers", customerId, customer);
        }
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          orders: [...current.orders.filter((item) => item.id !== id), payload],
          customers: customer.name
            ? [...current.customers.filter((item) => item.id !== customerId), customer]
            : current.customers,
        }));
      }

      return payload;
    },
    [setLocalData],
  );

  const updateOrderStatus = useCallback(
    async (id, patch) => {
      if (isFirebaseConfigured) {
        await updateDocument("orders", id, patch);
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          orders: current.orders.map((order) =>
            order.id === id ? buildOrderPayload({ ...order, ...patch }) : order,
          ),
        }));
      }
    },
    [setLocalData],
  );

  const deleteOrder = useCallback(
    async (id) => {
      if (isFirebaseConfigured) {
        await deleteDocument("orders", id);
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          orders: current.orders.filter((order) => order.id !== id),
        }));
      }
    },
    [setLocalData],
  );

  const upsertCustomer = useCallback(
    async (customer) => {
      const id =
        customer.id || makeCustomerId(customer.name, customer.area || customer.address, customer.phone);
      const payload = {
        ...customer,
        id: id.toLowerCase(),
        name: customer.name?.trim() || "",
        phone: customer.phone?.trim() || "",
        address: customer.address?.trim() || "",
        area: customer.area?.trim() || "",
        notes: customer.notes?.trim() || "",
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        await upsertDocument("customers", payload.id, payload);
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          customers: [...current.customers.filter((item) => item.id !== payload.id), payload],
        }));
      }

      return payload;
    },
    [setLocalData],
  );

  const upsertExpense = useCallback(
    async (expense) => {
      const id = expense.id || makeId("expense");
      const payload = {
        ...expense,
        id,
        amount: Number(expense.amount || 0),
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        await upsertDocument("expenses", id, payload);
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          expenses: [...current.expenses.filter((item) => item.id !== id), payload],
        }));
      }

      return payload;
    },
    [setLocalData],
  );

  const deleteExpense = useCallback(
    async (id) => {
      if (isFirebaseConfigured) {
        await deleteDocument("expenses", id);
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          expenses: current.expenses.filter((expense) => expense.id !== id),
        }));
      }
    },
    [setLocalData],
  );

  const upsertPriceItem = useCallback(
    async (priceItem) => {
      const id = priceItem.id || makeId("price");
      const payload = {
        ...priceItem,
        id,
        customerPrice: Number(priceItem.customerPrice || 0),
        dhobiCost: Number(priceItem.dhobiCost || 0),
        profit: Number(priceItem.customerPrice || 0) - Number(priceItem.dhobiCost || 0),
        active: priceItem.active !== false,
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        await upsertDocument("priceItems", id, payload);
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          priceItems: [...current.priceItems.filter((item) => item.id !== id), payload],
        }));
      }

      return payload;
    },
    [setLocalData],
  );

  const updateSettings = useCallback(
    async (settings) => {
      if (isFirebaseConfigured) {
        await upsertDocument("settings", "app", settings);
      } else if (isDemoModeEnabled) {
        setLocalData((current) => ({
          ...current,
          settings,
        }));
      }
    },
    [setLocalData],
  );

  const seedRemote = useCallback(async () => {
    return seedFirestore();
  }, []);

  const importExcelFile = useCallback(async (file) => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase must be configured before importing Excel.");
    }

    const parsed = await parseWashoraWorkbook(file);
    const importSummary = await importDataToFirestore(parsed.data, {
      source: `excel:${file.name}`,
    });

    return {
      ...parsed.summary,
      ...importSummary,
      warnings: parsed.warnings,
    };
  }, []);

  const migrateDemoStorage = useCallback(async () => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase must be configured before migrating demo data.");
    }

    const demoData = readDemoStorageData();
    if (!demoData) {
      throw new Error("No browser demo data was found on this device.");
    }

    return importDataToFirestore(demoData, {
      source: "browser-local-storage",
    });
  }, []);

  const resetDemoData = useCallback(() => {
    if (!isDemoModeEnabled) {
      return;
    }

    const seed = createSeedData();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    setLocalData(seed);
  }, [setLocalData]);

  return useMemo(
    () => ({
      ...data,
      loading,
      error,
      isFirebaseConfigured,
      isDemoMode: isDemoModeEnabled,
      requiresFirebaseSetup,
      upsertOrder,
      updateOrderStatus,
      deleteOrder,
      upsertCustomer,
      upsertExpense,
      deleteExpense,
      upsertPriceItem,
      updateSettings,
      seedRemote,
      importExcelFile,
      migrateDemoStorage,
      demoStorageSummary: getDemoStorageSummary(),
      resetDemoData,
    }),
    [
      data,
      loading,
      error,
      upsertOrder,
      updateOrderStatus,
      deleteOrder,
      upsertCustomer,
      upsertExpense,
      deleteExpense,
      upsertPriceItem,
      updateSettings,
      seedRemote,
      importExcelFile,
      migrateDemoStorage,
      resetDemoData,
    ],
  );
}
