/**
 * Bennington Public Schools debt clock — figures from public district sources.
 *
 * PRIMARY CLOCK (current outstanding):
 *   $198,575,000 principal (September 2026 Budget Hearing Presentation)
 *   + estimated interest since as-of date
 *
 * HS#2 AUTHORIZATION (context only — not added on top):
 *   $112,000,000 voter-authorized 2025 bond. Issued amounts are already
 *   reflected in the September 2026 outstanding principal.
 *
 * INTEREST ESTIMATE (same method as before; Sep 2026 deck inputs):
 *   Bond fund tax asking − principal paid this year = $6,350,431/year
 */
(function () {
  // --- CURRENT OUTSTANDING PRINCIPAL (published) ---
  const BASE_PRINCIPAL = 198575000;
  const BASE_DATE = new Date("2026-09-01T18:00:00-05:00");
  const CURRENT_AS_OF_LABEL = "September 2026";
  const CURRENT_SOURCE =
    "BPS Board of Education Budget Hearing Presentation (September 2026)";

  // Scheduled principal (from same presentation)
  const PRINCIPAL_NEXT_5_YEARS = 29140000;
  const PRINCIPAL_PAID_THIS_YEAR = 5765000;

  // --- INTEREST (derived from current debt budget figures) ---
  const BOND_FUND_TAX_ASKING = 12115431;
  const ANNUAL_INTEREST_EST = BOND_FUND_TAX_ASKING - PRINCIPAL_PAID_THIS_YEAR; // 6,350,431
  const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60; // 31,557,600
  const INTEREST_PER_SECOND = ANNUAL_INTEREST_EST / SECONDS_PER_YEAR;
  const EFFECTIVE_RATE =
    (ANNUAL_INTEREST_EST / BASE_PRINCIPAL) * 100; // ~3.20%

  // --- FUTURE / AUTHORIZED HS#2 BOND (context; not stacked on outstanding) ---
  const FUTURE_BOND_TOTAL = 112000000;
  const FUTURE_BOND_APPROVED = "March 11, 2025";
  const FUTURE_BOARD_AUTH = "June 9, 2025";
  const FUTURE_PROJECT_COST = 124645829;
  const FUTURE_RESERVES = 12645829;
  const FUTURE_OPENING = "2028–29 school year";
  const FUTURE_FIRST_TRANCHE_PLAN = 55500000;
  const FUTURE_FIRST_TRANCHE_WINDOW =
    "Series 2026 ~$55.5M expected; sale closing not confirmed in public records checked";
  const FUTURE_REMAINING_PLAN = FUTURE_BOND_TOTAL - FUTURE_FIRST_TRANCHE_PLAN;

  function formatMoney(amount, fractionDigits) {
    const digits = typeof fractionDigits === "number" ? fractionDigits : 0;
    return (
      "$" +
      amount.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    );
  }

  function formatPerSecond(amount) {
    return formatMoney(amount, 2) + " / sec";
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function secondsSinceBase() {
    return Math.max(0, (Date.now() - BASE_DATE.getTime()) / 1000);
  }

  function currentTotals() {
    const elapsed = secondsSinceBase();
    const interestCurrent = INTEREST_PER_SECOND * elapsed;
    return {
      elapsed: elapsed,
      interestCurrent: interestCurrent,
      liveCurrent: BASE_PRINCIPAL + interestCurrent,
    };
  }

  function renderStatic() {
    setText("[data-debt-as-of]", CURRENT_AS_OF_LABEL);
    setText("[data-debt-source]", CURRENT_SOURCE);
    setText("[data-debt-principal-5yr]", formatMoney(PRINCIPAL_NEXT_5_YEARS));
    setText("[data-debt-principal-paid]", formatMoney(PRINCIPAL_PAID_THIS_YEAR));
    setText("[data-debt-base-principal]", formatMoney(BASE_PRINCIPAL));
    setText("[data-interest-annual]", formatMoney(ANNUAL_INTEREST_EST));
    setText("[data-interest-per-second]", formatPerSecond(INTEREST_PER_SECOND));
    setText("[data-interest-rate]", EFFECTIVE_RATE.toFixed(2) + "%");
    setText("[data-bond-fund-tax]", formatMoney(BOND_FUND_TAX_ASKING));

    setText("[data-future-bond-total]", formatMoney(FUTURE_BOND_TOTAL));
    setText("[data-future-approved]", FUTURE_BOND_APPROVED);
    setText("[data-future-project-cost]", formatMoney(FUTURE_PROJECT_COST));
    setText("[data-future-reserves]", formatMoney(FUTURE_RESERVES));
    setText("[data-future-opening]", FUTURE_OPENING);
    setText("[data-future-first-tranche]", formatMoney(FUTURE_FIRST_TRANCHE_PLAN));
    setText("[data-future-first-window]", FUTURE_FIRST_TRANCHE_WINDOW);
    setText("[data-future-board-auth]", FUTURE_BOARD_AUTH);
    setText("[data-future-remaining]", formatMoney(FUTURE_REMAINING_PLAN));
  }

  function renderLive() {
    const t = currentTotals();

    setText("[data-debt-amount]", formatMoney(Math.floor(t.liveCurrent), 0));
    setText(
      "[data-interest-accrued]",
      formatMoney(Math.floor(t.interestCurrent), 0)
    );
    setText("[data-interest-per-second]", formatPerSecond(INTEREST_PER_SECOND));
  }

  renderStatic();
  renderLive();
  setInterval(renderLive, 200);
})();
