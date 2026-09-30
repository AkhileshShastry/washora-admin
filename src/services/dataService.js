import { createSeedData } from "../data/seedData";
import { getFirebaseDb } from "./firebase";

const COLLECTIONS = {
  orders: "orders",
  customers: "customers",
  expenses: "expenses",
  settlements: "settlements",
  priceItems: "priceItems",
  settings: "settings",
};

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function withTimestamps(value, serverTimestamp) {
  return stripUndefined({
    ...value,
    updatedAt: serverTimestamp(),
  });
}

async function getFirestoreApi() {
  const database = await getFirebaseDb();

  if (!database) {
    throw new Error("Firestore is not configured.");
  }

  const api = await import("firebase/firestore");
  return {
    db: database,
    ...api,
  };
}

export function subscribeToCollection(collectionName, onData, onError) {
  let disposed = false;
  let unsubscribe = () => {};

  getFirestoreApi()
    .then(({ db, collection, onSnapshot }) => {
      if (disposed) {
        return;
      }

      unsubscribe = onSnapshot(
        collection(db, COLLECTIONS[collectionName]),
        (snapshot) => {
          onData(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })),
          );
        },
        onError,
      );
    })
    .catch(onError);

  return () => {
    disposed = true;
    unsubscribe();
  };
}

export async function upsertDocument(collectionName, id, data) {
  const { db, doc, serverTimestamp, setDoc } = await getFirestoreApi();
  const ref = doc(db, COLLECTIONS[collectionName], id);
  await setDoc(ref, withTimestamps({ ...data, id }, serverTimestamp), { merge: true });
  return id;
}

export async function updateDocument(collectionName, id, patch) {
  const { db, doc, serverTimestamp, updateDoc } = await getFirestoreApi();
  await updateDoc(doc(db, COLLECTIONS[collectionName], id), withTimestamps(patch, serverTimestamp));
}

export async function deleteDocument(collectionName, id) {
  const { db, deleteDoc, doc } = await getFirestoreApi();
  await deleteDoc(doc(db, COLLECTIONS[collectionName], id));
}

export async function createExpenseSettlement(settlement, expenseIds) {
  const uniqueExpenseIds = [...new Set(expenseIds)].filter(Boolean);

  if (!uniqueExpenseIds.length) {
    throw new Error("Select at least one expense to settle.");
  }

  if (uniqueExpenseIds.length > 450) {
    throw new Error("A settlement can include up to 450 expenses.");
  }

  const { db, doc, runTransaction, serverTimestamp } = await getFirestoreApi();

  return runTransaction(db, async (transaction) => {
    const expenseRefs = uniqueExpenseIds.map((id) => doc(db, COLLECTIONS.expenses, id));
    const snapshots = await Promise.all(expenseRefs.map((ref) => transaction.get(ref)));
    const expenses = snapshots.map((snapshot) => {
      if (!snapshot.exists()) {
        throw new Error("One of the selected expenses no longer exists.");
      }

      return { id: snapshot.id, ...snapshot.data() };
    });

    if (expenses.some((expense) => expense.settlementStatus === "Settled" || expense.settlementId)) {
      throw new Error("One of the selected expenses has already been settled.");
    }

    const paidTo = expenses[0]?.paidBy;
    if (!paidTo || expenses.some((expense) => expense.paidBy !== paidTo)) {
      throw new Error("A settlement can contain expenses paid by one founder only.");
    }

    const amount = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const storedSettlement = stripUndefined({
      ...settlement,
      expenseIds: uniqueExpenseIds,
      expenseCount: uniqueExpenseIds.length,
      paidTo,
      amount,
    });
    const settlementRef = doc(db, COLLECTIONS.settlements, settlement.id);

    transaction.set(
      settlementRef,
      withTimestamps({ ...storedSettlement, id: settlement.id }, serverTimestamp),
      { merge: true },
    );

    expenseRefs.forEach((ref) => {
      transaction.update(
        ref,
        withTimestamps(
          {
            settlementStatus: "Settled",
            settlementId: settlement.id,
            settledAt: settlement.settlementDate,
            settlementMode: settlement.paymentMode,
          },
          serverTimestamp,
        ),
      );
    });

    return storedSettlement;
  });
}

export async function importDataToFirestore(data, { source = "import" } = {}) {
  const { db, doc, serverTimestamp, writeBatch } = await getFirestoreApi();
  const writes = [];

  const addWrite = (collectionName, id, payload) => {
    if (!id || !payload) {
      return;
    }

    writes.push({
      ref: doc(db, COLLECTIONS[collectionName], id),
      payload: withTimestamps(
        {
          ...payload,
          id,
          importSource: source,
          importedAt: serverTimestamp(),
        },
        serverTimestamp,
      ),
    });
  };

  (data.orders || []).forEach((order) => addWrite("orders", order.id, order));
  (data.customers || []).forEach((customer) => addWrite("customers", customer.id, customer));
  (data.expenses || []).forEach((expense) => addWrite("expenses", expense.id, expense));
  (data.settlements || []).forEach((settlement) =>
    addWrite("settlements", settlement.id, settlement),
  );
  (data.priceItems || []).forEach((price) => addWrite("priceItems", price.id, price));

  if (data.settings) {
    addWrite("settings", "app", data.settings);
  }

  for (let index = 0; index < writes.length; index += 450) {
    const batch = writeBatch(db);
    writes.slice(index, index + 450).forEach((write) => {
      batch.set(write.ref, write.payload, { merge: true });
    });
    await batch.commit();
  }

  return {
    orders: data.orders?.length || 0,
    customers: data.customers?.length || 0,
    expenses: data.expenses?.length || 0,
    settlements: data.settlements?.length || 0,
    priceItems: data.priceItems?.length || 0,
    settings: data.settings ? 1 : 0,
    totalWrites: writes.length,
  };
}

export async function seedFirestore() {
  const seed = createSeedData();
  return importDataToFirestore(seed, { source: "seed" });
}
