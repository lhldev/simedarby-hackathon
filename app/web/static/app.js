(function () {
  "use strict";

  const STORAGE_KEY = "sd-wallet-demo-v2";
  const API_BASE = "/api/v1/energy/chargers";
  const WALLET_API = "/api/v1/wallet";
  const MAX_STORED_SESSIONS = 20;

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) =>
    Array.from((root || document).querySelectorAll(selector));

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });

  const renderMarkdown = (value) => {
    const text = String(value || "");
    if (!text) return "";
    if (!window.marked || !window.DOMPurify) return escapeHtml(text);
    return DOMPurify.sanitize(
      marked.parse(text, { gfm: true, breaks: true }),
    );
  };

  const money = (value) =>
    "RM " +
    Number(value || 0).toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const moneyCents = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const cents = Number(value);
    if (!Number.isFinite(cents)) return "—";
    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(Math.trunc(cents));
    const ringgit = Math.floor(absolute / 100).toLocaleString("en-MY");
    const sen = String(absolute % 100).padStart(2, "0");
    return sign + "RM " + ringgit + "." + sen;
  };

  const uid = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  const pad = (value) => String(value).padStart(2, "0");

  function localDateInput() {
    const date = new Date();
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function formatTxDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const sameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (sameDay) {
      return (
        "Today, " +
        date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })
      );
    }
    return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
  }

  function formatRideDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value;
    const date = new Date(value + "T00:00:00");
    return date.toLocaleDateString("en-MY", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function formatRelative(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "just now";
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + " min ago";
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + " hr ago";
    return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
  }

  function initialsOf(value) {
    return String(value)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function toneFor(value) {
    const total = String(value)
      .split("")
      .reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return (total % 5) + 1;
  }

  const TX_ICONS = {
    topup: "TP",
    pay: "PY",
    transfer: "TR",
    ride: "CP",
    market: "MK",
    reward: "RW",
    reimburse: "EX",
    charge: "EV",
    utility: "UT",
  };

  function buildDefaultState() {
    return {
      balanceCents: null,
      transactions: [],
      sdPoints: 0,
      billDueCents: null,
      walletSummary: null,
      walletReady: false,
      cartQuote: { count: 0, totalCents: null },
      rides: [
        {
          id: uid(),
          role: "driver",
          name: "Farah Idris",
          initials: "FI",
          from: "Ara Damansara",
          to: "KLCC",
          date: "Today",
          time: "07:45",
          seats: 2,
          vehicle: "Perodua Ativa",
          isMine: false,
        },
        {
          id: uid(),
          role: "driver",
          name: "Daniel Tan",
          initials: "DT",
          from: "Subang Jaya",
          to: "Cyberjaya",
          date: "Today",
          time: "08:10",
          seats: 3,
          vehicle: "Honda City",
          isMine: false,
        },
        {
          id: uid(),
          role: "passenger",
          name: "Mei Ling",
          initials: "ML",
          from: "Puchong",
          to: "Ara Damansara",
          date: "Tomorrow",
          time: "08:00",
          seats: 1,
          vehicle: "Ride request",
          isMine: false,
        },
        {
          id: uid(),
          role: "driver",
          name: "Aina Zulkifli",
          initials: "AZ",
          from: "Bangsar",
          to: "KLCC",
          date: "Tomorrow",
          time: "07:30",
          seats: 1,
          vehicle: "Toyota Vios",
          isMine: false,
        },
        {
          id: uid(),
          role: "driver",
          name: "Raj Kumar",
          initials: "RK",
          from: "Petaling Jaya",
          to: "Subang Jaya",
          date: "Today",
          time: "18:15",
          seats: 3,
          vehicle: "Proton X50",
          isMine: false,
        },
        {
          id: uid(),
          role: "passenger",
          name: "Hana Yusof",
          initials: "HY",
          from: "KLCC",
          to: "Ara Damansara",
          date: "Weekdays",
          time: "18:30",
          seats: 1,
          vehicle: "Return trip request",
          isMine: false,
        },
      ],
      listings: [
        {
          id: uid(),
          name: "Ergonomic Laptop Stand",
          price: 45,
          category: "Electronics",
          condition: "Like new",
          seller: "Hafiz R.",
          description: "Aluminium stand with adjustable height. Used for two months.",
        },
        {
          id: uid(),
          name: "Handmade Batik Tote",
          price: 38,
          category: "Fashion",
          condition: "New",
          seller: "Nurul A.",
          description: "Locally made batik tote with a padded laptop sleeve.",
        },
        {
          id: uid(),
          name: "Oak Coffee Table",
          price: 120,
          category: "Home",
          condition: "Gently used",
          seller: "Daniel T.",
          description: "Solid oak table, 90cm round. Moving out this weekend.",
        },
        {
          id: uid(),
          name: "Kids STEM Kit",
          price: 65,
          category: "Kids",
          condition: "Like new",
          seller: "Siti M.",
          description: "Complete robotics kit with all parts and activity cards.",
        },
        {
          id: uid(),
          name: "5L Air Fryer",
          price: 180,
          category: "Home",
          condition: "Used once",
          seller: "Imran K.",
          description: "Digital air fryer with six presets. Box and manual included.",
        },
        {
          id: uid(),
          name: "Bicycle Tune-Up",
          price: 35,
          category: "Services",
          condition: "Weekends",
          seller: "Bike Lab",
          description: "Full tune-up, brake check and drivetrain cleaning at your place.",
        },
      ],
      cart: {},
      carbonSaved: 34.6,
      carpoolContributors: [
        { name: "Farah Idris", points: 900, rides: 6 },
        { name: "Daniel Tan", points: 750, rides: 5 },
        { name: "Aina Zulkifli", points: 600, rides: 4 },
        { name: "Aisyah Rahman", points: 450, rides: 3 },
        { name: "Raj Kumar", points: 300, rides: 2 },
      ],
      homeEnergy: {
        usedToday: 14.6,
        solarToday: 7.2,
      },
      ev: {
        battery: 42,
        capacityKwh: 60,
      },
      chargingSessions: [],
    };
  }

  function loadState() {
    const defaults = buildDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw);
      return {
        ...defaults,
        rides: Array.isArray(saved.rides) ? saved.rides : defaults.rides,
        listings: Array.isArray(saved.listings) ? saved.listings : defaults.listings,
        cart: saved.cart && typeof saved.cart === "object" ? saved.cart : {},
        carpoolContributors: Array.isArray(saved.carpoolContributors)
          ? saved.carpoolContributors
              .filter(function (contributor) {
                return (
                  contributor &&
                  typeof contributor.name === "string" &&
                  Number.isFinite(Number(contributor.points))
                );
              })
              .map(function (contributor) {
                return {
                  name: contributor.name,
                  points: Number(contributor.points),
                  rides: Math.max(0, Number(contributor.rides) || 0),
                };
              })
          : defaults.carpoolContributors,
        sdPoints: Number.isFinite(Number(saved.sdPoints))
          ? Math.max(0, Number(saved.sdPoints))
          : Number.isFinite(Number(saved.primePoints))
            ? Math.max(0, Number(saved.primePoints))
            : defaults.sdPoints,
        carbonSaved: Number.isFinite(Number(saved.carbonSaved))
          ? Math.max(0, Number(saved.carbonSaved))
          : defaults.carbonSaved,
        homeEnergy:
          saved.homeEnergy && typeof saved.homeEnergy === "object"
            ? {
                usedToday: Math.max(0, Number(saved.homeEnergy.usedToday) || 0),
                solarToday: Math.max(0, Number(saved.homeEnergy.solarToday) || 0),
              }
            : defaults.homeEnergy,
        ev:
          saved.ev && typeof saved.ev === "object"
            ? { ...defaults.ev, ...saved.ev }
            : defaults.ev,
        chargingSessions: Array.isArray(saved.chargingSessions)
          ? saved.chargingSessions.filter(function (session) {
              return session && Number.isFinite(Number(session.costCents));
            })
          : defaults.chargingSessions,
      };
    } catch (error) {
      return defaults;
    }
  }

  async function walletRequest(path, options) {
    const config = options || {};
    const response = await fetch(WALLET_API + path, {
      ...config,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(config.headers || {}),
      },
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }
    if (!response.ok) {
      let detail = payload && payload.detail;
      if (Array.isArray(detail)) {
        detail = detail
          .map(function (item) {
            return item.msg;
          })
          .join(", ");
      }
      throw new Error(detail || "Wallet request failed.");
    }
    return payload;
  }

  function applyWallet(wallet) {
    state.balanceCents = wallet.balance_cents;
    state.sdPoints = wallet.sd_points;
    state.billDueCents = wallet.bill_due_cents;
    state.transactions = wallet.transactions;
    state.walletSummary = wallet.summary;
    state.walletReady = true;
    renderWallet();
    renderHomeEnergy();
  }

  async function loadWallet() {
    try {
      applyWallet(await walletRequest(""));
    } catch (error) {
      state.walletReady = false;
      renderWallet();
      showToast(error.message, "error");
    }
  }

  let state = loadState();
  let chargeQuote = { key: "", costCents: null };
  let cartQuoteRequest = 0;
  let activeView = "wallet";
  let carpoolRole = "passenger";
  let marketQuery = "";
  let marketCategory = "All";
  let chatGeneration = 0;
  let chatMessages = [];
  let chargers = [];
  let chargeTarget = 80;

  const VIEW_META = {
    wallet: { eyebrow: "All-in-one", title: "SD-Wallet" },
    bylaws: { eyebrow: "Township", title: "By-Laws Alignment" },
    carpool: { eyebrow: "Community", title: "Carpool" },
    marketplace: { eyebrow: "Community", title: "Marketplace" },
    energy: { eyebrow: "Clean energy", title: "EV & Energy" },
  };

  function saveState() {
    if (state.chargingSessions.length > MAX_STORED_SESSIONS) {
      state.chargingSessions.length = MAX_STORED_SESSIONS;
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          rides: state.rides,
          listings: state.listings,
          cart: state.cart,
          carbonSaved: state.carbonSaved,
          homeEnergy: {
            usedToday: state.homeEnergy.usedToday,
            solarToday: state.homeEnergy.solarToday,
          },
          ev: state.ev,
          chargingSessions: state.chargingSessions,
        }),
      );
    } catch (error) {
      showToast("Could not save demo data in this browser.", "error");
    }
  }

  function showToast(message, tone) {
    const stack = $("#toast-stack");
    const toast = document.createElement("div");
    toast.className = "toast" + (tone === "error" ? " error" : "");
    toast.innerHTML =
      '<span class="toast-mark"></span><p>' + escapeHtml(message) + "</p>";
    stack.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("leaving");
      window.setTimeout(function () {
        toast.remove();
      }, 250);
    }, 3200);
  }

  const modal = $("#modal");
  const modalForm = $("#modal-form");
  let modalBusy = false;

  function setModalBusy(isBusy) {
    const submit = $("#modal-submit");
    modalBusy = isBusy;
    modal.classList.toggle("is-busy", isBusy);
    modal
      .querySelectorAll("input, select, textarea, [data-close-modal]")
      .forEach(function (element) {
        element.disabled = isBusy;
      });
    if (isBusy) {
      if (!submit.dataset.label) {
        submit.dataset.label = submit.textContent;
      }
      submit.classList.add("is-loading");
      submit.innerHTML =
        '<span class="spinner" aria-hidden="true"></span><span>' +
        escapeHtml(submit.dataset.label) +
        "</span>";
    } else {
      submit.classList.remove("is-loading");
      submit.textContent = submit.dataset.label || submit.textContent;
      delete submit.dataset.label;
    }
  }

  function openModal(config) {
    $("#modal-eyebrow").textContent = config.eyebrow || "SD-Wallet";
    $("#modal-title").textContent = config.title || "";
    $("#modal-subtitle").textContent = config.subtitle || "";
    $("#modal-body").innerHTML = config.body || "";
    const submit = $("#modal-submit");
    delete submit.dataset.label;
    submit.textContent = config.submitLabel || "Save";
    modalForm.onsubmit = async function (event) {
      event.preventDefault();
      if (modalBusy) return;
      const formData = new FormData(modalForm);
      setModalBusy(true);
      try {
        await config.onSubmit(formData);
      } finally {
        setModalBusy(false);
      }
    };
    modal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(function () {
      const firstField = modal.querySelector("input, select, textarea");
      if (firstField) firstField.focus();
    }, 30);
  }

  function closeModal() {
    if (modalBusy) setModalBusy(false);
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modalForm.onsubmit = null;
  }

  function resetDemo() {
    openModal({
      eyebrow: "Demo controls",
      title: "Reset the demo?",
      subtitle:
        "This resets the database wallet ledger and clears carpool, marketplace, energy and chat state in this browser.",
      submitLabel: "Reset demo",
      body:
        '<p class="muted small">Active charging sessions are released first. The page will reload at the Wallet view.</p>',
      onSubmit: async function () {
        const activeSessions = state.chargingSessions.filter(function (session) {
          return session.status === "active";
        });
        if (activeSessions.length) {
          if (!chargers.length) await loadChargers();
          for (const session of activeSessions) {
            await releaseChargerSlot(session.chargerId);
          }
        }
        try {
          applyWallet(await walletRequest("/reset", { method: "POST" }));
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          showToast(error.message, "error");
          return;
        }
        window.location.hash = "#wallet";
        window.location.reload();
      },
    });
  }

  function activateView(view) {
    const target = VIEW_META[view] ? view : "wallet";
    activeView = target;
    $$(".nav-item").forEach(function (button) {
      const isActive = button.dataset.nav === target;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
    $$("[data-view-panel]").forEach(function (panel) {
      const isActive = panel.dataset.viewPanel === target;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
    const meta = VIEW_META[target];
    $("#page-eyebrow").textContent = meta.eyebrow;
    $("#page-title").textContent = meta.title;
    if (window.location.hash !== "#" + target) {
      history.replaceState(null, "", "#" + target);
    }
    if (target === "energy") {
      if (!chargers.length) loadChargers();
      renderEnergy();
    }
    if (target === "marketplace") {
      renderMarketplace();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderWallet() {
    $$("[data-balance]").forEach(function (element) {
      element.textContent = moneyCents(state.balanceCents);
    });

    const summary = state.walletSummary;
    const spentElement = $("[data-spent]");
    if (spentElement) {
      spentElement.textContent = summary
        ? moneyCents(summary.spent_this_month_cents)
        : "—";
    }

    const cashbackElement = $("[data-cashback]");
    if (cashbackElement) {
      cashbackElement.textContent = summary
        ? moneyCents(summary.cashback_cents)
        : "—";
    }

    renderSdPoints();
    renderCarbon();
    renderImpact();
    renderTransactions();
  }

  function impactStats() {
    const ridesShared = state.rides.filter(function (ride) {
      return ride.joinedByMe || ride.offeredByMe;
    }).length;
    const itemsReused = state.transactions
      .filter(function (transaction) {
        return transaction.kind === "market";
      })
      .reduce(function (sum, transaction) {
        const match = /^(\d+)/.exec(String(transaction.meta || ""));
        return sum + (match ? Number(match[1]) : 1);
      }, 0);
    return {
      ridesShared: ridesShared,
      itemsReused: itemsReused,
      points: Number(state.sdPoints) || 0,
      carbon: Number(state.carbonSaved) || 0,
      evKwh: state.chargingSessions
        .filter(function (session) {
          return session.status === "complete";
        })
        .reduce(function (sum, session) {
          return sum + (Number(session.energy) || 0);
        }, 0),
    };
  }

  function renderImpact() {
    const stats = impactStats();
    const rides = $("[data-impact-rides]");
    if (rides) rides.textContent = stats.ridesShared.toLocaleString("en-MY");
    const items = $("[data-impact-items]");
    if (items) items.textContent = stats.itemsReused.toLocaleString("en-MY");
    const points = $("[data-impact-points]");
    if (points) points.textContent = stats.points.toLocaleString("en-MY");
    const carbon = $("[data-impact-carbon]");
    if (carbon) carbon.textContent = formatKg(stats.carbon);
    const ev = $("[data-impact-ev]");
    if (ev) ev.textContent = stats.evKwh.toFixed(1) + " kWh";
  }

  function renderTransactions() {
    const list = $("#tx-list");
    if (!list) return;
    if (!state.walletReady) {
      list.innerHTML =
        '<li class="empty-state">Loading the wallet ledger…</li>';
      return;
    }
    if (!state.transactions.length) {
      list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
      return;
    }
    list.innerHTML = state.transactions
      .slice(0, 8)
      .map(function (transaction) {
        const isIn = transaction.direction === "in";
        const isPoints = transaction.kind === "reward";
        const sign = isIn ? "+" : "-";
        const amount = isPoints
          ? Math.abs(Number(transaction.points || 0)).toLocaleString("en-MY") +
            " pts"
          : moneyCents(transaction.amount_cents);
        return (
          '<li class="tx-row">' +
          '<span class="tx-icon ' +
          (isIn ? "in" : "") +
          '">' +
          (TX_ICONS[transaction.kind] || "SD") +
          "</span>" +
          '<div class="tx-copy">' +
          "<strong>" +
          escapeHtml(transaction.title) +
          "</strong>" +
          "<span>" +
          escapeHtml(transaction.meta || "SD-Wallet") +
          " · " +
          escapeHtml(formatTxDate(transaction.at)) +
          "</span>" +
          "</div>" +
          '<span class="tx-amount ' +
          (isIn ? "in" : "") +
          '">' +
          sign +
          escapeHtml(amount) +
          "</span>" +
          "</li>"
        );
      })
      .join("");
  }

  const MONEY_MODES = {
    topup: {
      title: "Add money to SD-Wallet",
      subtitle: "Top up instantly from a linked bank account. Demo only.",
      submit: "Top up",
      direction: "in",
      kind: "topup",
      meta: "FPX · Maybank •• 2841",
    },
    pay: {
      title: "Pay with SD-Wallet",
      subtitle: "Simulate a QR or contactless payment. Demo only.",
      submit: "Pay now",
      direction: "out",
      kind: "pay",
      meta: "QR payment · Sime Darby merchant",
    },
    transfer: {
      title: "Transfer from SD-Wallet",
      subtitle: "Send money to a colleague or wallet ID. Demo only.",
      submit: "Send transfer",
      direction: "out",
      kind: "transfer",
      meta: "DuitNow transfer",
    },
  };

  function openMoneyModal(mode) {
    const config = MONEY_MODES[mode] || MONEY_MODES.pay;
    openModal({
      eyebrow: "SD-Wallet",
      title: config.title,
      subtitle: config.subtitle,
      submitLabel: config.submit,
      body:
        '<label>Amount (RM)<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" required /></label>' +
        (mode === "transfer"
          ? '<label>Recipient<input name="recipient" type="text" placeholder="Name or wallet ID" required /></label>'
          : "") +
        '<label>Note (optional)<input name="note" type="text" placeholder="What is this for?" /></label>',
      onSubmit: async function (formData) {
        const amount = String(formData.get("amount") || "").trim();
        if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
          showToast("Enter a valid amount with at most two decimals.", "error");
          return;
        }
        const recipient = String(formData.get("recipient") || "").trim();
        if (mode === "transfer" && !recipient) {
          showToast("Enter a recipient.", "error");
          return;
        }
        const note = String(formData.get("note") || "").trim();
        const title =
          mode === "topup"
            ? "Wallet top-up"
            : mode === "transfer"
              ? "Transfer to " + recipient
              : note || "Wallet payment";

        try {
          const wallet = await walletRequest("/transactions", {
            method: "POST",
            body: JSON.stringify({
              amount: amount,
              direction: config.direction,
              kind: config.kind,
              title: title,
              meta: note && mode !== "pay" ? note : config.meta,
            }),
          });
          applyWallet(wallet);
          closeModal();
          showToast(
            moneyCents(wallet.transactions[0].amount_cents) +
              (mode === "topup"
                ? " added to SD-Wallet."
                : mode === "transfer"
                  ? " sent from SD-Wallet."
                  : " paid from SD-Wallet."),
          );
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  function resetChat() {
    chatGeneration += 1;
    chatMessages = [
      {
        role: "assistant",
        text:
          "Hi Aisyah. I can check the township by-laws on property use, renovations, parking, pets, waste, common areas and enforcement. What would you like to know?",
      },
    ];
    renderChat();
  }

  function renderChat() {
    const log = $("#chat-log");
    if (!log) return;
    log.innerHTML = chatMessages
      .map(function (message) {
        const isUser = message.role === "user";
        return (
          '<div class="chat-message ' +
          (isUser ? "user" : "assistant") +
          '">' +
          '<span class="chat-avatar">' +
          (isUser ? "AR" : "BL") +
          "</span>" +
          '<div class="bubble' +
          (isUser ? "" : " markdown") +
          '">' +
          (isUser ? escapeHtml(message.text) : renderMarkdown(message.text)) +
          "</div>" +
          "</div>"
        );
      })
      .join("");
    log.scrollTop = log.scrollHeight;
  }

  async function sendChat(value) {
    const text = String(value || "").trim();
    if (!text) return;

    chatGeneration += 1;
    const generation = chatGeneration;
    chatMessages.push({ role: "user", text: text });
    const assistant = { role: "assistant", text: "" };
    renderChat();

    const log = $("#chat-log");
    const typing = document.createElement("div");
    typing.className = "chat-message assistant";
    typing.innerHTML =
      '<span class="chat-avatar">BL</span><div class="bubble typing-dots"><span></span><span></span><span></span></div>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    let started = false;

    function applyDelta(delta) {
      if (generation !== chatGeneration) return;
      if (!started) {
        typing.remove();
        started = true;
        assistant.text = delta;
        chatMessages.push(assistant);
      } else {
        assistant.text += delta;
      }
      renderChat();
    }

    try {
      const response = await fetch("/api/v1/bylaws/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message: text }),
      });
      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          event.split("\n").forEach(function (line) {
            if (!line.startsWith("data: ")) return;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta) applyDelta(parsed.delta);
            } catch (error) {
              return;
            }
          });
          boundary = buffer.indexOf("\n\n");
        }
      }

      if (!started && generation === chatGeneration) {
        applyDelta(
          "I could not reach the by-law assistant. Please try again or contact your township management office.",
        );
      }
    } catch (error) {
      if (generation === chatGeneration) {
        applyDelta(
          "The by-law assistant is unavailable right now. Please try again or contact your township management office.",
        );
      }
    } finally {
      typing.remove();
    }
  }

  function setCarpoolRole(role) {
    carpoolRole = role === "driver" ? "driver" : "passenger";
    $$("[data-carpool-role]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.carpoolRole === carpoolRole);
    });
    $$(".driver-only").forEach(function (field) {
      field.hidden = carpoolRole !== "driver";
    });
    $("#carpool-submit").textContent =
      carpoolRole === "driver" ? "Publish ride" : "Post ride request";
  }

  function renderRides() {
    const list = $("#ride-list");
    if (!list) return;
    $("#ride-count").textContent = state.rides.length + " posted";
    if (!state.rides.length) {
      list.innerHTML = '<p class="empty-state">No rides posted yet.</p>';
      return;
    }

    list.innerHTML = state.rides
      .slice(0, 10)
      .map(function (ride) {
        const isDriver = ride.role === "driver";
        const seatText = isDriver
          ? ride.seats + (ride.seats === 1 ? " seat left" : " seats left")
          : ride.seats + (ride.seats === 1 ? " seat needed" : " seats needed");
        let action = "";

        if (ride.isMine) {
          action = '<button class="btn btn-ghost btn-small" type="button" disabled>Your post</button>';
        } else if (isDriver) {
          const joined = Boolean(ride.joinedByMe);
          const full = ride.seats < 1;
          action =
            '<button class="btn btn-primary btn-small" type="button" data-join-ride="' +
            escapeHtml(ride.id) +
            '"' +
            (joined || full ? " disabled" : "") +
            ">" +
            (joined ? "Reserved" : full ? "Full" : "Join ride · Free") +
            "</button>";
        } else {
          const offered = Boolean(ride.offeredByMe);
          const filled = ride.seats < 1;
          action =
            '<button class="btn btn-navy btn-small" type="button" data-offer-seat="' +
            escapeHtml(ride.id) +
            '"' +
            (offered || filled ? " disabled" : "") +
            ">" +
            (offered ? "Seat offered" : filled ? "Filled" : "Offer a seat") +
            "</button>";
        }

        return (
          '<article class="ride-card ' +
          (ride.isMine ? "is-mine" : "") +
          '">' +
          '<div class="ride-top">' +
          '<div class="person">' +
          '<span class="avatar">' +
          escapeHtml(ride.initials) +
          "</span>" +
          "<div><strong>" +
          escapeHtml(ride.name) +
          "</strong><span>" +
          (isDriver ? "Driver" : "Passenger") +
          " · " +
          escapeHtml(ride.vehicle) +
          "</span></div>" +
          "</div>" +
          '<span class="role-badge ' +
          (isDriver ? "driver" : "") +
          '">' +
          (isDriver ? "Offer" : "Request") +
          "</span>" +
          "</div>" +
          '<div class="route"><span class="route-dot"></span><div>' +
          "<p>" +
          escapeHtml(ride.from) +
          "</p><p>" +
          escapeHtml(ride.to) +
          "</p>" +
          "</div></div>" +
          '<div class="ride-meta"><span>' +
          escapeHtml(formatRideDate(ride.date)) +
          "</span><span>" +
          escapeHtml(ride.time) +
          "</span><span>" +
          seatText +
          "</span></div>" +
          '<div class="ride-foot"><span class="points">' +
          (isDriver
            ? "150 SD Points · " +
              formatKg(CARBON_PER_SHARED_RIDE) +
              " CO₂e saved / seat"
            : '<span class="points-badge">Community Ride · ' +
              formatKg(CARBON_PER_SHARED_RIDE) +
              " CO₂e</span>") +
          "</span>" +
          action +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderCarpoolRanking() {
    const list = $("#carpool-ranking");
    if (!list) return;

    const contributors = state.carpoolContributors
      .slice()
      .sort(function (left, right) {
        return right.points - left.points || left.name.localeCompare(right.name);
      })
      .slice(0, 5);

    list.innerHTML = contributors
      .map(function (contributor, index) {
        const isCurrentUser = contributor.name === "Aisyah Rahman";
        return (
          '<li class="ranking-row ' +
          (isCurrentUser ? "is-current-user" : "") +
          '">' +
          '<span class="ranking-position">' +
          (index + 1) +
          "</span>" +
          '<span class="avatar ranking-avatar">' +
          escapeHtml(initialsOf(contributor.name)) +
          "</span>" +
          '<span class="ranking-copy"><strong>' +
          escapeHtml(contributor.name) +
          (isCurrentUser ? " (You)" : "") +
          "</strong><small>" +
          contributor.rides +
          (contributor.rides === 1 ? " shared ride" : " shared rides") +
          "</small></span>" +
          '<strong class="ranking-points">' +
          contributor.points.toLocaleString("en-MY") +
          " pts</strong>" +
          "</li>"
        );
      })
      .join("");
  }

  const SD_POINTS_PER_PASSENGER = 150;
  const SD_POINTS_PER_CHARGE = 40;
  const SD_POINTS_TIER_TARGET = 1000;
  const CARBON_PER_SHARED_RIDE = 4.2;
  const CARBON_PER_EV_KWH = 0.42;
  const CARBON_PER_ITEM = {
    Electronics: 9.5,
    Fashion: 4.8,
    Home: 12.6,
    Kids: 3.2,
    Services: 1.4,
  };
  const CARBON_PER_ITEM_DEFAULT = 4;
  const ECO_MILESTONE_KG = 50;

  function formatKg(value) {
    return Number(value || 0).toFixed(1) + " kg";
  }

  function carbonForListing(listing) {
    return Object.prototype.hasOwnProperty.call(CARBON_PER_ITEM, listing.category)
      ? CARBON_PER_ITEM[listing.category]
      : CARBON_PER_ITEM_DEFAULT;
  }

  function awardCarbon(amount) {
    state.carbonSaved =
      Math.round((Number(state.carbonSaved || 0) + Number(amount || 0)) * 10) /
      10;
  }

  function renderCarbon() {
    const total = Math.max(0, Number(state.carbonSaved) || 0);
    const nextGoal =
      Math.floor(total / ECO_MILESTONE_KG) * ECO_MILESTONE_KG +
      ECO_MILESTONE_KG;
    const percent = Math.max(0, Math.min(100, (total / nextGoal) * 100));
    const kmAvoided = Math.round(total / 0.192);
    const trees = Math.round(total / 21);

    $$("[data-carbon]").forEach(function (element) {
      element.textContent = formatKg(total);
    });
    $$("[data-carbon-bar]").forEach(function (element) {
      element.style.width = percent + "%";
      const meter = element.closest("[data-carbon-meter]");
      if (meter) {
        meter.setAttribute("aria-valuenow", total.toFixed(1));
        meter.setAttribute("aria-valuemax", String(nextGoal));
        meter.setAttribute(
          "aria-valuetext",
          total.toFixed(1) + " kilograms of CO2 equivalent saved",
        );
      }
    });
    $$("[data-carbon-next]").forEach(function (element) {
      element.textContent =
        formatKg(total) + " of " + nextGoal + " kg to the next eco milestone";
    });
    $$("[data-carbon-equivalent]").forEach(function (element) {
      element.textContent =
        "≈ " +
        kmAvoided.toLocaleString("en-MY") +
        " km driving avoided · " +
        trees.toLocaleString("en-MY") +
        " tree-year(s)";
    });
  }

  function renderSdPoints() {
    const points = state.walletReady ? Number(state.sdPoints) || 0 : null;
    const value = points === null ? "—" : points.toLocaleString("en-MY");
    $$("[data-points]").forEach(function (element) {
      element.textContent = value;
    });
    const badge = $("#sd-points");
    if (badge) badge.textContent = value;

    const intoTier = points === null ? 0 : points % SD_POINTS_TIER_TARGET;
    const nextReward = $("#sd-points-next");
    if (nextReward) {
      nextReward.textContent =
        intoTier.toLocaleString("en-MY") +
        " / " +
        SD_POINTS_TIER_TARGET.toLocaleString("en-MY") +
        " points to the next reward";
    }
    const progress = document.querySelector("#sd-points-progress span");
    if (progress) {
      progress.style.width = (intoTier / SD_POINTS_TIER_TARGET) * 100 + "%";
    }
    const remaining = SD_POINTS_TIER_TARGET - intoTier;
    $$("[data-points-next]").forEach(function (element) {
      element.textContent =
        remaining.toLocaleString("en-MY") + " points to the next tier";
    });

    const week = state.walletSummary
      ? Number(state.walletSummary.points_this_week) || 0
      : null;
    const weekBadge = $("#sd-points-week");
    if (weekBadge) {
      weekBadge.textContent =
        week === null ? "—" : "+" + week.toLocaleString("en-MY") + " pts this week";
    }
  }

  async function awardSdPoints(amount, meta) {
    try {
      const wallet = await walletRequest("/rewards", {
        method: "POST",
        body: JSON.stringify({ points: amount, meta: meta }),
      });
      applyWallet(wallet);
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  }

  function awardCarpoolPoints(name, amount) {
    let contributor = state.carpoolContributors.find(function (candidate) {
      return candidate.name === name;
    });
    if (!contributor) {
      contributor = { name: name, points: 0, rides: 0 };
      state.carpoolContributors.push(contributor);
    }
    contributor.points += amount;
    contributor.rides += 1;
  }

  function reserveRide(id) {
    const ride = state.rides.find(function (candidate) {
      return candidate.id === id;
    });
    if (!ride || ride.role !== "driver" || ride.seats < 1 || ride.joinedByMe) {
      return;
    }

    ride.seats -= 1;
    awardCarpoolPoints(ride.name, SD_POINTS_PER_PASSENGER);
    ride.joinedByMe = true;
    awardCarbon(CARBON_PER_SHARED_RIDE);
    saveState();
    renderRides();
    renderCarpoolRanking();
    renderCarbon();
    renderImpact();
    showToast(
      "Seat reserved — " +
        ride.name +
        " earned " +
        SD_POINTS_PER_PASSENGER +
        " SD Points. +" +
        formatKg(CARBON_PER_SHARED_RIDE) +
        " CO₂e saved. " +
        (ride.seats > 0 ? ride.seats + " seat(s) still available." : "This ride is now full."),
    );
  }

  function renderMarketCategories() {
    const container = $("#market-categories");
    if (!container) return;
    const categories = ["All"].concat(
      Array.from(
        new Set(
          state.listings.map(function (listing) {
            return listing.category;
          }),
        ),
      ),
    );
    container.innerHTML = categories
      .map(function (category) {
        return (
          '<button class="chip ' +
          (marketCategory === category ? "is-active" : "") +
          '" type="button" data-market-category="' +
          escapeHtml(category) +
          '">' +
          escapeHtml(category) +
          "</button>"
        );
      })
      .join("");
  }

  function renderProducts() {
    const grid = $("#product-grid");
    if (!grid) return;
    const query = marketQuery.trim().toLowerCase();
    const items = state.listings.filter(function (listing) {
      const matchesCategory =
        marketCategory === "All" || listing.category === marketCategory;
      const haystack = (
        listing.name +
        " " +
        listing.description +
        " " +
        listing.seller +
        " " +
        listing.category
      ).toLowerCase();
      return matchesCategory && (!query || haystack.indexOf(query) !== -1);
    });

    if (!items.length) {
      grid.innerHTML =
        '<p class="empty-state">No listings match this search. Try another category.</p>';
      return;
    }

    grid.innerHTML = items
      .map(function (listing) {
        const ownListing = listing.seller === "You";
        const addButton = ownListing
          ? '<button class="btn btn-ghost btn-small" type="button" disabled>Your listing</button>'
          : '<button class="btn btn-primary btn-small" type="button" data-cart-add="' +
            escapeHtml(listing.id) +
            '">Add</button>';
        return (
          '<article class="product-card">' +
          '<div class="product-thumb tone-' +
          toneFor(listing.id) +
          '"><span class="condition">' +
          escapeHtml(listing.condition) +
          "</span>" +
          escapeHtml(initialsOf(listing.name)) +
          "</div>" +
          '<div class="product-body">' +
          '<span class="product-cat">' +
          escapeHtml(listing.category) +
          "</span>" +
          "<h3>" +
          escapeHtml(listing.name) +
          "</h3>" +
          "<p>" +
          escapeHtml(listing.description) +
          "</p>" +
          '<div class="product-foot"><strong>' +
          escapeHtml(money(listing.price)) +
          "</strong>" +
          addButton +
          "</div>" +
          '<span class="seller">Sold by ' +
          escapeHtml(listing.seller) +
          "</span>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function cartEntries() {
    return Object.keys(state.cart)
      .map(function (id) {
        const listing = state.listings.find(function (candidate) {
          return candidate.id === id;
        });
        const quantity = Number(state.cart[id]) || 0;
        if (!listing || listing.seller === "You" || quantity < 1) return null;
        return { listing: listing, quantity: quantity };
      })
      .filter(Boolean);
  }

  function cartCount() {
    return cartEntries().reduce(function (sum, entry) {
      return sum + entry.quantity;
    }, 0);
  }

  async function refreshCartQuote() {
    cartQuoteRequest += 1;
    const requestId = cartQuoteRequest;
    const entries = cartEntries();
    if (!entries.length) {
      state.cartQuote = { count: 0, totalCents: 0 };
      renderCart();
      return;
    }
    try {
      const quote = await walletRequest("/quote-cart", {
        method: "POST",
        body: JSON.stringify({
          items: entries.map(function (entry) {
            return {
              price: String(entry.listing.price),
              quantity: entry.quantity,
            };
          }),
        }),
      });
      if (requestId !== cartQuoteRequest) return;
      state.cartQuote = {
        count: quote.count,
        totalCents: quote.total_cents,
      };
    } catch (error) {
      if (requestId !== cartQuoteRequest) return;
      state.cartQuote = { count: cartCount(), totalCents: null };
    }
    renderCart();
  }

  function renderCart() {
    const container = $("#cart-items");
    if (!container) return;
    const entries = cartEntries();
    const countElement = $("#cart-count");
    if (countElement) countElement.textContent = String(cartCount());
    const totalElement = $("#cart-total");
    if (totalElement) totalElement.textContent = moneyCents(state.cartQuote.totalCents);

    if (!entries.length) {
      container.innerHTML =
        '<p class="empty-state">Your basket is empty. Add something from the market.</p>';
      return;
    }

    container.innerHTML = entries
      .map(function (entry) {
        return (
          '<div class="cart-row">' +
          "<div><strong>" +
          escapeHtml(entry.listing.name) +
          "</strong><span>" +
          escapeHtml(money(entry.listing.price)) +
          "</span></div>" +
          '<div class="qty">' +
          '<button type="button" data-cart-dec="' +
          escapeHtml(entry.listing.id) +
          '" aria-label="Remove one">−</button>' +
          "<span>" +
          entry.quantity +
          "</span>" +
          '<button type="button" data-cart-inc="' +
          escapeHtml(entry.listing.id) +
          '" aria-label="Add one">+</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderMarketplace() {
    renderMarketCategories();
    renderProducts();
    renderCart();
  }

  async function checkout() {
    const entries = cartEntries();
    if (!entries.length) {
      showToast("Your basket is empty.", "error");
      return;
    }
    const carbonSaved = entries.reduce(function (sum, entry) {
      return sum + carbonForListing(entry.listing) * entry.quantity;
    }, 0);
    try {
      const wallet = await walletRequest("/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: entries.map(function (entry) {
            return {
              price: String(entry.listing.price),
              quantity: entry.quantity,
            };
          }),
        }),
      });
      applyWallet(wallet);
      awardCarbon(carbonSaved);
      state.cart = {};
      state.cartQuote = { count: 0, totalCents: 0 };
      saveState();
      renderMarketplace();
      showToast(
        "Order placed. " +
          moneyCents(wallet.transactions[0].amount_cents) +
          " paid with SD-Wallet. +" +
          formatKg(carbonSaved) +
          " CO₂e saved by reusing items.",
      );
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function openSellModal() {
    const categories = Array.from(
      new Set(
        state.listings.map(function (listing) {
          return listing.category;
        }).concat(["Electronics", "Fashion", "Home", "Kids", "Services"]),
      ),
    );
    openModal({
      eyebrow: "Community marketplace",
      title: "List an item",
      subtitle: "Add an item to the internal marketplace. Demo listing only.",
      submitLabel: "Publish listing",
      body:
        '<label>Item name<input name="name" type="text" maxlength="60" placeholder="What are you selling?" required /></label>' +
        '<div class="form-grid">' +
        '<label>Price (RM)<input name="price" type="number" min="1" step="1" placeholder="0" required /></label>' +
        '<label>Category<select name="category">' +
        categories
          .map(function (category) {
            return "<option>" + escapeHtml(category) + "</option>";
          })
          .join("") +
        "</select></label>" +
        "</div>" +
        '<label>Condition<select name="condition"><option>New</option><option>Like new</option><option>Gently used</option><option>Used</option><option>Service</option></select></label>' +
        '<label>Description<textarea name="description" rows="3" maxlength="240" placeholder="Condition, pickup location and anything else buyers should know." required></textarea></label>',
      onSubmit: function (formData) {
        const price = Number(formData.get("price"));
        if (!Number.isFinite(price) || price <= 0) {
          showToast("Enter a valid price.", "error");
          return;
        }
        const name = String(formData.get("name") || "").trim();
        const description = String(formData.get("description") || "").trim();
        if (!name || !description) {
          showToast("Enter an item name and description.", "error");
          return;
        }
        const listing = {
          id: uid(),
          name: name,
          price: price,
          category: String(formData.get("category") || "Home"),
          condition: String(formData.get("condition") || "Used"),
          seller: "You",
          description: description,
        };
        state.listings.unshift(listing);
        marketCategory = "All";
        marketQuery = "";
        const search = $("#market-search");
        if (search) search.value = "";
        saveState();
        renderMarketplace();
        closeModal();
        showToast("Your listing is live in the community market.");
      },
    });
  }

  function fallbackChargers() {
    const now = new Date().toISOString();
    return [
      {
        id: "oasis-hub-1",
        name: "Oasis Hub · Bay 1",
        location: "Sime Darby Oasis, B1",
        connector: "CCS2",
        power_kw: 120,
        bays_total: 4,
        bays_available: 2,
        price_per_kwh: 0.85,
        price_cents_per_kwh: 85,
        status: "available",
        updated_at: now,
      },
      {
        id: "ara-green-1",
        name: "Ara Green Charge",
        location: "Ara Damansara, P1",
        connector: "Type 2",
        power_kw: 22,
        bays_total: 2,
        bays_available: 0,
        price_per_kwh: 0.65,
        price_cents_per_kwh: 65,
        status: "busy",
        updated_at: now,
      },
      {
        id: "klcc-express",
        name: "KLCC Express",
        location: "Sime Darby HQ, B2",
        connector: "CCS2",
        power_kw: 180,
        bays_total: 6,
        bays_available: 4,
        price_per_kwh: 0.95,
        price_cents_per_kwh: 95,
        status: "available",
        updated_at: now,
      },
      {
        id: "hq-guest",
        name: "HQ Guest Charger",
        location: "Menara Sime Darby, B1",
        connector: "Type 2",
        power_kw: 11,
        bays_total: 1,
        bays_available: 0,
        price_per_kwh: 0.55,
        price_cents_per_kwh: 55,
        status: "offline",
        updated_at: now,
      },
    ];
  }

  async function loadChargers() {
    try {
      const response = await fetch(API_BASE, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid response");
      chargers = data;
      renderEnergy();
      return true;
    } catch (error) {
      if (!chargers.length) {
        chargers = fallbackChargers();
        renderEnergy();
      }
      return false;
    }
  }

  function availableCharger() {
    return chargers.find(function (charger) {
      return charger.status === "available" && Number(charger.bays_available) > 0;
    });
  }

  function activeSession() {
    return state.chargingSessions.find(function (session) {
      return session.status === "active";
    });
  }

  function remainingMinutes(session) {
    const endsAt = new Date(session.endsAt).getTime();
    if (Number.isNaN(endsAt)) return 0;
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 60000));
  }

  function chargePlan(charger, target) {
    const battery = Math.min(100, Math.max(0, Number(state.ev.battery) || 0));
    const capacity = Math.max(1, Number(state.ev.capacityKwh) || 60);
    const energy =
      Math.round(Math.max(0, target - battery) * capacity) / 100;
    const energyWh = Math.max(0, Math.round(energy * 1000));
    const carbon = Math.round(energy * CARBON_PER_EV_KWH * 10) / 10;
    const minutes =
      energy > 0 && Number(charger.power_kw) > 0
        ? Math.max(1, Math.round((energy / Number(charger.power_kw)) * 60))
        : 0;
    return {
      battery: battery,
      capacity: capacity,
      energy: energy,
      energyWh: energyWh,
      carbon: carbon,
      minutes: minutes,
    };
  }

  function chargeQuoteKey(charger, plan) {
    return (
      charger.id +
      ":" +
      charger.price_cents_per_kwh +
      ":" +
      plan.energyWh +
      ":" +
      chargeTarget
    );
  }

  function currentChargeCost(charger, plan) {
    return chargeQuote.key === chargeQuoteKey(charger, plan)
      ? chargeQuote.costCents
      : null;
  }

  function ensureChargeQuote(charger, plan) {
    const key = chargeQuoteKey(charger, plan);
    if (chargeQuote.key === key) return;
    chargeQuote = { key: key, costCents: null };
    walletRequest("/quote-charge", {
      method: "POST",
      body: JSON.stringify({
        energy_wh: plan.energyWh,
        price_cents_per_kwh: charger.price_cents_per_kwh,
      }),
    })
      .then(function (quote) {
        if (chargeQuote.key !== key) return;
        chargeQuote.costCents = quote.cost_cents;
        renderEnergy();
      })
      .catch(function (error) {
        if (chargeQuote.key !== key) return;
        chargeQuote.costCents = null;
        showToast(error.message, "error");
        renderEnergy();
      });
  }

  function estimateMarkup(plan, costCents) {
    if (plan.energy <= 0) {
      return '<p class="muted small">Your battery is already at the selected target.</p>';
    }
    return (
      '<div class="ev-estimate-row"><span>Energy needed</span><strong>' +
      plan.energy.toFixed(1) +
      " kWh</strong></div>" +
      '<div class="ev-estimate-row"><span>Estimated time</span><strong>' +
      plan.minutes +
      " min</strong></div>" +
      '<div class="ev-estimate-row"><span>Cost</span><strong>' +
      escapeHtml(moneyCents(costCents)) +
      "</strong></div>" +
      '<div class="ev-estimate-row"><span>CO₂e saved</span><strong>' +
      formatKg(plan.carbon) +
      "</strong></div>"
    );
  }

  function renderEnergy() {
    const battery = Math.min(100, Math.max(0, Number(state.ev.battery) || 0));
    const capacity = Math.max(1, Number(state.ev.capacityKwh) || 60);
    const range = Math.round(battery * 4.45);
    const running = activeSession();
    const charger = availableCharger();
    const plan = charger ? chargePlan(charger, chargeTarget) : null;
    const costCents = plan ? currentChargeCost(charger, plan) : null;

    const batteryNode = $("[data-ev-battery]");
    if (batteryNode) batteryNode.textContent = Math.round(battery) + "%";
    const batteryBar = $("[data-ev-battery-bar]");
    if (batteryBar) batteryBar.style.width = battery + "%";
    const rangeNode = $("[data-ev-range]");
    if (rangeNode) rangeNode.textContent = range + " km range";
    const capacityNode = $("[data-ev-capacity]");
    if (capacityNode) capacityNode.textContent = capacity + " kWh pack";

    const chargerNode = $("[data-ev-charger]");
    const statusNode = $("#ev-charger-status");
    if (charger) {
      if (chargerNode) {
        chargerNode.textContent =
          charger.name +
          " · " +
          charger.power_kw +
          " kW · " +
          moneyCents(charger.price_cents_per_kwh) +
          "/kWh";
      }
      if (statusNode) statusNode.textContent = "Ready";
    } else {
      if (chargerNode) {
        chargerNode.textContent =
          "No charger available right now. We'll keep checking.";
      }
      if (statusNode) statusNode.textContent = "Unavailable";
    }

    const estimate = $("#ev-estimate");
    const button = $("#start-charging");
    if (running) {
      if (estimate) {
        estimate.hidden = false;
        estimate.innerHTML =
          '<p class="muted small">Charging in progress. Stop the session to settle your SD Points.</p>';
      }
      if (button) {
        button.disabled = true;
        button.textContent = "Charging in progress";
      }
    } else if (charger) {
      if (estimate) {
        estimate.hidden = false;
        estimate.innerHTML = estimateMarkup(plan, costCents);
      }
      if (button) {
        if (plan.energy <= 0) {
          button.disabled = true;
          button.textContent = "Already at " + chargeTarget + "%";
        } else {
          button.disabled = false;
          button.textContent =
            "Start charging · " +
            (costCents === null ? "…" : moneyCents(costCents));
        }
      }
    } else {
      if (estimate) {
        estimate.hidden = true;
        estimate.innerHTML = "";
      }
      if (button) {
        button.disabled = true;
        button.textContent = "No charger available";
      }
    }

    $$("[data-charge-target]").forEach(function (targetButton) {
      targetButton.classList.toggle(
        "is-active",
        Number(targetButton.dataset.chargeTarget) === chargeTarget,
      );
    });

    renderChargingSessions();
    renderHomeEnergy();
    if (!running && charger && plan.energy > 0) {
      ensureChargeQuote(charger, plan);
    }
  }

  async function patchCharger(id, patch) {
    const previous = chargers.find(function (charger) {
      return charger.id === id;
    });
    try {
      const response = await fetch(API_BASE + "/" + id + "/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Update failed");
      const updated = await response.json();
      chargers = chargers.map(function (charger) {
        return charger.id === id ? updated : charger;
      });
    } catch (error) {
      if (previous) {
        chargers = chargers.map(function (charger) {
          if (charger.id !== id) return charger;
          return {
            ...charger,
            ...patch,
            updated_at: new Date().toISOString(),
          };
        });
      }
    }
    renderEnergy();
  }

  async function startCharging() {
    if (activeSession()) {
      showToast("A charging session is already running.", "error");
      return;
    }
    const charger = availableCharger();
    if (!charger) {
      showToast("No charger available right now. Try again shortly.", "error");
      return;
    }
    const plan = chargePlan(charger, chargeTarget);
    if (plan.energy <= 0) {
      showToast(
        "Your battery is already at " + chargeTarget + "%. Choose a higher target.",
        "error",
      );
      return;
    }

    try {
      const wallet = await walletRequest("/charge", {
        method: "POST",
        body: JSON.stringify({
          energy_wh: plan.energyWh,
          price_cents_per_kwh: charger.price_cents_per_kwh,
          title: "EV charging · " + charger.name,
          meta: plan.energy.toFixed(1) + " kWh · " + plan.minutes + " min",
        }),
      });
      const costCents = wallet.transactions[0].amount_cents;
      applyWallet(wallet);

      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + plan.minutes * 60000);
      state.chargingSessions.unshift({
        id: uid(),
        chargerId: charger.id,
        chargerName: charger.name,
        energy: plan.energy,
        costCents: costCents,
        minutes: plan.minutes,
        carbon: plan.carbon,
        target: chargeTarget,
        status: "active",
        startedAt: startedAt.toISOString(),
        endsAt: endsAt.toISOString(),
      });

      const nextBays = Math.max(0, Number(charger.bays_available) - 1);
      await patchCharger(charger.id, {
        status: nextBays > 0 ? "available" : "busy",
        bays_available: nextBays,
      });

      saveState();
      renderEnergy();
      showToast(
        moneyCents(costCents) +
          " paid — charging to " +
          chargeTarget +
          "%. Stop any time to settle rewards.",
      );
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function settleSession(session, showNotice) {
    if (!session || session.status !== "active") return;
    session.status = "complete";
    session.endedAt = new Date().toISOString();

    const capacity = Math.max(1, Number(state.ev.capacityKwh) || 60);
    const gainedPercent = (Number(session.energy) / capacity) * 100;
    state.ev.battery = Math.min(
      100,
      Math.round((Number(state.ev.battery) + gainedPercent) * 10) / 10,
    );

    awardCarbon(Number(session.carbon) || 0);
    const rewarded = await awardSdPoints(
      SD_POINTS_PER_CHARGE,
      "EV charging · " + Number(session.energy).toFixed(1) + " kWh",
    );

    const charger = chargers.find(function (candidate) {
      return candidate.id === session.chargerId;
    });
    if (charger) {
      const bays = Math.min(
        Math.max(0, Number(charger.bays_total) || 0),
        (Number(charger.bays_available) || 0) + 1,
      );
      const status =
        charger.status === "offline"
          ? "offline"
          : bays > 0
            ? "available"
            : "busy";
      await patchCharger(charger.id, {
        status: status,
        bays_available: bays,
      });
    }

    saveState();
    renderWallet();
    renderEnergy();
    if (showNotice && !document.hidden) {
      showToast(
        "Charging complete — +" +
          formatKg(session.carbon) +
          " CO₂e" +
          (rewarded
            ? " and +" + SD_POINTS_PER_CHARGE + " SD Points."
            : " (SD Points could not be recorded)."),
      );
    }
  }

  async function settleDueSessions() {
    const now = Date.now();
    const due = state.chargingSessions.filter(function (session) {
      if (session.status !== "active") return false;
      const endsAt = new Date(session.endsAt).getTime();
      return !Number.isNaN(endsAt) && endsAt <= now;
    });
    if (!due.length) return;
    if (!chargers.length) await loadChargers();
    for (const session of due) {
      await settleSession(session, true);
    }
  }

  async function releaseChargerSlot(chargerId) {
    const charger = chargers.find(function (candidate) {
      return candidate.id === chargerId;
    });
    if (!charger) return;
    const bays = Math.min(
      Math.max(0, Number(charger.bays_total) || 0),
      (Number(charger.bays_available) || 0) + 1,
    );
    const status =
      charger.status === "offline"
        ? "offline"
        : bays > 0
          ? "available"
          : "busy";
    await patchCharger(chargerId, { status: status, bays_available: bays });
  }

  async function stopCharging(sessionId) {
    const session = state.chargingSessions.find(function (candidate) {
      return candidate.id === sessionId && candidate.status === "active";
    });
    if (!session) return;
    await settleSession(session, true);
  }

  function renderChargingSessions() {
    const container = $("#charge-sessions");
    if (!container) return;
    const active = state.chargingSessions.filter(function (session) {
      return session.status === "active";
    });
    const count = $("#charge-count");
    if (count) count.textContent = String(active.length);

    const recent = state.chargingSessions.slice(0, 4);
    if (!recent.length) {
      container.innerHTML =
        '<p class="empty-state">No sessions yet. Start charging above.</p>';
      return;
    }

    const capacity = Math.max(1, Number(state.ev.capacityKwh) || 60);
    container.innerHTML = recent
      .map(function (session) {
        const isActive = session.status === "active";
        const gained = Math.round(
          (Number(session.energy) / capacity) * 1000,
        ) / 10;
        const detail = isActive
          ? "Charging · " +
            Number(session.energy).toFixed(1) +
            " kWh · " +
            remainingMinutes(session) +
            " min left · " +
            moneyCents(session.costCents)
          : Number(session.energy).toFixed(1) +
            " kWh · +" +
            gained +
            "% · " +
            formatKg(session.carbon) +
            " saved";
        return (
          '<div class="session-row">' +
          "<div><strong>" +
          escapeHtml(session.chargerName) +
          "</strong><span>" +
          escapeHtml(detail) +
          "</span></div>" +
          (isActive
            ? '<button class="btn btn-ghost btn-small" type="button" data-stop-charge="' +
              escapeHtml(session.id) +
              '">Stop &amp; settle</button>'
            : '<span class="badge">Complete</span>') +
          "</div>"
        );
      })
      .join("");
  }

  function renderHomeEnergy() {
    const home = state.homeEnergy || {};
    const used = Math.max(0, Number(home.usedToday) || 0);
    const solar = Math.max(0, Number(home.solarToday) || 0);
    const bill = state.walletReady ? Number(state.billDueCents) || 0 : null;

    const usedNode = $("[data-energy-used]");
    if (usedNode) usedNode.textContent = used.toFixed(1) + " kWh";
    const solarNode = $("[data-energy-solar]");
    if (solarNode) solarNode.textContent = solar.toFixed(1) + " kWh";
    const billNode = $("[data-energy-bill]");
    if (billNode) billNode.textContent = moneyCents(bill);
    const dueNode = $("[data-energy-due]");
    if (dueNode) {
      dueNode.textContent =
        bill === null
          ? "Loading wallet…"
          : bill > 0
            ? "Due on the next statement"
            : "Paid with SD-Wallet";
    }

    const payButton = $("#pay-energy-bill");
    if (payButton) {
      payButton.disabled = !(bill > 0);
      payButton.textContent =
        bill === null ? "Loading wallet…" : bill > 0 ? "Pay bill" : "Bill paid";
    }
  }

  async function payEnergyBill() {
    if (!(state.billDueCents > 0)) {
      showToast("No energy bill is due right now.", "error");
      return;
    }
    try {
      const wallet = await walletRequest("/pay-bill", { method: "POST" });
      applyWallet(wallet);
      showToast(
        moneyCents(wallet.transactions[0].amount_cents) +
          " energy bill paid with SD-Wallet.",
      );
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  document.addEventListener("click", async function (event) {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      activateView(nav.dataset.nav);
      return;
    }

    const moneyButton = event.target.closest("[data-money]");
    if (moneyButton) {
      openMoneyModal(moneyButton.dataset.money);
      return;
    }

    const promptButton = event.target.closest("[data-prompt]");
    if (promptButton) {
      sendChat(promptButton.dataset.prompt);
      return;
    }

    const roleButton = event.target.closest("[data-carpool-role]");
    if (roleButton) {
      setCarpoolRole(roleButton.dataset.carpoolRole);
      return;
    }

    const joinButton = event.target.closest("[data-join-ride]");
    if (joinButton) {
      reserveRide(joinButton.dataset.joinRide);
      return;
    }

    const offerButton = event.target.closest("[data-offer-seat]");
    if (offerButton) {
      const ride = state.rides.find(function (candidate) {
        return candidate.id === offerButton.dataset.offerSeat;
      });
      if (!ride || ride.role === "driver" || ride.seats < 1 || ride.offeredByMe) {
        return;
      }
      ride.offeredByMe = true;
      const rewarded = await awardSdPoints(
        SD_POINTS_PER_PASSENGER,
        "Community ride · you offered a seat to a neighbour",
      );
      if (!rewarded) {
        ride.offeredByMe = false;
        renderRides();
        return;
      }
      awardCarpoolPoints("Aisyah Rahman", SD_POINTS_PER_PASSENGER);
      ride.seats -= 1;
      awardCarbon(CARBON_PER_SHARED_RIDE);
      saveState();
      renderRides();
      renderSdPoints();
      renderCarpoolRanking();
      renderWallet();
      showToast(
        "Interest sent — you earned " +
          SD_POINTS_PER_PASSENGER +
          " SD Points and +" +
          formatKg(CARBON_PER_SHARED_RIDE) +
          " CO₂e was saved.",
      );
      return;
    }

    const categoryButton = event.target.closest("[data-market-category]");
    if (categoryButton) {
      marketCategory = categoryButton.dataset.marketCategory;
      renderMarketplace();
      return;
    }

    const addButton = event.target.closest("[data-cart-add]");
    if (addButton) {
      const id = addButton.dataset.cartAdd;
      state.cart[id] = (Number(state.cart[id]) || 0) + 1;
      saveState();
      renderCart();
      refreshCartQuote();
      showToast("Added to your basket.");
      return;
    }

    const increaseButton = event.target.closest("[data-cart-inc]");
    if (increaseButton) {
      const id = increaseButton.dataset.cartInc;
      state.cart[id] = (Number(state.cart[id]) || 0) + 1;
      saveState();
      renderCart();
      refreshCartQuote();
      return;
    }

    const decreaseButton = event.target.closest("[data-cart-dec]");
    if (decreaseButton) {
      const id = decreaseButton.dataset.cartDec;
      const next = (Number(state.cart[id]) || 0) - 1;
      if (next < 1) {
        delete state.cart[id];
      } else {
        state.cart[id] = next;
      }
      saveState();
      renderCart();
      refreshCartQuote();
      return;
    }

    const targetButton = event.target.closest("[data-charge-target]");
    if (targetButton) {
      chargeTarget = Number(targetButton.dataset.chargeTarget);
      renderEnergy();
      return;
    }

    if (event.target.closest("#start-charging")) {
      startCharging();
      return;
    }

    const stopButton = event.target.closest("[data-stop-charge]");
    if (stopButton) {
      stopCharging(stopButton.dataset.stopCharge);
      return;
    }

    if (event.target.closest("[data-close-modal]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  const chatForm = $("#chat-form");
  if (chatForm) {
    chatForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const input = $("#chat-input");
      sendChat(input.value);
      input.value = "";
    });
  }

  $("#reset-chat").addEventListener("click", resetChat);

  const carpoolForm = $("#carpool-form");
  if (carpoolForm) {
    carpoolForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const data = new FormData(carpoolForm);
      const from = String(data.get("from") || "").trim();
      const to = String(data.get("to") || "").trim();
      if (!from || !to) {
        showToast("Enter both a start and end location.", "error");
        return;
      }
      const date = String(data.get("date") || localDateInput());
      if (date < localDateInput()) {
        showToast("Choose today or a future date.", "error");
        return;
      }
      const time = String(data.get("time") || "08:00");
      const seats = Math.min(6, Math.max(1, Number(data.get("seats")) || 1));
      const vehicle = String(data.get("vehicle") || "").trim();

      state.rides.unshift({
        id: uid(),
        role: carpoolRole,
        name: "You",
        initials: "YOU",
        from: from,
        to: to,
        date: date,
        time: time,
        seats: seats,
        vehicle:
          carpoolRole === "driver"
            ? vehicle || "Your vehicle"
            : "Ride request",
        isMine: true,
      });
      saveState();
      renderRides();
      showToast(
        carpoolRole === "driver"
          ? "Ride published to the carpool board."
          : "Ride request posted. Drivers can now offer a seat.",
      );
      carpoolForm.reset();
      $("#carpool-form [name='date']").value = localDateInput();
      $("#carpool-form [name='time']").value = "08:00";
      $("#carpool-form [name='seats']").value = "1";
      setCarpoolRole(carpoolRole);
    });
  }

  $("#open-sell").addEventListener("click", openSellModal);
  $("#checkout").addEventListener("click", checkout);

  const resetDemoButton = $("#reset-demo");
  if (resetDemoButton) {
    resetDemoButton.addEventListener("click", resetDemo);
  }

  const searchInput = $("#market-search");
  if (searchInput) {
    searchInput.addEventListener("input", function (event) {
      marketQuery = event.target.value;
      renderProducts();
    });
  }

  $("#pay-energy-bill").addEventListener("click", payEnergyBill);

  window.addEventListener("hashchange", function () {
    activateView(window.location.hash.replace("#", ""));
  });

  resetChat();
  setCarpoolRole("passenger");
  renderWallet();
  renderRides();
  renderCarpoolRanking();
  renderSdPoints();
  renderMarketplace();
  renderEnergy();
  loadWallet();
  refreshCartQuote();

  const dateField = $("#carpool-form [name='date']");
  const timeField = $("#carpool-form [name='time']");
  if (dateField) {
    dateField.min = localDateInput();
    if (!dateField.value) dateField.value = localDateInput();
  }
  if (timeField && !timeField.value) timeField.value = "08:00";

  activateView(window.location.hash.replace("#", "") || "wallet");

  window.setInterval(function () {
    settleDueSessions();
    if (document.hidden || activeView !== "energy") return;
    fetch(API_BASE, { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Refresh failed");
        return response.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) return;
        chargers = data;
        renderEnergy();
      })
      .catch(function () {
        return null;
      });
  }, 15000);
})();
