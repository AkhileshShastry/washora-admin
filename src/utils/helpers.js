export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = toDate(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toInputDate(value) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function isSameDay(left, right) {
  const a = toDate(left);
  const b = toDate(right);
  if (!a || !b) {
    return false;
  }

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(left, right) {
  const a = toDate(left);
  const b = toDate(right);
  if (!a || !b) {
    return false;
  }

  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function makeId(prefix) {
  if (crypto?.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now().toString(36)}`;
}

export function makeReceiptId(orders) {
  const highest = orders.reduce((max, order) => {
    const match = String(order.receiptId || "").match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `ws-${String(highest + 1).padStart(3, "0")}`;
}

export function makeCustomerId(name, area, phone) {
  const clean = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 4);
  const phoneTail = String(phone || "").replace(/\D/g, "").slice(-4) || Date.now().toString().slice(-4);

  return `${clean(name) || "cust"}-${clean(area) || "area"}-${phoneTail}`;
}

export function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

export function sortByDateDesc(items, field = "orderDate") {
  return [...items].sort((a, b) => {
    const left = toDate(a[field])?.getTime() || 0;
    const right = toDate(b[field])?.getTime() || 0;
    return right - left;
  });
}

export function sum(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}
