(function () {
  "use strict";

  const api = window.SubscribAIProducts || {};
  const adminPage = document.body ? document.body.dataset.adminPage : "";

  const KEYS = {
    orders: "subscribai.admin.orders.v1",
    customers: "subscribai.admin.customers.v1",
    pages: "subscribai.admin.pages.v1",
    settings: "subscribai.admin.settings.v1"
  };

  const defaultOrders = [
    {
      id: "ORD-1048",
      customerName: "Ayesha Khan",
      customerEmail: "ayesha@example.com",
      productId: "chatgpt-plus-plan",
      status: "fulfilled",
      total: "$19",
      date: "2026-04-26",
      channel: "Website",
      notes: "Delivered onboarding notes and access details."
    },
    {
      id: "ORD-1047",
      customerName: "Hamza Ali",
      customerEmail: "hamza@example.com",
      productId: "automation-starter-pack",
      status: "processing",
      total: "$29",
      date: "2026-04-25",
      channel: "WhatsApp",
      notes: "Asked for help setting up the scheduling template."
    },
    {
      id: "ORD-1046",
      customerName: "Sara Malik",
      customerEmail: "sara@example.com",
      productId: "prompt-engineering-masterclass",
      status: "paid",
      total: "$24",
      date: "2026-04-24",
      channel: "Website",
      notes: "Send course login and bonus prompt sheet."
    },
    {
      id: "ORD-1045",
      customerName: "Bilal Ahmed",
      customerEmail: "bilal@example.com",
      productId: "ai-workspace-templates",
      status: "pending",
      total: "$18",
      date: "2026-04-23",
      channel: "Website",
      notes: "Waiting for payment confirmation."
    },
    {
      id: "ORD-1044",
      customerName: "Mina Roberts",
      customerEmail: "mina@example.com",
      productId: "canva-pro-access",
      status: "refunded",
      total: "$8",
      date: "2026-04-22",
      channel: "Email",
      notes: "Customer purchased duplicate access."
    }
  ];

  const defaultCustomers = [
    {
      id: "ayesha-khan",
      name: "Ayesha Khan",
      email: "ayesha@example.com",
      segment: "Creator",
      status: "active",
      source: "Website",
      orders: 4,
      spend: 78,
      lastOrder: "2026-04-26",
      notes: "Interested in creative bundles and weekly prompt resources."
    },
    {
      id: "hamza-ali",
      name: "Hamza Ali",
      email: "hamza@example.com",
      segment: "Startup",
      status: "active",
      source: "WhatsApp",
      orders: 3,
      spend: 117,
      lastOrder: "2026-04-25",
      notes: "Team account buyer. Prefers automation and shared workspace tools."
    },
    {
      id: "sara-malik",
      name: "Sara Malik",
      email: "sara@example.com",
      segment: "Student",
      status: "lead",
      source: "Freebie",
      orders: 1,
      spend: 24,
      lastOrder: "2026-04-24",
      notes: "Started from the prompt guide and bought the masterclass."
    },
    {
      id: "bilal-ahmed",
      name: "Bilal Ahmed",
      email: "bilal@example.com",
      segment: "Operations",
      status: "lead",
      source: "Website",
      orders: 1,
      spend: 18,
      lastOrder: "2026-04-23",
      notes: "Needs follow-up after pending order clears."
    },
    {
      id: "mina-roberts",
      name: "Mina Roberts",
      email: "mina@example.com",
      segment: "Designer",
      status: "paused",
      source: "Email",
      orders: 2,
      spend: 31,
      lastOrder: "2026-04-22",
      notes: "Refunded one duplicate order. Keep support history visible."
    }
  ];

  const defaultPages = [
    {
      id: "home",
      title: "Home",
      url: "index.html",
      seoTitle: "SubscribAI - Premium AI Tools Subscription",
      hero: "Your Hub for Premium AI Tools & Subscriptions",
      status: "published",
      priority: "High",
      owner: "Marketing",
      updated: "2026-04-24",
      notes: "Keep the first screen focused on premium AI access."
    },
    {
      id: "shop",
      title: "Shop",
      url: "shop.html",
      seoTitle: "Shop - SubscribAI",
      hero: "Shop AI Tools & Digital Bundles",
      status: "published",
      priority: "High",
      owner: "Catalog",
      updated: "2026-04-24",
      notes: "Product grid is powered by the product manager."
    },
    {
      id: "freebies",
      title: "Freebies",
      url: "freebies.html",
      seoTitle: "Freebies - SubscribAI",
      hero: "Free AI Resources",
      status: "published",
      priority: "Medium",
      owner: "Marketing",
      updated: "2026-04-21",
      notes: "Review free resources monthly."
    },
    {
      id: "blog",
      title: "Blog",
      url: "blog.html",
      seoTitle: "Blog - SubscribAI",
      hero: "Guides, Tips & Tool Updates",
      status: "review",
      priority: "Medium",
      owner: "Content",
      updated: "2026-04-20",
      notes: "Add more detailed article pages after content approval."
    },
    {
      id: "contact",
      title: "Contact",
      url: "contact.html",
      seoTitle: "Contact - SubscribAI",
      hero: "Need Help Choosing An AI Plan?",
      status: "published",
      priority: "High",
      owner: "Support",
      updated: "2026-04-22",
      notes: "Phone, email, and WhatsApp links should match settings."
    },
    {
      id: "account",
      title: "Account",
      url: "account.html",
      seoTitle: "Account - SubscribAI",
      hero: "Manage Your SubscribAI Access",
      status: "draft",
      priority: "Low",
      owner: "Product",
      updated: "2026-04-18",
      notes: "Ready for real login integration."
    }
  ];

  const defaultSettings = {
    storeName: "SubscribAI",
    currency: "USD",
    usdPkrRate: 280,
    supportEmail: "contact@subscribai.com",
    phone: "+1 555 013 2026",
    whatsapp: "+1 555 013 2026",
    location: "SubscribAI, Pakistan",
    announcement: "Premium AI subscriptions, bundles, and support are available now.",
    instagramUrl: "https://www.instagram.com/subscribai",
    facebookUrl: "https://www.facebook.com/subscribai",
    whatsappUrl: "https://wa.me/15550132026",
    linkedinUrl: "https://www.linkedin.com/company/subscribai",
    checkoutMode: "manual",
    defaultOrderStatus: "pending",
    orderNotifications: true,
    supportNotifications: true,
    showLaunchBanner: false,
    maintenanceMode: false
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    if (api.escapeHtml) {
      return api.escapeHtml(value);
    }
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value) {
    if (api.slugify) {
      return api.slugify(value);
    }
    return String(value || "item")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  }

  function parseMoney(value) {
    const match = String(value || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function formatMoney(value) {
    const number = Number(value || 0);
    return `$${number.toLocaleString("en-US", {
      maximumFractionDigits: number % 1 === 0 ? 0 : 2
    })}`;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function readStorage(key, fallback) {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      return stored || clone(fallback);
    } catch (error) {
      return clone(fallback);
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function copyText(text) {
    navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {});
  }

  function notify(target, text) {
    if (target) {
      target.textContent = text;
    }
  }

  function getProducts() {
    return api.getProducts ? api.getProducts() : [];
  }

  function findProduct(id) {
    return api.findProduct ? api.findProduct(id) : getProducts().find((product) => product.id === id);
  }

  function productName(id) {
    const product = findProduct(id);
    return product ? product.name : "Unassigned product";
  }

  function normalizeOrder(order) {
    const product = findProduct(order.productId);
    const allowed = ["pending", "paid", "processing", "failed", "fulfilled", "refunded"];
    const paymentProvider = ["jazzcash", "easypaisa", "card"].includes(order.paymentProvider) ? order.paymentProvider : "";
    const providerLabel = paymentProvider === "easypaisa" ? "Easypaisa" : (paymentProvider === "card" ? "Card" : (paymentProvider === "jazzcash" ? "JazzCash" : ""));
    return {
      id: String(order.id || createOrderId()).toUpperCase(),
      customerName: order.customerName || "Guest Customer",
      customerEmail: order.customerEmail || "customer@example.com",
      productId: order.productId || (getProducts()[0] && getProducts()[0].id) || "",
      status: allowed.includes(order.status) ? order.status : "pending",
      total: order.total || (product && product.price) || "$0",
      totalAmount: Number(order.totalAmount || 0),
      date: order.date || today(),
      channel: order.channel || order.source || "Website",
      source: order.source || order.channel || "Website",
      phone: order.phone || "",
      whatsapp: order.whatsapp || "",
      paymentMethod: order.paymentMethod || (paymentProvider ? (paymentProvider === "card" ? "Debit / Credit Card" : `${providerLabel} Wallet`) : ""),
      paymentProvider,
      providerLabel: order.providerLabel || providerLabel,
      walletPhone: order.walletPhone || "",
      gatewayOrderId: order.gatewayOrderId || "",
      gatewayTransactionId: order.gatewayTransactionId || "",
      gatewayStatusProvider: order.gatewayStatusProvider || order.statusProvider || paymentProvider,
      gatewayMode: order.gatewayMode || "",
      gatewayStatus: order.gatewayStatus || "",
      gatewayResponse: order.gatewayResponse || null,
      notes: order.notes || ""
    };
  }

  function normalizeCustomer(customer) {
    const allowed = ["active", "lead", "paused"];
    return {
      id: slugify(customer.id || customer.email || customer.name),
      name: customer.name || "Unnamed Customer",
      email: customer.email || "customer@example.com",
      segment: customer.segment || "General",
      status: allowed.includes(customer.status) ? customer.status : "lead",
      source: customer.source || "Website",
      orders: Number(customer.orders || 0),
      spend: Number(customer.spend || 0),
      lastOrder: customer.lastOrder || "",
      notes: customer.notes || ""
    };
  }

  function normalizePage(page) {
    const allowed = ["published", "draft", "review"];
    return {
      id: slugify(page.id || page.title || page.url),
      title: page.title || "Untitled Page",
      url: page.url || "#",
      seoTitle: page.seoTitle || page.title || "",
      hero: page.hero || "",
      status: allowed.includes(page.status) ? page.status : "draft",
      priority: page.priority || "Medium",
      owner: page.owner || "Admin",
      updated: page.updated || today(),
      notes: page.notes || ""
    };
  }

  function normalizeSettings(settings) {
    const source = settings || defaultSettings;
    return {
      ...clone(defaultSettings),
      ...(settings || {}),
      usdPkrRate: Number.isFinite(Number(source.usdPkrRate)) && Number(source.usdPkrRate) > 0 ? Number(source.usdPkrRate) : defaultSettings.usdPkrRate,
      orderNotifications: Boolean(source.orderNotifications),
      supportNotifications: Boolean(source.supportNotifications),
      showLaunchBanner: Boolean(source.showLaunchBanner),
      maintenanceMode: Boolean(source.maintenanceMode)
    };
  }

  function getOrders() {
    const stored = readStorage(KEYS.orders, defaultOrders);
    return Array.isArray(stored) ? stored.map(normalizeOrder) : clone(defaultOrders).map(normalizeOrder);
  }

  function saveOrders(orders) {
    return writeStorage(KEYS.orders, orders.map(normalizeOrder));
  }

  function resetOrders() {
    localStorage.removeItem(KEYS.orders);
    return getOrders();
  }

  function getCustomers() {
    const stored = readStorage(KEYS.customers, defaultCustomers);
    return Array.isArray(stored) ? stored.map(normalizeCustomer) : clone(defaultCustomers).map(normalizeCustomer);
  }

  function saveCustomers(customers) {
    return writeStorage(KEYS.customers, customers.map(normalizeCustomer));
  }

  function resetCustomers() {
    localStorage.removeItem(KEYS.customers);
    return getCustomers();
  }

  function getPages() {
    const stored = readStorage(KEYS.pages, defaultPages);
    return Array.isArray(stored) ? stored.map(normalizePage) : clone(defaultPages).map(normalizePage);
  }

  function savePages(pages) {
    return writeStorage(KEYS.pages, pages.map(normalizePage));
  }

  function resetPages() {
    localStorage.removeItem(KEYS.pages);
    return getPages();
  }

  function getSettings() {
    return normalizeSettings(readStorage(KEYS.settings, defaultSettings));
  }

  function saveSettings(settings) {
    return writeStorage(KEYS.settings, normalizeSettings(settings));
  }

  function resetSettings() {
    localStorage.removeItem(KEYS.settings);
    return getSettings();
  }

  function createOrderId() {
    const stored = readStorage(KEYS.orders, defaultOrders);
    const next = (Array.isArray(stored) ? stored : defaultOrders)
      .map((order) => Number(String(order.id).replace(/\D/g, "")))
      .filter(Boolean)
      .reduce((max, number) => Math.max(max, number), 1048) + 1;
    return `ORD-${next}`;
  }

  function createCustomerId(name, email) {
    return slugify(email || name || `customer-${Date.now()}`);
  }

  function statusPill(status) {
    const label = String(status || "").replace(/-/g, " ");
    return `<span class="status-pill status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
  }

  function activateAdminNav() {
    document.querySelectorAll("[data-admin-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.adminNav === adminPage);
    });
  }

  function bootProductPage() {
    const form = document.querySelector("#product-form");
    const list = document.querySelector("[data-admin-product-list]");
    const count = document.querySelector("[data-admin-count]");
    const search = document.querySelector("[data-admin-search]");
    const message = document.querySelector("[data-admin-message]");
    const title = document.querySelector("#admin-form-title");
    const importArea = document.querySelector("[data-import-products]");
    const imagePreview = document.querySelector("[data-image-preview]");

    let selectedImageData = "";
    let selectedImageName = "";
    let selectedImages = [];
    let imageProcessing = false;

    if (!api || !api.getProducts || !form || !list) {
      return;
    }

    function renderImagePreview(product) {
      const imageData = selectedImageData || (product && product.imageData) || "";
      const images = selectedImages.length
        ? selectedImages
        : (imageData ? [{ data: imageData, name: selectedImageName || (product && product.imageName) || "", alt: form.elements.imageAlt.value || "Product image" }] : []);
      const imageFit = form.elements.imageFit ? form.elements.imageFit.value : (product && product.imageFit) || "contain";
      const imageBgColor = form.elements.imageBgColor ? form.elements.imageBgColor.value : (product && product.imageBgColor) || "#ffffff";
      if (!imagePreview) {
        return;
      }
      imagePreview.className = `image-preview image-fit-${imageFit === "cover" ? "cover" : "contain"}`;
      imagePreview.style.setProperty("--product-image-bg", imageBgColor || "#ffffff");
      if (images.length) {
        imagePreview.innerHTML = `<div class="image-preview-gallery">${images.map((image, index) => `<span><img src="${escapeHtml(image.data)}" alt="${escapeHtml(image.alt || form.elements.imageAlt.value || "Product image")}"><small>${index + 1}</small></span>`).join("")}</div>`;
      } else {
        imagePreview.innerHTML = "<span>No image uploaded</span>";
      }
    }

    function currentProducts() {
      return api.getProducts();
    }

    function fillForm(product) {
      form.elements.id.value = product.id || "";
      form.elements.name.value = product.name || "";
      form.elements.price.value = product.price || "";
      form.elements.privatePrice.value = product.privatePrice || "";
      form.elements.sharedPrice.value = product.sharedPrice || "";
      form.elements.privateAvailable.checked = product.privateAvailable !== false && Boolean(product.privatePrice || product.price);
      form.elements.sharedAvailable.checked = product.sharedAvailable !== false && Boolean(product.sharedPrice || product.price);
      form.elements.tag.value = product.tag || "";
      form.elements.category.value = product.category || "";
      form.elements.plan.value = product.plan || "";
      form.elements.duration.value = product.duration || "";
      form.elements.activation.value = product.activation || "";
      form.elements.access.value = product.access || "";
      form.elements.warranty.value = product.warranty || "";
      form.elements.description.value = product.description || "";
      form.elements.details.value = product.details || "";
      form.elements.privateDescription.value = product.privateDescription || product.description || "";
      form.elements.privateDetails.value = product.privateDetails || product.details || "";
      form.elements.sharedDescription.value = product.sharedDescription || product.description || "";
      form.elements.sharedDetails.value = product.sharedDetails || product.details || "";
      form.elements.features.value = (product.features || []).join("\n");
      form.elements.imageAlt.value = product.imageAlt || product.name || "";
      form.elements.imageBgColor.value = product.imageBgColor || "#ffffff";
      form.elements.imageFit.value = product.imageFit || "contain";
      form.elements.mediaClass.value = product.mediaClass || "media-orange";
      form.elements.iconClass.value = product.iconClass || "fa-solid fa-robot";
      form.elements.status.value = product.status || "active";
      selectedImages = Array.isArray(product.images) && product.images.length
        ? product.images.map((image) => ({ data: image.data || image.imageData || image.src || "", name: image.name || "", alt: image.alt || product.imageAlt || product.name || "" })).filter((image) => image.data).slice(0, 3)
        : (product.imageData ? [{ data: product.imageData, name: product.imageName || "", alt: product.imageAlt || product.name || "" }] : []);
      selectedImageData = selectedImages[0]?.data || "";
      selectedImageName = selectedImages[0]?.name || "";
      if (form.elements.imageFile) {
        form.elements.imageFile.value = "";
      }
      renderImagePreview(product);
      if (title) {
        title.textContent = product.id ? "Edit product" : "Add product";
      }
      renderList(product.id);
    }

    function emptyProduct() {
      return {
        id: "",
        name: "",
        tag: "New",
        category: "AI Product",
        price: "",
        privatePrice: "",
        sharedPrice: "",
        privateAvailable: true,
        sharedAvailable: true,
        plan: "",
        duration: "",
        activation: "",
        access: "",
        warranty: "",
        description: "",
        details: "",
        privateDescription: "",
        privateDetails: "",
        sharedDescription: "",
        sharedDetails: "",
        features: [],
        imageData: "",
        imageName: "",
        images: [],
        imageAlt: "",
        imageBgColor: "#ffffff",
        imageFit: "contain",
        mediaClass: "media-orange",
        iconClass: "fa-solid fa-robot",
        status: "active"
      };
    }

    function readForm() {
      const name = form.elements.name.value.trim();
      const oldId = form.elements.id.value.trim();
      const images = selectedImages.map((image, index) => ({
        data: image.data,
        name: image.name || (index === 0 ? selectedImageName : ""),
        alt: image.alt || form.elements.imageAlt.value.trim() || name
      })).filter((image) => image.data).slice(0, 3);
      const primaryImage = images[0] || {};
      return {
        id: oldId || slugify(name),
        name,
        price: form.elements.price.value.trim(),
        privatePrice: form.elements.privatePrice.value.trim(),
        sharedPrice: form.elements.sharedPrice.value.trim(),
        privateAvailable: form.elements.privateAvailable.checked,
        sharedAvailable: form.elements.sharedAvailable.checked,
        tag: form.elements.tag.value.trim() || "New",
        category: form.elements.category.value.trim() || "AI Product",
        plan: form.elements.plan.value.trim(),
        duration: form.elements.duration.value.trim(),
        activation: form.elements.activation.value.trim(),
        access: form.elements.access.value.trim(),
        warranty: form.elements.warranty.value.trim(),
        description: form.elements.description.value.trim(),
        details: form.elements.details.value.trim(),
        privateDescription: form.elements.privateDescription.value.trim() || form.elements.description.value.trim(),
        privateDetails: form.elements.privateDetails.value.trim() || form.elements.details.value.trim() || form.elements.privateDescription.value.trim() || form.elements.description.value.trim(),
        sharedDescription: form.elements.sharedDescription.value.trim() || form.elements.description.value.trim(),
        sharedDetails: form.elements.sharedDetails.value.trim() || form.elements.details.value.trim() || form.elements.sharedDescription.value.trim() || form.elements.description.value.trim(),
        features: form.elements.features.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        images,
        imageData: primaryImage.data || selectedImageData,
        imageName: primaryImage.name || selectedImageName,
        imageAlt: form.elements.imageAlt.value.trim() || name,
        imageBgColor: form.elements.imageBgColor.value || "#ffffff",
        imageFit: form.elements.imageFit.value || "contain",
        mediaClass: form.elements.mediaClass.value,
        iconClass: form.elements.iconClass.value,
        status: form.elements.status.value
      };
    }

    function renderList(selectedId) {
      const query = (search && search.value ? search.value : "").toLowerCase().trim();
      const products = currentProducts();
      const filtered = products.filter((product) => {
        const haystack = `${product.name} ${product.tag} ${product.category} ${product.price}`.toLowerCase();
        return haystack.includes(query);
      });
      if (count) {
        count.textContent = String(products.length);
      }
      list.innerHTML = filtered.length ? filtered.map((product) => {
        const imageClass = product.imageData ? `has-product-image image-fit-${escapeHtml(product.imageFit)}` : "";
        const imageStyle = product.imageData ? ` style="--product-image-bg: ${escapeHtml(product.imageBgColor)};"` : "";
        const selectedClass = selectedId === product.id ? " selected" : "";
        return `
        <button class="admin-product-row${selectedClass}" type="button" data-edit-product="${escapeHtml(product.id)}">
          <span class="admin-product-icon ${escapeHtml(product.mediaClass)} ${imageClass}"${imageStyle}>${product.imageData ? `<img src="${escapeHtml(product.imageData)}" alt="${escapeHtml(product.imageAlt || product.name)}">` : `<i class="${escapeHtml(product.iconClass)}"></i>`}</span>
          <span>
            <strong>${escapeHtml(product.name)}</strong>
            <small>${escapeHtml(product.category)} / ${escapeHtml(product.plan || "Auto plan")} / Private ${product.privateAvailable === false || !product.privatePrice ? "Unavailable" : escapeHtml(product.privatePrice)} / Shared ${product.sharedAvailable === false || !product.sharedPrice ? "Unavailable" : escapeHtml(product.sharedPrice)} / ${escapeHtml(product.status)}</small>
          </span>
        </button>
      `;
      }).join("") : `<div class="empty-state"><h3>No products found</h3><p>Try another search or add a new product.</p></div>`;
    }

    function saveProduct(event) {
      event.preventDefault();
      if (imageProcessing) {
        notify(message, "Image is still processing. Try saving again in a moment.");
        return;
      }
      const product = readForm();
      if (!product.name || !product.description) {
        notify(message, "Name and short description are required.");
        return;
      }
      const products = currentProducts();
      const index = products.findIndex((item) => item.id === product.id);
      if (index >= 0) {
        products[index] = product;
      } else {
        let id = product.id;
        let counter = 2;
        while (products.some((item) => item.id === id)) {
          id = `${product.id}-${counter}`;
          counter += 1;
        }
        product.id = id;
        products.unshift(product);
      }
      api.saveProducts(products);
      fillForm(product);
      notify(message, "Saved. The storefront has been updated in this browser.");
    }

    function deleteProduct() {
      const id = form.elements.id.value.trim();
      if (!id) {
        notify(message, "Choose a product before deleting.");
        return;
      }
      const product = findProduct(id);
      if (!product) {
        notify(message, "Product was not found.");
        return;
      }
      if (!confirm(`Delete "${product.name}"?`)) {
        return;
      }
      api.saveProducts(currentProducts().filter((item) => item.id !== id));
      fillForm(emptyProduct());
      notify(message, "Product deleted.");
    }

    function exportProducts() {
      const json = JSON.stringify(currentProducts(), null, 2);
      if (importArea) {
        importArea.value = json;
      }
      copyText(json);
      notify(message, "Export JSON is ready below. It was copied to clipboard if your browser allowed it.");
    }

    function importProducts() {
      if (!importArea || !importArea.value.trim()) {
        notify(message, "Paste exported product JSON before importing.");
        return;
      }
      try {
        const imported = JSON.parse(importArea.value);
        if (!Array.isArray(imported)) {
          throw new Error("Expected an array of products.");
        }
        const saved = api.saveProducts(imported);
        fillForm(saved[0] || emptyProduct());
        notify(message, "Imported products successfully.");
      } catch (error) {
        notify(message, `Import failed: ${error.message}`);
      }
    }

    function resetProducts() {
      if (!confirm("Reset products back to the original default list?")) {
        return;
      }
      const products = api.resetProducts();
      fillForm(products[0] || emptyProduct());
      notify(message, "Products reset to defaults.");
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Could not read image."));
        reader.readAsDataURL(file);
      });
    }

    function loadImage(dataUrl) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Could not load image."));
        image.src = dataUrl;
      });
    }

    async function compressImageFile(file) {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadImage(dataUrl);
      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let transparent = false;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] < 255) {
          transparent = true;
          break;
        }
      }
      return transparent || file.type === "image/png" || file.type === "image/webp"
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", 0.86);
    }

    list.addEventListener("click", (event) => {
      const row = event.target.closest("[data-edit-product]");
      if (!row) {
        return;
      }
      const product = findProduct(row.dataset.editProduct);
      if (product) {
        fillForm(product);
        notify(message, `Editing ${product.name}.`);
      }
    });

    form.addEventListener("submit", saveProduct);
    document.querySelectorAll("[data-new-product]").forEach((button) => {
      button.addEventListener("click", () => {
        fillForm(emptyProduct());
        notify(message, "Ready for a new product.");
      });
    });
    document.querySelector("[data-delete-product]")?.addEventListener("click", deleteProduct);
    document.querySelector("[data-export-products]")?.addEventListener("click", exportProducts);
    document.querySelector("[data-import-button]")?.addEventListener("click", importProducts);
    document.querySelector("[data-reset-products]")?.addEventListener("click", resetProducts);
    document.querySelector("[data-remove-image]")?.addEventListener("click", () => {
      selectedImageData = "";
      selectedImageName = "";
      selectedImages = [];
      if (form.elements.imageFile) {
        form.elements.imageFile.value = "";
      }
      renderImagePreview();
      notify(message, "Product image removed. Save the product to keep this change.");
    });
    form.elements.imageFile?.addEventListener("change", async (event) => {
      const files = Array.from(event.target.files || []).slice(0, 3);
      if (!files.length) {
        return;
      }
      imageProcessing = true;
      notify(message, "Processing images...");
      try {
        selectedImages = [];
        for (const file of files) {
          selectedImages.push({
            data: await compressImageFile(file),
            name: file.name,
            alt: form.elements.imageAlt.value.trim() || form.elements.name.value.trim() || file.name.replace(/\.[^.]+$/, "")
          });
        }
        selectedImageData = selectedImages[0]?.data || "";
        selectedImageName = selectedImages[0]?.name || "";
        if (!form.elements.imageAlt.value.trim()) {
          form.elements.imageAlt.value = form.elements.name.value.trim() || files[0].name.replace(/\.[^.]+$/, "");
        }
        renderImagePreview();
        notify(message, `${selectedImages.length} image${selectedImages.length === 1 ? "" : "s"} uploaded. Save the product to publish.`);
      } catch (error) {
        notify(message, `Image upload failed: ${error.message}`);
      } finally {
        imageProcessing = false;
      }
    });
    form.elements.imageAlt?.addEventListener("input", () => renderImagePreview());
    form.elements.imageBgColor?.addEventListener("input", () => renderImagePreview());
    form.elements.imageFit?.addEventListener("change", () => renderImagePreview());
    search?.addEventListener("input", () => renderList(form.elements.id.value));

    const products = currentProducts();
    fillForm(products[0] || emptyProduct());
  }

  function bootFreebiesPage() {
    const form = document.querySelector("#freebie-form");
    const list = document.querySelector("[data-freebies-list]");
    const search = document.querySelector("[data-freebies-search]");
    const categoryFilter = document.querySelector("[data-freebies-category-filter]");
    const message = document.querySelector("[data-freebies-message]");
    const title = document.querySelector("#freebie-form-title");
    const imagePreview = document.querySelector("[data-freebie-image-preview]");

    let selectedImageData = "";
    let selectedImageName = "";
    let selectedImages = [];
    let imageProcessing = false;

    if (!api || !api.getFreebies || !form || !list) {
      return;
    }

    function currentFreebies() {
      return api.getFreebies();
    }

    function emptyFreebie() {
      return {
        id: "",
        title: "",
        tag: "Course",
        category: "Learning",
        price: "Free",
        description: "",
        link: "contact.html",
        imageData: "",
        imageName: "",
        images: [],
        imageAlt: "",
        imageBgColor: "#ffffff",
        imageFit: "contain",
        mediaClass: "media-blue",
        iconClass: "fa-solid fa-graduation-cap",
        status: "active"
      };
    }

    function renderImagePreview(freebie) {
      if (!imagePreview) {
        return;
      }
      const imageData = selectedImageData || (freebie && freebie.imageData) || "";
      const images = selectedImages.length
        ? selectedImages
        : (imageData ? [{ data: imageData, name: selectedImageName || (freebie && freebie.imageName) || "", alt: form.elements.imageAlt.value || "Freebie image" }] : []);
      const imageFit = form.elements.imageFit ? form.elements.imageFit.value : (freebie && freebie.imageFit) || "contain";
      const imageBgColor = form.elements.imageBgColor ? form.elements.imageBgColor.value : (freebie && freebie.imageBgColor) || "#ffffff";
      imagePreview.className = `image-preview image-fit-${imageFit === "cover" ? "cover" : "contain"}`;
      imagePreview.style.setProperty("--product-image-bg", imageBgColor || "#ffffff");
      if (images.length) {
        imagePreview.innerHTML = `<div class="image-preview-gallery">${images.map((image, index) => `<span><img src="${escapeHtml(image.data)}" alt="${escapeHtml(image.alt || form.elements.imageAlt.value || "Freebie image")}"><small>${index + 1}</small></span>`).join("")}</div>`;
      } else {
        imagePreview.innerHTML = "<span>No image uploaded</span>";
      }
    }

    function fillForm(freebie) {
      form.elements.id.value = freebie.id || "";
      form.elements.title.value = freebie.title || "";
      form.elements.tag.value = freebie.tag || "Course";
      form.elements.category.value = freebie.category || "Learning";
      form.elements.price.value = freebie.price || "Free";
      form.elements.description.value = freebie.description || "";
      form.elements.link.value = freebie.link || "contact.html";
      form.elements.imageAlt.value = freebie.imageAlt || freebie.title || "";
      form.elements.imageBgColor.value = freebie.imageBgColor || "#ffffff";
      form.elements.imageFit.value = freebie.imageFit || "contain";
      form.elements.mediaClass.value = freebie.mediaClass || "media-blue";
      form.elements.iconClass.value = freebie.iconClass || "fa-solid fa-graduation-cap";
      form.elements.status.value = freebie.status || "active";
      selectedImages = Array.isArray(freebie.images) && freebie.images.length
        ? freebie.images.map((image) => ({ data: image.data || image.imageData || image.src || "", name: image.name || "", alt: image.alt || freebie.imageAlt || freebie.title || "" })).filter((image) => image.data).slice(0, 3)
        : (freebie.imageData ? [{ data: freebie.imageData, name: freebie.imageName || "", alt: freebie.imageAlt || freebie.title || "" }] : []);
      selectedImageData = selectedImages[0]?.data || "";
      selectedImageName = selectedImages[0]?.name || "";
      if (form.elements.imageFile) {
        form.elements.imageFile.value = "";
      }
      renderImagePreview(freebie);
      if (title) {
        title.textContent = freebie.id ? "Edit freebie" : "Add course";
      }
      renderList(freebie.id);
    }

    function readForm() {
      const freebieTitle = form.elements.title.value.trim();
      const images = selectedImages.map((image, index) => ({
        data: image.data,
        name: image.name || (index === 0 ? selectedImageName : ""),
        alt: image.alt || form.elements.imageAlt.value.trim() || freebieTitle
      })).filter((image) => image.data).slice(0, 3);
      const primaryImage = images[0] || {};
      return {
        id: form.elements.id.value.trim() || slugify(freebieTitle),
        title: freebieTitle,
        tag: form.elements.tag.value.trim() || "Course",
        category: form.elements.category.value.trim() || "Learning",
        price: form.elements.price.value.trim() || "Free",
        description: form.elements.description.value.trim(),
        link: form.elements.link.value.trim() || "contact.html",
        images,
        imageData: primaryImage.data || selectedImageData,
        imageName: primaryImage.name || selectedImageName,
        imageAlt: form.elements.imageAlt.value.trim() || freebieTitle,
        imageBgColor: form.elements.imageBgColor.value || "#ffffff",
        imageFit: form.elements.imageFit.value || "contain",
        mediaClass: form.elements.mediaClass.value,
        iconClass: form.elements.iconClass.value,
        status: form.elements.status.value
      };
    }

    function renderCategoryFilter(freebies) {
      if (!categoryFilter) {
        return;
      }
      const selected = categoryFilter.value;
      const categories = Array.from(new Set(freebies.map((freebie) => freebie.category).filter(Boolean))).sort();
      categoryFilter.innerHTML = `<option value="">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
      categoryFilter.value = categories.includes(selected) ? selected : "";
    }

    function renderList(selectedId) {
      const query = (search?.value || "").toLowerCase().trim();
      const selectedCategory = categoryFilter?.value || "";
      const freebies = currentFreebies();
      renderCategoryFilter(freebies);
      const filtered = freebies.filter((freebie) => {
        const haystack = `${freebie.title} ${freebie.tag} ${freebie.category} ${freebie.status}`.toLowerCase();
        return haystack.includes(query) && (!selectedCategory || freebie.category === selectedCategory);
      });

      list.innerHTML = filtered.length ? filtered.map((freebie) => {
        const imageClass = freebie.imageData ? `has-product-image image-fit-${escapeHtml(freebie.imageFit)}` : "";
        const imageStyle = freebie.imageData ? ` style="--product-image-bg: ${escapeHtml(freebie.imageBgColor)};"` : "";
        const selectedClass = selectedId === freebie.id ? " selected" : "";
        return `
        <button class="admin-product-row${selectedClass}" type="button" data-edit-freebie="${escapeHtml(freebie.id)}">
          <span class="admin-product-icon ${escapeHtml(freebie.mediaClass)} ${imageClass}"${imageStyle}>${freebie.imageData ? `<img src="${escapeHtml(freebie.imageData)}" alt="${escapeHtml(freebie.imageAlt || freebie.title)}">` : `<i class="${escapeHtml(freebie.iconClass)}"></i>`}</span>
          <span>
            <strong>${escapeHtml(freebie.title)}</strong>
            <small>${escapeHtml(freebie.tag)} / ${escapeHtml(freebie.category)} / ${escapeHtml(freebie.status)}</small>
          </span>
        </button>
      `;
      }).join("") : `<div class="empty-state"><h3>No freebies found</h3><p>Try another search or add a course.</p></div>`;
    }

    function saveFreebie(event) {
      event.preventDefault();
      if (imageProcessing) {
        notify(message, "Image is still processing. Try saving again in a moment.");
        return;
      }
      const freebie = readForm();
      if (!freebie.title) {
        notify(message, "Course title is required.");
        return;
      }
      const freebies = currentFreebies();
      const index = freebies.findIndex((item) => item.id === freebie.id);
      if (index >= 0) {
        freebies[index] = freebie;
      } else {
        let id = freebie.id;
        let counter = 2;
        while (freebies.some((item) => item.id === id)) {
          id = `${freebie.id}-${counter}`;
          counter += 1;
        }
        freebie.id = id;
        freebies.unshift(freebie);
      }
      api.saveFreebies(freebies);
      fillForm(freebie);
      notify(message, "Saved. The freebies page has been updated in this browser.");
    }

    function deleteFreebie() {
      const id = form.elements.id.value.trim();
      if (!id) {
        notify(message, "Choose a freebie before deleting.");
        return;
      }
      const freebie = currentFreebies().find((item) => item.id === id);
      if (!freebie || !confirm(`Delete "${freebie.title}"?`)) {
        return;
      }
      api.saveFreebies(currentFreebies().filter((item) => item.id !== id));
      fillForm(emptyFreebie());
      notify(message, "Freebie deleted.");
    }

    function exportFreebies() {
      const json = JSON.stringify(currentFreebies(), null, 2);
      copyText(json);
      notify(message, "Freebies exported to clipboard if your browser allowed it.");
    }

    function resetFreebies() {
      if (!confirm("Reset freebies back to the original default list?")) {
        return;
      }
      const freebies = api.resetFreebies();
      fillForm(freebies[0] || emptyFreebie());
      notify(message, "Freebies reset to defaults.");
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Could not read image."));
        reader.readAsDataURL(file);
      });
    }

    function loadImage(dataUrl) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Could not load image."));
        image.src = dataUrl;
      });
    }

    async function compressImageFile(file) {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadImage(dataUrl);
      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let transparent = false;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] < 255) {
          transparent = true;
          break;
        }
      }
      return transparent || file.type === "image/png" || file.type === "image/webp"
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", 0.86);
    }

    list.addEventListener("click", (event) => {
      const row = event.target.closest("[data-edit-freebie]");
      if (!row) {
        return;
      }
      const freebie = currentFreebies().find((item) => item.id === row.dataset.editFreebie);
      if (freebie) {
        fillForm(freebie);
        notify(message, `Editing ${freebie.title}.`);
      }
    });

    form.addEventListener("submit", saveFreebie);
    search?.addEventListener("input", () => renderList(form.elements.id.value));
    categoryFilter?.addEventListener("change", () => renderList(form.elements.id.value));
    document.querySelector("[data-remove-freebie-image]")?.addEventListener("click", () => {
      selectedImageData = "";
      selectedImageName = "";
      selectedImages = [];
      if (form.elements.imageFile) {
        form.elements.imageFile.value = "";
      }
      renderImagePreview();
      notify(message, "Freebie image removed. Save to keep this change.");
    });
    form.elements.imageFile?.addEventListener("change", async (event) => {
      const files = Array.from(event.target.files || []).slice(0, 3);
      if (!files.length) {
        return;
      }
      imageProcessing = true;
      notify(message, "Processing images...");
      try {
        selectedImages = [];
        for (const file of files) {
          selectedImages.push({
            data: await compressImageFile(file),
            name: file.name,
            alt: form.elements.imageAlt.value.trim() || form.elements.title.value.trim() || file.name.replace(/\.[^.]+$/, "")
          });
        }
        selectedImageData = selectedImages[0]?.data || "";
        selectedImageName = selectedImages[0]?.name || "";
        if (!form.elements.imageAlt.value.trim()) {
          form.elements.imageAlt.value = form.elements.title.value.trim() || files[0].name.replace(/\.[^.]+$/, "");
        }
        renderImagePreview();
        notify(message, `${selectedImages.length} image${selectedImages.length === 1 ? "" : "s"} uploaded. Save the freebie to publish.`);
      } catch (error) {
        notify(message, `Image upload failed: ${error.message}`);
      } finally {
        imageProcessing = false;
      }
    });
    form.elements.imageAlt?.addEventListener("input", () => renderImagePreview());
    form.elements.imageBgColor?.addEventListener("input", () => renderImagePreview());
    form.elements.imageFit?.addEventListener("change", () => renderImagePreview());
    document.querySelectorAll("[data-new-freebie]").forEach((button) => {
      button.addEventListener("click", () => {
        fillForm(emptyFreebie());
        notify(message, "Ready for a new course or freebie.");
      });
    });
    document.querySelector("[data-delete-freebie]")?.addEventListener("click", deleteFreebie);
    document.querySelector("[data-export-freebies]")?.addEventListener("click", exportFreebies);
    document.querySelector("[data-reset-freebies]")?.addEventListener("click", resetFreebies);

    const freebies = currentFreebies();
    fillForm(freebies[0] || emptyFreebie());
  }

  function bootOrdersPage() {
    const form = document.querySelector("#order-form");
    const table = document.querySelector("[data-orders-table]");
    const search = document.querySelector("[data-orders-search]");
    const statusFilter = document.querySelector("[data-orders-status]");
    const productSelect = document.querySelector("[data-order-products]");
    const message = document.querySelector("[data-orders-message]");
    const title = document.querySelector("#order-form-title");

    if (!form || !table) {
      return;
    }

    function renderProductOptions(selectedId) {
      const products = getProducts();
      productSelect.innerHTML = products.length
        ? products.map((product) => `<option value="${escapeHtml(product.id)}"${product.id === selectedId ? " selected" : ""}>${escapeHtml(product.name)}</option>`).join("")
        : `<option value="">No products available</option>`;
    }

    function fillForm(order) {
      renderProductOptions(order.productId);
      form.elements.id.value = order.id || "";
      form.elements.customerName.value = order.customerName || "";
      form.elements.customerEmail.value = order.customerEmail || "";
      form.elements.productId.value = order.productId || "";
      form.elements.status.value = order.status || "pending";
      form.elements.total.value = order.total || "$0";
      form.elements.date.value = order.date || today();
      form.elements.channel.value = order.channel || "Website";
      form.elements.paymentProvider.value = order.paymentProvider || "";
      form.elements.walletPhone.value = order.walletPhone || "";
      form.elements.gatewayStatus.value = order.gatewayStatus || "";
      form.elements.gatewayTransactionId.value = order.gatewayTransactionId || "";
      form.elements.notes.value = order.notes || "";
      if (title) {
        title.textContent = order.id ? "Edit order" : "New order";
      }
      renderOrders(order.id);
    }

    function emptyOrder() {
      const product = getProducts()[0] || {};
      return {
        id: "",
        customerName: "",
        customerEmail: "",
        productId: product.id || "",
        status: getSettings().defaultOrderStatus || "pending",
        total: product.price || "$0",
        date: today(),
        channel: "Website",
        paymentProvider: "",
        walletPhone: "",
        gatewayStatus: "",
        gatewayTransactionId: "",
        notes: ""
      };
    }

    function readForm() {
      return normalizeOrder({
        id: form.elements.id.value.trim() || createOrderId(),
        customerName: form.elements.customerName.value.trim(),
        customerEmail: form.elements.customerEmail.value.trim(),
        productId: form.elements.productId.value,
        status: form.elements.status.value,
        total: form.elements.total.value.trim(),
        date: form.elements.date.value,
        channel: form.elements.channel.value.trim() || "Website",
        paymentProvider: form.elements.paymentProvider.value,
        walletPhone: form.elements.walletPhone.value.trim(),
        gatewayStatus: form.elements.gatewayStatus.value.trim(),
        gatewayTransactionId: form.elements.gatewayTransactionId.value.trim(),
        notes: form.elements.notes.value.trim()
      });
    }

    function renderOrders(selectedId) {
      const query = (search?.value || "").toLowerCase().trim();
      const status = statusFilter?.value || "";
      const filtered = getOrders().filter((order) => {
        const haystack = `${order.id} ${order.customerName} ${order.customerEmail} ${productName(order.productId)} ${order.total} ${order.channel} ${order.source} ${order.providerLabel} ${order.walletPhone} ${order.gatewayOrderId} ${order.gatewayTransactionId} ${order.gatewayStatus} ${order.notes}`.toLowerCase();
        return haystack.includes(query) && (!status || order.status === status);
      });
      table.innerHTML = filtered.length ? filtered.map((order) => `
        <tr class="${selectedId === order.id ? "selected-row" : ""}">
          <td><strong>${escapeHtml(order.id)}</strong><small>${escapeHtml(order.channel)}</small></td>
          <td>${escapeHtml(order.customerName)}<small>${escapeHtml(order.customerEmail)}</small></td>
          <td>${escapeHtml(productName(order.productId))}</td>
          <td><strong>${escapeHtml(order.providerLabel || order.paymentMethod || "Manual")}</strong><small>${escapeHtml([order.walletPhone, order.gatewayOrderId, order.gatewayTransactionId, order.gatewayStatus].filter(Boolean).join(" / ") || "No gateway data")}</small></td>
          <td>${statusPill(order.status)}</td>
          <td><strong>${escapeHtml(order.total)}</strong></td>
          <td>${escapeHtml(order.date)}</td>
          <td><button class="table-action" type="button" data-edit-order="${escapeHtml(order.id)}">Edit</button></td>
        </tr>
      `).join("") : `<tr><td colspan="8"><div class="empty-state"><h3>No orders found</h3><p>Try another filter or create a new order.</p></div></td></tr>`;
    }

    function saveOrder(event) {
      event.preventDefault();
      const order = readForm();
      if (!order.customerName || !order.customerEmail || !order.total) {
        notify(message, "Customer, email, and total are required.");
        return;
      }
      const orders = getOrders();
      const index = orders.findIndex((item) => item.id === order.id);
      if (index >= 0) {
        orders[index] = order;
      } else {
        orders.unshift(order);
      }
      saveOrders(orders);
      fillForm(order);
      notify(message, "Order saved.");
    }

    function deleteOrder() {
      const id = form.elements.id.value.trim();
      if (!id) {
        notify(message, "Choose an order before deleting.");
        return;
      }
      if (!confirm(`Delete order ${id}?`)) {
        return;
      }
      saveOrders(getOrders().filter((order) => order.id !== id));
      fillForm(emptyOrder());
      notify(message, "Order deleted.");
    }

    table.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-order]");
      if (!button) {
        return;
      }
      const order = getOrders().find((item) => item.id === button.dataset.editOrder);
      if (order) {
        fillForm(order);
        notify(message, `Editing ${order.id}.`);
      }
    });

    form.addEventListener("submit", saveOrder);
    productSelect?.addEventListener("change", () => {
      const product = findProduct(productSelect.value);
      if (product) {
        form.elements.total.value = product.price;
      }
    });
    search?.addEventListener("input", () => renderOrders(form.elements.id.value));
    statusFilter?.addEventListener("change", () => renderOrders(form.elements.id.value));
    document.querySelectorAll("[data-new-order]").forEach((button) => button.addEventListener("click", () => {
      fillForm(emptyOrder());
      notify(message, "Ready for a new order.");
    }));
    document.querySelector("[data-delete-order]")?.addEventListener("click", deleteOrder);
    document.querySelector("[data-export-orders]")?.addEventListener("click", () => {
      const json = JSON.stringify(getOrders(), null, 2);
      copyText(json);
      notify(message, "Orders exported to clipboard if your browser allowed it.");
    });
    document.querySelector("[data-reset-orders]")?.addEventListener("click", () => {
      if (!confirm("Reset orders to the sample list?")) {
        return;
      }
      const orders = resetOrders();
      fillForm(orders[0] || emptyOrder());
      notify(message, "Sample orders restored.");
    });

    fillForm(getOrders()[0] || emptyOrder());
  }

  function bootCustomersPage() {
    const form = document.querySelector("#customer-form");
    const table = document.querySelector("[data-customers-table]");
    const search = document.querySelector("[data-customers-search]");
    const statusFilter = document.querySelector("[data-customers-status]");
    const message = document.querySelector("[data-customers-message]");
    const title = document.querySelector("#customer-form-title");

    if (!form || !table) {
      return;
    }

    function emptyCustomer() {
      return {
        id: "",
        name: "",
        email: "",
        segment: "General",
        status: "lead",
        source: "Website",
        orders: 0,
        spend: 0,
        lastOrder: today(),
        notes: ""
      };
    }

    function fillForm(customer) {
      form.elements.id.value = customer.id || "";
      form.elements.name.value = customer.name || "";
      form.elements.email.value = customer.email || "";
      form.elements.segment.value = customer.segment || "General";
      form.elements.status.value = customer.status || "lead";
      form.elements.source.value = customer.source || "Website";
      form.elements.orders.value = customer.orders || 0;
      form.elements.spend.value = customer.spend || 0;
      form.elements.lastOrder.value = customer.lastOrder || "";
      form.elements.notes.value = customer.notes || "";
      if (title) {
        title.textContent = customer.id ? "Edit customer" : "New customer";
      }
      renderCustomers(customer.id);
    }

    function readForm() {
      return normalizeCustomer({
        id: form.elements.id.value.trim() || createCustomerId(form.elements.name.value, form.elements.email.value),
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        segment: form.elements.segment.value.trim() || "General",
        status: form.elements.status.value,
        source: form.elements.source.value.trim() || "Website",
        orders: form.elements.orders.value,
        spend: form.elements.spend.value,
        lastOrder: form.elements.lastOrder.value,
        notes: form.elements.notes.value.trim()
      });
    }

    function renderCustomers(selectedId) {
      const query = (search?.value || "").toLowerCase().trim();
      const status = statusFilter?.value || "";
      const filtered = getCustomers().filter((customer) => {
        const haystack = `${customer.name} ${customer.email} ${customer.segment} ${customer.source}`.toLowerCase();
        return haystack.includes(query) && (!status || customer.status === status);
      });
      table.innerHTML = filtered.length ? filtered.map((customer) => `
        <tr class="${selectedId === customer.id ? "selected-row" : ""}">
          <td><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.source)}</small></td>
          <td>${escapeHtml(customer.email)}</td>
          <td>${escapeHtml(customer.segment)}</td>
          <td>${statusPill(customer.status)}</td>
          <td>${escapeHtml(customer.orders)}</td>
          <td><strong>${formatMoney(customer.spend)}</strong></td>
          <td><button class="table-action" type="button" data-edit-customer="${escapeHtml(customer.id)}">Edit</button></td>
        </tr>
      `).join("") : `<tr><td colspan="7"><div class="empty-state"><h3>No customers found</h3><p>Try another search or add a customer.</p></div></td></tr>`;
    }

    function saveCustomer(event) {
      event.preventDefault();
      const customer = readForm();
      if (!customer.name || !customer.email) {
        notify(message, "Name and email are required.");
        return;
      }
      const customers = getCustomers();
      const index = customers.findIndex((item) => item.id === customer.id);
      if (index >= 0) {
        customers[index] = customer;
      } else {
        customers.unshift(customer);
      }
      saveCustomers(customers);
      fillForm(customer);
      notify(message, "Customer saved.");
    }

    function deleteCustomer() {
      const id = form.elements.id.value.trim();
      if (!id) {
        notify(message, "Choose a customer before deleting.");
        return;
      }
      const customer = getCustomers().find((item) => item.id === id);
      if (!customer || !confirm(`Delete ${customer.name}?`)) {
        return;
      }
      saveCustomers(getCustomers().filter((item) => item.id !== id));
      fillForm(emptyCustomer());
      notify(message, "Customer deleted.");
    }

    table.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-customer]");
      if (!button) {
        return;
      }
      const customer = getCustomers().find((item) => item.id === button.dataset.editCustomer);
      if (customer) {
        fillForm(customer);
        notify(message, `Editing ${customer.name}.`);
      }
    });

    form.addEventListener("submit", saveCustomer);
    search?.addEventListener("input", () => renderCustomers(form.elements.id.value));
    statusFilter?.addEventListener("change", () => renderCustomers(form.elements.id.value));
    document.querySelectorAll("[data-new-customer]").forEach((button) => button.addEventListener("click", () => {
      fillForm(emptyCustomer());
      notify(message, "Ready for a new customer.");
    }));
    document.querySelector("[data-delete-customer]")?.addEventListener("click", deleteCustomer);
    document.querySelector("[data-export-customers]")?.addEventListener("click", () => {
      const json = JSON.stringify(getCustomers(), null, 2);
      copyText(json);
      notify(message, "Customers exported to clipboard if your browser allowed it.");
    });
    document.querySelector("[data-reset-customers]")?.addEventListener("click", () => {
      if (!confirm("Reset customers to the sample list?")) {
        return;
      }
      const customers = resetCustomers();
      fillForm(customers[0] || emptyCustomer());
      notify(message, "Sample customers restored.");
    });

    fillForm(getCustomers()[0] || emptyCustomer());
  }

  function bootContentPage() {
    const form = document.querySelector("#page-form");
    const list = document.querySelector("[data-pages-list]");
    const search = document.querySelector("[data-pages-search]");
    const statusFilter = document.querySelector("[data-pages-status]");
    const message = document.querySelector("[data-pages-message]");
    const title = document.querySelector("#page-form-title");

    if (!form || !list) {
      return;
    }

    function emptyPage() {
      return {
        id: "",
        title: "",
        url: "",
        seoTitle: "",
        hero: "",
        status: "draft",
        priority: "Medium",
        owner: "Admin",
        updated: today(),
        notes: ""
      };
    }

    function fillForm(page) {
      form.elements.id.value = page.id || "";
      form.elements.title.value = page.title || "";
      form.elements.url.value = page.url || "";
      form.elements.seoTitle.value = page.seoTitle || "";
      form.elements.hero.value = page.hero || "";
      form.elements.status.value = page.status || "draft";
      form.elements.priority.value = page.priority || "Medium";
      form.elements.owner.value = page.owner || "Admin";
      form.elements.updated.value = page.updated || today();
      form.elements.notes.value = page.notes || "";
      if (title) {
        title.textContent = page.id ? "Edit page" : "New page";
      }
      renderPages(page.id);
    }

    function readForm() {
      return normalizePage({
        id: form.elements.id.value.trim() || slugify(form.elements.title.value || form.elements.url.value),
        title: form.elements.title.value.trim(),
        url: form.elements.url.value.trim(),
        seoTitle: form.elements.seoTitle.value.trim(),
        hero: form.elements.hero.value.trim(),
        status: form.elements.status.value,
        priority: form.elements.priority.value,
        owner: form.elements.owner.value.trim() || "Admin",
        updated: form.elements.updated.value || today(),
        notes: form.elements.notes.value.trim()
      });
    }

    function renderPages(selectedId) {
      const query = (search?.value || "").toLowerCase().trim();
      const status = statusFilter?.value || "";
      const filtered = getPages().filter((page) => {
        const haystack = `${page.title} ${page.url} ${page.owner} ${page.seoTitle}`.toLowerCase();
        return haystack.includes(query) && (!status || page.status === status);
      });
      list.innerHTML = filtered.length ? filtered.map((page) => `
        <article class="admin-content-card ${selectedId === page.id ? "selected-card" : ""}">
          <div>
            <div class="admin-content-title">
              <h3>${escapeHtml(page.title)}</h3>
              ${statusPill(page.status)}
            </div>
            <p>${escapeHtml(page.hero || page.seoTitle || "No summary added yet.")}</p>
            <small>${escapeHtml(page.url)} / ${escapeHtml(page.owner)} / ${escapeHtml(page.priority)} priority / ${escapeHtml(page.updated)}</small>
          </div>
          <div class="admin-content-actions">
            <a class="table-action" href="${escapeHtml(page.url)}">Open</a>
            <button class="table-action" type="button" data-edit-page="${escapeHtml(page.id)}">Edit</button>
          </div>
        </article>
      `).join("") : `<div class="empty-state"><h3>No pages found</h3><p>Try another search or add a page record.</p></div>`;
    }

    function savePage(event) {
      event.preventDefault();
      const page = readForm();
      if (!page.title || !page.url) {
        notify(message, "Title and URL are required.");
        return;
      }
      const pages = getPages();
      const index = pages.findIndex((item) => item.id === page.id);
      if (index >= 0) {
        pages[index] = page;
      } else {
        pages.unshift(page);
      }
      savePages(pages);
      fillForm(page);
      notify(message, "Page record saved.");
    }

    function deletePage() {
      const id = form.elements.id.value.trim();
      if (!id) {
        notify(message, "Choose a page before deleting.");
        return;
      }
      const page = getPages().find((item) => item.id === id);
      if (!page || !confirm(`Delete ${page.title}?`)) {
        return;
      }
      savePages(getPages().filter((item) => item.id !== id));
      fillForm(emptyPage());
      notify(message, "Page record deleted.");
    }

    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-page]");
      if (!button) {
        return;
      }
      const page = getPages().find((item) => item.id === button.dataset.editPage);
      if (page) {
        fillForm(page);
        notify(message, `Editing ${page.title}.`);
      }
    });

    form.addEventListener("submit", savePage);
    search?.addEventListener("input", () => renderPages(form.elements.id.value));
    statusFilter?.addEventListener("change", () => renderPages(form.elements.id.value));
    document.querySelectorAll("[data-new-page]").forEach((button) => button.addEventListener("click", () => {
      fillForm(emptyPage());
      notify(message, "Ready for a new page record.");
    }));
    document.querySelector("[data-delete-page]")?.addEventListener("click", deletePage);
    document.querySelector("[data-export-pages]")?.addEventListener("click", () => {
      const json = JSON.stringify(getPages(), null, 2);
      copyText(json);
      notify(message, "Pages exported to clipboard if your browser allowed it.");
    });
    document.querySelector("[data-reset-pages]")?.addEventListener("click", () => {
      if (!confirm("Reset page records to the default list?")) {
        return;
      }
      const pages = resetPages();
      fillForm(pages[0] || emptyPage());
      notify(message, "Default page records restored.");
    });

    fillForm(getPages()[0] || emptyPage());
  }

  function bootSettingsPage() {
    const form = document.querySelector("#settings-form");
    const message = document.querySelector("[data-settings-message]");
    const preview = document.querySelector("[data-settings-preview]");

    if (!form) {
      return;
    }

    function fillForm(settings) {
      form.elements.storeName.value = settings.storeName;
      form.elements.currency.value = settings.currency;
      form.elements.usdPkrRate.value = settings.usdPkrRate || defaultSettings.usdPkrRate;
      form.elements.supportEmail.value = settings.supportEmail;
      form.elements.phone.value = settings.phone;
      form.elements.whatsapp.value = settings.whatsapp;
      form.elements.location.value = settings.location;
      form.elements.announcement.value = settings.announcement;
      form.elements.instagramUrl.value = settings.instagramUrl || "";
      form.elements.facebookUrl.value = settings.facebookUrl || "";
      form.elements.whatsappUrl.value = settings.whatsappUrl || "";
      form.elements.linkedinUrl.value = settings.linkedinUrl || "";
      form.elements.checkoutMode.value = settings.checkoutMode;
      form.elements.defaultOrderStatus.value = settings.defaultOrderStatus;
      form.elements.orderNotifications.checked = settings.orderNotifications;
      form.elements.supportNotifications.checked = settings.supportNotifications;
      form.elements.showLaunchBanner.checked = settings.showLaunchBanner;
      form.elements.maintenanceMode.checked = settings.maintenanceMode;
      renderPreview(settings);
    }

    function readForm() {
      return normalizeSettings({
        storeName: form.elements.storeName.value.trim(),
        currency: form.elements.currency.value.trim(),
        usdPkrRate: Number(form.elements.usdPkrRate.value || defaultSettings.usdPkrRate),
        supportEmail: form.elements.supportEmail.value.trim(),
        phone: form.elements.phone.value.trim(),
        whatsapp: form.elements.whatsapp.value.trim(),
        location: form.elements.location.value.trim(),
        announcement: form.elements.announcement.value.trim(),
        instagramUrl: form.elements.instagramUrl.value.trim(),
        facebookUrl: form.elements.facebookUrl.value.trim(),
        whatsappUrl: form.elements.whatsappUrl.value.trim(),
        linkedinUrl: form.elements.linkedinUrl.value.trim(),
        checkoutMode: form.elements.checkoutMode.value,
        defaultOrderStatus: form.elements.defaultOrderStatus.value,
        orderNotifications: form.elements.orderNotifications.checked,
        supportNotifications: form.elements.supportNotifications.checked,
        showLaunchBanner: form.elements.showLaunchBanner.checked,
        maintenanceMode: form.elements.maintenanceMode.checked
      });
    }

    function renderPreview(settings) {
      if (!preview) {
        return;
      }
      preview.innerHTML = `
        <div><span>Store</span><strong>${escapeHtml(settings.storeName)}</strong></div>
        <div><span>Currency</span><strong>${escapeHtml(settings.currency)}</strong></div>
        <div><span>USD to PKR fallback</span><strong>${escapeHtml(settings.usdPkrRate)}</strong></div>
        <div><span>Email</span><strong>${escapeHtml(settings.supportEmail)}</strong></div>
        <div><span>Phone</span><strong>${escapeHtml(settings.phone)}</strong></div>
        <div><span>Instagram</span><strong>${escapeHtml(settings.instagramUrl || "Hidden")}</strong></div>
        <div><span>Facebook</span><strong>${escapeHtml(settings.facebookUrl || "Hidden")}</strong></div>
        <div><span>WhatsApp Icon</span><strong>${escapeHtml(settings.whatsappUrl || "Hidden")}</strong></div>
        <div><span>LinkedIn</span><strong>${escapeHtml(settings.linkedinUrl || "Hidden")}</strong></div>
        <div><span>Checkout</span><strong>${escapeHtml(settings.checkoutMode)}</strong></div>
        <div><span>Default status</span><strong>${escapeHtml(settings.defaultOrderStatus)}</strong></div>
      `;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const settings = readForm();
      if (!settings.storeName || !settings.supportEmail) {
        notify(message, "Store name and support email are required.");
        return;
      }
      saveSettings(settings);
      fillForm(settings);
      notify(message, "Settings saved.");
    });

    form.addEventListener("input", () => renderPreview(readForm()));
    form.addEventListener("change", () => renderPreview(readForm()));
    document.querySelector("[data-export-settings]")?.addEventListener("click", () => {
      const json = JSON.stringify(readForm(), null, 2);
      copyText(json);
      notify(message, "Settings exported to clipboard if your browser allowed it.");
    });
    document.querySelector("[data-reset-settings]")?.addEventListener("click", () => {
      if (!confirm("Reset settings to defaults?")) {
        return;
      }
      const settings = resetSettings();
      fillForm(settings);
      notify(message, "Default settings restored.");
    });

    fillForm(getSettings());
  }

  function bootCouponsPanel() {
    const form = document.querySelector("#coupon-form");
    const list = document.querySelector("[data-coupons-list]");
    const message = document.querySelector("[data-coupons-message]");

    if (!form || !list || !api.getCoupons || !api.saveCoupons) {
      return;
    }

    function currentCoupons() {
      return api.getCoupons();
    }

    function emptyCoupon() {
      return {
        id: "",
        code: "",
        discount: 10,
        quantity: 100,
        expires: "",
        status: "active"
      };
    }

    function fillForm(coupon) {
      form.elements.id.value = coupon.id || "";
      form.elements.code.value = coupon.code || "";
      form.elements.discount.value = Number(coupon.discount || 0);
      form.elements.quantity.value = Number(coupon.quantity || 0);
      form.elements.expires.value = coupon.expires || "";
      form.elements.status.value = coupon.status || "active";
      renderList(coupon.id);
    }

    function readForm() {
      const code = form.elements.code.value.trim().toUpperCase().replace(/\s+/g, "");
      return {
        id: form.elements.id.value.trim() || slugify(code),
        code,
        discount: Number(form.elements.discount.value || 0),
        quantity: Number(form.elements.quantity.value || 0),
        expires: form.elements.expires.value,
        status: form.elements.status.value
      };
    }

    function renderList(selectedId) {
      const coupons = currentCoupons();
      list.innerHTML = coupons.length ? coupons.map((coupon) => `
        <button class="admin-product-row${selectedId === coupon.id ? " selected" : ""}" type="button" data-edit-coupon="${escapeHtml(coupon.id)}">
          <span class="admin-product-icon media-orange"><i class="fa-solid fa-ticket"></i></span>
          <span>
            <strong>${escapeHtml(coupon.code)}</strong>
            <small>${escapeHtml(String(coupon.discount))}% off / ${escapeHtml(String(coupon.quantity))} uses / ${escapeHtml(coupon.expires || "No expiry")} / ${escapeHtml(coupon.status)}</small>
          </span>
        </button>
      `).join("") : `<div class="empty-state"><h3>No coupons yet</h3><p>Add a coupon code for the checkout page.</p></div>`;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const coupon = readForm();
      if (!coupon.code) {
        notify(message, "Coupon code is required.");
        return;
      }
      const coupons = currentCoupons();
      const duplicate = coupons.find((item) => item.code === coupon.code && item.id !== coupon.id);
      if (duplicate) {
        notify(message, "Another coupon already uses this code.");
        return;
      }
      const index = coupons.findIndex((item) => item.id === coupon.id);
      if (index >= 0) {
        coupons[index] = coupon;
      } else {
        coupons.unshift(coupon);
      }
      const saved = api.saveCoupons(coupons);
      const fresh = saved.find((item) => item.code === coupon.code) || saved[0] || emptyCoupon();
      fillForm(fresh);
      notify(message, "Coupon saved. Cart checkout will use this code immediately.");
    });

    list.addEventListener("click", (event) => {
      const row = event.target.closest("[data-edit-coupon]");
      if (!row) {
        return;
      }
      const coupon = currentCoupons().find((item) => item.id === row.dataset.editCoupon);
      if (coupon) {
        fillForm(coupon);
        notify(message, `Editing ${coupon.code}.`);
      }
    });

    document.querySelector("[data-new-coupon]")?.addEventListener("click", () => {
      fillForm(emptyCoupon());
      notify(message, "Ready for a new coupon.");
    });

    document.querySelector("[data-delete-coupon]")?.addEventListener("click", () => {
      const id = form.elements.id.value.trim();
      if (!id) {
        notify(message, "Choose a coupon before deleting.");
        return;
      }
      const coupon = currentCoupons().find((item) => item.id === id);
      if (!coupon || !confirm(`Delete coupon "${coupon.code}"?`)) {
        return;
      }
      const coupons = api.saveCoupons(currentCoupons().filter((item) => item.id !== id));
      fillForm(coupons[0] || emptyCoupon());
      notify(message, "Coupon deleted.");
    });

    fillForm(currentCoupons()[0] || emptyCoupon());
  }

  function bootDashboard() {
    const stats = document.querySelector("[data-dashboard-stats]");
    const recentOrders = document.querySelector("[data-recent-orders]");
    const productList = document.querySelector("[data-dashboard-products]");
    const customerSegments = document.querySelector("[data-customer-segments]");
    const trafficSources = document.querySelector("[data-traffic-sources]");
    const tasks = document.querySelector("[data-dashboard-tasks]");

    if (!stats) {
      return;
    }

    const products = getProducts();
    const activeProducts = products.filter((product) => product.status !== "draft");
    const draftProducts = products.length - activeProducts.length;
    const orders = getOrders();
    const openOrders = orders.filter((order) => ["pending", "paid", "processing"].includes(order.status));
    const revenue = orders
      .filter((order) => ["paid", "processing", "fulfilled"].includes(order.status))
      .reduce((sum, order) => sum + parseMoney(order.total), 0);
    const customers = getCustomers();
    const pages = getPages();
    const reviewPages = pages.filter((page) => page.status === "review").length;
    const settings = getSettings();

    stats.innerHTML = [
      ["Revenue", formatMoney(revenue), "Tracked from saved orders"],
      ["Open Orders", String(openOrders.length), "Pending, paid, or processing"],
      ["Active Products", String(activeProducts.length), `${draftProducts} draft product${draftProducts === 1 ? "" : "s"}`],
      ["Customers", String(customers.length), "Saved CRM records"]
    ].map(([label, value, detail]) => `
      <article class="admin-metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(detail)}</small>
      </article>
    `).join("");

    if (recentOrders) {
      recentOrders.innerHTML = orders.slice(0, 5).map((order) => `
        <div class="admin-list-row">
          <div>
            <strong>${escapeHtml(order.id)} / ${escapeHtml(order.customerName)}</strong>
            <span>${escapeHtml(productName(order.productId))}</span>
          </div>
          <div>
            ${statusPill(order.status)}
            <b>${escapeHtml(order.total)}</b>
          </div>
        </div>
      `).join("");
    }

    if (productList) {
      productList.innerHTML = products.slice(0, 5).map((product) => `
        <div class="admin-list-row">
          <div>
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.category)}</span>
          </div>
          <div>
            ${statusPill(product.status || "active")}
            <b>${escapeHtml(product.price)}</b>
          </div>
        </div>
      `).join("");
    }

    if (customerSegments) {
      const segmentCounts = customers.reduce((totals, customer) => {
        totals[customer.segment] = (totals[customer.segment] || 0) + 1;
        return totals;
      }, {});
      customerSegments.innerHTML = Object.entries(segmentCounts).map(([segment, count]) => `
        <div class="admin-list-row">
          <div>
            <strong>${escapeHtml(segment)}</strong>
            <span>${count} customer${count === 1 ? "" : "s"}</span>
          </div>
          <b>${Math.round((count / Math.max(customers.length, 1)) * 100)}%</b>
        </div>
      `).join("");
    }

    if (trafficSources) {
      const sources = api.getTrafficSummary ? api.getTrafficSummary() : [];
      trafficSources.innerHTML = sources.length ? sources.slice(0, 6).map((source) => `
        <div class="admin-list-row">
          <div>
            <strong>${escapeHtml(source.source)}</strong>
            <span>${escapeHtml(source.campaign || source.medium || source.landingPage || "Website traffic")}</span>
          </div>
          <div>
            <b>${escapeHtml(source.visits)}</b>
            <span>${escapeHtml(source.checkouts)} checkout${source.checkouts === 1 ? "" : "s"}</span>
          </div>
        </div>
      `).join("") : `<div class="empty-state"><h3>No traffic yet</h3><p>Open the storefront with a URL like ?utm_source=instagram to start tracking sources.</p></div>`;
    }

    if (tasks) {
      tasks.innerHTML = `
        <div><strong>${openOrders.length} orders need movement</strong><span>Review pending, paid, and processing orders.</span></div>
        <div><strong>${draftProducts} draft products</strong><span>Publish or archive catalog items.</span></div>
        <div><strong>${reviewPages} content pages need review</strong><span>Check page records before launch updates.</span></div>
        <div><strong>${escapeHtml(settings.checkoutMode)} checkout</strong><span>Current flow uses ${escapeHtml(settings.defaultOrderStatus)} as the default order status.</span></div>
      `;
    }
  }

  function boot() {
    activateAdminNav();
    bootDashboard();
    bootProductPage();
    bootFreebiesPage();
    bootOrdersPage();
    bootCustomersPage();
    bootContentPage();
    bootSettingsPage();
    bootCouponsPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
