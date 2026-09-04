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
import { MetricCard } from "../components/dashboard/MetricCard";
import { StatusPill } from "../components/common/StatusPill";
import { buildDashboardMetrics, buildProfitLossSummary } from "../utils/calculations";
import { formatCurrency, formatDate, sortByDateDesc } from "../utils/helpers";

export function Dashboard({ orders, expenses, onOpenOrders }) {
  const metrics = buildDashboardMetrics({ orders, expenses });
  const profitLoss = buildProfitLossSummary({ orders, expenses });
  const isProfit = profitLoss.netProfit >= 0;
  const activeOrders = sortByDateDesc(orders).filter((order) => order.orderStatus !== "Delivered").slice(0, 5);
  const pendingPayments = sortByDateDesc(orders)
    .filter((order) => order.paymentStatus !== "Done")
    .slice(0, 5);

  return (
    <div className="page-stack">
      <section className="metric-grid">
        <MetricCard label="Orders" value={metrics.totalOrders} detail={`${metrics.activeOrders} active`} icon={ClipboardList} />
        <MetricCard label="Pickups" value={metrics.todayPickups} detail="Today" tone="green" icon={Truck} />
        <MetricCard label="Deliveries" value={metrics.todayDeliveries} detail="Today" tone="cyan" icon={PackageCheck} />
        <MetricCard
          label="Pending"
          value={formatCurrency(metrics.pendingPaymentAmount)}
          detail={`${metrics.pendingPaymentCount} payments`}
          tone="amber"
          icon={CircleAlert}
        />
        <MetricCard label="Revenue" value={formatCurrency(metrics.monthlyRevenue)} detail="This month" tone="green" icon={IndianRupee} />
        <MetricCard label="Profit" value={formatCurrency(metrics.monthlyProfit)} detail="This month" tone="coral" icon={CalendarCheck2} />
        <MetricCard
          label="P&L"
          value={formatCurrency(profitLoss.netProfit)}
          detail="So far"
          tone={isProfit ? "green" : "coral"}
          icon={isProfit ? TrendingUp : TrendingDown}
        />
      </section>

      <section className={`profit-panel ${isProfit ? "profit-panel--positive" : "profit-panel--negative"}`}>
        <div className="profit-panel__header">
          <div>
            <span className="eyebrow">P&L So Far</span>
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
      </section>

      <section className="split-grid">
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
      </section>
    </div>
  );
}
