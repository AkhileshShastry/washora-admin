import {
  CalendarCheck2,
  CircleAlert,
  ClipboardList,
  IndianRupee,
  PackageCheck,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MetricCard } from "../components/dashboard/MetricCard";
import { StatusPill } from "../components/common/StatusPill";
import {
  buildDashboardMetrics,
  buildProfitLossSummary,
  WASHORA_START_MONTH,
  WASHORA_START_YEAR,
} from "../utils/calculations";
import { formatCurrency, formatDate, sortByDateDesc } from "../utils/helpers";

const PERIOD_MODES = [
  { value: "all", label: "All time" },
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
];

const monthFormatter = new Intl.DateTimeFormat("en-IN", { month: "long" });

export function Dashboard({ orders, expenses, onOpenOrders }) {
  const today = new Date();
  const currentYear = Math.max(today.getFullYear(), WASHORA_START_YEAR);
  const initialMonth =
    currentYear === WASHORA_START_YEAR
      ? Math.max(today.getMonth(), WASHORA_START_MONTH)
      : today.getMonth();
  const [periodMode, setPeriodMode] = useState("month");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const years = useMemo(
    () =>
      Array.from(
        { length: currentYear - WASHORA_START_YEAR + 1 },
        (_, index) => WASHORA_START_YEAR + index,
      ).reverse(),
    [currentYear],
  );
  const months = useMemo(() => {
    const firstMonth = selectedYear === WASHORA_START_YEAR ? WASHORA_START_MONTH : 0;
    return Array.from({ length: 12 - firstMonth }, (_, index) => firstMonth + index);
  }, [selectedYear]);
  const period = useMemo(
    () => ({ mode: periodMode, year: selectedYear, month: selectedMonth }),
    [periodMode, selectedMonth, selectedYear],
  );
  const periodLabel =
    periodMode === "all"
      ? "All time"
      : periodMode === "year"
        ? String(selectedYear)
        : `${monthFormatter.format(new Date(selectedYear, selectedMonth, 1))} ${selectedYear}`;

  const metrics = buildDashboardMetrics({ orders, expenses, period, today });
  const profitLoss = buildProfitLossSummary({ orders, expenses, period });
  const isProfit = profitLoss.netProfit >= 0;
  const activeOrders = sortByDateDesc(orders).filter((order) => order.orderStatus !== "Delivered").slice(0, 5);
  const pendingPayments = sortByDateDesc(orders)
    .filter((order) => order.paymentStatus !== "Done")
    .slice(0, 5);

  const changeYear = (event) => {
    const year = Number(event.target.value);
    setSelectedYear(year);

    if (year === WASHORA_START_YEAR && selectedMonth < WASHORA_START_MONTH) {
      setSelectedMonth(WASHORA_START_MONTH);
    }
  };

  return (
    <div className="page-stack">
      <section className="dashboard-section" aria-labelledby="performance-heading">
        <div className="dashboard-section__header">
          <div>
            <span className="eyebrow">Business overview</span>
            <h2 id="performance-heading">Performance</h2>
          </div>

          <div className="period-filter">
            <div className="segmented-control" aria-label="Performance period">
              {PERIOD_MODES.map((mode) => (
                <button
                  className={periodMode === mode.value ? "segmented-control__active" : ""}
                  type="button"
                  key={mode.value}
                  aria-pressed={periodMode === mode.value}
                  onClick={() => setPeriodMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {periodMode !== "all" ? (
              <label className="period-select">
                <span>Year</span>
                <select value={selectedYear} onChange={changeYear}>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {periodMode === "month" ? (
              <label className="period-select period-select--month">
                <span>Month</span>
                <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {monthFormatter.format(new Date(selectedYear, month, 1))}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>

        <div className="metric-grid metric-grid--dashboard">
          <MetricCard label="Orders" value={metrics.totalOrders} detail={periodLabel} icon={ClipboardList} />
          <MetricCard
            label="Paid Revenue"
            value={formatCurrency(metrics.periodRevenue)}
            detail={periodLabel}
            tone="green"
            icon={IndianRupee}
          />
          <MetricCard
            label="Expenses"
            value={formatCurrency(metrics.periodExpenses)}
            detail={periodLabel}
            tone="amber"
            icon={TrendingDown}
          />
          <MetricCard
            label="Net Profit"
            value={formatCurrency(metrics.periodProfit)}
            detail={periodLabel}
            tone={isProfit ? "green" : "coral"}
            icon={isProfit ? TrendingUp : TrendingDown}
          />
        </div>

        <div className={`profit-panel ${isProfit ? "profit-panel--positive" : "profit-panel--negative"}`}>
          <div className="profit-panel__header">
            <div>
              <span className="eyebrow">P&amp;L / {periodLabel}</span>
              <h2>{formatCurrency(profitLoss.netProfit)}</h2>
            </div>
            <span className={`status-pill ${isProfit ? "status-pill--green" : "status-pill--amber"}`}>
              {isProfit ? "Profit" : "Loss"}
            </span>
          </div>

          <div className="profit-panel__body">
            <div className="profit-bars">
              <div className="profit-bar-row">
                <div>
                  <span>Paid Revenue</span>
                  <strong>{formatCurrency(profitLoss.totalRevenue)}</strong>
                </div>
                <div className="profit-track" aria-hidden="true">
                  <span
                    className="profit-track__fill profit-track__fill--revenue"
                    style={{ width: `${profitLoss.revenuePercent}%` }}
                  />
                </div>
              </div>

              <div className="profit-bar-row">
                <div>
                  <span>Total Expenses</span>
                  <strong>{formatCurrency(profitLoss.totalExpenses)}</strong>
                </div>
                <div className="profit-track" aria-hidden="true">
                  <span
                    className="profit-track__fill profit-track__fill--expense"
                    style={{ width: `${profitLoss.expensePercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="profit-facts">
              <div>
                <span>Paid orders</span>
                <strong>{profitLoss.paidOrderCount}</strong>
              </div>
              <div>
                <span>Expense entries</span>
                <strong>{profitLoss.expenseCount}</strong>
              </div>
              <div>
                <span>Margin</span>
                <strong>{profitLoss.marginPercent}%</strong>
              </div>
            </div>
          </div>

          {profitLoss.monthlyRows.length ? (
            <div className="profit-months">
              {profitLoss.monthlyRows.map((row) => (
                <div className="profit-month-row" key={row.key}>
                  <span>{row.label}</span>
                  <div className="month-bars" aria-hidden="true">
                    <i
                      className="month-bars__bar month-bars__bar--revenue"
                      style={{ width: `${row.revenuePercent}%` }}
                    />
                    <i
                      className="month-bars__bar month-bars__bar--expense"
                      style={{ width: `${row.expensePercent}%` }}
                    />
                  </div>
                  <strong className={row.netProfit >= 0 ? "money-positive" : "money-negative"}>
                    {formatCurrency(row.netProfit)}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="dashboard-section dashboard-section--operations" aria-labelledby="operations-heading">
        <div className="dashboard-section__header">
          <div>
            <span className="eyebrow">Current workload</span>
            <h2 id="operations-heading">Live Operations</h2>
          </div>
          <span className="status-pill status-pill--green">Live</span>
        </div>

        <div className="metric-grid metric-grid--dashboard">
          <MetricCard label="Pickups" value={metrics.todayPickups} detail="Today" tone="green" icon={Truck} />
          <MetricCard
            label="Deliveries"
            value={metrics.todayDeliveries}
            detail="Today"
            tone="cyan"
            icon={PackageCheck}
          />
          <MetricCard
            label="Active Orders"
            value={metrics.activeOrders}
            detail="Open now"
            icon={CalendarCheck2}
          />
          <MetricCard
            label="Outstanding"
            value={formatCurrency(metrics.pendingPaymentAmount)}
            detail={`${metrics.pendingPaymentCount} payments`}
            tone="amber"
            icon={CircleAlert}
          />
        </div>

        <div className="split-grid">
          <div className="panel">
            <div className="panel__header">
              <h2>Active Orders</h2>
              <button className="link-button" type="button" onClick={onOpenOrders}>
                View
              </button>
            </div>
            <div className="compact-list">
              {activeOrders.length ? (
                activeOrders.map((order) => (
                  <div className="compact-row" key={order.id}>
                    <div>
                      <strong>{order.customerName}</strong>
                      <span>
                        {order.receiptId} - {formatDate(order.orderDate)}
                      </span>
                    </div>
                    <StatusPill value={order.orderStatus} />
                  </div>
                ))
              ) : (
                <div className="soft-note">No active orders</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__header">
              <h2>Collections</h2>
              <span>{formatCurrency(metrics.pendingPaymentAmount)}</span>
            </div>
            <div className="compact-list">
              {pendingPayments.length ? (
                pendingPayments.map((order) => (
                  <div className="compact-row" key={order.id}>
                    <div>
                      <strong>{order.customerName}</strong>
                      <span>
                        {order.receiptId} - {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <StatusPill value={order.paymentStatus} />
                  </div>
                ))
              ) : (
                <div className="soft-note">All visible orders are collected</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
