(function () {
  "use strict";

  const PRODUCTS_KEY = "subscribai.products.v1";
  const FREEBIES_KEY = "subscribai.freebies.v1";
  const CART_KEY = "subscribai.cart.v1";
  const SETTINGS_KEY = "subscribai.admin.settings.v1";
  const COUPONS_KEY = "subscribai.admin.coupons.v1";
  const APPLIED_COUPON_KEY = "subscribai.cart.coupon.v1";
  const EXCHANGE_RATE_KEY = "subscribai.exchange.usd-pkr.v1";
  const TRAFFIC_SOURCE_KEY = "subscribai.traffic.source.v1";
  const TRAFFIC_SUMMARY_KEY = "subscribai.traffic.summary.v1";
  const ORDERS_KEY = "subscribai.admin.orders.v1";
  const CUSTOMERS_KEY = "subscribai.admin.customers.v1";
  const EXCHANGE_RATE_ENDPOINT = "https://open.er-api.com/v6/latest/USD";
  const DEFAULT_USD_PKR_RATE = 280;
  let pageLoaderHidden = false;
  let exchangeRateState = {
    usdToPkr: 0,
    requested: false
  };

  const defaultSocialLinks = {
    instagramUrl: "https://www.instagram.com/subscribai",
    facebookUrl: "https://www.facebook.com/subscribai",
    whatsappUrl: "",
    linkedinUrl: "https://www.linkedin.com/company/subscribai"
  };

  const defaultSiteSettings = {
    ...defaultSocialLinks,
    currency: "USD",
    usdPkrRate: DEFAULT_USD_PKR_RATE
  };

  const defaultCoupons = [
    {
      id: "welcome10",
      code: "WELCOME10",
      discount: 10,
      quantity: 100,
      expires: "2026-12-31",
      status: "active"
    }
  ];

  const defaultProducts = [
    {
      id: "chatgpt-plus-plan",
      name: "ChatGPT Plus Plan",
      tag: "Popular",
      category: "AI Subscription",
      price: "$19",
      description: "Fast AI support for writing, research, coding, planning, and daily productivity.",
      details: "A premium AI assistant plan for creators, students, freelancers, and teams that need reliable daily support for content, research, code, and planning.",
      features: ["Writing and research workflows", "Coding and debugging help", "Planning and brainstorming support", "Great for daily productivity"],
      mediaClass: "media-green",
      iconClass: "fa-solid fa-robot",
      status: "active"
    },
    {
      id: "ai-image-studio",
      name: "AI Image Studio",
      tag: "Creator",
      category: "Creative Tool",
      price: "$12",
      description: "Generate visuals, thumbnails, brand concepts, mockups, and campaign graphics.",
      details: "A creator-focused visual toolkit for turning prompts into polished campaign assets, thumbnails, brand concepts, and social graphics.",
      features: ["Thumbnail and ad creative prompts", "Brand concept generation", "Mockup-ready visual workflows", "Useful for creators and marketers"],
      mediaClass: "media-blue",
      iconClass: "fa-solid fa-image",
      status: "active"
    },
    {
      id: "canva-pro-access",
      name: "Canva Pro Access",
      tag: "Design",
      category: "Design Subscription",
      price: "$8",
      description: "Premium templates, brand kits, and creator assets for polished social content.",
      details: "Design access for customers who need premium templates, fast layout creation, branded social posts, and everyday creative resources.",
      features: ["Premium design templates", "Creator-friendly assets", "Brand kit workflows", "Fast social content production"],
      mediaClass: "media-pink",
      iconClass: "fa-solid fa-video",
      status: "active"
    },
    {
      id: "automation-starter-pack",
      name: "Automation Starter Pack",
      tag: "Business",
      category: "Automation",
      price: "$29",
      description: "Templates for sales follow-up, customer support, scheduling, and marketing ops.",
      details: "A practical automation pack for small teams that want reusable templates for recurring business tasks and customer workflows.",
      features: ["Sales follow-up templates", "Support workflow checklists", "Scheduling automations", "Marketing operations starters"],
      mediaClass: "media-orange",
      iconClass: "fa-solid fa-network-wired",
      status: "active"
    },
    {
      id: "copywriting-prompt-vault",
      name: "Copywriting Prompt Vault",
      tag: "Writing",
      category: "Prompt Pack",
      price: "$15",
      description: "Ready prompt systems for ads, emails, landing pages, product copy, and scripts.",
      details: "A structured prompt library for writing persuasive copy faster across marketing, ecommerce, email, landing pages, and video scripts.",
      features: ["Ad copy prompts", "Email campaign prompts", "Landing page frameworks", "Product description systems"],
      mediaClass: "media-blue",
      iconClass: "fa-solid fa-file-lines",
      status: "active"
    },
    {
      id: "ai-workspace-templates",
      name: "AI Workspace Templates",
      tag: "Productivity",
      category: "Templates",
      price: "$18",
      description: "Planning dashboards, content calendars, SOPs, and task workflows for teams.",
      details: "Workspace templates for organizing AI-assisted content, operations, tasks, SOPs, and team planning in one repeatable system.",
      features: ["Content planning dashboards", "Task workflow templates", "SOP structures", "Team planning layouts"],
      mediaClass: "media-green",
      iconClass: "fa-solid fa-table-cells",
      status: "active"
    },
    {
      id: "prompt-engineering-masterclass",
      name: "Prompt Engineering Masterclass",
      tag: "Course",
      category: "Learning",
      price: "$24",
      description: "Learn reusable prompt frameworks for content, automation, coding, and research.",
      details: "A beginner-friendly learning product for customers who want to understand how to build better prompts and repeatable AI workflows.",
      features: ["Prompt fundamentals", "Reusable prompt formulas", "Workflow examples", "Content and research lessons"],
      mediaClass: "media-pink",
      iconClass: "fa-solid fa-graduation-cap",
      status: "active"
    },
    {
      id: "setup-assistance",
      name: "Setup Assistance",
      tag: "Support",
      category: "Service",
      price: "$35",
      description: "Guided onboarding for subscriptions, workspaces, automations, and team access.",
      details: "Hands-on setup support for customers who want help getting their tools, resources, accounts, or team workflows ready.",
      features: ["Tool onboarding guidance", "Workspace setup help", "Automation setup support", "Team access assistance"],
      mediaClass: "media-orange",
      iconClass: "fa-solid fa-screwdriver-wrench",
      status: "active"
    }
  ];

  const defaultFreebies = [
    {
      id: "prompt-engineering-starter-guide",
      title: "Prompt Engineering Starter Guide",
      tag: "Guide",
      category: "Prompting",
      price: "Free",
      description: "A beginner guide for writing better AI prompts and reusable prompt systems.",
      link: "contact.html",
      mediaClass: "media-orange",
      iconClass: "fa-solid fa-file-lines",
      status: "active"
    },
    {
      id: "social-media-content-calendar",
      title: "Social Media Content Calendar",
      tag: "Template",
      category: "Planning",
      price: "Free",
      description: "A ready calendar for planning posts, campaigns, captions, and creative ideas.",
      link: "contact.html",
      mediaClass: "media-green",
      iconClass: "fa-solid fa-table-cells",
      status: "active"
    },
    {
      id: "ai-productivity-mini-course",
      title: "AI Productivity Mini Course",
      tag: "Course",
      category: "Learning",
      price: "Free",
      description: "A short course for building practical AI workflows for daily work.",
      link: "contact.html",
      mediaClass: "media-blue",
      iconClass: "fa-solid fa-graduation-cap",
      status: "active"
    },
    {
      id: "automation-checklist",
      title: "Automation Checklist",
      tag: "Checklist",
      category: "Automation",
      price: "Free",
      description: "A simple checklist for spotting repeatable tasks and building automations.",
      link: "contact.html",
      mediaClass: "media-pink",
      iconClass: "fa-solid fa-screwdriver-wrench",
      status: "active"
    },
    {
      id: "thumbnail-prompt-pack",
      title: "Thumbnail Prompt Pack",
      tag: "Prompt Pack",
      category: "Creative",
      price: "Free",
      description: "Prompt ideas for thumbnails, visuals, content hooks, and campaign graphics.",
      link: "contact.html",
      mediaClass: "media-blue",
      iconClass: "fa-solid fa-image",
      status: "active"
    },
    {
      id: "client-onboarding-workflow",
      title: "Client Onboarding Workflow",
      tag: "Workflow",
      category: "Business",
      price: "Free",
      description: "A free workflow for client intake, follow-up, handoff, and support notes.",
      link: "contact.html",
      mediaClass: "media-green",
      iconClass: "fa-solid fa-network-wired",
      status: "active"
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value) {
    return String(value || "product")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";
  }

  function normalizeImages(item, fallbackAlt) {
    const source = Array.isArray(item.images) ? item.images : [];
    const images = source
      .map((image) => ({
        data: image && (image.data || image.imageData || image.src) ? String(image.data || image.imageData || image.src) : "",
        name: image && image.name ? String(image.name) : "",
        alt: image && image.alt ? String(image.alt) : fallbackAlt
      }))
      .filter((image) => image.data)
      .slice(0, 3);

    if (!images.length && item.imageData) {
      images.push({
        data: item.imageData,
        name: item.imageName || "",
        alt: item.imageAlt || fallbackAlt
      });
    }

    return images;
  }

  function normalizeProduct(product) {
    const images = normalizeImages(product, product.name || "Product image");
    const primaryImage = images[0] || {};
    const hasPrivatePrice = Object.prototype.hasOwnProperty.call(product, "privatePrice");
    const hasSharedPrice = Object.prototype.hasOwnProperty.call(product, "sharedPrice");
    const hasPrivateAvailable = Object.prototype.hasOwnProperty.call(product, "privateAvailable");
    const hasSharedAvailable = Object.prototype.hasOwnProperty.call(product, "sharedAvailable");
    const price = product.price == null ? "" : String(product.price);
    const privatePrice = hasPrivatePrice ? String(product.privatePrice || "") : price;
    const sharedPrice = hasSharedPrice ? String(product.sharedPrice || "") : price;
    const normalized = {
      id: slugify(product.id || product.name),
      name: product.name || "Untitled Product",
      tag: product.tag || "New",
      category: product.category || "AI Product",
      price,
      privatePrice,
      sharedPrice,
      privateAvailable: hasPrivateAvailable ? product.privateAvailable !== false : Boolean(privatePrice.trim()),
      sharedAvailable: hasSharedAvailable ? product.sharedAvailable !== false : Boolean(sharedPrice.trim()),
      description: product.description || "",
      details: product.details || product.description || "",
      privateDescription: product.privateDescription || product.description || "",
      privateDetails: product.privateDetails || product.details || product.description || "",
      sharedDescription: product.sharedDescription || product.description || "",
      sharedDetails: product.sharedDetails || product.details || product.description || "",
      features: Array.isArray(product.features) ? product.features.filter(Boolean) : [],
      mediaClass: product.mediaClass || "media-orange",
      iconClass: product.iconClass || "fa-solid fa-robot",
      images,
      imageData: primaryImage.data || "",
      imageName: primaryImage.name || product.imageName || "",
      imageAlt: product.imageAlt || primaryImage.alt || product.name || "Product image",
      imageFit: product.imageFit === "cover" ? "cover" : "contain",
      imageBgColor: /^#[0-9a-f]{6}$/i.test(product.imageBgColor || "") ? product.imageBgColor : "#ffffff",
      brand: product.brand || "",
      plan: product.plan || "",
      duration: product.duration || "",
      activation: product.activation || "",
      access: product.access || "",
      warranty: product.warranty || "",
      status: product.status === "draft" ? "draft" : "active"
    };
    return normalized;
  }

  function normalizeFreebie(freebie) {
    const images = normalizeImages(freebie, freebie.title || freebie.name || "Freebie image");
    const primaryImage = images[0] || {};
    return {
      id: slugify(freebie.id || freebie.title || freebie.name || "freebie"),
      title: freebie.title || freebie.name || "Untitled Freebie",
      tag: freebie.tag || freebie.type || "Free",
      category: freebie.category || "Resource",
      price: freebie.price || "Free",
      description: freebie.description || "",
      link: freebie.link || "contact.html",
      mediaClass: freebie.mediaClass || "media-green",
      iconClass: freebie.iconClass || "fa-solid fa-file-lines",
      images,
      imageData: primaryImage.data || "",
      imageName: primaryImage.name || freebie.imageName || "",
      imageAlt: freebie.imageAlt || primaryImage.alt || freebie.title || freebie.name || "Freebie image",
      imageFit: freebie.imageFit === "cover" ? "cover" : "contain",
      imageBgColor: /^#[0-9a-f]{6}$/i.test(freebie.imageBgColor || "") ? freebie.imageBgColor : "#ffffff",
      status: freebie.status === "draft" ? "draft" : "active"
    };
  }

  function normalizeCoupon(coupon) {
    const code = String(coupon.code || coupon.id || "WELCOME10").trim().toUpperCase().replace(/\s+/g, "");
    return {
      id: slugify(coupon.id || code),
      code,
      discount: Math.max(0, Math.min(100, Number(coupon.discount || 0))),
      quantity: Math.max(0, Math.floor(Number(coupon.quantity || 0))),
      expires: coupon.expires || "",
      status: coupon.status === "draft" ? "draft" : "active"
    };
  }

  function getProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem(PRODUCTS_KEY));
      if (Array.isArray(stored)) {
        return stored.map(normalizeProduct);
      }
    } catch (error) {
      console.warn("Could not read saved products.", error);
    }
    return clone(defaultProducts).map(normalizeProduct);
  }

  function saveProducts(products) {
    const normalized = products.map(normalizeProduct);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetProducts() {
    localStorage.removeItem(PRODUCTS_KEY);
    return getProducts();
  }

  function getActiveProducts() {
    return getProducts().filter((product) => product.status !== "draft");
  }

  function findProduct(id) {
    return getProducts().find((product) => product.id === id);
  }

  function getCoupons() {
    try {
      const stored = JSON.parse(localStorage.getItem(COUPONS_KEY));
      if (Array.isArray(stored)) {
        return stored.map(normalizeCoupon);
      }
    } catch (error) {
      console.warn("Could not read saved coupons.", error);
    }
    return clone(defaultCoupons).map(normalizeCoupon);
  }

  function saveCoupons(coupons) {
    const normalized = coupons.map(normalizeCoupon);
    localStorage.setItem(COUPONS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetCoupons() {
    localStorage.removeItem(COUPONS_KEY);
    return getCoupons();
  }

  function getFreebies() {
    try {
      const stored = JSON.parse(localStorage.getItem(FREEBIES_KEY));
      if (Array.isArray(stored)) {
        return stored.map(normalizeFreebie);
      }
    } catch (error) {
      console.warn("Could not read saved freebies.", error);
    }
    return clone(defaultFreebies).map(normalizeFreebie);
  }

  function saveFreebies(freebies) {
    const normalized = freebies.map(normalizeFreebie);
    localStorage.setItem(FREEBIES_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetFreebies() {
    localStorage.removeItem(FREEBIES_KEY);
    return getFreebies();
  }

  function getActiveFreebies() {
    return getFreebies().filter((freebie) => freebie.status !== "draft");
  }

  function normalizeStoreCurrency(value) {
    const currency = String(value || "USD").trim().toUpperCase();
    if (currency.includes("PKR") || /\bRS\.?\b/.test(currency) || currency.includes("₨")) {
      return "PKR";
    }
    return "USD";
  }

  function normalizeRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) && rate > 0 ? rate : 0;
  }

  function getSiteSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return {
        ...defaultSiteSettings,
        ...(stored && typeof stored === "object" ? stored : {})
      };
    } catch (error) {
      console.warn("Could not read saved site settings.", error);
      return { ...defaultSiteSettings };
    }
  }

  function getSiteSocialLinks() {
    return getSiteSettings();
  }

  function renderFooterSocialLinks() {
    const settings = getSiteSocialLinks();
    const socials = [
      ["Instagram", "instagramUrl", "fa-brands fa-instagram"],
      ["Facebook", "facebookUrl", "fa-brands fa-facebook-f"],
      ["WhatsApp", "whatsappUrl", "fa-brands fa-whatsapp"],
      ["LinkedIn", "linkedinUrl", "fa-brands fa-linkedin-in"]
    ]
      .map(([label, key, icon]) => ({ label, href: String(settings[key] || "").trim(), icon }))
      .filter((link) => link.href);

    document.querySelectorAll(".footer-grid .brand").forEach((brand) => {
      const parent = brand.parentElement;
      if (!parent) {
        return;
      }

      let row = parent.querySelector("[data-footer-social-links]");
      let attribution = parent.querySelector("[data-exchange-rate-attribution]");
      if (!attribution) {
        attribution = document.createElement("a");
        attribution.className = "exchange-rate-attribution";
        attribution.dataset.exchangeRateAttribution = "";
        attribution.href = "https://www.exchangerate-api.com";
        attribution.target = "_blank";
        attribution.rel = "noopener";
        attribution.textContent = "Rates by Exchange Rate API";
      }

      if (!socials.length) {
        row?.remove();
        brand.insertAdjacentElement("afterend", attribution);
        return;
      }

      if (!row) {
        row = document.createElement("div");
        row.className = "footer-social-links";
        row.dataset.footerSocialLinks = "";
        brand.insertAdjacentElement("afterend", row);
      }

      row.innerHTML = socials.map((link) => `
        <a href="${escapeHtml(link.href)}" aria-label="${escapeHtml(link.label)}" title="${escapeHtml(link.label)}">
          <i class="${escapeHtml(link.icon)}"></i>
        </a>
      `).join("");
      row.insertAdjacentElement("afterend", attribution);
    });
  }

  function parsePrice(price) {
    const match = String(price || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function sourceCurrency(price) {
    const text = String(price || "").toUpperCase();
    if (text.includes("FREE")) {
      return "FREE";
    }
    if (text.includes("PKR") || /\bRS\.?\b/.test(text) || text.includes("₨")) {
      return "PKR";
    }
    return "USD";
  }

  function getStoreCurrency() {
    return normalizeStoreCurrency(getSiteSettings().currency);
  }

  function readCachedUsdPkrRate() {
    try {
      const cached = JSON.parse(localStorage.getItem(EXCHANGE_RATE_KEY));
      const rate = normalizeRate(cached && cached.rate);
      if (rate) {
        return rate;
      }
    } catch (error) {
      console.warn("Could not read cached exchange rate.", error);
    }
    return 0;
  }

  function saveUsdPkrRate(rate) {
    const normalized = normalizeRate(rate);
    if (!normalized) {
      return;
    }
    exchangeRateState.usdToPkr = normalized;
    try {
      localStorage.setItem(EXCHANGE_RATE_KEY, JSON.stringify({
        rate: normalized,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn("Could not save exchange rate.", error);
    }
  }

  function usdPkrRate() {
    const cached = readCachedUsdPkrRate();
    if (cached) {
      exchangeRateState.usdToPkr = cached;
      return cached;
    }
    const settingsRate = normalizeRate(getSiteSettings().usdPkrRate);
    return normalizeRate(exchangeRateState.usdToPkr) || settingsRate || DEFAULT_USD_PKR_RATE;
  }

  function convertMoney(amount, fromCurrency, toCurrency) {
    const value = Number(amount || 0);
    if (!Number.isFinite(value) || fromCurrency === "FREE") {
      return 0;
    }
    if (fromCurrency === toCurrency) {
      return value;
    }
    const rate = usdPkrRate();
    if (fromCurrency === "USD" && toCurrency === "PKR") {
      return value * rate;
    }
    if (fromCurrency === "PKR" && toCurrency === "USD") {
      return rate ? value / rate : value;
    }
    return value;
  }

  function formatMoneyAmount(amount, currency = getStoreCurrency()) {
    const value = Number(amount || 0);
    if (currency === "PKR") {
      return `₨ ${Math.round(value).toLocaleString("en-PK")}`;
    }
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: value % 1 ? 2 : 0,
      maximumFractionDigits: 2
    })}`;
  }

  function normalizeAccountType(value) {
    return String(value || "").toLowerCase() === "shared" ? "shared" : "private";
  }

  function accountLabel(type) {
    return normalizeAccountType(type) === "shared" ? "Shared" : "Private";
  }

  function rawProductPrice(product, accountType = "private") {
    const type = normalizeAccountType(accountType);
    if (type === "shared") {
      return product.sharedPrice || "";
    }
    return product.privatePrice || "";
  }

  function isPriceEntered(value) {
    return String(value || "").trim().length > 0;
  }

  function productAccountAvailable(product, accountType = "private") {
    const type = normalizeAccountType(accountType);
    const availableFlag = type === "shared" ? product.sharedAvailable !== false : product.privateAvailable !== false;
    return availableFlag && isPriceEntered(rawProductPrice(product, type));
  }

  function availableProductAccounts(product) {
    return ["private", "shared"].filter((type) => productAccountAvailable(product, type));
  }

  function firstAvailableAccount(product) {
    return availableProductAccounts(product)[0] || "private";
  }

  function productPriceAmount(product, accountType = "private") {
    const raw = rawProductPrice(product, accountType);
    const fromCurrency = sourceCurrency(raw);
    const targetCurrency = getStoreCurrency();
    return {
      raw,
      sourceCurrency: fromCurrency,
      targetCurrency,
      value: convertMoney(parsePrice(raw), fromCurrency, targetCurrency)
    };
  }

  function productPriceDisplay(product, accountType = "private") {
    if (!productAccountAvailable(product, accountType)) {
      return "Unavailable";
    }
    const price = productPriceAmount(product, accountType);
    if (price.sourceCurrency === "FREE") {
      return "Free";
    }
    return formatMoneyAmount(price.value, price.targetCurrency);
  }

  function lowestProductAccount(product) {
    const accounts = availableProductAccounts(product);
    if (!accounts.length) {
      return "private";
    }
    return accounts.slice().sort((left, right) => productPriceAmount(product, left).value - productPriceAmount(product, right).value)[0];
  }

  function productCardPriceInfo(product) {
    const accounts = availableProductAccounts(product);
    if (!accounts.length) {
      return { prefix: "", value: "Unavailable", unavailable: true };
    }
    const privatePrice = productAccountAvailable(product, "private") ? productPriceAmount(product, "private") : null;
    const sharedPrice = productAccountAvailable(product, "shared") ? productPriceAmount(product, "shared") : null;
    if (!privatePrice || !sharedPrice) {
      return { prefix: "", value: productPriceDisplay(product, accounts[0]), unavailable: false };
    }
    if (Math.abs(privatePrice.value - sharedPrice.value) < 0.01) {
      return { prefix: "", value: productPriceDisplay(product, "private"), unavailable: false };
    }
    return { prefix: "From", value: productPriceDisplay(product, lowestProductAccount(product)), unavailable: false };
  }

  function productCardPrice(product) {
    const price = productCardPriceInfo(product);
    return price.prefix ? `${price.prefix} ${price.value}` : price.value;
  }

  function productCardPriceMarkup(product) {
    const price = productCardPriceInfo(product);
    return `
      <strong class="product-card-price${price.unavailable ? " unavailable" : ""}">
        ${price.prefix ? `<span>${escapeHtml(price.prefix)}</span>` : ""}
        <b>${escapeHtml(price.value)}</b>
      </strong>`;
  }

  function productFilterPrice(product) {
    const accounts = availableProductAccounts(product);
    return accounts.length ? productPriceAmount(product, lowestProductAccount(product)).value : 0;
  }

  function refreshPriceSurfaces() {
    renderProductGrids();
    renderShopCatalog();
    renderProductDetail();
    renderCart();
    updateCartBadges();
  }

  async function refreshExchangeRate() {
    if (exchangeRateState.requested || !window.fetch) {
      return;
    }
    exchangeRateState.requested = true;
    try {
      const response = await window.fetch(EXCHANGE_RATE_ENDPOINT, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Exchange rate request failed: ${response.status}`);
      }
      const data = await response.json();
      const rate = normalizeRate(data && data.rates && data.rates.PKR);
      if (rate) {
        saveUsdPkrRate(rate);
        refreshPriceSurfaces();
      }
    } catch (error) {
      console.warn("Could not update USD to PKR rate. Using cached or fallback rate.", error);
    }
  }

  function productBrand(product) {
    const explicit = product.brand || product.vendor || "";
    if (explicit) {
      return explicit;
    }
    const name = String(product.name || "");
    const checks = [
      ["ChatGPT", /chat\s*gpt|chatgpt/i],
      ["Gemini", /gemini/i],
      ["Canva", /canva/i],
      ["ElevenLabs", /eleven/i],
      ["Prime Video", /prime/i],
      ["Surfshark", /surfshark/i]
    ];
    const match = checks.find(([, pattern]) => pattern.test(name));
    if (match) {
      return match[0];
    }
    return name.split(/\s+/).filter(Boolean)[0] || "SubscribAI";
  }

  function productPlan(product) {
    if (product.plan) {
      return product.plan;
    }
    const name = String(product.name || "");
    if (/pro/i.test(name)) {
      return "Pro Plan";
    }
    if (/plus/i.test(name)) {
      return "Plus Plan";
    }
    if (/subscription|plan/i.test(product.category || "")) {
      return product.tag || "Premium Plan";
    }
    return product.tag || product.category || "Digital Product";
  }

  function productDetailRows(product, accountType = "private") {
    const accessValue = product.access
      ? `${product.access}${/private|shared/i.test(product.access) ? "" : ` (${accountLabel(accountType)} account)`}`
      : `${accountLabel(accountType)} account`;
    return [
      ["Plan", productPlan(product)],
      ["Duration", product.duration || (/subscription|plan/i.test(`${product.name} ${product.category}`) ? "1 Year" : "Lifetime access")],
      ["Activation", product.activation || "On mail"],
      ["Access", accessValue],
      ["Warranty", product.warranty || "12 Months"]
    ];
  }

  function productTags(product) {
    const values = [
      product.tag,
      product.category,
      productBrand(product),
      ...(product.features || []).slice(0, 3)
    ];
    return Array.from(new Set(values.filter(Boolean))).slice(0, 6);
  }

  function productCategories(product) {
    return Array.from(new Set(["AI Tools", product.category, "Digital Products", /subscription|plan/i.test(`${product.name} ${product.category}`) ? "Digital Subscription" : ""].filter(Boolean)));
  }

  function productAccountCopy(product, accountType = "private") {
    const type = normalizeAccountType(accountType);
    if (type === "shared") {
      return {
        description: product.sharedDescription || product.description || "",
        details: product.sharedDetails || product.sharedDescription || product.details || product.description || ""
      };
    }
    return {
      description: product.privateDescription || product.description || "",
      details: product.privateDetails || product.privateDescription || product.details || product.description || ""
    };
  }

  function productSummary(product, accountType = "private") {
    const copy = productAccountCopy(product, accountType);
    return copy.details || copy.description || product.details || product.description || "";
  }

  function productAccessOptionSummary(product, accountType = "private") {
    const copy = productAccountCopy(product, accountType);
    const fallback = normalizeAccountType(accountType) === "shared"
      ? "Shared access at a lower price"
      : "Dedicated access for one customer";
    const summary = copy.description || fallback;
    return summary.length > 78 ? `${summary.slice(0, 75).trim()}...` : summary;
  }

  function productLongSections(product, accountType = "private") {
    const name = product.name;
    const brand = productBrand(product);
    const plan = productPlan(product);
    const access = normalizeAccountType(accountType);
    const accessLabel = accountLabel(access);
    const copy = productAccountCopy(product, access);
    const detail = copy.details || copy.description || product.details || product.description;
    const features = product.features || [];

    if (/gemini/i.test(name)) {
      return [
        [`What is Gemini Pro Plan (${accessLabel})`, detail || "Gemini Pro Plan is a premium AI subscription by Google designed for users who want a more intelligent, faster, and reliable AI experience."],
        ["Advanced AI Performance", "Gemini Pro helps with writing, research, coding, planning, and productivity by understanding detailed prompts and returning more useful responses."],
        [`${accessLabel} Account Access`, access === "shared" ? "Shared access is arranged for customers who want a lower-cost Gemini option while still getting the listed plan benefits and support." : "Private access is dedicated to one customer, keeping the account experience cleaner for confidential work and long-term usage."],
        ["Faster and More Reliable Access", "The Pro Plan offers improved performance for smoother daily use when you rely on AI for important tasks."],
        ["Why Choose Gemini Pro Plan", "Gemini Pro Plan combines intelligence, speed, and reliability in one AI solution with simple activation and warranty support."]
      ];
    }

    return [
      [`What is ${name} (${accessLabel})`, `${detail || `${name} is a premium digital product from ${brand} made for customers who want faster, smarter, and more reliable work.`} This ${accessLabel.toLowerCase()} account option is suitable for customers who want practical results without complicated setup.`],
      ["Advanced Performance", `${plan} gives you a stronger workflow with useful features, cleaner output, and dependable access for daily productivity.`],
      ["Best Use Cases", features.length ? `${name} is useful for ${features.join(", ").toLowerCase()}.` : `${name} is useful for writing, research, content creation, planning, productivity, and business workflows.`],
      [`${accessLabel} Access and Support`, access === "shared" ? "Your shared account order is handled with clear activation details, usage guidance, and support for the listed warranty period." : "Your private account order is handled with dedicated access details, simple activation, and support for the listed warranty period."],
      [`Why Choose ${name}`, `${name} brings together convenience, value, and practical digital access so you can start using the product quickly.`]
    ];
  }

  function renderLongSections(product, accountType = "private") {
    return productLongSections(product, accountType)
      .map(([heading, copy]) => `<article><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(copy)}</p></article>`)
      .join("");
  }

  function relatedProducts(product, limit = 4) {
    const active = getActiveProducts().filter((item) => item.id !== product.id);
    const sameCategory = active.filter((item) => item.category === product.category);
    const others = active.filter((item) => item.category !== product.category);
    return [...sameCategory, ...others].slice(0, limit);
  }

  function productGallery(product) {
    return Array.isArray(product.images) && product.images.length
      ? product.images
      : (product.imageData ? [{ data: product.imageData, name: product.imageName, alt: product.imageAlt || product.name }] : []);
  }

  function productCard(product) {
    const imageClass = product.imageData ? `has-product-image image-fit-${escapeHtml(product.imageFit)}` : "";
    const imageStyle = product.imageData ? ` style="--product-image-bg: ${escapeHtml(product.imageBgColor)};"` : "";
    const addAccount = firstAvailableAccount(product);
    const canBuy = availableProductAccounts(product).length > 0;
    const media = product.imageData
      ? `<img class="product-image" src="${escapeHtml(product.imageData)}" alt="${escapeHtml(product.imageAlt || product.name)}">`
      : `<i class="${escapeHtml(product.iconClass)}"></i>`;
    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}">
        <a class="product-media ${escapeHtml(product.mediaClass)} ${imageClass}"${imageStyle} href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)}">
          ${media}
          ${(product.images || []).length > 1 ? `<span class="product-image-count">${product.images.length}</span>` : ""}
        </a>
        <div class="product-content">
          <span class="product-tag">${escapeHtml(product.tag)}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <div class="product-bottom">
            ${productCardPriceMarkup(product)}
            <div class="product-actions">
              <a class="product-icon-action" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)}" title="View details"><i class="fa-solid fa-eye"></i></a>
              <button class="product-icon-action" type="button" data-add-to-cart="${escapeHtml(product.id)}" data-product-access="${escapeHtml(addAccount)}" data-icon-action="cart" aria-label="${canBuy ? `Add ${escapeHtml(product.name)} to cart` : `${escapeHtml(product.name)} unavailable`}" title="${canBuy ? "Add to cart" : "Unavailable"}"${canBuy ? "" : " disabled"}><i class="fa-solid fa-cart-shopping"></i></button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function productCardShop(product) {
    const imageClass = product.imageData ? `has-product-image image-fit-${escapeHtml(product.imageFit)}` : "";
    const imageStyle = product.imageData ? ` style="--product-image-bg: ${escapeHtml(product.imageBgColor)};"` : "";
    const addAccount = firstAvailableAccount(product);
    const canBuy = availableProductAccounts(product).length > 0;
    const media = product.imageData
      ? `<img class="product-image" src="${escapeHtml(product.imageData)}" alt="${escapeHtml(product.imageAlt || product.name)}">`
      : `<i class="${escapeHtml(product.iconClass)}"></i>`;

    return `
      <article class="product-card shop-card" data-product-id="${escapeHtml(product.id)}">
        <div class="shop-card-media ${escapeHtml(product.mediaClass)} ${imageClass}"${imageStyle}>
          <a class="shop-card-image" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)}">
            ${media}
          </a>
          ${(product.images || []).length > 1 ? `<span class="product-image-count">${product.images.length}</span>` : ""}
          <span class="shop-sale-badge">${escapeHtml(product.tag)}</span>
        </div>
        <div class="product-content shop-card-content">
          <span class="product-tag">${escapeHtml(product.category)}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <div class="shop-price-line">
            <span>Price:</span>
            ${productCardPriceMarkup(product)}
          </div>
          <div class="product-actions">
            <a class="product-icon-action" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)}" title="View details"><i class="fa-solid fa-eye"></i></a>
            <button class="product-icon-action" type="button" data-add-to-cart="${escapeHtml(product.id)}" data-product-access="${escapeHtml(addAccount)}" data-icon-action="cart" aria-label="${canBuy ? `Add ${escapeHtml(product.name)} to cart` : `${escapeHtml(product.name)} unavailable`}" title="${canBuy ? "Add to cart" : "Unavailable"}"${canBuy ? "" : " disabled"}><i class="fa-solid fa-cart-shopping"></i></button>
          </div>
        </div>
      </article>`;
  }

  function freebieCard(freebie) {
    const href = freebie.link || "contact.html";
    const imageClass = freebie.imageData ? `has-product-image image-fit-${escapeHtml(freebie.imageFit)}` : "";
    const imageStyle = freebie.imageData ? ` style="--product-image-bg: ${escapeHtml(freebie.imageBgColor)};"` : "";
    const media = freebie.imageData
      ? `<img class="product-image" src="${escapeHtml(freebie.imageData)}" alt="${escapeHtml(freebie.imageAlt || freebie.title)}">`
      : `<i class="${escapeHtml(freebie.iconClass)}"></i>`;
    return `
      <article class="freebie-square-card product-card" data-freebie-id="${escapeHtml(freebie.id)}">
        <a class="freebie-square-media ${escapeHtml(freebie.mediaClass)} ${imageClass}"${imageStyle} href="${escapeHtml(href)}" aria-label="View ${escapeHtml(freebie.title)}">
          ${media}
          ${(freebie.images || []).length > 1 ? `<span class="product-image-count">${freebie.images.length}</span>` : ""}
          <span class="freebie-square-badge">${escapeHtml(freebie.tag)}</span>
        </a>
        <div class="freebie-square-content">
          <span class="product-tag">${escapeHtml(freebie.category)}</span>
          <h3>${escapeHtml(freebie.title)}</h3>
          <div class="freebie-square-bottom">
            <strong>${escapeHtml(freebie.price)}</strong>
            <a class="product-icon-action" href="${escapeHtml(href)}" aria-label="View ${escapeHtml(freebie.title)}" title="View details"><i class="fa-solid fa-eye"></i></a>
          </div>
        </div>
      </article>`;
  }

  function skeletonLine(size = "long") {
    return `<span class="skeleton-block skeleton-line ${size}"></span>`;
  }

  function productSkeletonCard(extraClass = "") {
    return `
      <article class="product-card skeleton-card ${extraClass}" aria-hidden="true">
        <span class="skeleton-block skeleton-media"></span>
        <div class="skeleton-content">
          ${skeletonLine("short")}
          ${skeletonLine("long")}
          ${skeletonLine("medium")}
          <div class="skeleton-actions">
            <span class="skeleton-block skeleton-pill"></span>
            <span class="skeleton-block skeleton-pill"></span>
          </div>
        </div>
      </article>`;
  }

  function productSkeletonCards(count, extraClass = "") {
    return Array.from({ length: count }, () => productSkeletonCard(extraClass)).join("");
  }

  function cartSkeletonMarkup() {
    return `
      <div class="cart-skeleton" aria-hidden="true">
        ${Array.from({ length: 3 }, () => `
          <div class="cart-skeleton-line">
            <span class="skeleton-block cart-skeleton-media"></span>
            <span class="cart-skeleton-copy">
              ${skeletonLine("short")}
              ${skeletonLine("long")}
              ${skeletonLine("medium")}
            </span>
            <span class="skeleton-block cart-skeleton-actions"></span>
          </div>`).join("")}
      </div>`;
  }

  function checkoutSkeletonMarkup() {
    return `
      <div class="checkout-skeleton" aria-hidden="true">
        ${Array.from({ length: 3 }, () => `
          <div class="checkout-skeleton-line">
            <span class="skeleton-block checkout-skeleton-media"></span>
            <span class="checkout-skeleton-copy">
              ${skeletonLine("medium")}
              ${skeletonLine("long")}
            </span>
            <span class="skeleton-block checkout-skeleton-total"></span>
          </div>`).join("")}
        <span class="skeleton-block skeleton-line long"></span>
        <span class="skeleton-block skeleton-line medium"></span>
      </div>`;
  }

  function productDetailSkeletonMarkup() {
    return `
      <div class="product-detail-skeleton" aria-hidden="true">
        <span class="skeleton-block product-detail-skeleton-media"></span>
        <div class="product-detail-skeleton-copy">
          ${skeletonLine("short")}
          <span class="skeleton-block product-detail-skeleton-title"></span>
          ${skeletonLine("long")}
          ${skeletonLine("medium")}
          <span class="skeleton-block product-detail-skeleton-price"></span>
          <div class="product-detail-skeleton-grid">
            <span class="skeleton-block"></span>
            <span class="skeleton-block"></span>
            <span class="skeleton-block"></span>
            <span class="skeleton-block"></span>
          </div>
        </div>
      </div>`;
  }

  function setInitialSkeleton(container, markup) {
    if (!container || container.children.length) {
      return;
    }
    container.setAttribute("aria-busy", "true");
    container.innerHTML = markup;
  }

  function renderInitialSkeletons() {
    document.querySelectorAll("[data-products-grid]").forEach((grid) => {
      const limit = Number(grid.dataset.limit || 0);
      const count = limit > 0 ? Math.min(limit, 8) : (grid.hasAttribute("data-shop-products") ? 8 : 4);
      setInitialSkeleton(grid, productSkeletonCards(count, grid.hasAttribute("data-shop-products") ? "shop-card" : ""));
    });

    document.querySelectorAll("[data-freebie-grid]").forEach((grid) => {
      const limit = Number(grid.dataset.limit || 0);
      const count = limit > 0 ? Math.min(limit, 8) : 4;
      setInitialSkeleton(grid, productSkeletonCards(count, "freebie-square-card"));
    });

    setInitialSkeleton(document.querySelector("[data-cart-items]"), cartSkeletonMarkup());
    setInitialSkeleton(document.querySelector("[data-checkout-summary]"), checkoutSkeletonMarkup());
    setInitialSkeleton(document.querySelector("[data-product-detail]"), productDetailSkeletonMarkup());
  }

  function renderProductGrids() {
    document.querySelectorAll("[data-products-grid]").forEach((grid) => {
      const limit = Number(grid.dataset.limit || 0);
      const category = grid.dataset.category;
      let products = getActiveProducts();
      if (category) {
        products = products.filter((product) => product.category === category);
      }
      if (limit > 0) {
        products = products.slice(0, limit);
      }
      grid.innerHTML = products.length
        ? products.map(productCard).join("")
        : `<div class="empty-state"><h3>No products yet</h3><p>Add products from the admin panel to fill this section.</p></div>`;
      grid.removeAttribute("aria-busy");
    });
  }

  function renderFreebieGrids() {
    document.querySelectorAll("[data-freebie-grid]").forEach((grid) => {
      const limit = Number(grid.dataset.limit || 0);
      const category = grid.dataset.selectedCategory || grid.dataset.category || "all";
      let freebies = getActiveFreebies();
      if (category && category !== "all") {
        freebies = freebies.filter((freebie) => freebie.category === category || freebie.tag === category);
      }
      if (limit > 0) {
        freebies = freebies.slice(0, limit);
      }
      grid.innerHTML = freebies.length
        ? freebies.map(freebieCard).join("")
        : `<div class="empty-state"><h3>No freebies yet</h3><p>Add a course or free resource from the admin panel to fill this section.</p></div>`;
      grid.removeAttribute("aria-busy");
    });
  }

  function renderFreebieCategories() {
    document.querySelectorAll("[data-freebie-categories]").forEach((container) => {
      const section = container.closest(".container") || document;
      const grid = section.querySelector("[data-freebie-grid]");
      const freebies = getActiveFreebies();
      const categories = ["all", ...Array.from(new Set(freebies.map((freebie) => freebie.category).filter(Boolean)))];
      const selected = (grid && grid.dataset.selectedCategory) || "all";

      container.innerHTML = categories.map((category) => {
        const label = category === "all" ? "All" : category;
        const count = category === "all"
          ? freebies.length
          : freebies.filter((freebie) => freebie.category === category).length;
        return `<button class="${category === selected ? "active" : ""}" type="button" data-freebie-category="${escapeHtml(category)}">${escapeHtml(label)} <span>${count}</span></button>`;
      }).join("");

      container.querySelectorAll("[data-freebie-category]").forEach((button) => {
        button.addEventListener("click", () => {
          if (grid) {
            grid.dataset.selectedCategory = button.dataset.freebieCategory || "all";
          }
          renderFreebieCategories();
          renderFreebieGrids();
        });
      });
    });
  }

  function isShopCategoryMatch(product, category) {
    if (!category || category === "all") {
      return true;
    }

    if (category === "Templates") {
      return ["Templates", "Prompt Pack", "Automation"].includes(product.category);
    }

    return product.category === category;
  }

  function renderShopCatalog() {
    const catalog = document.querySelector("[data-shop-catalog]");
    if (!catalog) {
      return;
    }

    const grid = catalog.querySelector("[data-shop-products]");
    const searchForm = catalog.querySelector("[data-shop-search-form]");
    const searchInput = catalog.querySelector("[data-shop-search]");
    const minInput = catalog.querySelector("[data-shop-min]");
    const maxInput = catalog.querySelector("[data-shop-max]");
    const priceButton = catalog.querySelector("[data-shop-apply-filter]");
    const priceLabel = catalog.querySelector("[data-shop-price-label]");
    const resultCount = catalog.querySelector("[data-shop-result-count]");
    const sortSelect = catalog.querySelector("[data-shop-sort]");
    const categoryButtons = Array.from(catalog.querySelectorAll("[data-shop-category], [data-shop-tab]"));

    if (!grid) {
      return;
    }

    const state = {
      category: "all",
      query: "",
      min: "",
      max: "",
      sort: "latest"
    };

    function activeProducts() {
      return getActiveProducts();
    }

    function updateCategoryCounts(products) {
      catalog.querySelectorAll("[data-shop-count]").forEach((node) => {
        const category = node.dataset.shopCount;
        const count = products.filter((product) => isShopCategoryMatch(product, category)).length;
        node.textContent = String(count);
      });
    }

    function filteredProducts() {
      const query = state.query.toLowerCase().trim();
      const min = state.min === "" ? null : Number(state.min);
      const max = state.max === "" ? null : Number(state.max);

      return activeProducts()
        .filter((product) => isShopCategoryMatch(product, state.category))
        .filter((product) => {
          if (!query) {
            return true;
          }

          const haystack = `${product.name} ${product.tag} ${product.category} ${product.description}`.toLowerCase();
          return haystack.includes(query);
        })
        .filter((product) => {
          const price = productFilterPrice(product);
          return (min === null || price >= min) && (max === null || price <= max);
        })
        .sort((left, right) => {
          if (state.sort === "price-low") {
            return productFilterPrice(left) - productFilterPrice(right);
          }
          if (state.sort === "price-high") {
            return productFilterPrice(right) - productFilterPrice(left);
          }
          if (state.sort === "name") {
            return left.name.localeCompare(right.name);
          }
          return 0;
        });
    }

    function setCategory(category) {
      state.category = category || "all";
      categoryButtons.forEach((button) => {
        const value = button.dataset.shopCategory || button.dataset.shopTab;
        button.classList.toggle("active", value === state.category);
      });
      render();
    }

    function render() {
      const products = activeProducts();
      const filtered = filteredProducts();
      updateCategoryCounts(products);

      grid.innerHTML = filtered.length
        ? filtered.map(productCardShop).join("")
        : `<div class="empty-state"><h3>No products found</h3><p>Try another search, category, or price range.</p></div>`;
      grid.removeAttribute("aria-busy");

      if (resultCount) {
        resultCount.textContent = filtered.length
          ? `Showing ${filtered.length} of ${products.length} results`
          : "No products match the current filters";
      }

      if (priceLabel) {
        const minText = state.min === "" ? formatMoneyAmount(0) : formatMoneyAmount(Number(state.min || 0));
        const maxLabel = state.max === "" ? "Any" : formatMoneyAmount(Number(state.max || 0));
        priceLabel.textContent = state.min === "" && state.max === "" ? "Price: all products" : `Price: ${minText} - ${maxLabel}`;
      }
    }

    searchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.query = searchInput ? searchInput.value : "";
      render();
    });

    searchInput?.addEventListener("input", () => {
      state.query = searchInput.value;
      render();
    });

    function applyPriceFilter() {
      state.min = minInput ? minInput.value : "";
      state.max = maxInput ? maxInput.value : "";
      render();
    }

    priceButton?.addEventListener("click", () => {
      applyPriceFilter();
    });

    [minInput, maxInput].forEach((input) => {
      input?.addEventListener("input", applyPriceFilter);
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          applyPriceFilter();
        }
      });
    });

    sortSelect?.addEventListener("change", () => {
      state.sort = sortSelect.value;
      render();
    });

    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setCategory(button.dataset.shopCategory || button.dataset.shopTab);
      });
    });

    render();
  }

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY));
      if (!cart || typeof cart !== "object") {
        return {};
      }
      const normalized = {};
      let changed = false;
      Object.entries(cart).forEach(([key, qty]) => {
        const parsed = parseCartKey(key);
        const nextKey = cartKey(parsed.id, parsed.accountType);
        normalized[nextKey] = Number(normalized[nextKey] || 0) + Number(qty || 0);
        changed = changed || nextKey !== key;
      });
      if (changed) {
        localStorage.setItem(CART_KEY, JSON.stringify(normalized));
      }
      return normalized;
    } catch (error) {
      return {};
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadges();
    renderCart();
    renderCheckout();
  }

  function cartCount(cart) {
    return Object.values(cart || {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  function cartKey(id, accountType = "private") {
    return `${id}::${normalizeAccountType(accountType)}`;
  }

  function parseCartKey(key) {
    const value = String(key || "");
    const parts = value.split("::");
    if (parts.length > 1) {
      return {
        id: parts[0],
        accountType: normalizeAccountType(parts[1])
      };
    }
    return {
      id: value,
      accountType: "private"
    };
  }

  function getCartEntries(cart = getCart()) {
    const products = getProducts();
    return Object.entries(cart)
      .map(([key, qty]) => {
        const parsed = parseCartKey(key);
        return {
          key,
          id: parsed.id,
          accountType: parsed.accountType,
          product: products.find((item) => item.id === parsed.id),
          qty: Number(qty || 0)
        };
      })
      .filter((entry) => entry.product && entry.qty > 0);
  }

  function addToCart(id, accountType = "private") {
    const product = findProduct(id);
    if (!product || !productAccountAvailable(product, accountType)) {
      return;
    }
    const cart = getCart();
    const key = cartKey(id, accountType);
    cart[key] = Number(cart[key] || 0) + 1;
    saveCart(cart);
  }

  function formatCartMoney(amount) {
    return formatMoneyAmount(amount, getStoreCurrency());
  }

  function readStorageValue(key, fallback) {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      return stored == null ? fallback : stored;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorageValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function todayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function normalizeTrafficName(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) {
      return "Direct";
    }
    if (["ig", "insta", "instagram.com"].includes(raw) || raw.includes("instagram")) {
      return "Instagram";
    }
    if (["fb", "facebook.com", "meta"].includes(raw) || raw.includes("facebook")) {
      return "Facebook";
    }
    if (raw.includes("whatsapp") || raw.includes("wa.me")) {
      return "WhatsApp";
    }
    if (raw.includes("linkedin")) {
      return "LinkedIn";
    }
    if (raw.includes("google") || raw.includes("gclid")) {
      return "Google";
    }
    if (raw.includes("youtube")) {
      return "YouTube";
    }
    if (raw.includes("tiktok")) {
      return "TikTok";
    }
    if (raw.includes("bing") || raw.includes("msclkid")) {
      return "Bing";
    }
    return raw.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function detectTrafficSource() {
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer || "";
    const paramSource = params.get("utm_source") || params.get("source") || params.get("ref");
    let source = paramSource;
    let signal = Boolean(paramSource);

    if (!source && params.get("fbclid")) {
      source = "Facebook";
      signal = true;
    }
    if (!source && params.get("gclid")) {
      source = "Google";
      signal = true;
    }
    if (!source && params.get("ttclid")) {
      source = "TikTok";
      signal = true;
    }
    if (!source && params.get("msclkid")) {
      source = "Bing";
      signal = true;
    }
    if (!source && referrer) {
      try {
        const referrerHost = new URL(referrer).hostname.replace(/^www\./, "");
        const currentHost = window.location.hostname.replace(/^www\./, "");
        if (referrerHost && referrerHost !== currentHost) {
          source = referrerHost;
          signal = true;
        }
      } catch (error) {
        source = referrer;
        signal = true;
      }
    }

    return {
      source: normalizeTrafficName(source || "Direct"),
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      landingPage: `${window.location.pathname || "index.html"}${window.location.search || ""}`,
      referrer,
      hasSignal: signal
    };
  }

  function getTrafficSummary() {
    const stored = readStorageValue(TRAFFIC_SUMMARY_KEY, []);
    const rows = Array.isArray(stored) ? stored : Object.values(stored || {});
    return rows
      .map((row) => ({
        source: normalizeTrafficName(row.source || "Direct"),
        visits: Math.max(0, Number(row.visits || 0)),
        checkouts: Math.max(0, Number(row.checkouts || 0)),
        campaign: row.campaign || "",
        medium: row.medium || "",
        landingPage: row.landingPage || "",
        referrer: row.referrer || "",
        lastVisit: row.lastVisit || "",
        lastCheckout: row.lastCheckout || ""
      }))
      .sort((left, right) => (right.checkouts - left.checkouts) || (right.visits - left.visits));
  }

  function saveTrafficSummaryRow(sourceData, patch = {}) {
    const rows = getTrafficSummary();
    const source = normalizeTrafficName(sourceData.source);
    const index = rows.findIndex((row) => row.source === source);
    const current = index >= 0 ? rows[index] : {
      source,
      visits: 0,
      checkouts: 0,
      campaign: "",
      medium: "",
      landingPage: "",
      referrer: "",
      lastVisit: "",
      lastCheckout: ""
    };
    const next = {
      ...current,
      campaign: sourceData.campaign || current.campaign,
      medium: sourceData.medium || current.medium,
      landingPage: sourceData.landingPage || current.landingPage,
      referrer: sourceData.referrer || current.referrer,
      ...patch
    };
    if (index >= 0) {
      rows[index] = next;
    } else {
      rows.push(next);
    }
    writeStorageValue(TRAFFIC_SUMMARY_KEY, rows);
    return next;
  }

  function getCurrentTrafficSource() {
    const current = readStorageValue(TRAFFIC_SOURCE_KEY, null);
    return current && current.source ? current : {
      source: "Direct",
      medium: "",
      campaign: "",
      landingPage: "index.html",
      referrer: "",
      firstSeen: "",
      lastSeen: ""
    };
  }

  function captureTrafficSource() {
    if (document.body && document.body.classList.contains("admin-page")) {
      return getCurrentTrafficSource();
    }
    const detected = detectTrafficSource();
    const previous = getCurrentTrafficSource();
    const now = new Date().toISOString();
    const current = detected.hasSignal ? detected : previous;
    const saved = {
      ...previous,
      ...current,
      source: normalizeTrafficName(current.source),
      firstSeen: previous.firstSeen || now,
      lastSeen: now
    };
    writeStorageValue(TRAFFIC_SOURCE_KEY, saved);
    const summary = getTrafficSummary().find((row) => row.source === saved.source);
    saveTrafficSummaryRow(saved, {
      visits: Number(summary?.visits || 0) + 1,
      lastVisit: now
    });
    return saved;
  }

  function createCheckoutOrderId(orders) {
    const next = (Array.isArray(orders) ? orders : [])
      .map((order) => Number(String(order.id || "").replace(/\D/g, "")))
      .filter(Boolean)
      .reduce((max, number) => Math.max(max, number), 1048) + 1;
    return `ORD-${next}`;
  }

  function createSahulatPayOrderId() {
    const stamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 7);
    return `O${stamp}${random}`.toUpperCase().slice(0, 19);
  }

  function normalizePaymentProvider(value) {
    const provider = String(value || "").trim().toLowerCase();
    return ["jazzcash", "easypaisa", "card"].includes(provider) ? provider : "";
  }

  function paymentProviderLabel(provider) {
    const normalized = normalizePaymentProvider(provider);
    if (!normalized) {
      return "SahulatPay";
    }
    if (normalized === "easypaisa") {
      return "Easypaisa";
    }
    if (normalized === "card") {
      return "Card";
    }
    return "JazzCash";
  }

  function isWalletProvider(provider) {
    return ["jazzcash", "easypaisa"].includes(normalizePaymentProvider(provider));
  }

  function paymentMethodLabel(provider) {
    const normalized = normalizePaymentProvider(provider);
    if (!normalized) {
      return "Manual confirmation";
    }
    return normalized === "card" ? "Debit / Credit Card" : `${paymentProviderLabel(normalized)} Wallet`;
  }

  function walletPhoneValid(phone) {
    return /^03\d{9}$/.test(String(phone || "").trim());
  }

  function gatewayAmount(total) {
    const amount = Number(total || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "";
    }
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  }

  function orderStatusFromPayment(paymentStatus) {
    const status = String(paymentStatus || "").toLowerCase();
    if (status === "paid" || status === "success" || status === "completed") {
      return "paid";
    }
    if (status === "failed" || status === "cancelled" || status === "canceled") {
      return "failed";
    }
    return "pending";
  }

  function getCheckoutOrders() {
    const orders = readStorageValue(ORDERS_KEY, []);
    return Array.isArray(orders) ? orders : [];
  }

  function saveCheckoutOrders(orders) {
    writeStorageValue(ORDERS_KEY, Array.isArray(orders) ? orders : []);
  }

  function updateCheckoutOrder(orderId, patch = {}) {
    const orders = getCheckoutOrders();
    const index = orders.findIndex((order) => order.id === orderId);
    if (index < 0) {
      return null;
    }
    const current = orders[index];
    const nextNotes = patch.notes && current.notes && !String(current.notes).includes(String(patch.notes))
      ? `${current.notes} ${patch.notes}`
      : (patch.notes || current.notes);
    const next = {
      ...current,
      ...patch,
      notes: nextNotes
    };
    orders[index] = next;
    saveCheckoutOrders(orders);
    return next;
  }

  function cartTotals(entries) {
    const subtotal = entries.reduce((sum, entry) => sum + productPriceAmount(entry.product, entry.accountType).value * entry.qty, 0);
    const applied = validateCoupon(getAppliedCouponCode(), subtotal);
    const discount = applied.valid ? applied.discount : 0;
    const total = Math.max(0, subtotal - discount);
    return { subtotal, applied, discount, total };
  }

  function cartItemSummary(entries) {
    return entries
      .map((entry) => `${entry.product.name} (${accountLabel(entry.accountType)}) x${entry.qty}`)
      .join(", ");
  }

  function markCouponUsed(applied) {
    if (!applied || !applied.valid || !applied.coupon) {
      return;
    }
    const coupons = getCoupons();
    const index = coupons.findIndex((coupon) => coupon.code === applied.coupon.code);
    if (index >= 0) {
      coupons[index] = {
        ...coupons[index],
        quantity: Math.max(0, Number(coupons[index].quantity || 0) - 1)
      };
      saveCoupons(coupons);
    }
  }

  function saveCheckoutOrder(entries, total, customerInfo = {}) {
    if (!entries.length) {
      return null;
    }
    const source = getCurrentTrafficSource();
    const sourceName = normalizeTrafficName(source.source);
    const now = new Date().toISOString();
    const date = todayDate();
    const firstEntry = entries[0];
    const itemSummary = cartItemSummary(entries);
    const customerName = customerInfo.name || `${sourceName} Checkout Visitor`;
    const customerEmail = customerInfo.email || `${slugify(sourceName)}-checkout@subscribai.local`;
    const phone = customerInfo.phone || "";
    const whatsapp = customerInfo.whatsapp || "";
    const paymentProvider = normalizePaymentProvider(customerInfo.paymentProvider);
    const walletPhone = customerInfo.walletPhone || "";
    const paymentMethod = customerInfo.paymentMethod || (paymentProvider ? paymentMethodLabel(paymentProvider) : "Manual confirmation");
    const gatewayStatus = customerInfo.gatewayStatus || "";
    const gatewayTransactionId = customerInfo.transactionId || "";
    const notes = [
      `Checkout submitted from ${sourceName}.`,
      `Items: ${itemSummary}.`,
      `Payment method: ${paymentMethod}.`,
      phone ? `Phone: ${phone}.` : "",
      whatsapp ? `WhatsApp: ${whatsapp}.` : "",
      walletPhone ? `Wallet phone: ${walletPhone}.` : "",
      gatewayTransactionId ? `SahulatPay transaction: ${gatewayTransactionId}.` : "",
      gatewayStatus ? `Gateway status: ${gatewayStatus}.` : "",
      customerInfo.notes ? `Customer note: ${customerInfo.notes}.` : "",
      `Campaign: ${source.campaign || "Not set"}.`,
      `Medium: ${source.medium || "Not set"}.`,
      `Landing page: ${source.landingPage || "Not tracked"}.`,
      `Referrer: ${source.referrer || "Direct"}.`
    ].filter(Boolean).join(" ");

    const orders = readStorageValue(ORDERS_KEY, []);
    const order = {
      id: customerInfo.orderId || createCheckoutOrderId(orders),
      customerName,
      customerEmail,
      productId: firstEntry.product.id,
      status: customerInfo.status || "pending",
      total: formatCartMoney(total),
      totalAmount: Number(total || 0),
      date,
      channel: sourceName,
      source: sourceName,
      phone,
      whatsapp,
      paymentMethod,
      paymentProvider,
      providerLabel: paymentProvider ? paymentProviderLabel(paymentProvider) : "",
      walletPhone,
      gatewayOrderId: customerInfo.orderId || "",
      gatewayTransactionId,
      gatewayStatus,
      gatewayResponse: customerInfo.gatewayResponse || null,
      notes
    };
    writeStorageValue(ORDERS_KEY, [order, ...(Array.isArray(orders) ? orders : [])]);

    const customers = readStorageValue(CUSTOMERS_KEY, []);
    const customerId = slugify(customerEmail || `${sourceName}-checkout-visitor`);
    const existingIndex = Array.isArray(customers) ? customers.findIndex((customer) => customer.id === customerId) : -1;
    const existing = existingIndex >= 0 ? customers[existingIndex] : {};
    const customer = {
      id: customerId,
      name: customerName,
      email: customerEmail,
      segment: "Traffic Lead",
      status: "lead",
      source: sourceName,
      orders: Number(existing.orders || 0) + 1,
      spend: Number(existing.spend || 0) + Number(total || 0),
      lastOrder: date,
      notes: `Latest checkout: ${itemSummary}. Phone: ${phone || "Not provided"}. WhatsApp: ${whatsapp || "Not provided"}. Campaign: ${source.campaign || "Not set"}. Landing: ${source.landingPage || "Not tracked"}.`
    };
    const nextCustomers = Array.isArray(customers) ? [...customers] : [];
    if (existingIndex >= 0) {
      nextCustomers[existingIndex] = customer;
    } else {
      nextCustomers.unshift(customer);
    }
    writeStorageValue(CUSTOMERS_KEY, nextCustomers);

    const summary = getTrafficSummary().find((row) => row.source === sourceName);
    saveTrafficSummaryRow(source, {
      checkouts: Number(summary?.checkouts || 0) + 1,
      lastCheckout: now
    });

    return order;
  }

  function saveCheckoutLead(entries, total) {
    return saveCheckoutOrder(entries, total);
  }

  function getAppliedCouponCode() {
    return String(localStorage.getItem(APPLIED_COUPON_KEY) || "").trim().toUpperCase();
  }

  function validateCoupon(code, subtotal) {
    const normalizedCode = String(code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!normalizedCode) {
      return { valid: false, message: "Enter a coupon code." };
    }
    const coupon = getCoupons().find((item) => item.code === normalizedCode);
    if (!coupon || coupon.status !== "active") {
      return { valid: false, message: "Coupon code is not active." };
    }
    if (coupon.quantity <= 0) {
      return { valid: false, message: "Coupon quantity is finished." };
    }
    if (coupon.expires) {
      const expiry = new Date(`${coupon.expires}T23:59:59`);
      if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) {
        return { valid: false, message: "Coupon code has expired." };
      }
    }
    const discount = Math.max(0, Math.min(subtotal, subtotal * (coupon.discount / 100)));
    return {
      valid: true,
      coupon,
      discount,
      message: `${coupon.discount}% coupon applied. ${coupon.quantity} use${coupon.quantity === 1 ? "" : "s"} available.`
    };
  }

  function couponPanel(entries, subtotal, applied) {
    if (!entries.length) {
      return "";
    }
    const inputValue = applied.valid ? applied.coupon.code : getAppliedCouponCode();
    const message = applied.message || "Add a coupon code before checkout.";
    const messageClass = applied.valid ? "success" : (inputValue ? "error" : "");
    return `
      <div class="cart-coupon-box">
        <div>
          <p class="section-kicker">Coupon Code</p>
          <h3>Have a discount coupon?</h3>
        </div>
        <form class="cart-coupon-form" data-coupon-form>
          <input type="text" name="couponCode" value="${escapeHtml(inputValue)}" placeholder="Enter coupon code" autocomplete="off">
          <button class="btn btn-small btn-outline" type="submit">Apply Coupon</button>
          ${applied.valid ? `<button class="btn btn-small btn-outline" type="button" data-remove-coupon>Remove</button>` : ""}
        </form>
        <p class="coupon-message ${messageClass}" data-coupon-message>${escapeHtml(message)}</p>
      </div>`;
  }

  function cartMedia(product, accountType = "private") {
    const gallery = productGallery(product);
    const imageClass = product.imageData ? `has-product-image image-fit-${escapeHtml(product.imageFit)}` : "";
    const imageStyle = product.imageData ? ` style="--product-image-bg: ${escapeHtml(product.imageBgColor)};"` : "";
    const media = gallery.length
      ? `<img class="product-image" src="${escapeHtml(gallery[0].data)}" alt="${escapeHtml(gallery[0].alt || product.imageAlt || product.name)}">`
      : `<i class="${escapeHtml(product.iconClass)}"></i>`;
    return `<a class="cart-line-media ${escapeHtml(product.mediaClass)} ${imageClass}"${imageStyle} href="product.html?id=${encodeURIComponent(product.id)}&access=${encodeURIComponent(normalizeAccountType(accountType))}" aria-label="View ${escapeHtml(product.name)}">${media}</a>`;
  }

  function updateCartBadges() {
    const count = cartCount(getCart());
    document.querySelectorAll(".icon-link span, [data-cart-count]").forEach((badge) => {
      badge.textContent = String(count);
    });
  }

  function renderCart() {
    const container = document.querySelector("[data-cart-items]");
    if (!container) {
      return;
    }
    const cart = getCart();
    const entries = getCartEntries(cart);
    const { subtotal, applied, discount, total } = cartTotals(entries);
    container.removeAttribute("aria-busy");

    if (!entries.length) {
      localStorage.removeItem(APPLIED_COUPON_KEY);
      container.innerHTML = `
        <div class="cart-panel">
          <p class="section-kicker">Cart Items</p>
          <h2>No products added yet</h2>
          <p>Add a plan from the shop page, or contact us if you want help choosing the best product for your workflow.</p>
          <div class="hero-buttons">
            <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
            <a href="contact.html" class="btn btn-outline">Ask for Help</a>
          </div>
        </div>`;
    } else {
      container.innerHTML = `${entries.map((entry) => {
        const lineTotal = productPriceAmount(entry.product, entry.accountType).value * entry.qty;
        const productUrl = `product.html?id=${encodeURIComponent(entry.product.id)}&access=${encodeURIComponent(entry.accountType)}`;
        return `
        <article class="cart-line">
          ${cartMedia(entry.product, entry.accountType)}
          <div class="cart-line-copy">
            <span>${escapeHtml(entry.product.tag)}</span>
            <h3><a href="${productUrl}">${escapeHtml(entry.product.name)}</a></h3>
            <div class="cart-line-meta">
              <span>Access <strong>${escapeHtml(accountLabel(entry.accountType))}</strong></span>
              <span>Price <strong>${escapeHtml(productPriceDisplay(entry.product, entry.accountType))}</strong></span>
              <span>Qty <strong>${entry.qty}</strong></span>
              <span>Total <strong>${escapeHtml(formatCartMoney(lineTotal))}</strong></span>
            </div>
          </div>
          <div class="cart-line-actions">
            <div>
              <button type="button" data-cart-decrease="${escapeHtml(entry.key)}">-</button>
              <span>${entry.qty}</span>
              <button type="button" data-cart-increase="${escapeHtml(entry.key)}">+</button>
            </div>
            <button type="button" data-cart-remove="${escapeHtml(entry.key)}">Remove</button>
          </div>
        </article>`;
      }).join("")}${couponPanel(entries, subtotal, applied)}`;
    }

    document.querySelectorAll("[data-cart-subtotal]").forEach((node) => {
      node.textContent = formatCartMoney(subtotal);
    });
    document.querySelectorAll("[data-cart-discount]").forEach((node) => {
      node.textContent = discount ? `-${formatCartMoney(discount)}` : formatCartMoney(0);
    });
    document.querySelectorAll("[data-cart-discount-row]").forEach((node) => {
      node.hidden = !discount;
    });
    document.querySelectorAll("[data-cart-total]").forEach((node) => {
      node.textContent = formatCartMoney(total);
    });
    document.querySelectorAll("[data-cart-label]").forEach((node) => {
      node.textContent = entries.length ? `${cartCount(cart)} item${cartCount(cart) === 1 ? "" : "s"} in cart` : "Items currently shown in this demo cart";
    });
  }

  function checkoutItemRow(entry) {
    const lineTotal = productPriceAmount(entry.product, entry.accountType).value * entry.qty;
    return `
      <article class="checkout-review-item">
        ${cartMedia(entry.product, entry.accountType)}
        <div>
          <strong>${escapeHtml(entry.product.name)}</strong>
          <span>${escapeHtml(accountLabel(entry.accountType))} account / Qty ${entry.qty}</span>
        </div>
        <b>${escapeHtml(formatCartMoney(lineTotal))}</b>
      </article>`;
  }

  function renderCheckout() {
    const summary = document.querySelector("[data-checkout-summary]");
    const form = document.querySelector("[data-checkout-form]");
    if (!summary && !form) {
      return;
    }

    const entries = getCartEntries();
    const { subtotal, applied, discount, total } = cartTotals(entries);

    if (!entries.length) {
      if (form) {
        form.hidden = true;
      }
      if (summary) {
        summary.removeAttribute("aria-busy");
        summary.innerHTML = `
          <div class="checkout-empty">
            <p class="section-kicker">Checkout</p>
            <h2>Your cart is empty</h2>
            <p>Add a product before starting checkout.</p>
            <a class="btn btn-primary" href="shop.html">Continue Shopping</a>
          </div>`;
      }
      return;
    }

    if (form) {
      form.hidden = false;
    }

    if (summary) {
      summary.removeAttribute("aria-busy");
      summary.innerHTML = `
        <div class="checkout-summary-card">
          <div class="checkout-summary-heading">
            <p class="section-kicker">Order Summary</p>
            <h2>${entries.length} item${entries.length === 1 ? "" : "s"}</h2>
          </div>
          <div class="checkout-review-list">
            ${entries.map(checkoutItemRow).join("")}
          </div>
          ${couponPanel(entries, subtotal, applied)}
          <div class="checkout-totals">
            <div><span>Subtotal</span><strong>${escapeHtml(formatCartMoney(subtotal))}</strong></div>
            ${discount ? `<div><span>Coupon Discount</span><strong>-${escapeHtml(formatCartMoney(discount))}</strong></div>` : ""}
            <div><span>Support</span><strong>Included</strong></div>
            <div class="checkout-total-row"><span>Total</span><strong>${escapeHtml(formatCartMoney(total))}</strong></div>
          </div>
        </div>`;
    }
    updateCheckoutPaymentFields(form);
  }

  function renderProductDetail() {
    const container = document.querySelector("[data-product-detail]");
    if (!container) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const activeAccess = container.querySelector("[data-product-access-option]:checked");
    const product = findProduct(id) || getActiveProducts()[0];
    container.removeAttribute("aria-busy");
    if (!product) {
      container.innerHTML = `<div class="empty-state"><h2>No product found</h2><p>Add a product from the admin panel first.</p></div>`;
      return;
    }
    const requestedAccess = normalizeAccountType(params.get("access") || (activeAccess && activeAccess.value));
    const availableAccounts = availableProductAccounts(product);
    const selectedAccess = productAccountAvailable(product, requestedAccess) ? requestedAccess : (availableAccounts[0] || requestedAccess);
    const canBuySelected = productAccountAvailable(product, selectedAccess);
    document.title = `${product.name} - SubscribAI`;
    const imageClass = product.imageData ? `has-product-image image-fit-${escapeHtml(product.imageFit)}` : "";
    const imageStyle = product.imageData ? ` style="--product-image-bg: ${escapeHtml(product.imageBgColor)};"` : "";
    const gallery = productGallery(product);
    const media = gallery.length
      ? `<img class="product-detail-image" src="${escapeHtml(gallery[0].data)}" alt="${escapeHtml(gallery[0].alt || product.imageAlt || product.name)}">`
      : `<i class="${escapeHtml(product.iconClass)}"></i>`;
    const detailRows = productDetailRows(product, selectedAccess);
    const tags = productTags(product);
    const categories = productCategories(product);
    const related = relatedProducts(product);
    const accessOptions = ["private", "shared"].map((type) => {
      const checked = type === selectedAccess;
      const available = productAccountAvailable(product, type);
      return `
        <label class="product-access-card${checked ? " active" : ""}${available ? "" : " unavailable"}">
          <input type="radio" name="productAccess" value="${type}" data-product-access-option data-product-id="${escapeHtml(product.id)}"${checked ? " checked" : ""}${available ? "" : " disabled"}>
          <span>
            <strong>${accountLabel(type)} account</strong>
            <small>${available ? escapeHtml(productAccessOptionSummary(product, type)) : "Not available"}</small>
          </span>
          <b>${escapeHtml(productPriceDisplay(product, type))}</b>
        </label>`;
    }).join("");
    container.innerHTML = `
      <nav class="product-breadcrumb" aria-label="Breadcrumb">
        <a href="shop.html">Products</a><i class="fa-solid fa-chevron-right"></i>
        <a href="shop.html">${escapeHtml(productBrand(product))}</a><i class="fa-solid fa-chevron-right"></i>
        <span>${escapeHtml(product.name)}</span>
      </nav>

      <div class="product-detail-main">
        <div class="product-detail-media ${escapeHtml(product.mediaClass)} ${imageClass}"${imageStyle}>
          ${media}
          ${gallery.length > 1 ? `<div class="product-detail-gallery">${gallery.map((image) => `<span><img src="${escapeHtml(image.data)}" alt="${escapeHtml(image.alt || product.name)}"></span>`).join("")}</div>` : ""}
        </div>
        <div class="product-detail-copy">
          <p class="section-kicker">${escapeHtml(product.category)}</p>
          <h1><span>${escapeHtml(product.name)}</span></h1>
          <p class="hero-text" data-product-summary>${escapeHtml(productSummary(product, selectedAccess))}</p>
          <div class="product-access-options" role="radiogroup" aria-label="Choose account type">
            ${accessOptions}
          </div>
          ${availableAccounts.length ? "" : `<p class="product-unavailable-note">This product is currently unavailable. Add a private or shared price in admin to enable orders.</p>`}
          <div class="product-detail-price" data-product-selected-price>${escapeHtml(productPriceDisplay(product, selectedAccess))}</div>
          <dl class="product-spec-table">
            ${detailRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd${label === "Access" ? " data-product-access-spec" : ""}>${escapeHtml(value)}</dd></div>`).join("")}
          </dl>
          <div class="product-purchase-row">
            <div class="product-qty-control">
              <span>${escapeHtml(product.name)} quantity</span>
              <div class="product-qty-stepper">
                <button type="button" data-product-qty-decrease="${escapeHtml(product.id)}" aria-label="Decrease ${escapeHtml(product.name)} quantity"><i class="fa-solid fa-minus"></i></button>
                <input type="number" min="1" max="99" value="1" inputmode="numeric" data-product-quantity="${escapeHtml(product.id)}">
                <button type="button" data-product-qty-increase="${escapeHtml(product.id)}" aria-label="Increase ${escapeHtml(product.name)} quantity"><i class="fa-solid fa-plus"></i></button>
              </div>
            </div>
            <button class="btn btn-primary" type="button" data-add-to-cart="${escapeHtml(product.id)}" data-quantity-input="${escapeHtml(product.id)}" data-product-access="${escapeHtml(selectedAccess)}"${canBuySelected ? "" : " disabled"}>${canBuySelected ? "Add to Cart" : "Unavailable"}</button>
          </div>
          <div class="product-taxonomy">
            <p><strong>Categories:</strong> ${categories.map((category) => `<a href="shop.html">${escapeHtml(category)}</a>`).join(", ")}</p>
            <p><strong>Tags:</strong> ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join(", ")}</p>
            <p><strong>Brand:</strong> <span>${escapeHtml(productBrand(product))}</span></p>
          </div>
        </div>
      </div>

      <div class="product-detail-tabs" aria-label="Product details">
        <a class="active" href="#description">Description</a>
        <a href="#additional-information">Additional information</a>
        <a href="#reviews">Reviews (0)</a>
      </div>

      <section id="description" class="product-long-description" data-product-long-description>
        ${renderLongSections(product, selectedAccess)}
      </section>

      <section id="additional-information" class="product-additional-info">
        <h2>Additional information</h2>
        <div class="detail-list">
          ${detailRows.map(([label, value]) => `<span><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</span>`).join("")}
          ${(product.features || []).map((feature) => `<span><strong>Feature</strong>${escapeHtml(feature)}</span>`).join("")}
        </div>
      </section>

      <section id="reviews" class="product-reviews">
        <h2>Reviews (0)</h2>
        <p>There are no reviews yet.</p>
      </section>

      ${related.length ? `
        <section class="related-products">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Related products</p>
              <h2>You may also like</h2>
            </div>
            <a class="btn btn-small btn-outline" href="shop.html">View Shop</a>
          </div>
          <div class="product-grid shop-product-grid">
            ${related.map(productCardShop).join("")}
          </div>
        </section>` : ""}`;
  }

  function handleProductAccessChange(event) {
    const option = event.target.closest("[data-product-access-option]");
    if (!option) {
      return;
    }
    const product = findProduct(option.dataset.productId);
    if (!product) {
      return;
    }
    const access = normalizeAccountType(option.value);
    const detail = option.closest("[data-product-detail]") || document;
    detail.querySelectorAll(".product-access-card").forEach((card) => {
      const input = card.querySelector("[data-product-access-option]");
      card.classList.toggle("active", input && normalizeAccountType(input.value) === access);
    });
    detail.querySelectorAll("[data-product-selected-price]").forEach((node) => {
      node.textContent = productPriceDisplay(product, access);
    });
    detail.querySelectorAll("[data-product-summary]").forEach((node) => {
      node.textContent = productSummary(product, access);
    });
    detail.querySelectorAll("[data-product-long-description]").forEach((node) => {
      node.innerHTML = renderLongSections(product, access);
    });
    detail.querySelectorAll("[data-product-access-spec]").forEach((node) => {
      node.textContent = product.access
        ? `${product.access}${/private|shared/i.test(product.access) ? "" : ` (${accountLabel(access)} account)`}`
        : `${accountLabel(access)} account`;
    });
    detail.querySelectorAll("[data-add-to-cart][data-product-access]").forEach((button) => {
      if (button.dataset.addToCart === product.id) {
        button.dataset.productAccess = access;
      }
    });
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set("id", product.id);
      url.searchParams.set("access", access);
      window.history.replaceState({}, "", url);
    }
  }

  async function handleCartClick(event) {
    const removeCoupon = event.target.closest("[data-remove-coupon]");
    const paymentStatusButton = event.target.closest("[data-check-payment-status]");
    const proceedCheckout = event.target.closest("[data-proceed-checkout]");
    const add = event.target.closest("[data-add-to-cart]");
    const increase = event.target.closest("[data-cart-increase]");
    const decrease = event.target.closest("[data-cart-decrease]");
    const remove = event.target.closest("[data-cart-remove]");
    const qtyIncrease = event.target.closest("[data-product-qty-increase]");
    const qtyDecrease = event.target.closest("[data-product-qty-decrease]");

    if (qtyIncrease || qtyDecrease) {
      event.preventDefault();
      const quantityId = (qtyIncrease && qtyIncrease.dataset.productQtyIncrease) || (qtyDecrease && qtyDecrease.dataset.productQtyDecrease) || "";
      const selectorId = window.CSS && CSS.escape ? CSS.escape(quantityId) : quantityId.replace(/"/g, '\\"');
      const qtyInput = quantityId ? document.querySelector(`[data-product-quantity="${selectorId}"]`) : null;
      if (qtyInput) {
        const current = Math.max(1, Math.min(99, Number(qtyInput.value || 1) || 1));
        qtyInput.value = String(qtyIncrease ? Math.min(99, current + 1) : Math.max(1, current - 1));
      }
      return;
    }

    if (paymentStatusButton) {
      event.preventDefault();
      const orderId = paymentStatusButton.dataset.checkPaymentStatus;
      const message = document.querySelector("[data-checkout-message]");
      const order = getCheckoutOrders().find((item) => item.id === orderId);
      if (!order) {
        setCheckoutMessage(message, "error", "<strong>Order not found.</strong><span>Open admin orders or start checkout again.</span>");
        return;
      }
      const originalText = paymentStatusButton.textContent;
      paymentStatusButton.disabled = true;
      paymentStatusButton.textContent = "Checking...";
      try {
        const statusResponse = await requestSahulatStatus({
          ...order,
          paymentProvider: paymentStatusButton.dataset.paymentProvider || order.paymentProvider,
          gatewayStatusProvider: paymentStatusButton.dataset.statusProvider || order.gatewayStatusProvider,
          gatewayTransactionId: paymentStatusButton.dataset.transactionId || order.gatewayTransactionId
        });
        const updatedOrder = updateOrderFromGatewayStatus(order.id, statusResponse) || order;
        const label = document.querySelector("[data-payment-status-label]");
        if (label) {
          label.textContent = updatedOrder.status === "paid" ? "Paid" : (updatedOrder.status === "failed" ? "Failed" : "Pending");
        }
        setCheckoutMessage(message, updatedOrder.status === "failed" ? "error" : "success", `
          <strong>Payment status: ${escapeHtml(updatedOrder.status)}</strong>
          <span>${escapeHtml(statusResponse.message || "SahulatPay status updated.")}</span>`);
      } catch (error) {
        setCheckoutMessage(message, "error", `
          <strong>Status check failed.</strong>
          <span>${escapeHtml(error.message)} Try again in a moment.</span>`);
      } finally {
        paymentStatusButton.disabled = false;
        paymentStatusButton.textContent = originalText || "Check Payment Status";
      }
      return;
    }

    if (removeCoupon) {
      event.preventDefault();
      localStorage.removeItem(APPLIED_COUPON_KEY);
      renderCart();
      renderCheckout();
      return;
    }

    if (proceedCheckout) {
      const entries = getCartEntries();
      if (!entries.length) {
        event.preventDefault();
        renderCart();
      }
      return;
    }

    if (add) {
      event.preventDefault();
      const quantityId = add.dataset.quantityInput || "";
      const selectorId = window.CSS && CSS.escape ? CSS.escape(quantityId) : quantityId.replace(/"/g, '\\"');
      const qtyInput = quantityId ? document.querySelector(`[data-product-quantity="${selectorId}"]`) : null;
      const qty = Math.max(1, Math.min(99, Number(qtyInput?.value || 1) || 1));
      const accountType = normalizeAccountType(add.dataset.productAccess);
      const product = findProduct(add.dataset.addToCart);
      if (!product || !productAccountAvailable(product, accountType)) {
        add.innerHTML = add.dataset.iconAction ? `<i class="fa-solid fa-ban"></i>` : "Unavailable";
        add.setAttribute("aria-label", "Unavailable");
        return;
      }
      for (let index = 0; index < qty; index += 1) {
        addToCart(add.dataset.addToCart, accountType);
      }
      const originalHtml = add.dataset.originalHtml || add.innerHTML;
      const originalAriaLabel = add.dataset.originalAriaLabel || add.getAttribute("aria-label") || "Add to cart";
      add.dataset.originalHtml = originalHtml;
      add.dataset.originalAriaLabel = originalAriaLabel;
      add.classList.add("is-added");
      add.setAttribute("aria-label", "Added to cart");
      add.innerHTML = add.dataset.iconAction ? `<i class="fa-solid fa-check"></i>` : "Added";
      setTimeout(() => {
        add.classList.remove("is-added");
        add.innerHTML = add.dataset.originalHtml || originalHtml;
        add.setAttribute("aria-label", add.dataset.originalAriaLabel || originalAriaLabel);
      }, 900);
      window.setTimeout(() => {
        window.location.href = "cart.html";
      }, 180);
    }

    if (increase || decrease || remove) {
      const cart = getCart();
      const id = (increase && increase.dataset.cartIncrease) || (decrease && decrease.dataset.cartDecrease) || (remove && remove.dataset.cartRemove);
      if (increase) {
        cart[id] = Number(cart[id] || 0) + 1;
      }
      if (decrease) {
        cart[id] = Math.max(0, Number(cart[id] || 0) - 1);
      }
      if (remove || cart[id] === 0) {
        delete cart[id];
      }
      saveCart(cart);
    }
  }

  function handleCouponSubmit(event) {
    const form = event.target.closest("[data-coupon-form]");
    if (!form) {
      return;
    }
    event.preventDefault();
    const code = String(form.elements.couponCode?.value || "").trim().toUpperCase().replace(/\s+/g, "");
    const cart = getCart();
    const entries = getCartEntries(cart);
    const subtotal = entries.reduce((sum, entry) => sum + productPriceAmount(entry.product, entry.accountType).value * entry.qty, 0);
    const result = validateCoupon(code, subtotal);
    if (result.valid) {
      localStorage.setItem(APPLIED_COUPON_KEY, result.coupon.code);
    } else if (code) {
      localStorage.setItem(APPLIED_COUPON_KEY, code);
    } else {
      localStorage.removeItem(APPLIED_COUPON_KEY);
    }
    renderCart();
    renderCheckout();
  }

  function checkoutApiPath(path) {
    return window.location.protocol === "file:" ? path.replace(/^\//, "") : path;
  }

  function setCheckoutMessage(message, type, html) {
    if (!message) {
      return;
    }
    message.className = `checkout-message ${type}`;
    message.innerHTML = html;
  }

  function updateCheckoutPaymentFields(form = document.querySelector("[data-checkout-form]")) {
    if (!form || !form.elements || !form.elements.paymentProvider) {
      return;
    }
    const provider = normalizePaymentProvider(form.elements.paymentProvider.value);
    const walletRequired = isWalletProvider(provider);
    const walletField = form.querySelector("[data-wallet-phone-field]");
    const walletInput = form.elements.walletPhone;
    const help = form.querySelector("[data-payment-help]");
    const submitButton = form.querySelector("button[type='submit']");
    if (walletField) {
      walletField.hidden = !walletRequired;
    }
    if (walletInput) {
      walletInput.required = walletRequired;
      walletInput.disabled = !walletRequired;
      if (!walletRequired) {
        walletInput.value = "";
      }
    }
    if (help) {
      help.textContent = walletRequired
        ? "Wallet payments send a mobile approval request to your JazzCash or Easypaisa account. If no prompt appears, open the wallet app or check SMS/USSD, then use Check Payment Status."
        : "Card payment opens SahulatPay's secure hosted page where the customer completes payment in the browser.";
    }
    if (submitButton && !submitButton.disabled) {
      submitButton.innerHTML = provider === "card"
        ? `Pay by Card <i class="fa-solid fa-arrow-right"></i>`
        : `Pay with SahulatPay <i class="fa-solid fa-arrow-right"></i>`;
    }
  }

  function handleCheckoutPaymentChange(event) {
    const field = event.target.closest("[name='paymentProvider']");
    if (field && field.form) {
      updateCheckoutPaymentFields(field.form);
    }
  }

  async function requestSahulatPayment(payload) {
    const response = await fetch(checkoutApiPath("/api/create-payment"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const detailParts = [
        data.message,
        data.hint,
        data.gatewayHttpStatus ? `Gateway HTTP ${data.gatewayHttpStatus}.` : "",
        data.gatewayStatus ? `Gateway status ${data.gatewayStatus}.` : ""
      ].filter(Boolean);
      const error = new Error(detailParts.join(" ") || "SahulatPay payment could not be started.");
      error.data = data;
      throw error;
    }
    return data;
  }

  async function requestSahulatStatus(order) {
    const params = new URLSearchParams({
      orderId: order.id,
      provider: order.gatewayStatusProvider || order.statusProvider || order.paymentProvider || "jazzcash"
    });
    if (order.gatewayTransactionId) {
      params.set("transactionId", order.gatewayTransactionId);
    }
    const response = await fetch(checkoutApiPath(`/api/payment-status?${params.toString()}`));
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || "Could not check payment status.");
      error.data = data;
      throw error;
    }
    return data;
  }

  function renderGatewayProcessing(summary, order, totals, placedItems, gatewayResponse = {}) {
    if (!summary || !order) {
      return;
    }
    const paymentStatus = gatewayResponse.paymentStatus || "pending";
    const orderStatus = orderStatusFromPayment(paymentStatus);
    const statusLabel = orderStatus === "paid" ? "Paid" : (orderStatus === "failed" ? "Failed" : "Pending");
    const isCardPayment = normalizePaymentProvider(order.paymentProvider) === "card";
    const gatewayMode = gatewayResponse.gatewayMode || order.gatewayMode || "";
    const isHostedFallback = gatewayMode.startsWith("hosted-fallback");
    const usesHostedPage = isCardPayment || isHostedFallback;
    const gatewayReference = order.gatewayOrderId || gatewayResponse.gatewayOrderId || order.gatewayTransactionId || "";
    const walletRow = isWalletProvider(order.paymentProvider)
      ? `<div><span>Wallet</span><strong>${escapeHtml(order.walletPhone || "")}</strong></div>`
      : "";
    const redirectLink = gatewayResponse.redirectUrl
      ? `<a class="btn btn-outline" href="${escapeHtml(gatewayResponse.redirectUrl)}" target="_blank" rel="noopener">${usesHostedPage ? "Open Secure Payment Page" : "Open Payment Page"}</a>`
      : "";
    summary.innerHTML = `
      <div class="checkout-success-card">
        <p class="section-kicker">SahulatPay</p>
        <h2>Payment is processing</h2>
        <p>${usesHostedPage
          ? "Your SahulatPay payment link is ready. Complete payment there, then return and check the status."
          : `Your ${escapeHtml(paymentProviderLabel(order.paymentProvider))} wallet payment has been started. Approve it in your wallet app, SMS, or USSD prompt.`} Keep this order ID for support.</p>
        <div class="checkout-totals">
          <div><span>Order ID</span><strong>${escapeHtml(order.id)}</strong></div>
          ${gatewayReference && gatewayReference !== order.id ? `<div><span>Payment Ref</span><strong>${escapeHtml(gatewayReference)}</strong></div>` : ""}
          <div><span>Items</span><strong>${escapeHtml(placedItems)}</strong></div>
          <div class="checkout-total-row"><span>Total</span><strong>${escapeHtml(formatCartMoney(totals.total))}</strong></div>
          <div><span>Provider</span><strong>${escapeHtml(paymentMethodLabel(order.paymentProvider))}</strong></div>
          ${walletRow}
          <div><span>Status</span><strong data-payment-status-label>${escapeHtml(statusLabel)}</strong></div>
        </div>
        <div class="hero-buttons">
          <button class="btn btn-primary" type="button" data-check-payment-status="${escapeHtml(order.id)}" data-payment-provider="${escapeHtml(order.paymentProvider || "")}" data-status-provider="${escapeHtml(order.gatewayStatusProvider || gatewayResponse.statusProvider || "")}" data-transaction-id="${escapeHtml(order.gatewayTransactionId || "")}">Check Payment Status</button>
          ${redirectLink}
          <a class="btn btn-outline" href="contact.html">Contact Support</a>
        </div>
      </div>`;
  }

  function updateOrderFromGatewayStatus(orderId, statusResponse) {
    const paymentStatus = statusResponse.paymentStatus || "pending";
    return updateCheckoutOrder(orderId, {
      status: orderStatusFromPayment(paymentStatus),
      gatewayStatus: paymentStatus,
      gatewayResponse: statusResponse.gatewayResponse || statusResponse,
      notes: `Latest SahulatPay status: ${paymentStatus}.`
    });
  }

  async function handleCheckoutSubmit(event) {
    const form = event.target.closest("[data-checkout-form]");
    if (!form) {
      return;
    }
    event.preventDefault();
    const message = document.querySelector("[data-checkout-message]");
    const entries = getCartEntries();
    const totals = cartTotals(entries);

    if (!entries.length) {
      if (message) {
        message.className = "checkout-message error";
        message.textContent = "Your cart is empty. Add a product before checkout.";
      }
      renderCheckout();
      return;
    }

    const paymentProvider = normalizePaymentProvider(form.elements.paymentProvider.value);
    const walletRequired = isWalletProvider(paymentProvider);
    const walletPhone = form.elements.walletPhone ? form.elements.walletPhone.value.trim() : "";
    const customerInfo = {
      name: form.elements.customerName.value.trim(),
      email: form.elements.customerEmail.value.trim(),
      phone: form.elements.customerPhone.value.trim(),
      whatsapp: form.elements.customerWhatsapp.value.trim(),
      paymentProvider,
      walletPhone: walletRequired ? walletPhone : "",
      paymentMethod: paymentMethodLabel(paymentProvider),
      notes: form.elements.orderNotes.value.trim()
    };

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      if (message) {
        message.className = "checkout-message error";
        message.textContent = "Please enter your name, email, and phone number.";
      }
      return;
    }

    if (!paymentProvider) {
      if (message) {
        message.className = "checkout-message error";
        message.textContent = "Please choose JazzCash, Easypaisa, or Card.";
      }
      return;
    }

    if (walletRequired && !walletPhoneValid(walletPhone)) {
      if (message) {
        message.className = "checkout-message error";
        message.textContent = "Wallet phone must be in 03XXXXXXXXX format.";
      }
      return;
    }

    if (!form.elements.checkoutTerms.checked) {
      if (message) {
        message.className = "checkout-message error";
        message.textContent = "Please confirm the order details before placing the order.";
      }
      return;
    }

    const amount = gatewayAmount(totals.total);
    if (!amount) {
      if (message) {
        message.className = "checkout-message error";
        message.textContent = "Payment amount is invalid.";
      }
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = `Starting payment <i class="fa-solid fa-spinner"></i>`;
    }
    setCheckoutMessage(message, "success", "<strong>Starting SahulatPay payment...</strong><span>Please wait while we connect your selected payment method.</span>");

    const orderId = createSahulatPayOrderId();
    const order = saveCheckoutOrder(entries, totals.total, {
      ...customerInfo,
      orderId,
      status: "pending",
      gatewayStatus: "creating"
    });
    const summary = document.querySelector("[data-checkout-summary]");
    const placedItems = cartItemSummary(entries);

    try {
      const gatewayResponse = await requestSahulatPayment({
        provider: paymentProvider,
        amount,
        phone: walletRequired ? walletPhone : "",
        email: customerInfo.email,
        orderId,
        storeName: "SubscribAI",
        redirectUrl: window.location.origin && !/^file:|^null$/i.test(window.location.origin) ? `${window.location.origin}/api/sahulatpay-callback` : ""
      });
      const updatedOrder = updateCheckoutOrder(order.id, {
        status: orderStatusFromPayment(gatewayResponse.paymentStatus),
        gatewayStatus: gatewayResponse.gatewayStatus || gatewayResponse.paymentStatus || "pending",
        gatewayTransactionId: gatewayResponse.transactionId || order.id,
        gatewayOrderId: gatewayResponse.gatewayOrderId || gatewayResponse.transactionId || order.id,
        gatewayStatusProvider: gatewayResponse.statusProvider || paymentProvider,
        gatewayMode: gatewayResponse.gatewayMode || "",
        gatewayResponse,
        notes: `SahulatPay ${paymentMethodLabel(paymentProvider)} payment started.`
      }) || order;

      markCouponUsed(totals.applied);
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(APPLIED_COUPON_KEY);
      form.reset();
      form.hidden = true;
      updateCartBadges();
      document.querySelectorAll("[data-cart-label]").forEach((node) => {
        node.textContent = "Payment is processing";
      });
      renderGatewayProcessing(summary, updatedOrder, totals, placedItems, gatewayResponse);
      const usesHostedPage = paymentProvider === "card" || String(gatewayResponse.gatewayMode || "").startsWith("hosted-fallback");
      const autoOpenHostedPage = paymentProvider === "card";
      setCheckoutMessage(message, "success", `
        <strong>Payment is processing.</strong>
        <span>${usesHostedPage
          ? (autoOpenHostedPage
            ? `Your payment page is opening. If it does not open, use the Open Secure Payment Page button. Order ID: ${escapeHtml(order.id)}.`
            : `Wallet push is not available for this transaction, so use the Open Secure Payment Page button. Order ID: ${escapeHtml(order.id)}.`)
          : `Your order ID is ${escapeHtml(order.id)}. Approve the request in your wallet app, SMS, or USSD prompt, then use the status button to confirm payment.`}</span>`);
      if (autoOpenHostedPage && gatewayResponse.redirectUrl) {
        window.setTimeout(() => {
          window.location.href = gatewayResponse.redirectUrl;
        }, 700);
      }
    } catch (error) {
      updateCheckoutOrder(order.id, {
        status: "failed",
        gatewayStatus: "failed",
        gatewayResponse: error.data || { message: error.message },
        notes: `SahulatPay start failed: ${error.message}.`
      });
      setCheckoutMessage(message, "error", `
        <strong>Payment could not start.</strong>
        <span>${escapeHtml(error.message)} Your cart is still saved here, so you can retry or contact support.</span>
        <a class="btn btn-small btn-outline" href="contact.html">Contact Support</a>`);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = `Pay with SahulatPay <i class="fa-solid fa-arrow-right"></i>`;
      }
    }
  }

  function hidePageLoader() {
    if (pageLoaderHidden) {
      return;
    }
    pageLoaderHidden = true;

    const startedAt = window.SubscribAIPageLoadStartedAt || Date.now();
    const elapsed = Date.now() - startedAt;
    const delay = Math.max(0, 650 - elapsed);

    window.setTimeout(() => {
      if (document.body) {
        document.body.classList.add("page-loaded");
      }
    }, delay);
  }

  function showPageLoaderForNavigation(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link || link.target || link.hasAttribute("download")) {
      return;
    }

    const url = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);
    const isSameDocumentHash = url.pathname === current.pathname && url.search === current.search && url.hash;
    const isPageLink = ["file:", "http:", "https:"].includes(url.protocol);

    if (isPageLink && !isSameDocumentHash && document.body) {
      document.body.classList.remove("page-loaded");
    }
  }

  function parseStatValue(text) {
    const value = String(text || "").trim();
    const numberMatch = value.match(/[\d.]+/);
    const number = numberMatch ? Number(numberMatch[0]) : 0;
    const prefix = numberMatch ? value.slice(0, numberMatch.index) : "";
    const suffix = numberMatch ? value.slice(numberMatch.index + numberMatch[0].length) : value;
    const decimals = numberMatch && numberMatch[0].includes(".") ? numberMatch[0].split(".")[1].length : 0;
    return { number, prefix, suffix, decimals, original: value };
  }

  function formatStatValue(value, stat) {
    const fixed = stat.decimals ? value.toFixed(stat.decimals) : String(Math.round(value));
    return `${stat.prefix}${fixed}${stat.suffix}`;
  }

  function animateStatNumber(node) {
    if (!node || node.dataset.statAnimated === "true") {
      return;
    }
    const stat = parseStatValue(node.dataset.statFinal || node.textContent);
    if (!stat.number) {
      return;
    }
    node.dataset.statAnimated = "true";
    node.dataset.statFinal = stat.original;
    const duration = 1200;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatStatValue(stat.number * eased, stat);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        node.textContent = stat.original;
      }
    }

    node.textContent = formatStatValue(0, stat);
    requestAnimationFrame(frame);
  }

  function bootStatsAnimation() {
    const stats = Array.from(document.querySelectorAll(".stats-grid strong"));
    if (!stats.length) {
      return;
    }
    stats.forEach((node) => {
      node.dataset.statFinal = node.textContent.trim();
    });

    if (!("IntersectionObserver" in window)) {
      stats.forEach(animateStatNumber);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.querySelectorAll("strong").forEach(animateStatNumber);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    document.querySelectorAll(".stats-section, .stats-grid").forEach((section) => {
      observer.observe(section);
    });
  }

  function bootMobileMenu() {
    const header = document.querySelector(".site-header");
    const navWrap = header && header.querySelector(".nav-wrap");
    const navLinks = navWrap && navWrap.querySelector(".nav-links");
    const navActions = navWrap && navWrap.querySelector(".nav-actions");

    if (!header || !navWrap || !navLinks || !navActions) {
      return;
    }

    let panel = navWrap.querySelector(".mobile-menu-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "mobile-menu-panel";
      panel.id = "mobile-site-menu";
      navWrap.insertBefore(panel, navLinks);
      panel.appendChild(navLinks);
      panel.appendChild(navActions);
    }

    if (!panel.id) {
      panel.id = "mobile-site-menu";
    }

    let panelHeader = panel.querySelector(".mobile-menu-heading");
    if (!panelHeader) {
      panelHeader = document.createElement("div");
      panelHeader.className = "mobile-menu-heading";
      panel.insertBefore(panelHeader, panel.firstChild);
    }
    if (!panelHeader.querySelector(".mobile-menu-close")) {
      panelHeader.innerHTML = `
        <span>Menu</span>
        <button class="mobile-menu-close" type="button" aria-label="Close menu">
          <i class="fa-solid fa-xmark"></i>
        </button>`;
    }

    let toggle = navWrap.querySelector(".mobile-menu-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.className = "mobile-menu-toggle";
      toggle.type = "button";
      toggle.innerHTML = "<span></span><span></span><span></span>";
      navWrap.appendChild(toggle);
    }
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-controls", panel.id);
    toggle.setAttribute("aria-expanded", "false");

    let mobileCart = navWrap.querySelector(".mobile-header-cart");
    if (!mobileCart) {
      mobileCart = document.createElement("a");
      mobileCart.className = "mobile-header-cart";
      mobileCart.href = "cart.html";
      mobileCart.setAttribute("aria-label", "Cart");
      mobileCart.innerHTML = `<i class="fa-solid fa-cart-shopping"></i><span data-cart-count>0</span>`;
      navWrap.insertBefore(mobileCart, toggle);
    }

    let backdrop = header.querySelector(".mobile-menu-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("button");
      backdrop.className = "mobile-menu-backdrop";
      backdrop.type = "button";
      backdrop.setAttribute("aria-label", "Close menu");
      header.appendChild(backdrop);
    }

    if (toggle.dataset.menuReady === "true") {
      return;
    }
    toggle.dataset.menuReady = "true";

    const closeButton = panel.querySelector(".mobile-menu-close");
    toggle.onclick = null;
    closeButton.onclick = null;
    backdrop.onclick = null;

    function setOpen(open) {
      panel.style.transform = "";
      document.body.classList.toggle("mobile-menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", () => {
      setOpen(!document.body.classList.contains("mobile-menu-open"));
    });

    closeButton.addEventListener("click", () => setOpen(false));
    backdrop.addEventListener("click", () => setOpen(false));
    navLinks.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });
    navActions.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  }

  function boot() {
    bootMobileMenu();
    renderInitialSkeletons();
    captureTrafficSource();
    renderFooterSocialLinks();
    renderProductGrids();
    renderFreebieCategories();
    renderFreebieGrids();
    renderShopCatalog();
    renderProductDetail();
    renderCart();
    renderCheckout();
    updateCartBadges();
    bootStatsAnimation();
    document.addEventListener("click", handleCartClick);
    document.addEventListener("change", handleProductAccessChange);
    document.addEventListener("change", handleCheckoutPaymentChange);
    document.addEventListener("submit", handleCouponSubmit);
    document.addEventListener("submit", handleCheckoutSubmit);
    document.addEventListener("click", showPageLoaderForNavigation);
    refreshExchangeRate();
  }

  window.SubscribAIProducts = {
    PRODUCTS_KEY,
    FREEBIES_KEY,
    CART_KEY,
    SETTINGS_KEY,
    COUPONS_KEY,
    APPLIED_COUPON_KEY,
    EXCHANGE_RATE_KEY,
    TRAFFIC_SOURCE_KEY,
    TRAFFIC_SUMMARY_KEY,
    defaultProducts: clone(defaultProducts),
    defaultFreebies: clone(defaultFreebies),
    defaultCoupons: clone(defaultCoupons),
    escapeHtml,
    slugify,
    getProducts,
    saveProducts,
    resetProducts,
    getActiveProducts,
    findProduct,
    getSiteSettings,
    getCurrentTrafficSource,
    getTrafficSummary,
    productPriceDisplay,
    productCardPrice,
    getCoupons,
    saveCoupons,
    resetCoupons,
    getFreebies,
    saveFreebies,
    resetFreebies,
    getActiveFreebies,
    renderFooterSocialLinks,
    renderFreebieCategories,
    renderFreebieGrids,
    renderProductGrids,
    renderProductDetail,
    renderCart,
    renderCheckout,
    updateCartBadges
  };

  if (document.readyState === "loading") {
    bootMobileMenu();
    renderInitialSkeletons();
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    renderInitialSkeletons();
    boot();
  }

  if (document.readyState === "complete") {
    hidePageLoader();
  } else {
    window.addEventListener("load", hidePageLoader, { once: true });
    window.setTimeout(hidePageLoader, 1200);
  }
})();
