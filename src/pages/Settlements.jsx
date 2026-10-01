import {
  CalendarDays,
  CircleCheckBig,
  Clock3,
  History as HistoryIcon,
  Save,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { formatCurrency, formatDate, sortByDateDesc, sum, toInputDate } from "../utils/helpers";
import { isExpenseSettled } from "../utils/settlements";
import { PAYMENT_MODES, STAFF_MEMBERS } from "../utils/statuses";

const UNASSIGNED_FOUNDER = "Unassigned";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function founderForExpense(expense) {
  return expense.paidBy || UNASSIGNED_FOUNDER;
}

function SettlementModal({ open, expenses, cutoffDate, onClose, onSave }) {
  const [draft, setDraft] = useState({
    settlementDate: today(),
    paymentMode: PAYMENT_MODES[0],
    reference: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const paidTo = expenses[0]?.paidBy || "Founder";
  const total = sum(expenses, (expense) => expense.amount);

  useEffect(() => {
    if (open) {
      setDraft({
        settlementDate: today(),
        paymentMode: PAYMENT_MODES[0],
        reference: "",
        note: "",
      });
      setError("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await onSave({ ...draft, cutoffDate });
      onClose();
    } catch (caught) {
      setError(caught.message || "Unable to complete the settlement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal-panel modal-panel--narrow" aria-modal="true" role="dialog">
        <div className="modal-panel__header">
          <div>
            <span className="eyebrow">Founder reimbursement</span>
            <h2>Pay {paidTo}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <div className="settlement-modal-summary">
          <div>
            <span>Selected expenses</span>
            <strong>{expenses.length}</strong>
          </div>
          <div>
            <span>Settlement amount</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Settlement date</span>
            <input
              type="date"
              max={today()}
              value={draft.settlementDate}
              onChange={(event) => updateField("settlementDate", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Payment mode</span>
            <select
              value={draft.paymentMode}
              onChange={(event) => updateField("paymentMode", event.target.value)}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="form-grid__wide">
            <span>Payment reference</span>
            <input
              value={draft.reference}
              onChange={(event) => updateField("reference", event.target.value)}
              placeholder="Transaction ID or receipt number"
            />
          </label>

          <label className="form-grid__wide">
            <span>Note</span>
            <textarea
              value={draft.note}
              onChange={(event) => updateField("note", event.target.value)}
              placeholder="Optional settlement note"
            />
          </label>

          {error ? <div className="form-error form-grid__wide">{error}</div> : null}

          <div className="modal-panel__footer form-grid__wide">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving || !expenses.length}>
              <Save size={18} />
              {saving ? "Settling" : "Confirm settlement"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function Settlements({ expenses, settlements, onCreateSettlement }) {
  const [activeView, setActiveView] = useState("Pending");
  const [cutoffDate, setCutoffDate] = useState(today);
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const pendingExpenses = useMemo(
    () =>
      sortByDateDesc(
        expenses.filter((expense) => {
          const expenseDate = toInputDate(expense.date);
          return !isExpenseSettled(expense) && (!expenseDate || expenseDate <= cutoffDate);
        }),
        "date",
      ),
    [cutoffDate, expenses],
  );

  const groupedExpenses = useMemo(() => {
    const groups = new Map();

    pendingExpenses.forEach((expense) => {
      const founder = founderForExpense(expense);
      groups.set(founder, [...(groups.get(founder) || []), expense]);
    });

    const founderOrder = [...STAFF_MEMBERS, ...groups.keys()];
    return [...new Set(founderOrder)]
      .filter((founder) => groups.has(founder))
      .map((founder) => ({ founder, expenses: groups.get(founder) }));
  }, [pendingExpenses]);

  const selectedExpenses = useMemo(
    () => pendingExpenses.filter((expense) => selectedIds.includes(expense.id)),
    [pendingExpenses, selectedIds],
  );
  const selectedFounder = selectedExpenses[0]?.paidBy || "";
  const selectedTotal = sum(selectedExpenses, (expense) => expense.amount);
  const pendingTotal = sum(pendingExpenses, (expense) => expense.amount);
  const settlementHistory = useMemo(
    () => sortByDateDesc(settlements || [], "settlementDate"),
    [settlements],
  );

  useEffect(() => {
    const availableIds = new Set(pendingExpenses.map((expense) => expense.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => availableIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [pendingExpenses]);

  const changeCutoffDate = (value) => {
    setCutoffDate(value);
    setSelectedIds([]);
  };

  const toggleExpense = (expense, checked) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, expense.id])] : current.filter((id) => id !== expense.id),
    );
  };

  const toggleGroup = (groupExpenses, checked) => {
    const groupIds = groupExpenses.map((expense) => expense.id);
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, ...groupIds])]
        : current.filter((id) => !groupIds.includes(id)),
    );
  };

  const saveSettlement = async (details) => {
    await onCreateSettlement({
      ...details,
      expenseIds: selectedExpenses.map((expense) => expense.id),
    });
    setSelectedIds([]);
    setActiveView("History");
  };

  return (
    <div className="page-stack">
      <section className="expense-summary settlement-total">
        <WalletCards size={24} />
        <div>
          <span>Unsettled through {formatDate(cutoffDate)}</span>
          <strong>{formatCurrency(pendingTotal)}</strong>
        </div>
        <small>{pendingExpenses.length} expenses</small>
      </section>

      <section className="settlement-balances" aria-label="Founder balances">
        {groupedExpenses.map(({ founder, expenses: founderExpenses }) => (
          <article className="settlement-balance" key={founder}>
            <span>{founder}</span>
            <strong>{formatCurrency(sum(founderExpenses, (expense) => expense.amount))}</strong>
            <small>{founderExpenses.length} pending</small>
          </article>
        ))}
      </section>

      <div className="settlement-tabs" role="tablist" aria-label="Settlement views">
        <button
          className={activeView === "Pending" ? "settlement-tabs__active" : ""}
          type="button"
          role="tab"
          aria-selected={activeView === "Pending"}
          onClick={() => setActiveView("Pending")}
        >
          <Clock3 size={17} />
          Pending
        </button>
        <button
          className={activeView === "History" ? "settlement-tabs__active" : ""}
          type="button"
          role="tab"
          aria-selected={activeView === "History"}
          onClick={() => setActiveView("History")}
        >
          <HistoryIcon size={17} />
          History
        </button>
      </div>

      {activeView === "Pending" ? (
        <>
          <section className="settlement-filter">
            <label>
              <span>Expenses till</span>
              <div className="settlement-date-field">
                <CalendarDays size={18} />
                <input
                  type="date"
                  max={today()}
                  value={cutoffDate}
                  onChange={(event) => changeCutoffDate(event.target.value)}
                />
              </div>
            </label>
          </section>

          <section className="settlement-groups">
            {groupedExpenses.length ? (
              groupedExpenses.map(({ founder, expenses: founderExpenses }) => {
                const isUnassigned = founder === UNASSIGNED_FOUNDER;
                const allSelected = founderExpenses.every((expense) => selectedIds.includes(expense.id));
                const blockedByOtherFounder = Boolean(selectedFounder && selectedFounder !== founder);

                return (
                  <article className="settlement-group" key={founder}>
                    <header className="settlement-group__header">
                      <div>
                        <strong>{founder}</strong>
                        <span>{formatCurrency(sum(founderExpenses, (expense) => expense.amount))}</span>
                      </div>
                      {isUnassigned ? (
                        <span className="settlement-chip settlement-chip--unsettled">
                          <span aria-hidden="true" />
                          Paid by missing
                        </span>
                      ) : (
                        <label className="settlement-select-all">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            disabled={blockedByOtherFounder}
                            onChange={(event) => toggleGroup(founderExpenses, event.target.checked)}
                          />
                          <span>Select all</span>
                        </label>
                      )}
                    </header>

                    <div className="settlement-expense-list">
                      {founderExpenses.map((expense) => (
                        <label className="settlement-expense-row" key={expense.id}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(expense.id)}
                            disabled={isUnassigned || blockedByOtherFounder}
                            onChange={(event) => toggleExpense(expense, event.target.checked)}
                            aria-label={`Select ${expense.description || expense.expenseType}`}
                          />
                          <div>
                            <strong>{expense.description || expense.expenseType}</strong>
                            <span>
                              {formatDate(expense.date)} - {expense.expenseType}
                            </span>
                          </div>
                          <strong>{formatCurrency(expense.amount)}</strong>
                        </label>
                      ))}
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState title="Everything is settled" detail="No unsettled expenses exist through this date." />
            )}
          </section>

          {selectedExpenses.length ? (
            <section className="settlement-selection-bar">
              <div>
                <span>
                  {selectedExpenses.length} selected for {selectedFounder}
                </span>
                <strong>{formatCurrency(selectedTotal)}</strong>
              </div>
              <button className="primary-button" type="button" onClick={() => setModalOpen(true)}>
                <CircleCheckBig size={18} />
                Settle selected
              </button>
            </section>
          ) : null}
        </>
      ) : (
        <section className="data-list">
          {settlementHistory.length ? (
            settlementHistory.map((settlement) => (
              <article className="settlement-history-row" key={settlement.id}>
                <span className="settlement-history-row__icon">
                  <CircleCheckBig size={19} />
                </span>
                <div>
                  <strong>Paid to {settlement.paidTo}</strong>
                  <span>
                    {formatDate(settlement.settlementDate)} - {settlement.paymentMode} -{" "}
                    {settlement.expenseCount || settlement.expenseIds?.length || 0} expenses
                  </span>
                  {settlement.reference ? <small>Reference: {settlement.reference}</small> : null}
                </div>
                <strong>{formatCurrency(settlement.amount)}</strong>
              </article>
            ))
          ) : (
            <EmptyState title="No settlements yet" detail="Completed founder reimbursements will appear here." />
          )}
        </section>
      )}

      <SettlementModal
        open={modalOpen}
        expenses={selectedExpenses}
        cutoffDate={cutoffDate}
        onClose={() => setModalOpen(false)}
        onSave={saveSettlement}
      />
    </div>
  );
}
