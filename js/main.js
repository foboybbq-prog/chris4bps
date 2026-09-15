/**
 * Campaign site interactions: mobile nav + contact form (mailto fallback).
 * Replace the email below when you have a campaign address.
 */
(function () {
  const CAMPAIGN_EMAIL = "info@chris4bps.com";

  document.querySelectorAll(".more-detail-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = button.getAttribute("aria-controls");
      const panel = id ? document.getElementById(id) : null;
      if (!panel) return;
      const open = panel.hasAttribute("hidden");
      if (open) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.textContent = open ? "Hide detail" : "More detail";
    });
  });

  // Mobile navigation
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav-links");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Contact / volunteer forms → opens email client with filled fields
  document.querySelectorAll("[data-campaign-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const data = new FormData(form);
      const type = form.getAttribute("data-campaign-form") || "contact";
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const phone = (data.get("phone") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();
      const interest = (data.get("interest") || "").toString().trim();

      const subject =
        type === "volunteer"
          ? "Volunteer interest — Bennington School Board campaign"
          : "Campaign website message — Bennington School Board";

      const body = [
        "Name: " + name,
        "Email: " + email,
        phone ? "Phone: " + phone : null,
        interest ? "Interest: " + interest : null,
        "",
        "Message:",
        message || "(no message)",
      ]
        .filter(function (line) {
          return line !== null;
        })
        .join("\n");

      if (CAMPAIGN_EMAIL.indexOf("REPLACE") === 0) {
        const success = form.querySelector(".form-success");
        if (success) {
          success.textContent =
            "Thanks, " +
            (name || "friend") +
            "! Update CAMPAIGN_EMAIL in js/main.js to send real messages. Your info was not emailed yet.";
          success.classList.add("is-visible");
        }
        form.reset();
        return;
      }

      const mailto =
        "mailto:" +
        encodeURIComponent(CAMPAIGN_EMAIL) +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      window.location.href = mailto;

      const success = form.querySelector(".form-success");
      if (success) {
        success.textContent =
          "Thanks, " + (name || "friend") + "! Your email app should open with your message.";
        success.classList.add("is-visible");
      }
      form.reset();
    });
  });
})();
