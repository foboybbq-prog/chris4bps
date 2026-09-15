/**
 * Bennington Public Schools debt clock — figures from public district sources.
 *
 * LEFT CLOCK (current debt):
 *   $159,365,000 principal (Sept 8, 2025) + estimated interest since as-of date
 *
 * RIGHT CLOCK (current + future authorized HS#2 bond):
 *   Same method, but principal = $159,365,000 + $112,000,000
 *   Interest uses the same effective rate (~4.06%) scaled to the larger principal
 *
 * INTEREST ESTIMATE:
 *   Bond fund tax asking − scheduled principal = $6,464,216/year on current principal
 *   ≈ $0.20/sec at ~4.06% effective rate
 */
(function () {
  // --- CURRENT OUTSTANDING PRINCIPAL (published) ---
  const BASE_PRINCIPAL = 159365000;
  const BASE_DATE = new Date("2025-09-08T18:00:00-05:00"); // budget hearing evening (Central)
  const CURRENT_AS_OF_LABEL = "September 8, 2025";
  const CURRENT_SOURCE =
    "BPS Board of Education Budget Hearing presentation (2025–26 budget)";

  // Scheduled principal (from same presentation)
  const PRINCIPAL_NEXT_5_YEARS = 29140000;
  const PRINCIPAL_FY_2025_26 = 4610000;

  // --- INTEREST (derived from current debt budget figures) ---
  const BOND_FUND_TAX_ASKING = 11074216;
  const ANNUAL_INTEREST_EST = BOND_FUND_TAX_ASKING - PRINCIPAL_FY_2025_26; // 6,464,216
  const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60; // 31,557,600
  const INTEREST_PER_SECOND = ANNUAL_INTEREST_EST / SECONDS_PER_YEAR;
  const EFFECTIVE_RATE =
    (ANNUAL_INTEREST_EST / BASE_PRINCIPAL) * 100; // ~4.06%

  // --- FUTURE / AUTHORIZED HS#2 BOND ---
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

  // Combined principal for right-hand clock
  const COMBINED_PRINCIPAL = BASE_PRINCIPAL + FUTURE_BOND_TOTAL;
  // Scale interest to combined principal at the same effective rate
  const ANNUAL_INTEREST_WITH_FUTURE =
    ANNUAL_INTEREST_EST * (COMBINED_PRINCIPAL / BASE_PRINCIPAL);
  const INTEREST_PER_SECOND_WITH_FUTURE =
    ANNUAL_INTEREST_WITH_FUTURE / SECONDS_PER_YEAR;

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
    const interestWithFuture = INTEREST_PER_SECOND_WITH_FUTURE * elapsed;
    return {
      elapsed: elapsed,
      interestCurrent: interestCurrent,
      liveCurrent: BASE_PRINCIPAL + interestCurrent,
      interestWithFuture: interestWithFuture,
      liveWithFuture: COMBINED_PRINCIPAL + interestWithFuture,
    };
  }

  function renderStatic() {
    setText("[data-debt-as-of]", CURRENT_AS_OF_LABEL);
    setText("[data-debt-source]", CURRENT_SOURCE);
    setText("[data-debt-principal-5yr]", formatMoney(PRINCIPAL_NEXT_5_YEARS));
    setText("[data-debt-principal-2526]", formatMoney(PRINCIPAL_FY_2025_26));
    setText("[data-debt-base-principal]", formatMoney(BASE_PRINCIPAL));
    setText("[data-debt-combined-principal]", formatMoney(COMBINED_PRINCIPAL));
    setText("[data-interest-annual]", formatMoney(ANNUAL_INTEREST_EST));
    setText(
      "[data-interest-annual-with-future]",
      formatMoney(Math.round(ANNUAL_INTEREST_WITH_FUTURE))
    );
    setText("[data-interest-per-second]", formatPerSecond(INTEREST_PER_SECOND));
    setText(
      "[data-interest-per-second-with-future]",
      formatPerSecond(INTEREST_PER_SECOND_WITH_FUTURE)
    );
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
    setText(
      "[data-debt-combined-potential]",
      formatMoney(COMBINED_PRINCIPAL)
    );
  }

  function renderLive() {
    const t = currentTotals();

    // Left: current debt only
    setText("[data-debt-amount]", formatMoney(Math.floor(t.liveCurrent), 0));
    setText(
      "[data-interest-accrued]",
      formatMoney(Math.floor(t.interestCurrent), 0)
    );
    setText("[data-interest-per-second]", formatPerSecond(INTEREST_PER_SECOND));

    // Right: current + future authorized bond
    setText(
      "[data-debt-amount-with-future]",
      formatMoney(Math.floor(t.liveWithFuture), 0)
    );
    setText(
      "[data-interest-accrued-with-future]",
      formatMoney(Math.floor(t.interestWithFuture), 0)
    );
    setText(
      "[data-interest-per-second-with-future]",
      formatPerSecond(INTEREST_PER_SECOND_WITH_FUTURE)
    );
  }

  renderStatic();
  renderLive();
  setInterval(renderLive, 200);
})();
