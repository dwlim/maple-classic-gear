const slots = [
  "Head",
  "Earring",
  "Top",
  "Bottom",
  "Overall",
  "Cape",
  "Glove",
  "Shoes",
  "Weapon",
  "Shield",
  "Pet Equip",
];
const inventorySlots = slots.filter((slot) => slot !== "Overall");
const slotPositions = {
  Head: [3, 1],
  Earring: [4, 2],
  Cape: [1, 3],
  Top: [2, 3],
  Weapon: [4, 3],
  Shield: [5, 3],
  Glove: [1, 4],
  Bottom: [2, 4],
  Shoes: [2, 5],
  "Pet Equip": [5, 6],
};
const imageLabeledSlots = new Set([
  "Head",
  "Earring",
  "Cape",
  "Top",
  "Bottom",
  "Shoes",
  "Glove",
  "Weapon",
  "Shield",
]);
const statKeys = [
  "STR",
  "DEX",
  "INT",
  "LUK",
  "WATK",
  "MATK",
  "WDEF",
  "MDEF",
  "ACC",
  "AVOID",
  "SPEED",
  "JUMP",
  "HP",
  "MP",
  "CRIT RATE",
  "CRIT DMG",
];
const osmsCategoryBySlot = {
  Head: ["Hat"],
  Earring: ["Earring"],
  Top: ["Top", "Overall"],
  Bottom: ["Bottom"],
  Overall: ["Overall"],
  Cape: ["Cape"],
  Glove: ["Glove"],
  Shoes: ["Shoes"],
  Weapon: ["Weapon"],
  Shield: ["Shield"],
  "Pet Equip": ["Pet Equip", "Pet"],
};
const osmsStatsByStat = {
  STR: "incSTR",
  DEX: "incDEX",
  INT: "incINT",
  LUK: "incLUK",
  WATK: "incWAT",
  MATK: "incMAD",
  WDEF: "incPDD",
  MDEF: "incMDD",
  ACC: "incACC",
  AVOID: "incEVA",
  SPEED: "incSpeed",
  JUMP: "incJump",
  HP: "incMHP",
  MP: "incMMP",
  "CRIT RATE": "incCRT",
  "CRIT DMG": "incCRD",
};
const statByOsmsKey = Object.fromEntries(
  Object.entries(osmsStatsByStat).map(([label, key]) => [key, label]),
);
const weaponScrollTypes = {
  130: "1H Sword",
  131: "1H Axe",
  132: "1H Blunt",
  133: "Dagger",
  137: "Wand",
  138: "Staff",
  140: "2H Sword",
  141: "2H Axe",
  142: "2H Blunt",
  143: "Spear",
  144: "Polearm",
  145: "Bow",
  146: "Crossbow",
  147: "Claw",
};
const otherScrollPrefixes = {
  Head: ["Hat "],
  Top: ["Topwear "],
  Bottom: ["Bottomwear "],
  "Pet Equip": ["Pet Equip "],
};
const OSMS_ITEMS_URL = "https://osmsdataexplorer.com/data/api/v1/items.json";
const OSMS_CATALOG_CACHE_KEY = "maple-gearbook-osms-cache-v1";
const blank = () => ({ id: null, name: "", scrolls: [] });
let gear = Object.fromEntries(slots.map((s) => [s, blank()])),
  editing = null,
  modalReturnFocus = null,
  catalogSource = "live";
let catalog = [],
  catalogById = new Map(),
  catalogBySlot = Object.fromEntries(slots.map((s) => [s, []])),
  scrollCatalog = [],
  scrollById = new Map(),
  scrollByFamily = new Map(),
  selectedCatalogItem = null,
  draftScrollCounts = {},
  draftFailedScrollCount = 0,
  draftBaseStats = {},
  catalogReady = false,
  hashRevision = 0;
const $ = (id) => document.getElementById(id);
function build(persist = true) {
  let grid = $("slotGrid");
  grid.innerHTML = "";
  inventorySlots.forEach((name) => {
    const overallEquipped = Boolean(gear.Overall?.id),
      weaponBlocksShield = isTwoHandedWeapon(gear.Weapon),
      blockedByOverall = name === "Bottom" && overallEquipped,
      blockedByWeapon = name === "Shield" && weaponBlocksShield,
      blocked = blockedByOverall || blockedByWeapon,
      item =
        (name === "Top" && overallEquipped ? gear.Overall : gear[name]) ||
        blank(),
      source = item.id && catalogById.get(Number(item.id));
    const [col, row] = slotPositions[name];
    const available = (catalogBySlot[name] || []).length > 0,
      b = document.createElement("button");
    b.type = "button";
    b.className =
      "slot " +
      (item.id ? "" : "empty") +
      (!available ? " unsupported" : "") +
      (blocked ? " blocked-slot" : "") +
      (imageLabeledSlots.has(name) ? " has-bg-label" : "") +
      (source?.icon_url ? " has-item-image" : "");
    b.disabled = !available || blocked;
    b.dataset.slotName = name;
    b.style.setProperty("--col", col);
    b.style.setProperty("--row", row);
    b.setAttribute(
      "aria-label",
      blockedByOverall
        ? "Bottom unavailable while an Overall is equipped"
        : blockedByWeapon
          ? "Shield unavailable while a two-handed weapon is equipped"
          : item.id
            ? `${name}: ${escapeHtml(item.name)}${passedScrollCount(item) ? ` (+${passedScrollCount(item)})` : ""}. Edit item`
            : available
              ? `Choose ${name} from OSMS equipment`
              : `${name}: no items in the OSMS equipment catalog`,
    );
    b.innerHTML = `<span class="slot-label">${escapeHtml(name)}</span>${source?.icon_url ? `<img class="slot-item-image" src="${escapeHtml(source.icon_url)}" alt="" loading="lazy" onerror="this.remove();this.parentElement.classList.remove('has-item-image')">` : ""}<span class="slot-name">${item.id ? `${escapeHtml(item.name)}${passedScrollCount(item) ? ` (+${passedScrollCount(item)})` : ""}` : blockedByOverall ? "Cannot wear with Overall" : blockedByWeapon ? "Cannot wear with 2H weapon" : available ? "" : "Not in catalog"}</span>`;
    b.onclick = () => openModal(name);
    grid.append(b);
  });
  const equipped = Object.values(gear).filter((i) => i.id).length;
  $("equippedCount").textContent = catalogReady
    ? `${equipped} item${equipped === 1 ? "" : "s"} equipped`
    : "Loading OSMS equipment…";
  $("catalogStatus").hidden = catalogSource !== "cached";
  $("statGrid").innerHTML = statKeys
    .map(
      (k) =>
        `<div class="stat-row"><label>${k}</label><input class="stat-input" readonly aria-label="Total ${k}" value="${total(k) || "—"}"></div>`,
    )
    .join("");
  renderDetailsView();
  if (persist && catalogReady) {
    saveLocal();
    if (location.hash) updateShareHash();
  }
}
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function baseStat(item, k) {
  return Number(item?.stats?.[osmsStatsByStat[k]]) || 0;
}
function baseStatBounds(item, key) {
  const clean = Number(item?.stats?.[key]) || 0,
    variance = clean < 10 ? 1 : 5;
  return [Math.max(0, clean - variance), clean + variance];
}
function weaponScrollType(item) {
  return weaponScrollTypes[String(item?.id || "").slice(0, 3)] || "";
}
function isTwoHandedWeapon(item) {
  const type = catalogById.get(Number(item?.id))?.weapon?.type || "";
  return (
    /^2H\s/.test(type) || ["Bow", "Crossbow", "Polearm", "Spear"].includes(type)
  );
}
function scrollFitsItem(item, scroll, slot = editing) {
  const target = scroll?.scroll?.slot;
  if (!item || !target) return false;
  if (target === "Other")
    return (otherScrollPrefixes[slot] || []).some((prefix) =>
      scroll.name.startsWith(prefix),
    );
  if (item.sub_category === "Weapon") return weaponScrollType(item) === target;
  return target === item.sub_category;
}
function compatibleScrolls(item, slot = editing) {
  return scrollCatalog
    .filter((scroll) => scrollFitsItem(item, scroll, slot))
    .sort(
      (a, b) => a.name.localeCompare(b.name) || Number(a.id) - Number(b.id),
    );
}
function scrollFamilyKey(scroll) {
  return String(scroll?.name || "");
}
function passedScrollCount(item) {
  return (item?.scrolls || []).reduce(
    (sum, entry) => sum + (Number(entry?.count) || 0),
    0,
  );
}
function totalEnhancementCount(item) {
  return passedScrollCount(item) + (Number(item?.failedScrolls) || 0);
}
function formatStats(stats) {
  return Object.entries(stats || {})
    .filter(([key, value]) => statByOsmsKey[key] && Number(value))
    .map(([key, value]) => `${statByOsmsKey[key]} +${value}`)
    .join(" · ");
}
function total(k) {
  return Object.values(gear).reduce((sum, item) => {
    const source = item.id && catalogById.get(Number(item.id)),
      key = osmsStatsByStat[k],
      overrides = item.baseStats || {},
      base = Object.prototype.hasOwnProperty.call(overrides, key)
        ? Number(overrides[key]) || 0
        : baseStat(source, k);
    const rolled = (item.scrolls || []).reduce((n, entry) => {
      const scroll = scrollById.get(Number(entry?.id));
      return (
        n +
        (Number(entry?.count) || 0) *
          (Number(scroll?.scroll?.stats?.[key]) || 0)
      );
    }, 0);
    return sum + base + rolled;
  }, 0);
}
function itemStatValue(item, source, key) {
  const clean = Number(source.stats?.[key]) || 0,
    base = Object.prototype.hasOwnProperty.call(item.baseStats || {}, key)
      ? Number(item.baseStats[key]) || 0
      : clean;
  let scrollBonus = 0;
  (item.scrolls || []).forEach((entry) => {
    const sourceScroll = scrollById.get(Number(entry?.id));
    scrollBonus +=
      (Number(entry?.count) || 0) *
      (Number(sourceScroll?.scroll?.stats?.[key]) || 0);
  });
  return {
    clean,
    value: base + scrollBonus,
    delta: base + scrollBonus - clean,
  };
}
const itemStatLabels = {
  STR: "Strength",
  DEX: "Dexterity",
  INT: "Intelligence",
  LUK: "Luk",
  WATK: "Weapon Attack",
  MATK: "Magic Attack",
  WDEF: "Weapon Defense",
  MDEF: "Magic Defense",
  ACC: "Accuracy",
  AVOID: "Evasion",
  SPEED: "Speed",
  JUMP: "Jump",
  HP: "HP",
  MP: "MP",
  "CRIT RATE": "Crit Rate",
  "CRIT DMG": "Crit Damage",
};
const jobRootByClass = {
  beginner: "BEGINNER",
  warrior: "WARRIOR",
  fighter: "WARRIOR",
  page: "WARRIOR",
  spearman: "WARRIOR",
  magician: "MAGICIAN",
  cleric: "MAGICIAN",
  "fire / poison": "MAGICIAN",
  "ice / lightning": "MAGICIAN",
  bowman: "BOWMAN",
  hunter: "BOWMAN",
  crossbowman: "BOWMAN",
  thief: "THIEF",
  assassin: "THIEF",
  bandit: "THIEF",
};
function itemDetailCard(slot, item) {
  const source = catalogById.get(Number(item.id));
  if (!source) return "";
  const count = totalEnhancementCount(item),
    passed = passedScrollCount(item),
    tuc = Math.max(0, Number(source.stats?.tuc) || 0),
    reqClasses = Array.isArray(source.req_classes) ? source.req_classes : [],
    allowedRoots = new Set(
      reqClasses
        .map((name) => jobRootByClass[String(name).toLocaleLowerCase()])
        .filter(Boolean),
    ),
    allAllowed =
      !reqClasses.length ||
      reqClasses.some((name) =>
        ["all", "common"].includes(String(name).toLocaleLowerCase()),
      );
  const classes = ["BEGINNER", "WARRIOR", "MAGICIAN", "BOWMAN", "THIEF"]
    .map(
      (name) =>
        `<span class="item-class-tab${allAllowed || allowedRoots.has(name) ? " allowed" : ""}">${name}</span>`,
    )
    .join("");
  const requirements = [
    ["REQ LEV", "reqLevel"],
    ["REQ STR", "reqSTR"],
    ["REQ DEX", "reqDEX"],
    ["REQ INT", "reqINT"],
    ["REQ LUK", "reqLUK"],
    ["REQ FAM", "reqFAM"],
  ]
    .map(
      ([label, key]) =>
        `<span><b>${label} :</b> ${Number(source.stats?.[key]) || 0}</span>`,
    )
    .join("");
  const statRows = statKeys
    .map((label) => {
      const key = osmsStatsByStat[label];
      if (
        !Object.prototype.hasOwnProperty.call(source.stats || {}, key) &&
        !Object.values(item.scrolls || []).some((entry) => {
          const scroll = scrollById.get(Number(entry?.id));
          return (Number(scroll?.scroll?.stats?.[key]) || 0) !== 0;
        })
      )
        return "";
      const result = itemStatValue(item, source, key),
        format = (value) => `${value > 0 ? "+" : ""}${value}`,
        breakdown = result.delta
          ? ` <span class="stat-breakdown">(${result.clean} ${format(result.delta)})</span>`
          : "";
      return `<div class="item-window-stat"><span>${itemStatLabels[label]} <strong>${format(result.value)}</strong>${breakdown}</span></div>`;
    })
    .join("");
  const speed = source.stats?.attackSpeed;
  const speedName =
    speed == null
      ? ""
      : {
          2: "Faster",
          3: "Faster",
          4: "Fast",
          5: "Fast",
          6: "Normal",
          7: "Slow",
          8: "Slow",
          9: "Very Slow",
        }[Number(speed)] || String(speed);
  const type = source.weapon?.type || source.sub_category;
  const extras = `<div class="item-window-stat"><span>Type: <strong>${escapeHtml(type || "Equipment")}</strong></span></div>${speedName ? `<div class="item-window-stat"><span>Attack Speed: <strong>${escapeHtml(speedName)}</strong></span></div>` : ""}${statRows}<div class="item-window-stat"><span>Remaining Enhancements: <strong>${Math.max(0, tuc - count)}</strong></span></div>`;
  return `<article class="item-window" aria-label="${escapeHtml(item.name)} details"><div class="item-window-name">${escapeHtml(item.name)}${passed ? ` (+${passed})` : ""}</div><div class="item-window-top">${source.icon_url ? `<img class="item-window-image" crossorigin="anonymous" src="${escapeHtml(source.icon_url)}" alt="${escapeHtml(item.name)}" loading="eager">` : '<div class="item-window-image"></div>'}<div class="item-window-requirements">${requirements}</div></div><div class="item-class-tabs">${classes}</div><div class="item-window-stats">${extras}</div></article>`;
}
function renderDetailsView() {
  const equipped = slots
    .map((slot) => ({ slot, item: gear[slot] }))
    .filter((entry) => entry.item?.id);
  $("detailsGrid").innerHTML = equipped.length
    ? equipped.map(({ slot, item }) => itemDetailCard(slot, item)).join("")
    : '<div class="details-empty">Equip an item to see its MapleStory-style details window here.</div>';
}
function usedScrollCount() {
  return (
    Object.values(draftScrollCounts).reduce(
      (sum, count) => sum + (Number(count) || 0),
      0,
    ) + draftFailedScrollCount
  );
}
function setFailedScrollCount(value) {
  if (!selectedCatalogItem) return;
  const slots = Math.max(0, Number(selectedCatalogItem.stats?.tuc) || 0),
    other = usedScrollCount() - draftFailedScrollCount;
  draftFailedScrollCount = Math.min(
    Math.max(0, Math.floor(Number(value) || 0)),
    Math.max(0, slots - other),
  );
  renderScrollEditor(selectedCatalogItem);
  $("scrollEditor")
    .querySelector("[data-failed-qty]")
    ?.focus({ preventScroll: true });
  saveDraftItem();
}
function setScrollCount(id, value) {
  if (!selectedCatalogItem) return;
  const slots = Math.max(0, Number(selectedCatalogItem.stats?.tuc) || 0),
    key = String(id),
    current = Number(draftScrollCounts[key]) || 0,
    other = usedScrollCount() - current,
    requested = Math.max(0, Math.floor(Number(value) || 0)),
    next = Math.min(requested, Math.max(0, slots - other));
  if (next) draftScrollCounts[key] = next;
  else delete draftScrollCounts[key];
  renderScrollEditor(selectedCatalogItem);
  $("scrollEditor")
    .querySelector(`[data-scroll-qty="${key}"]`)
    ?.focus({ preventScroll: true });
  saveDraftItem();
}
function renderScrollEditor(item) {
  const panel = $("scrollEditor");
  panel.hidden = !item;
  if (!item) return;
  const slots = Math.max(0, Number(item.stats?.tuc) || 0),
    options = compatibleScrolls(item, editing),
    used = usedScrollCount();
  if (!slots) {
    panel.innerHTML =
      '<h3>Available scrolls</h3><p class="scroll-editor-note">This item has no upgrade slots in the OSMS data.</p>';
    return;
  }
  const groups = new Map();
  options.forEach((scroll) => {
    const title = scroll.name.replace(
      /: (Lesser|Intermediate|Greater|Chaos)$/,
      "",
    );
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(scroll);
  });
  const colorFor = (scroll) => {
    if (
      String(scroll.scroll?.tier || "").toLocaleLowerCase() === "chaos" ||
      /: Chaos$/i.test(scroll.name)
    )
      return "chaos";
    const successRate = Number(scroll.scroll?.success_rate);
    return [10, 60, 100].includes(successRate) ? String(successRate) : "other";
  };
  const orderFor = (scroll) =>
    ({ 10: 0, 60: 1, 100: 2, chaos: 3 })[colorFor(scroll)] ?? 4;
  const body = [...groups.entries()]
    .map(([title, group]) => {
      group.sort(
        (a, b) => orderFor(a) - orderFor(b) || a.name.localeCompare(b.name),
      );
      const rows = group
        .map((scroll) => {
          const count = Number(draftScrollCounts[String(scroll.id)]) || 0,
            remaining = Math.max(0, slots - (used - count)),
            effect =
              formatStats(scroll.scroll?.stats) ||
              scroll.scroll?.stat ||
              "No stat effect listed",
            successRate = Number(scroll.scroll?.success_rate),
            rate = [10, 60, 100].includes(successRate)
              ? `${successRate}% success`
              : "";
          return `<div class="scroll-row" data-scroll-color="${colorFor(scroll)}"><div class="scroll-row-info">${scroll.icon_url ? `<img class="scroll-row-thumb" src="${escapeHtml(scroll.icon_url)}" alt="" loading="lazy">` : ""}<strong>${escapeHtml(scroll.name)}</strong><span>${escapeHtml([rate, effect].filter(Boolean).join(" · "))}</span></div><div class="scroll-qty"><button type="button" data-scroll-step="-1" data-scroll-id="${scroll.id}" aria-label="Use one fewer ${escapeHtml(scroll.name)}" ${count <= 0 ? "disabled" : ""}>−</button><input type="number" min="0" max="${remaining}" step="1" value="${count}" data-scroll-qty="${scroll.id}" aria-label="Quantity of ${escapeHtml(scroll.name)}"><button type="button" data-scroll-step="1" data-scroll-id="${scroll.id}" aria-label="Use one more ${escapeHtml(scroll.name)}" ${count >= remaining ? "disabled" : ""}>+</button></div></div>`;
        })
        .join("");
      return `<section class="scroll-group"><div class="scroll-group-title">${escapeHtml(title)}</div>${rows}</section>`;
    })
    .join("");
  const failedRemaining = Math.max(0, slots - (used - draftFailedScrollCount)),
    failedRow = `<section class="scroll-group"><div class="scroll-group-title">Failed scrolls</div><div class="scroll-row" data-scroll-color="failed"><div class="scroll-row-info"><strong>Failed scroll</strong><span>Uses one upgrade slot · no stat bonus</span></div><div class="scroll-qty"><button type="button" data-failed-step="-1" aria-label="Remove one failed scroll" ${draftFailedScrollCount <= 0 ? "disabled" : ""}>−</button><input type="number" min="0" max="${failedRemaining}" step="1" value="${draftFailedScrollCount}" data-failed-qty aria-label="Number of failed scrolls"><button type="button" data-failed-step="1" aria-label="Add one failed scroll" ${draftFailedScrollCount >= failedRemaining ? "disabled" : ""}>+</button></div></div></section>`;
  panel.innerHTML = `<h3>Scrolls you can use</h3><p class="scroll-editor-note">Choose how many of each scroll have landed. Total quantity is limited by this item's upgrade slots.</p><div class="scroll-list">${body || '<div class="catalog-empty">No compatible scrolls are listed for this equipment.</div>'}${failedRow}</div><div class="scroll-foot">${used} of ${slots} scrolls applied</div>`;
}
function renderBaseStatEditor(item) {
  const panel = $("baseStatEditor");
  panel.hidden = !item;
  if (!item) return;
  const fields = statKeys
    .map((label) => {
      const key = osmsStatsByStat[label];
      if (!Object.prototype.hasOwnProperty.call(item.stats || {}, key))
        return "";
      const clean = Number(item.stats[key]) || 0,
        [min, max] = baseStatBounds(item, key),
        current = Math.min(
          max,
          Math.max(
            min,
            Object.prototype.hasOwnProperty.call(draftBaseStats, key)
              ? Number(draftBaseStats[key])
              : clean,
          ),
        ),
        delta = current - clean;
      return `<div class="base-stat-row"><label for="base-stat-${key}">${label}</label><span class="base-stat-clean">Clean ${clean}</span><span class="base-stat-delta">${delta > 0 ? `+${delta}` : delta}</span><button type="button" class="base-stat-reset" data-base-stat-reset="${key}" ${delta === 0 ? "disabled" : ""}>Reset</button><div class="scroll-qty base-stat-qty"><button type="button" data-base-stat-step="-1" data-base-stat-key="${key}" aria-label="Decrease ${label} base stat" ${current <= min ? "disabled" : ""}>−</button><input id="base-stat-${key}" type="number" min="${min}" max="${max}" step="1" value="${current}" data-base-stat="${key}" aria-label="${label} base stat"><button type="button" data-base-stat-step="1" data-base-stat-key="${key}" aria-label="Increase ${label} base stat" ${current >= max ? "disabled" : ""}>+</button></div></div>`;
    })
    .filter(Boolean)
    .join("");
  panel.innerHTML = `<h3>Item base stats</h3><p class="base-stat-note">Adjust this copy's clean, unscrolled stats. Values under 10 can vary by ±1; values 10 or higher by ±5. Stats cannot go below zero. “Clean” shows the OSMS catalog value.</p>${fields || '<p class="base-stat-note">No editable stats are listed for this item.</p>'}`;
}
function setBaseStat(key, value) {
  if (
    !selectedCatalogItem ||
    !Object.prototype.hasOwnProperty.call(selectedCatalogItem.stats || {}, key)
  )
    return;
  const [min, max] = baseStatBounds(selectedCatalogItem, key),
    number = Math.min(max, Math.max(min, Math.floor(Number(value) || 0))),
    clean = Number(selectedCatalogItem.stats[key]) || 0;
  if (number === clean) delete draftBaseStats[key];
  else draftBaseStats[key] = number;
  renderBaseStatEditor(selectedCatalogItem);
  $("baseStatEditor")
    .querySelector(`[data-base-stat="${key}"]`)
    ?.focus({ preventScroll: true });
  saveDraftItem();
}
function selectCatalogItem(item, preserveDraft = false) {
  if (
    !preserveDraft &&
    (!selectedCatalogItem ||
      !item ||
      Number(selectedCatalogItem.id) !== Number(item.id))
  ) {
    draftScrollCounts = {};
    draftFailedScrollCount = 0;
    draftBaseStats = {};
  }
  selectedCatalogItem = item;
  $("selectedItem").hidden = !item;
  if (item) {
    const stats = statKeys
      .map((k) => [k, baseStat(item, k)])
      .filter(([, v]) => v)
      .map(([k, v]) => `${k} +${v}`)
      .join(" · ");
    const req = item.stats?.reqLevel ? ` · Lv. ${item.stats.reqLevel}+` : "";
    const tuc = Math.max(0, Number(item.stats?.tuc) || 0);
    $("selectedItem").innerHTML =
      `${item.icon_url ? `<img class="selected-item-thumb" src="${escapeHtml(item.icon_url)}" alt="" loading="lazy">` : ""}<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.sub_category || "Equipment")}${req} · ${tuc} upgrade slots${stats ? " · " + escapeHtml(stats) : ""}</span></div>`;
    $("itemSearch").value = item.name;
    renderBaseStatEditor(item);
    renderScrollEditor(item);
    saveDraftItem();
  } else {
    $("baseStatEditor").hidden = true;
    $("baseStatEditor").innerHTML = "";
    $("scrollEditor").hidden = true;
    $("scrollEditor").innerHTML = "";
  }
  renderCatalogResults($("itemSearch").value);
  if (item) {
    const firstControl =
      $("baseStatEditor").querySelector(
        "button:not(:disabled), input:not(:disabled)",
      ) ||
      $("scrollEditor").querySelector(
        "button:not(:disabled), input:not(:disabled)",
      ) ||
      $("removeItem");
    firstControl.focus({ preventScroll: true });
  }
}
function renderCatalogResults(query = "") {
  const list = editing ? catalogBySlot[editing] || [] : [];
  const q = query.trim().toLocaleLowerCase();
  const filtered = list.filter(
    (item) => !q || item.name.toLocaleLowerCase().includes(q),
  );
  const matches = filtered.slice(0, 18);
  const results = matches
    .map(
      (item) =>
        `<button type="button" class="catalog-option" role="option" data-item-id="${item.id}">${item.icon_url ? `<img class="catalog-option-thumb" src="${escapeHtml(item.icon_url)}" alt="" loading="lazy">` : ""}<span class="catalog-option-main"><span class="catalog-option-name">${escapeHtml(item.name)}</span><span class="catalog-option-meta">${item.stats?.reqLevel ? `Lv. ${item.stats.reqLevel} · ` : ""}#${item.id}</span></span></button>`,
    )
    .join("");
  $("itemResults").innerHTML = results
    ? results +
      (filtered.length > 18
        ? `<div class="catalog-note">Showing 18 of ${filtered.length} matches. Refine your search to find the item.</div>`
        : "")
    : `<div class="catalog-empty">${list.length ? "No matching items. Try another search." : "OSMS currently has no items for this slot."}</div>`;
}
function openModal(name) {
  if (!catalogReady) return;
  modalReturnFocus = { element: document.activeElement, slot: name };
  editing = name;
  const item =
      (name === "Top" && gear.Overall?.id ? gear.Overall : gear[name]) ||
      blank(),
    itemCount = (catalogBySlot[name] || []).length;
  $("modalTitle").textContent = item.id ? "Edit equipment" : "Add equipment";
  $("modalSubtitle").textContent =
    `${name} slot · ${itemCount} catalog item${itemCount === 1 ? "" : "s"} available.`;
  $("itemSearch").value = "";
  $("itemSearch").placeholder = `Search ${itemCount} ${name} items`;
  $("removeItem").style.visibility = item.id ? "visible" : "hidden";
  draftScrollCounts = Object.fromEntries(
    (item.scrolls || [])
      .filter((entry) => entry?.id && entry.count)
      .map((entry) => [String(entry.id), Number(entry.count)]),
  );
  draftFailedScrollCount = Math.max(0, Number(item.failedScrolls) || 0);
  draftBaseStats = { ...(item.baseStats || {}) };
  selectedCatalogItem = null;
  selectCatalogItem(
    item.id ? catalogById.get(Number(item.id)) || null : null,
    true,
  );
  renderCatalogResults(item.name || "");
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  document.querySelector(".topbar").inert = true;
  $("mainContent").inert = true;
  $("modalBackdrop").classList.add("open");
  setTimeout(() => {
    if ($("modalBackdrop").classList.contains("open")) $("itemSearch").focus();
  }, 30);
}
function closeModal(restoreFocus = true) {
  $("modalBackdrop").classList.remove("open");
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  document.querySelector(".topbar").inert = false;
  $("mainContent").inert = false;
  editing = null;
  const returnFocus = modalReturnFocus;
  modalReturnFocus = null;
  if (restoreFocus && returnFocus) {
    const target = returnFocus.element?.isConnected
      ? returnFocus.element
      : [...$("slotGrid").querySelectorAll(".slot")].find(
          (button) => button.dataset.slotName === returnFocus.slot,
        );
    target?.focus({ preventScroll: true });
  }
}
function saveDraftItem() {
  if (!editing || !selectedCatalogItem) return false;
  const scrolls = compatibleScrolls(selectedCatalogItem, editing)
      .map((scroll) => ({
        id: Number(scroll.id),
        count: Number(draftScrollCounts[String(scroll.id)]) || 0,
      }))
      .filter((entry) => entry.count > 0),
    baseStats = {};
  Object.entries(draftBaseStats).forEach(([key, value]) => {
    if (
      !Object.prototype.hasOwnProperty.call(
        selectedCatalogItem.stats || {},
        key,
      )
    )
      return;
    const [min, max] = baseStatBounds(selectedCatalogItem, key),
      clean = Number(selectedCatalogItem.stats[key]) || 0,
      number = Math.min(max, Math.max(min, Math.floor(Number(value) || 0)));
    if (number !== clean) baseStats[key] = number;
  });
  const destination =
    editing === "Top" && selectedCatalogItem.sub_category === "Overall"
      ? "Overall"
      : editing;
  const item = {
    id: selectedCatalogItem.id,
    name: selectedCatalogItem.name,
    scrolls,
    failedScrolls: draftFailedScrollCount,
    baseStats,
  };
  if (editing === "Top") {
    gear.Top = blank();
    gear.Overall = blank();
  }
  gear[destination] = item;
  if (destination === "Overall") gear.Bottom = blank();
  if (destination === "Weapon" && isTwoHandedWeapon(item))
    gear.Shield = blank();
  build();
  return true;
}
function getState() {
  return { v: 6, g: gear };
}
function packedState() {
  const slotKeys = {
      Head: "h",
      Earring: "e",
      Top: "t",
      Bottom: "b",
      Overall: "o",
      Cape: "c",
      Glove: "g",
      Shoes: "s",
      Weapon: "w",
      Shield: "d",
      "Pet Equip": "p",
    },
    packed = { v: 7, g: {} };
  Object.entries(gear).forEach(([slot, item]) => {
    if (!item?.id) return;
    const baseStats = Object.entries(item.baseStats || {})
      .map(([key, value]) => [
        statKeys.indexOf(statByOsmsKey[key]),
        Number(value),
      ])
      .filter(([index]) => index >= 0);
    packed.g[slotKeys[slot]] = [
      Number(item.id),
      (item.scrolls || []).map((entry) => [
        Number(entry.id),
        Number(entry.count),
      ]),
      Number(item.failedScrolls) || 0,
      baseStats,
    ];
  });
  return packed;
}
function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function base64UrlToBytes(value) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
function encodeState() {
  return bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(packedState())),
  );
}
async function encodeShareHash() {
  const json = JSON.stringify(packedState());
  if (!("CompressionStream" in window)) return encodeState();
  try {
    const stream = new Blob([json])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return `z${bytesToBase64Url(bytes)}`;
  } catch (e) {
    return encodeState();
  }
}
function updateShareHash() {
  const revision = ++hashRevision;
  encodeShareHash()
    .then((encoded) => {
      if (revision === hashRevision && location.hash)
        history.replaceState(null, "", `#${encoded}`);
    })
    .catch(() => {});
}
async function shareUrl() {
  return `${location.href.split("#")[0]}#${await encodeShareHash()}`;
}
function hydrateScrollCounts(state, item, source, slot, maxSlots) {
  const counts = {},
    entries = Array.isArray(item.scrolls) ? item.scrolls : [];
  let used = 0;
  const requested =
    state.v >= 4
      ? entries.map((entry) => ({
          id: entry?.id,
          count: Number(entry?.count) || 0,
        }))
      : entries
          .filter((entry) => entry?.id && entry.success !== false)
          .map((entry) => ({ id: entry.id, count: 1 }));
  requested.forEach((entry) => {
    const original = scrollById.get(Number(entry.id));
    if (!original || !scrollFitsItem(source, original, slot)) return;
    const scroll = scrollByFamily.get(scrollFamilyKey(original)) || original;
    const count = Math.min(
      Math.max(0, Math.floor(entry.count)),
      Math.max(0, maxSlots - used),
    );
    if (count) {
      counts[String(scroll.id)] =
        (Number(counts[String(scroll.id)]) || 0) + count;
      used += count;
    }
  });
  return Object.entries(counts).map(([id, count]) => ({
    id: Number(id),
    count,
  }));
}
function loadState(state) {
  if (state?.v === 7) {
    const slotNames = {
        h: "Head",
        e: "Earring",
        t: "Top",
        b: "Bottom",
        o: "Overall",
        c: "Cape",
        g: "Glove",
        s: "Shoes",
        w: "Weapon",
        d: "Shield",
        p: "Pet Equip",
      },
      expanded = {};
    Object.entries(state.g || {}).forEach(([key, packed]) => {
      const slot = slotNames[key];
      if (!slot || !Array.isArray(packed)) return;
      expanded[slot] = {
        id: packed[0],
        scrolls: (packed[1] || []).map(([id, count]) => ({ id, count })),
        failedScrolls: packed[2] || 0,
        baseStats: Object.fromEntries(
          (packed[3] || [])
            .map(([index, value]) => [osmsStatsByStat[statKeys[index]], value])
            .filter(([key]) => key),
        ),
      };
    });
    state = { ...state, v: 6, g: expanded };
  }
  if (!state || ![1, 2, 3, 4, 5, 6].includes(state.v)) return false;
  const validSlots = new Set(slots);
  gear = Object.fromEntries(slots.map((s) => [s, blank()]));
  Object.entries(state.g || {}).forEach(([slot, item]) => {
    if (!validSlots.has(slot) || !item || typeof item !== "object") return;
    const source =
      (item.id && catalogById.get(Number(item.id))) ||
      (catalogBySlot[slot] || []).find(
        (candidate) =>
          candidate.name.toLocaleLowerCase() ===
          String(item.name || "").toLocaleLowerCase(),
      );
    if (
      !source ||
      !(osmsCategoryBySlot[slot] || []).includes(source.sub_category)
    )
      return;
    const maxSlots = Math.max(0, Number(source.stats?.tuc) || 0),
      scrolls = hydrateScrollCounts(state, item, source, slot, maxSlots),
      used = scrolls.reduce((sum, entry) => sum + entry.count, 0),
      failedScrolls =
        state.v >= 6
          ? Math.min(
              Math.max(0, Math.floor(Number(item.failedScrolls) || 0)),
              Math.max(0, maxSlots - used),
            )
          : 0,
      baseStats = {};
    if (state.v >= 5 && item.baseStats && typeof item.baseStats === "object")
      Object.entries(item.baseStats).forEach(([key, value]) => {
        if (
          !statByOsmsKey[key] ||
          !Object.prototype.hasOwnProperty.call(source.stats || {}, key)
        )
          return;
        const [min, max] = baseStatBounds(source, key),
          clean = Number(source.stats[key]) || 0,
          number = Math.min(max, Math.max(min, Math.floor(Number(value) || 0)));
        if (number !== clean) baseStats[key] = number;
      });
    gear[slot] = {
      id: source.id,
      name: source.name,
      scrolls,
      failedScrolls,
      baseStats,
    };
  });
  if (gear.Overall.id) {
    gear.Top = blank();
    gear.Bottom = blank();
  }
  if (isTwoHandedWeapon(gear.Weapon)) gear.Shield = blank();
  build();
  return true;
}
async function loadHash() {
  if (!location.hash) return false;
  try {
    const value = location.hash.slice(1);
    let bytes = base64UrlToBytes(value[0] === "z" ? value.slice(1) : value);
    if (value[0] === "z") {
      if (!("DecompressionStream" in window)) return false;
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    return loadState(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (e) {
    return false;
  }
}
async function copyLink() {
  const url = await shareUrl();
  try {
    await navigator.clipboard.writeText(url);
    toast("Share link copied to clipboard");
  } catch (e) {
    const t = document.createElement("textarea");
    t.value = url;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.append(t);
    t.select();
    document.execCommand("copy");
    t.remove();
    toast("Share link copied to clipboard");
  }
  history.replaceState(null, "", `#${url.split("#")[1]}`);
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2200);
}
$("closeModal").onclick = closeModal;
$("modalBackdrop").addEventListener("click", (e) => {
  if (e.target === $("modalBackdrop")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (!$("modalBackdrop").classList.contains("open")) return;
  if (e.key === "Escape") {
    closeModal();
    return;
  }
  if (e.key !== "Tab") return;
  const focusable = [
    ...$("modalBackdrop").querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter(
    (element) =>
      element.getClientRects().length &&
      getComputedStyle(element).visibility !== "hidden",
  );
  if (!focusable.length) {
    e.preventDefault();
    return;
  }
  const first = focusable[0],
    last = focusable[focusable.length - 1],
    active = document.activeElement;
  if (
    e.shiftKey &&
    (active === first || !$("modalBackdrop").contains(active))
  ) {
    e.preventDefault();
    last.focus();
  } else if (
    !e.shiftKey &&
    (active === last || !$("modalBackdrop").contains(active))
  ) {
    e.preventDefault();
    first.focus();
  }
});
$("removeItem").onclick = () => {
  if (editing) {
    const slotToFocus = editing;
    if (editing === "Top") {
      gear.Top = blank();
      gear.Overall = blank();
    } else gear[editing] = blank();
    closeModal(false);
    build();
    const slotButton = [...$("slotGrid").querySelectorAll(".slot")].find(
      (button) =>
        button.getAttribute("aria-label").startsWith(`Choose ${slotToFocus} `),
    );
    slotButton?.focus({ preventScroll: true });
  }
};
async function capturePreviewBlob() {
  if (!window.htmlToImage?.toBlob)
    throw new Error("The image renderer did not load");
  const preview = $("detailsPreview"),
    oldWidth = preview.style.width,
    oldZoom = preview.style.zoom;
  let restoreImages = () => {};
  let missingImages = 0;
  preview.style.width = "720px";
  preview.style.zoom = "1";
  try {
    const imageState = await preparePreviewImages(preview);
    restoreImages = imageState.restore;
    missingImages = imageState.missingImages;
    const blob = await window.htmlToImage.toBlob(preview, {
      backgroundColor:
        getComputedStyle(document.body).backgroundColor || "#f5f6f1",
      pixelRatio: 2,
      cacheBust: true,
      fontEmbedCSS: "",
    });
    if (!blob) throw new Error("PNG encoding returned no image");
    return { blob, missingImages };
  } finally {
    restoreImages();
    preview.style.width = oldWidth;
    preview.style.zoom = oldZoom;
  }
}
async function preparePreviewImages(preview) {
  const unavailable = [];
  const images = [...preview.querySelectorAll("img")];
  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise((resolve) => {
          const finish = () => {
            clearTimeout(timeout);
            image.removeEventListener("load", finish);
            image.removeEventListener("error", finish);
            resolve();
          };
          const timeout = setTimeout(finish, 8000);
          image.loading = "eager";
          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
          if (image.complete) finish();
        });
      }
      if (image.naturalWidth > 0) {
        if (image.decode) await image.decode().catch(() => {});
        return;
      }
      const placeholder = document.createElement("div");
      placeholder.className = image.className;
      placeholder.setAttribute(
        "aria-label",
        `${image.alt || "Item"} image unavailable`,
      );
      image.replaceWith(placeholder);
      unavailable.push([placeholder, image]);
    }),
  );
  return {
    missingImages: unavailable.length,
    restore() {
      unavailable.forEach(([placeholder, image]) =>
        placeholder.replaceWith(image),
      );
    },
  };
}
function downloadPreviewImage(blob) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = "maple-gear-loadout.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function savePreviewImage() {
  const button = $("copyImageBtn");
  button.disabled = true;
  button.textContent = "Preparing image…";
  try {
    const { blob, missingImages } = await capturePreviewBlob();
    downloadPreviewImage(blob);
    toast(
      missingImages
        ? `Image downloaded; ${missingImages} item icon${missingImages === 1 ? " was" : "s were"} unavailable`
        : "Gear image downloaded",
    );
  } catch (error) {
    console.error(error);
    toast(`Could not create image: ${error.message || "unknown error"}`);
  } finally {
    button.disabled = false;
    button.textContent = "Save as image";
  }
}
$("copyImageBtn").onclick = savePreviewImage;
$("clearGear").onclick = () => {
  gear = Object.fromEntries(slots.map((s) => [s, blank()]));
  build();
};
$("shareBtn").onclick = copyLink;
function saveLocal() {
  try {
    localStorage.setItem("maple-gearbook-v1", JSON.stringify(getState()));
  } catch (e) {}
}
$("itemSearch").addEventListener("input", () => {
  selectedCatalogItem = null;
  draftScrollCounts = {};
  draftFailedScrollCount = 0;
  draftBaseStats = {};
  $("selectedItem").hidden = true;
  $("baseStatEditor").hidden = true;
  $("scrollEditor").hidden = true;
  renderCatalogResults($("itemSearch").value);
});
$("itemResults").addEventListener("click", (event) => {
  const button = event.target.closest("[data-item-id]");
  if (!button) return;
  const item = catalogById.get(Number(button.dataset.itemId));
  if (item) selectCatalogItem(item);
});
$("baseStatEditor").addEventListener("change", (event) => {
  const field = event.target.closest("[data-base-stat]");
  if (field) setBaseStat(field.dataset.baseStat, field.value);
});
$("baseStatEditor").addEventListener("click", (event) => {
  const reset = event.target.closest("[data-base-stat-reset]");
  if (reset) {
    setBaseStat(
      reset.dataset.baseStat,
      selectedCatalogItem?.stats?.[reset.dataset.baseStat],
    );
    return;
  }
  const step = event.target.closest("[data-base-stat-step]");
  if (step) {
    const key = step.dataset.baseStatKey,
      current = Object.prototype.hasOwnProperty.call(draftBaseStats, key)
        ? Number(draftBaseStats[key])
        : Number(selectedCatalogItem?.stats?.[key]) || 0;
    setBaseStat(key, current + Number(step.dataset.baseStatStep));
  }
});
function handleScrollQuantity(event) {
  const field = event.target.closest("[data-scroll-qty]");
  if (field) setScrollCount(field.dataset.scrollQty, field.value);
}
$("scrollEditor").addEventListener("change", handleScrollQuantity);
$("scrollEditor").addEventListener("change", (event) => {
  const field = event.target.closest("[data-failed-qty]");
  if (field) setFailedScrollCount(field.value);
});
$("scrollEditor").addEventListener("click", (event) => {
  const failed = event.target.closest("[data-failed-step]");
  if (failed) {
    setFailedScrollCount(
      draftFailedScrollCount + Number(failed.dataset.failedStep),
    );
    return;
  }
  const button = event.target.closest("[data-scroll-step]");
  if (!button) return;
  const id = button.dataset.scrollId,
    current = Number(draftScrollCounts[String(id)]) || 0;
  setScrollCount(id, current + Number(button.dataset.scrollStep));
});
function normalizeCatalogRecord(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const id = Number(item.id),
    name = typeof item.name === "string" ? item.name.trim() : "";
  if (!Number.isSafeInteger(id) || id <= 0 || !name) return null;
  let iconUrl = "";
  if (typeof item.icon_url === "string" && item.icon_url.trim()) {
    try {
      const url = new URL(item.icon_url, location.href);
      if (url.protocol === "http:" || url.protocol === "https:")
        iconUrl = item.icon_url.trim();
    } catch (error) {}
  }
  return {
    ...item,
    id,
    name,
    icon_url: iconUrl,
    stats:
      item.stats && typeof item.stats === "object" && !Array.isArray(item.stats)
        ? item.stats
        : {},
    scroll:
      item.scroll &&
      typeof item.scroll === "object" &&
      !Array.isArray(item.scroll)
        ? item.scroll
        : null,
  };
}
function installCatalog(data) {
  if (!Array.isArray(data)) throw new Error("Invalid OSMS catalog format");
  const records = data.map(normalizeCatalogRecord).filter(Boolean);
  catalog = records.filter(
    (item) =>
      item.category === "Equipment" &&
      typeof item.sub_category === "string" &&
      item.sub_category,
  );
  if (!catalog.length)
    throw new Error("OSMS returned an empty equipment catalog");
  catalogById = new Map(catalog.map((item) => [Number(item.id), item]));
  catalogBySlot = Object.fromEntries(
    slots.map((slot) => [
      slot,
      catalog.filter((item) =>
        (osmsCategoryBySlot[slot] || []).includes(item.sub_category),
      ),
    ]),
  );
  const genericPetEquip = {
    id: 1802007,
    name: "Red Top Hat",
    category: "Equipment",
    sub_category: "Pet Equip",
    stats: { reqLevel: 0, tuc: 5 },
    icon_url: "assets/red-top-hat.png",
  };
  catalogById.set(genericPetEquip.id, genericPetEquip);
  catalogBySlot["Pet Equip"] = [genericPetEquip];
  const allScrolls = records
    .filter(
      (item) =>
        item.scroll &&
        typeof item.scroll.slot === "string" &&
        item.scroll.slot.trim(),
    )
    .sort((a, b) => a.id - b.id);
  scrollById = new Map(allScrolls.map((item) => [Number(item.id), item]));
  scrollByFamily = new Map();
  allScrolls.forEach((item) => {
    const key = scrollFamilyKey(item);
    if (!scrollByFamily.has(key)) scrollByFamily.set(key, item);
  });
  scrollCatalog = [...scrollByFamily.values()];
  catalogReady = true;
}
function readCachedCatalog() {
  try {
    const cached = JSON.parse(localStorage.getItem(OSMS_CATALOG_CACHE_KEY));
    if (
      cached?.version === 1 &&
      Array.isArray(cached.items) &&
      cached.items.length
    )
      return cached;
  } catch (error) {}
  return null;
}
function cacheCatalog(data) {
  try {
    localStorage.setItem(
      OSMS_CATALOG_CACHE_KEY,
      JSON.stringify({ version: 1, savedAt: Date.now(), items: data }),
    );
  } catch (error) {}
}
async function initialize() {
  let data,
    cached = null;
  try {
    const response = await fetch(OSMS_ITEMS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid OSMS catalog format");
    installCatalog(data);
    catalogSource = "live";
    cacheCatalog(data);
  } catch (error) {
    cached = readCachedCatalog();
    if (cached) {
      try {
        installCatalog(cached.items);
        catalogSource = "cached";
      } catch (cacheError) {
        catalogReady = false;
      }
    }
  }
  if (!catalogReady) {
    build(false);
    $("equippedCount").textContent = "Could not load OSMS equipment data";
    return;
  }
  const catalogStatus = $("catalogStatus");
  catalogStatus.hidden = catalogSource !== "cached";
  if (catalogSource === "cached") {
    const cachedDate = new Date(cached.savedAt);
    catalogStatus.title = Number.isNaN(cachedDate.getTime())
      ? "Using a locally saved OSMS catalog."
      : `Using OSMS catalog saved ${cachedDate.toLocaleString()}.`;
  }
  let loaded = await loadHash();
  if (!loaded) {
    try {
      const saved = localStorage.getItem("maple-gearbook-v1");
      if (saved) loadState(JSON.parse(saved));
    } catch (error) {}
  }
  build();
}
initialize();
