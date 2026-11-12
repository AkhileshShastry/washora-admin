export const SETTLEMENT_STATUS = {
  settled: "Settled",
  unsettled: "Unsettled",
};

export function isExpenseSettled(expense) {
  return expense?.settlementStatus === SETTLEMENT_STATUS.settled || Boolean(expense?.settlementId);
}

export function getExpenseSettlementStatus(expense) {
  return isExpenseSettled(expense) ? SETTLEMENT_STATUS.settled : SETTLEMENT_STATUS.unsettled;
}
