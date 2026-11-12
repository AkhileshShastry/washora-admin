import { isSameDay, sum, toDate } from "./helpers";

export const WASHORA_START_YEAR = 2026;
export const WASHORA_START_MONTH = 5;

function filterByPeriod(items, field, period) {
  return items.filter((item) => {
    const date = toDate(item[field]);
    if (!date) {
      return false;
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const isBeforeWashora =
      year < WASHORA_START_YEAR ||
      (year === WASHORA_START_YEAR && month < WASHORA_START_MONTH);

    if (isBeforeWashora) {
      return false;
    }

    if (!period || period.mode === "all") {
      return true;
    }

    if (year !== period.year) {
      return false;
    }

    return period.mode === "year" || month === period.month;
  });
}

export function calculateOrderTotals(items, deliveryCharge = 0) {
  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const customerPrice = Number(item.customerPrice || 0);
    const dhobiCost = Number(item.dhobiCost || 0);
    const lineTotal = quantity * customerPrice;
    const lineDhobiCost = quantity * dhobiCost;

    return {
      ...item,
      quantity,
      customerPrice,
      dhobiCost,
      lineTotal,
      lineDhobiCost,
      lineProfit: lineTotal - lineDhobiCost,
    };
  });

  return {
    items: normalizedItems,
    clothesCount: sum(normalizedItems, (item) => item.quantity),
    deliveryCharge: Number(deliveryCharge || 0),
    totalAmount: sum(normalizedItems, (item) => item.lineTotal) + Number(deliveryCharge || 0),
    dhobiCost: sum(normalizedItems, (item) => item.lineDhobiCost),
    grossProfit: sum(normalizedItems, (item) => item.lineProfit) + Number(deliveryCharge || 0),
  };
}

export function buildDashboardMetrics({ orders, expenses, period, today = new Date() }) {
  const periodOrders = filterByPeriod(orders, "orderDate", period);
  const periodExpenses = filterByPeriod(expenses, "date", period);
  const periodPaidOrders = periodOrders.filter(isPaidOrder);
  const deliveredOrders = orders.filter((order) => order.orderStatus === "Delivered");
  const activeOrders = orders.filter((order) => order.orderStatus !== "Delivered");
  const pendingPayments = orders.filter((order) => order.paymentStatus !== "Done");
  const periodRevenue = sum(periodPaidOrders, (order) => order.totalAmount);
  const periodExpenseAmount = sum(periodExpenses, (expense) => expense.amount);

  return {
    totalOrders: periodOrders.length,
    activeOrders: activeOrders.length,
    deliveredOrders: deliveredOrders.length,
    todayPickups: orders.filter((order) => isSameDay(order.pickupDate, today)).length,
    todayDeliveries: orders.filter((order) => isSameDay(order.deliveryDate, today)).length,
    pendingPaymentCount: pendingPayments.length,
    pendingPaymentAmount: sum(pendingPayments, (order) => order.totalAmount),
    periodRevenue,
    periodExpenses: periodExpenseAmount,
    periodProfit: periodRevenue - periodExpenseAmount,
  };
}

function isPaidOrder(order) {
  return String(order.paymentStatus || "").toLowerCase() === "done";
}

function monthKey(value) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
}

export function buildProfitLossSummary({ orders, expenses, period }) {
  const periodOrders = filterByPeriod(orders, "orderDate", period);
  const periodExpenses = filterByPeriod(expenses, "date", period);
  const paidOrders = periodOrders.filter(isPaidOrder);
  const totalRevenue = sum(paidOrders, (order) => order.totalAmount);
  const totalExpenses = sum(periodExpenses, (expense) => expense.amount);
  const netProfit = totalRevenue - totalExpenses;
  const comparisonMax = Math.max(totalRevenue, totalExpenses, 1);
  const monthlyMap = new Map();

  paidOrders.forEach((order) => {
    const key = monthKey(order.orderDate);
    if (!key) {
      return;
    }

    const current = monthlyMap.get(key) || { key, revenue: 0, expenses: 0 };
    current.revenue += Number(order.totalAmount || 0);
    monthlyMap.set(key, current);
  });

  periodExpenses.forEach((expense) => {
    const key = monthKey(expense.date);
    if (!key) {
      return;
    }

    const current = monthlyMap.get(key) || { key, revenue: 0, expenses: 0 };
    current.expenses += Number(expense.amount || 0);
    monthlyMap.set(key, current);
  });

  const sortedMonthlyRows = [...monthlyMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  const monthlyRows = period?.mode === "all" ? sortedMonthlyRows.slice(-6) : sortedMonthlyRows;
  const monthlyMax = Math.max(
    ...monthlyRows.flatMap((row) => [row.revenue, row.expenses]),
    1,
  );

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    paidOrderCount: paidOrders.length,
    expenseCount: periodExpenses.length,
    marginPercent: totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0,
    revenuePercent: Math.round((totalRevenue / comparisonMax) * 100),
    expensePercent: Math.round((totalExpenses / comparisonMax) * 100),
    monthlyRows: monthlyRows.map((row) => ({
      ...row,
      label: monthLabel(row.key),
      netProfit: row.revenue - row.expenses,
      revenuePercent: Math.round((row.revenue / monthlyMax) * 100),
      expensePercent: Math.round((row.expenses / monthlyMax) * 100),
    })),
  };
}

export function buildCustomerStats(customer, orders) {
  const customerOrders = orders.filter((order) => order.customerId === customer.id);
  const firstOrder = customerOrders
    .map((order) => toDate(order.orderDate))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return {
    totalOrders: customerOrders.length,
    totalRevenue: sum(customerOrders, (order) => order.totalAmount),
    firstOrderDate: firstOrder ? firstOrder.toISOString().slice(0, 10) : customer.firstOrderDate,
  };
}
