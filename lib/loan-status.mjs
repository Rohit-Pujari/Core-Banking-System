// Earlier admin approvals recorded the reviewer but never set a payout account.
export function needsLoanCredit(loan) {
  return loan.status === 'Active' && loan.account_id == null &&
    loan.reviewed_by != null && loan.reviewed_at != null;
}
