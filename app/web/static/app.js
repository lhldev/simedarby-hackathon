(function () {
  "use strict";

  const STORAGE_KEY = "sd-wallet-demo-v2";
  const API_BASE = "/api/v1/restaurants";

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

  const uid = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  const pad = (value) => String(value).padStart(2, "0");

  function daysAgo(days, hour, minute) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

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
    ride: "CR",
    market: "MK",
    reward: "RW",
  };

  const STATUS_LABELS = { open: "Open", busy: "Busy", closed: "Closed" };

  function buildDefaultState() {
    return {
      balance: 3482.6,
      transactions: [
        {
          id: uid(),
          title: "Carpool contribution",
          meta: "Ara Damansara to KLCC · Farah I.",
          amount: 8,
          direction: "out",
          kind: "ride",
          at: daysAgo(0, 8, 12),
        },
        {
          id: uid(),
          title: "Marketplace order",
          meta: "2 items from the community market",
          amount: 83,
          direction: "out",
          kind: "market",
          at: daysAgo(0, 12, 40),
        },
        {
          id: uid(),
          title: "Wallet top-up",
          meta: "FPX · Maybank •• 2841",
          amount: 250,
          direction: "in",
          kind: "topup",
          at: daysAgo(1, 9, 5),
        },
        {
          id: uid(),
          title: "Nasi Lemak Corner",
          meta: "QR payment · Menara Sime Darby",
          amount: 18.5,
          direction: "out",
          kind: "pay",
          at: daysAgo(1, 13, 15),
        },
        {
          id: uid(),
          title: "Expense reimbursement",
          meta: "Travel claim · October",
          amount: 146.4,
          direction: "in",
          kind: "reward",
          at: daysAgo(3, 16, 20),
        },
        {
          id: uid(),
          title: "Transfer to Mei Ling",
          meta: "DuitNow transfer · lunch split",
          amount: 32,
          direction: "out",
          kind: "transfer",
          at: daysAgo(4, 12, 8),
        },
      ],
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
          price: 8,
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
          price: 6,
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
          price: 0,
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
          price: 10,
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
          price: 5,
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
          price: 0,
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
        ...saved,
        transactions: Array.isArray(saved.transactions) ? saved.transactions : defaults.transactions,
        rides: Array.isArray(saved.rides) ? saved.rides : defaults.rides,
        listings: Array.isArray(saved.listings) ? saved.listings : defaults.listings,
        cart: saved.cart && typeof saved.cart === "object" ? saved.cart : {},
      };
    } catch (error) {
      return defaults;
    }
  }

  let state = loadState();
  let activeView = "wallet";
  let carpoolRole = "passenger";
  let marketQuery = "";
  let marketCategory = "All";
  let chatGeneration = 0;
  let chatMessages = [];
  let venues = [];
  let activity = [];

  const venuePhotos = {};

  const VIEW_META = {
    wallet: { eyebrow: "All-in-one", title: "SD-Wallet" },
    bylaws: { eyebrow: "Township", title: "By-Laws Alignment" },
    carpool: { eyebrow: "Community", title: "Carpool" },
    marketplace: { eyebrow: "Community", title: "Marketplace" },
    restaurant: { eyebrow: "Live operations", title: "Restaurant Monitor" },
  };

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  function openModal(config) {
    $("#modal-eyebrow").textContent = config.eyebrow || "SD-Wallet";
    $("#modal-title").textContent = config.title || "";
    $("#modal-subtitle").textContent = config.subtitle || "";
    $("#modal-body").innerHTML = config.body || "";
    $("#modal-submit").textContent = config.submitLabel || "Save";
    modalForm.onsubmit = function (event) {
      event.preventDefault();
      config.onSubmit(new FormData(modalForm));
    };
    modal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(function () {
      const firstField = modal.querySelector("input, select, textarea");
      if (firstField) firstField.focus();
    }, 30);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modalForm.onsubmit = null;
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
    if (target === "restaurant" && !venues.length) {
      loadVenues();
    }
    if (target === "marketplace") {
      renderMarketplace();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function isThisMonth(value) {
    const date = new Date(value);
    const now = new Date();
    return (
      !Number.isNaN(date.getTime()) &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  function renderWallet() {
    $$("[data-balance]").forEach(function (element) {
      element.textContent = money(state.balance);
    });

    const spent = state.transactions
      .filter(function (transaction) {
        return transaction.direction === "out" && isThisMonth(transaction.at);
      })
      .reduce(function (sum, transaction) {
        return sum + Number(transaction.amount || 0);
      }, 0);

    const marketSpend = state.transactions
      .filter(function (transaction) {
        return transaction.kind === "market";
      })
      .reduce(function (sum, transaction) {
        return sum + Number(transaction.amount || 0);
      }, 0);

    const spentElement = $("[data-spent]");
    if (spentElement) spentElement.textContent = money(spent);

    const cashbackElement = $("[data-cashback]");
    if (cashbackElement) cashbackElement.textContent = money(marketSpend * 0.02);

    const pointsElement = $("[data-points]");
    if (pointsElement) {
      pointsElement.textContent = String(720 + Math.round(marketSpend / 10));
    }

    renderTransactions();
  }

  function renderTransactions() {
    const list = $("#tx-list");
    if (!list) return;
    if (!state.transactions.length) {
      list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
      return;
    }
    list.innerHTML = state.transactions
      .slice(0, 8)
      .map(function (transaction) {
        const isIn = transaction.direction === "in";
        const sign = isIn ? "+" : "-";
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
          escapeHtml(money(transaction.amount)) +
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
      onSubmit: function (formData) {
        const amount = Number(formData.get("amount"));
        if (!Number.isFinite(amount) || amount <= 0) {
          showToast("Enter a valid amount.", "error");
          return;
        }
        if (config.direction === "out" && amount > state.balance) {
          showToast("Insufficient wallet balance.", "error");
          return;
        }
        const recipient = String(formData.get("recipient") || "").trim();
        const note = String(formData.get("note") || "").trim();
        const title =
          mode === "topup"
            ? "Wallet top-up"
            : mode === "transfer"
              ? "Transfer to " + recipient
              : note || "Wallet payment";

        state.balance += config.direction === "in" ? amount : -amount;
        state.transactions.unshift({
          id: uid(),
          title: title,
          meta: note && mode !== "pay" ? note : config.meta,
          amount: amount,
          direction: config.direction,
          kind: config.kind,
          at: new Date().toISOString(),
        });
        saveState();
        renderWallet();
        closeModal();
        showToast(
          mode === "topup"
            ? money(amount) + " added to SD-Wallet."
            : money(amount) + " paid from SD-Wallet.",
        );
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

    const generation = chatGeneration;
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
        const price = Number(ride.price) || 0;
        const seatText = isDriver
          ? ride.seats + (ride.seats === 1 ? " seat left" : " seats left")
          : ride.seats + (ride.seats === 1 ? " seat needed" : " seats needed");
        let action = "";

        if (ride.isMine) {
          action = '<button class="btn btn-ghost btn-small" type="button" disabled>Your post</button>';
        } else if (isDriver) {
          action =
            '<button class="btn btn-primary btn-small" type="button" data-join-ride="' +
            escapeHtml(ride.id) +
            '"' +
            (ride.seats < 1 ? " disabled" : "") +
            ">" +
            (ride.seats < 1 ? "Full" : "Reserve seat" + (price ? " · " + money(price) : "")) +
            "</button>";
        } else {
          action =
            '<button class="btn btn-navy btn-small" type="button" data-offer-seat="' +
            escapeHtml(ride.id) +
            '">Offer a seat</button>';
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
          '<div class="ride-foot"><span class="price">' +
          (price ? money(price) + " / seat" : "No contribution set") +
          "</span>" +
          action +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function reserveRide(id) {
    const ride = state.rides.find(function (candidate) {
      return candidate.id === id;
    });
    if (!ride || ride.role !== "driver" || ride.seats < 1) return;
    const price = Number(ride.price) || 0;
    if (price > state.balance) {
      showToast("Insufficient wallet balance for this contribution.", "error");
      return;
    }

    ride.seats -= 1;
    if (price > 0) {
      state.balance -= price;
      state.transactions.unshift({
        id: uid(),
        title: "Carpool · " + ride.from + " to " + ride.to,
        meta: "Seat reserved with " + ride.name,
        amount: price,
        direction: "out",
        kind: "ride",
        at: new Date().toISOString(),
      });
    }
    saveState();
    renderRides();
    renderWallet();
    showToast(
      ride.seats > 0
        ? "Seat reserved. " + ride.seats + " seat(s) still available."
        : "Seat reserved. This ride is now full.",
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
          '</strong><button class="btn btn-primary btn-small" type="button" data-cart-add="' +
          escapeHtml(listing.id) +
          '">Add</button></div>' +
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
        if (!listing || quantity < 1) return null;
        return { listing: listing, quantity: quantity };
      })
      .filter(Boolean);
  }

  function cartTotals() {
    return cartEntries().reduce(
      function (result, entry) {
        result.count += entry.quantity;
        result.total += Number(entry.listing.price) * entry.quantity;
        return result;
      },
      { count: 0, total: 0 },
    );
  }

  function renderCart() {
    const container = $("#cart-items");
    if (!container) return;
    const entries = cartEntries();
    const totals = cartTotals();
    const countElement = $("#cart-count");
    if (countElement) countElement.textContent = String(totals.count);
    const totalElement = $("#cart-total");
    if (totalElement) totalElement.textContent = money(totals.total);

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

  function checkout() {
    const totals = cartTotals();
    if (!totals.count) {
      showToast("Your basket is empty.", "error");
      return;
    }
    if (totals.total > state.balance) {
      showToast("Insufficient wallet balance for this order.", "error");
      return;
    }
    state.balance -= totals.total;
    state.transactions.unshift({
      id: uid(),
      title: "Marketplace order",
      meta: totals.count + " item(s) from the community market",
      amount: totals.total,
      direction: "out",
      kind: "market",
      at: new Date().toISOString(),
    });
    state.cart = {};
    saveState();
    renderMarketplace();
    renderWallet();
    showToast("Order placed. " + money(totals.total) + " paid with SD-Wallet.");
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
        state.listings.unshift({
          id: uid(),
          name: String(formData.get("name") || "").trim(),
          price: price,
          category: String(formData.get("category") || "Home"),
          condition: String(formData.get("condition") || "Used"),
          seller: "You",
          description: String(formData.get("description") || "").trim(),
        });
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

  function fallbackVenues() {
    const now = new Date().toISOString();
    return [
      {
        id: "nasi-lemak-corner",
        name: "Nasi Lemak Corner",
        cuisine: "Malaysian",
        location: "Menara Sime Darby, Level 2",
        capacity: 48,
        status: "open",
        tables_available: 17,
        wait_minutes: 5,
        updated_at: now,
      },
      {
        id: "kopi-and-co",
        name: "Kopi & Co.",
        cuisine: "Cafe",
        location: "Ara Damansara, Tower B",
        capacity: 32,
        status: "busy",
        tables_available: 4,
        wait_minutes: 18,
        updated_at: now,
      },
      {
        id: "the-grill-house",
        name: "The Grill House",
        cuisine: "Western",
        location: "Sime Darby HQ, KLCC",
        capacity: 60,
        status: "open",
        tables_available: 23,
        wait_minutes: 8,
        updated_at: now,
      },
      {
        id: "bites-by-chef-nadia",
        name: "Bites by Chef Nadia",
        cuisine: "Fusion",
        location: "Sime Darby Oasis, Ground Floor",
        capacity: 40,
        status: "closed",
        tables_available: 0,
        wait_minutes: 0,
        updated_at: now,
      },
    ];
  }

  async function loadVenues() {
    try {
      const response = await fetch(API_BASE, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Request failed");
      venues = await response.json();
      renderVenues();
    } catch (error) {
      if (!venues.length) {
        venues = fallbackVenues();
        renderVenues();
      }
    }
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function renderVenues() {
    const grid = $("#venue-grid");
    if (!grid) return;
    if (!venues.length) {
      grid.innerHTML = '<p class="empty-state">Loading restaurant availability…</p>';
      return;
    }

    grid.innerHTML = venues
      .map(function (venue) {
        const photos = venuePhotos[venue.id] || [];
        const freePercent = venue.capacity
          ? Math.round((venue.tables_available / venue.capacity) * 100)
          : 0;
        const occupied = Math.max(0, venue.capacity - venue.tables_available);
        const visual = photos.length
          ? '<img src="' + photos[0] + '" alt="Photo of ' + escapeHtml(venue.name) + '" />'
          : '<span class="venue-initials">' + escapeHtml(initialsOf(venue.name)) + "</span>";
        const photoRow = photos.length
          ? '<div class="photo-row">' +
            photos
              .map(function (photo, index) {
                return (
                  '<span class="photo-thumb"><img src="' +
                  photo +
                  '" alt="Restaurant photo ' +
                  (index + 1) +
                  '" /><button type="button" data-remove-photo="' +
                  escapeHtml(venue.id) +
                  '" data-photo-index="' +
                  index +
                  '" aria-label="Remove photo">×</button></span>'
                );
              })
              .join("") +
            "</div>"
          : "";

        return (
          '<article class="venue-card">' +
          '<div class="venue-visual tone-' +
          toneFor(venue.id) +
          '">' +
          visual +
          '<span class="status-badge ' +
          escapeHtml(venue.status) +
          '">' +
          escapeHtml(statusLabel(venue.status)) +
          "</span>" +
          "</div>" +
          '<div class="venue-body">' +
          '<div class="venue-head"><h3>' +
          escapeHtml(venue.name) +
          "</h3><p>" +
          escapeHtml(venue.cuisine) +
          " · " +
          escapeHtml(venue.location) +
          "</p></div>" +
          '<div class="availability-row">' +
          "<div><strong>" +
          venue.tables_available +
          "</strong><span>tables free</span></div>" +
          "<div><strong>" +
          venue.wait_minutes +
          "</strong><span>min wait</span></div>" +
          "<div><strong>" +
          venue.capacity +
          "</strong><span>seats</span></div>" +
          "</div>" +
          '<div class="capacity-bar"><span style="width:' +
          freePercent +
          '%"></span></div>' +
          '<p class="venue-updated">Updated ' +
          escapeHtml(formatRelative(venue.updated_at)) +
          " · " +
          occupied +
          " seats occupied</p>" +
          photoRow +
          '<div class="status-toggle" role="group" aria-label="Availability status">' +
          ["open", "busy", "closed"]
            .map(function (status) {
              return (
                '<button type="button" data-venue-status="' +
                escapeHtml(venue.id) +
                '" data-status="' +
                status +
                '" class="' +
                (venue.status === status ? "is-active" : "") +
                '">' +
                statusLabel(status) +
                "</button>"
              );
            })
            .join("") +
          "</div>" +
          '<div class="venue-actions">' +
          '<button class="btn btn-ghost btn-small" type="button" data-upload-photo="' +
          escapeHtml(venue.id) +
          '">Upload photos</button>' +
          '<button class="btn btn-navy btn-small" type="button" data-edit-venue="' +
          escapeHtml(venue.id) +
          '">Update availability</button>' +
          '<button class="btn btn-ghost btn-small" type="button" data-venue-api="' +
          escapeHtml(venue.id) +
          '">API</button>' +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    renderActivity();
    updateApiSnippet();
  }

  function pushActivity(text) {
    activity.unshift({ at: new Date().toISOString(), text: text });
    activity = activity.slice(0, 12);
    renderActivity();
  }

  function renderActivity() {
    const list = $("#venue-activity");
    if (!list) return;
    if (!activity.length) {
      list.innerHTML = '<li><p class="empty-state">No updates yet.</p></li>';
      return;
    }
    list.innerHTML = activity
      .slice(0, 6)
      .map(function (entry) {
        return (
          '<li><span class="activity-dot"></span><div><p>' +
          escapeHtml(entry.text) +
          "</p><span>" +
          escapeHtml(formatRelative(entry.at)) +
          "</span></div></li>"
        );
      })
      .join("");
  }

  function updateApiSnippet() {
    const snippet = $("#api-snippet");
    if (!snippet) return;
    const id = venues.length ? venues[0].id : "<venue-id>";
    snippet.textContent =
      'curl -X PATCH "' +
      window.location.origin +
      API_BASE +
      "/" +
      id +
      '/availability" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\"status\":\"busy\",\"tables_available\":4,\"wait_minutes\":20}'";
  }

  async function patchVenue(id, patch) {
    const previous = venues.find(function (venue) {
      return venue.id === id;
    });
    try {
      const response = await fetch(API_BASE + "/" + id + "/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Update failed");
      const updated = await response.json();
      venues = venues.map(function (venue) {
        return venue.id === id ? updated : venue;
      });
    } catch (error) {
      if (previous) {
        venues = venues.map(function (venue) {
          if (venue.id !== id) return venue;
          return {
            ...venue,
            ...patch,
            updated_at: new Date().toISOString(),
          };
        });
      }
      showToast("Live API unavailable — showing a local demo update.", "error");
    }
    renderVenues();
  }

  function setVenueStatus(id, status) {
    const venue = venues.find(function (candidate) {
      return candidate.id === id;
    });
    if (!venue || venue.status === status) return;

    const patch = {
      status: status,
      tables_available: venue.tables_available,
      wait_minutes: venue.wait_minutes,
    };

    if (status === "closed") {
      patch.tables_available = 0;
      patch.wait_minutes = 0;
    } else if (status === "open") {
      if (venue.status === "closed" || venue.tables_available < 1) {
        patch.tables_available = Math.max(1, Math.round(venue.capacity * 0.3));
        patch.wait_minutes = 5;
      } else {
        patch.wait_minutes = Math.min(venue.wait_minutes, 10);
      }
    } else if (status === "busy") {
      patch.wait_minutes = Math.max(venue.wait_minutes, 15);
      if (venue.tables_available < 1) {
        patch.tables_available = Math.max(1, Math.round(venue.capacity * 0.1));
      }
    }

    pushActivity(venue.name + " marked " + status + " by the owner.");
    showToast(venue.name + " is now " + status + ".");
    patchVenue(id, patch);
  }

  function openVenueModal(id) {
    const venue = venues.find(function (candidate) {
      return candidate.id === id;
    });
    if (!venue) return;
    openModal({
      eyebrow: "Restaurant monitor",
      title: "Update availability",
      subtitle: "Publish live numbers for " + venue.name + ". Capacity: " + venue.capacity + " seats.",
      submitLabel: "Publish update",
      body:
        '<label>Status<select name="status">' +
        ["open", "busy", "closed"]
          .map(function (status) {
            return (
              '<option value="' +
              status +
              '"' +
              (venue.status === status ? " selected" : "") +
              ">" +
              statusLabel(status) +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        '<div class="form-grid">' +
        '<label>Tables available<input name="tables_available" type="number" min="0" max="' +
        venue.capacity +
        '" value="' +
        venue.tables_available +
        '" required /></label>' +
        '<label>Wait (minutes)<input name="wait_minutes" type="number" min="0" value="' +
        venue.wait_minutes +
        '" required /></label>' +
        "</div>" +
        '<p class="muted small">This simulates the owner automation API and refreshes every connected dashboard.</p>',
      onSubmit: function (formData) {
        const status = String(formData.get("status") || "open");
        const tables = Number(formData.get("tables_available"));
        const wait = Number(formData.get("wait_minutes"));
        if (!Number.isFinite(tables) || tables < 0 || tables > venue.capacity) {
          showToast("Tables must be between 0 and " + venue.capacity + ".", "error");
          return;
        }
        if (!Number.isFinite(wait) || wait < 0) {
          showToast("Enter a valid wait time.", "error");
          return;
        }
        pushActivity(venue.name + " updated to " + tables + " free tables.");
        patchVenue(id, {
          status: status,
          tables_available: tables,
          wait_minutes: wait,
        });
        closeModal();
        showToast(venue.name + " availability published.");
      },
    });
  }

  function openPhotoPicker(id) {
    const venue = venues.find(function (candidate) {
      return candidate.id === id;
    });
    if (!venue) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.addEventListener("change", function () {
      const files = Array.from(input.files || []).slice(0, 3);
      if (!files.length) return;
      let pending = files.length;
      files.forEach(function (file) {
        const reader = new FileReader();
        reader.addEventListener("load", function () {
          if (typeof reader.result === "string") {
            venuePhotos[id] = (venuePhotos[id] || []).concat(reader.result).slice(0, 4);
          }
          pending -= 1;
          if (pending === 0) {
            renderVenues();
            pushActivity("New photos uploaded for " + venue.name + ".");
            showToast("Photos added to the restaurant listing.");
          }
        });
        reader.readAsDataURL(file);
      });
    });
    input.click();
  }

  function removePhoto(id, index) {
    if (!venuePhotos[id]) return;
    venuePhotos[id].splice(index, 1);
    renderVenues();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard.");
      return;
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Copied to clipboard.");
    }
  }

  function openApiModal(id) {
    const venue = venues.find(function (candidate) {
      return candidate.id === id;
    });
    if (!venue) return;
    const endpoint = window.location.origin + API_BASE + "/" + venue.id + "/availability";
    const snippet =
      'curl -X PATCH "' +
      endpoint +
      '" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\"status\":\"busy\",\"tables_available\":4,\"wait_minutes\":20}'";
    openModal({
      eyebrow: "Owner automation",
      title: "Availability API",
      subtitle: venue.name + " · one authenticated-free demo endpoint",
      submitLabel: "Copy curl",
      body:
        '<p class="muted small">Send a PATCH request from the POS or kitchen system. The dashboard polls every 15 seconds.</p>' +
        '<pre class="code-block">' +
        escapeHtml(snippet) +
        "</pre>" +
        '<p class="muted small">Validation: tables_available must be between 0 and the venue capacity. Response includes the updated timestamp.</p>',
      onSubmit: function () {
        copyText(snippet);
        closeModal();
      },
    });
  }

  document.addEventListener("click", function (event) {
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
      showToast("Interest sent. The passenger will see your offer on the ride board.");
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
      showToast("Added to your basket.");
      return;
    }

    const increaseButton = event.target.closest("[data-cart-inc]");
    if (increaseButton) {
      const id = increaseButton.dataset.cartInc;
      state.cart[id] = (Number(state.cart[id]) || 0) + 1;
      saveState();
      renderCart();
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
      return;
    }

    const statusButton = event.target.closest("[data-venue-status]");
    if (statusButton) {
      setVenueStatus(statusButton.dataset.venueStatus, statusButton.dataset.status);
      return;
    }

    const uploadButton = event.target.closest("[data-upload-photo]");
    if (uploadButton) {
      openPhotoPicker(uploadButton.dataset.uploadPhoto);
      return;
    }

    const removeButton = event.target.closest("[data-remove-photo]");
    if (removeButton) {
      removePhoto(removeButton.dataset.removePhoto, Number(removeButton.dataset.photoIndex));
      return;
    }

    const editButton = event.target.closest("[data-edit-venue]");
    if (editButton) {
      openVenueModal(editButton.dataset.editVenue);
      return;
    }

    const apiButton = event.target.closest("[data-venue-api]");
    if (apiButton) {
      openApiModal(apiButton.dataset.venueApi);
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
      const time = String(data.get("time") || "08:00");
      const seats = Math.min(6, Math.max(1, Number(data.get("seats")) || 1));
      const price = Math.max(0, Number(data.get("price")) || 0);
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
        price: carpoolRole === "driver" ? price : 0,
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

  const searchInput = $("#market-search");
  if (searchInput) {
    searchInput.addEventListener("input", function (event) {
      marketQuery = event.target.value;
      renderProducts();
    });
  }

  $("#refresh-venues").addEventListener("click", function () {
    loadVenues();
    showToast("Availability refreshed.");
  });

  $("#copy-api").addEventListener("click", function () {
    copyText($("#api-snippet").textContent);
  });

  $("#open-api-modal").addEventListener("click", function () {
    if (venues.length) {
      openApiModal(venues[0].id);
    }
  });

  window.addEventListener("hashchange", function () {
    activateView(window.location.hash.replace("#", ""));
  });

  activity = [
    {
      at: new Date().toISOString(),
      text: "Live availability feed connected to the restaurant API.",
    },
  ];

  resetChat();
  setCarpoolRole("passenger");
  renderWallet();
  renderRides();
  renderMarketplace();
  renderActivity();
  updateApiSnippet();

  const dateField = $("#carpool-form [name='date']");
  const timeField = $("#carpool-form [name='time']");
  if (dateField && !dateField.value) dateField.value = localDateInput();
  if (timeField && !timeField.value) timeField.value = "08:00";

  activateView(window.location.hash.replace("#", "") || "wallet");

  window.setInterval(function () {
    if (activeView !== "restaurant") return;
    fetch(API_BASE, { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Refresh failed");
        return response.json();
      })
      .then(function (data) {
        venues = data;
        renderVenues();
      })
      .catch(function () {
        return null;
      });
  }, 15000);
})();
