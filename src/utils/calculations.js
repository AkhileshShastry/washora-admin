import { isSameDay, isSameMonth, sum, toDate } from "./helpers";

export function calculateOrderTotals(items) {
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
    totalAmount: sum(normalizedItems, (item) => item.lineTotal),
    dhobiCost: sum(normalizedItems, (item) => item.lineDhobiCost),
    grossProfit: sum(normalizedItems, (item) => item.lineProfit),
  };
}

export function buildDashboardMetrics({ orders, expenses, today = new Date() }) {
  const deliveredOrders = orders.filter((order) => order.orderStatus === "Delivered");
  const paidOrders = orders.filter((order) => order.paymentStatus === "Done");
  const activeOrders = orders.filter((order) => order.orderStatus !== "Delivered");
  const pendingPayments = orders.filter((order) => order.paymentStatus !== "Done");
  const monthlyPaidOrders = paidOrders.filter((order) => isSameMonth(order.orderDate, today));
  const monthlyExpenses = expenses.filter((expense) => isSameMonth(expense.date, today));

  return {
    totalOrders: orders.length,
    activeOrders: activeOrders.length,
    deliveredOrders: deliveredOrders.length,
    todayPickups: orders.filter((order) => isSameDay(order.pickupDate, today)).length,
    todayDeliveries: orders.filter((order) => isSameDay(order.deliveryDate, today)).length,
    pendingPaymentCount: pendingPayments.length,
    pendingPaymentAmount: sum(pendingPayments, (order) => order.totalAmount),
    monthlyRevenue: sum(monthlyPaidOrders, (order) => order.totalAmount),
    monthlyExpenses: sum(monthlyExpenses, (expense) => expense.amount),
    monthlyProfit:
      sum(monthlyPaidOrders, (order) => order.totalAmount) -
      sum(monthlyExpenses, (expense) => expense.amount),
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

export function buildProfitLossSummary({ orders, expenses }) {
  const paidOrders = orders.filter(isPaidOrder);
  const totalRevenue = sum(paidOrders, (order) => order.totalAmount);
  const totalExpenses = sum(expenses, (expense) => expense.amount);
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

  expenses.forEach((expense) => {
    const key = monthKey(expense.date);
    if (!key) {
      return;
    }

    const current = monthlyMap.get(key) || { key, revenue: 0, expenses: 0 };
    current.expenses += Number(expense.amount || 0);
    monthlyMap.set(key, current);
  });

  const monthlyRows = [...monthlyMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6);
  const monthlyMax = Math.max(
    ...monthlyRows.flatMap((row) => [row.revenue, row.expenses]),
    1,
  );

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    paidOrderCount: paidOrders.length,
    expenseCount: expenses.length,
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
