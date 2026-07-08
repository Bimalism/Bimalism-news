/* ============== CONFIG ============== */
/* Keep your same API keys here */
const KEYS = {
  mediastack: "0ad0ca92ff944378ebf7264ffdeba284",
  gnews: "555cc6c6d65125cbc73110e2081e40e0",
  newsapi: "399424383f0245649bb0880bf4d2d0bc",
  currents: "-FLyVsvYJCMf8ao-JScI_oEyTju2UR5p9jlJDbOvyFmyZK3R",
  thenewsapi: "MkViUMU2mrSb7srxpie2sJNg7tvvYNI5FeFgflnG",
  thenewsio: "pub_754cb6755ea74340a3ac69299a874e96",
  newsdata: "pub_61a70084212d4555aa0fb2f4906a7ff4"
};

const REFRESH_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT = 4500;
const MAX_PER_API = 50;

/* ============== STRICT SECTION FILTERS ============== */

const INDIA_WORDS = [
  "india", "indian", "bharat", "modi", "delhi", "new delhi", "mumbai",
  "chennai", "bengaluru", "bangalore", "kolkata", "hyderabad", "pune",
  "ahmedabad", "lucknow", "jaipur", "kerala", "tamil nadu", "karnataka",
  "maharashtra", "gujarat", "uttar pradesh", "bihar", "west bengal",
  "rajasthan", "punjab", "haryana", "lok sabha", "rajya sabha",
  "bjp", "congress", "aap", "rupee", "rbi", "sensex", "nifty"
];

const WORLD_WORDS = [
  "world", "global", "international", "foreign", "united states", "us ",
  "usa", "america", "uk", "britain", "europe", "china", "russia",
  "ukraine", "israel", "gaza", "iran", "iraq", "france", "germany",
  "japan", "korea", "africa", "australia", "canada", "mexico",
  "united nations", "nato", "eu "
];

const SECTIONS = [
  {
    id: "breaking",
    label: "Breaking",
    q: "breaking news latest top headlines",
    apiCategory: "general",
    include: [],
    exclude: []
  },
  {
    id: "international",
    label: "International",
    q: "international world global foreign news",
    apiCategory: "world",
    include: WORLD_WORDS,
    exclude: INDIA_WORDS
  },
  {
    id: "national",
    label: "National",
    q: "india national politics government latest news",
    apiCategory: "general",
    include: INDIA_WORDS,
    exclude: []
  },
  {
    id: "india",
    label: "India",
    q: "india latest news politics economy government",
    apiCategory: "general",
    include: INDIA_WORDS,
    exclude: []
  },
  {
    id: "world",
    label: "World",
    q: "world news global latest",
    apiCategory: "world",
    include: WORLD_WORDS,
    exclude: INDIA_WORDS
  },
  {
    id: "business",
    label: "Business",
    q: "business economy markets finance companies",
    apiCategory: "business",
    include: [
      "business", "market", "markets", "economy", "economic", "finance",
      "financial", "stock", "stocks", "shares", "company", "companies",
      "bank", "banking", "trade", "inflation", "startup", "investment",
      "investor", "profit", "revenue", "oil prices"
    ],
    exclude: []
  },
  {
    id: "technology",
    label: "Technology",
    q: "technology tech ai software gadgets cybersecurity",
    apiCategory: "technology",
    include: [
      "technology", "tech", "ai", "artificial intelligence", "software",
      "app", "apps", "internet", "cyber", "cybersecurity", "data",
      "chip", "semiconductor", "startup", "google", "apple",
      "microsoft", "meta", "openai", "nvidia", "tesla", "robot",
      "smartphone", "gadget"
    ],
    exclude: []
  },
  {
    id: "sports",
    label: "Sports",
    q: "sports cricket football tennis latest",
    apiCategory: "sports",
    include: [
      "sports", "sport", "cricket", "football", "soccer", "tennis",
      "hockey", "badminton", "olympic", "fifa", "ipl", "nba", "nfl",
      "formula", "f1", "race", "match", "tournament", "league",
      "world cup", "champions", "player", "coach"
    ],
    exclude: []
  },
  {
    id: "entertainment",
    label: "Entertainment",
    q: "entertainment movies cinema celebrity music",
    apiCategory: "entertainment",
    include: [
      "entertainment", "movie", "movies", "film", "films", "cinema",
      "actor", "actress", "celebrity", "celebrities", "music", "song",
      "album", "ott", "netflix", "hollywood", "bollywood", "trailer",
      "box office", "tv", "series"
    ],
    exclude: []
  },
  {
    id: "health",
    label: "Health",
    q: "health medical medicine hospital disease",
    apiCategory: "health",
    include: [
      "health", "medical", "medicine", "doctor", "hospital", "disease",
      "virus", "covid", "vaccine", "fitness", "diet", "mental health",
      "study", "treatment", "cancer", "heart", "diabetes", "nutrition"
    ],
    exclude: []
  },
  {
    id: "science",
    label: "Science",
    q: "science research space climate discovery",
    apiCategory: "science",
    include: [
      "science", "scientist", "research", "study", "space", "nasa",
      "isro", "planet", "moon", "mars", "climate", "discovery",
      "physics", "biology", "chemistry", "environment", "earth",
      "satellite", "astronomy"
    ],
    exclude: []
  }
];

/* ============== STATE ============== */

const state = {
  cat: "breaking",
  articles: [],
  search: "",
  bookmarks: safeJSON(localStorage.getItem("bn_bm"), []),
  broadcast: safeJSON(localStorage.getItem("bn_bc"), null),
  idMap: safeJSON(localStorage.getItem("bn_idmap"), {}),
  singleCode: null
};

const CACHE = new Map();

/* ============== HELPERS ============== */

const $ = s => document.querySelector(s);

function safeJSON(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveBm() {
  localStorage.setItem("bn_bm", JSON.stringify(state.bookmarks));
}

function saveIdMap() {
  localStorage.setItem("bn_idmap", JSON.stringify(state.idMap));
}

function saveBc() {
  localStorage.setItem("bn_bc", JSON.stringify(state.broadcast));
}

function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function articleText(a) {
  return `${a.title || ""} ${a.description || ""} ${a.source || ""} ${a.category || ""}`.toLowerCase();
}

function hasAny(text, words) {
  if (!words || !words.length) return true;
  return words.some(w => {
    const word = String(w).toLowerCase();
    if (word.endsWith(" ")) return text.includes(word);
    return text.includes(word);
  });
}

function hasExcluded(text, words) {
  if (!words || !words.length) return false;
  return words.some(w => text.includes(String(w).toLowerCase()));
}

function matchesSection(article, section) {
  const text = articleText(article);

  if (hasExcluded(text, section.exclude)) return false;

  if (section.include && section.include.length) {
    return hasAny(text, section.include);
  }

  return true;
}

function shortId(url) {
  let h = 0;
  const input = String(url || "");

  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }

  const code = String(Math.abs(h) % 90000 + 10000);

  if (url && !state.idMap[code]) {
    state.idMap[code] = url;
    saveIdMap();
  }

  return code;
}

function findByCode(code) {
  if (!code) return null;

  const fromCurrent = state.articles.find(a => shortId(a.url) === String(code));
  if (fromCurrent) return fromCurrent;

  const savedUrl = state.idMap[String(code)];
  if (!savedUrl) return null;

  return (
    state.articles.find(a => a.url === savedUrl) ||
    state.bookmarks.find(a => a.url === savedUrl) ||
    (state.broadcast?.url === savedUrl ? state.broadcast : null)
  );
}

function timeAgo(iso) {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const s = Math.floor((Date.now() - date.getTime()) / 1000);

  if (s < 60) return `${Math.max(s, 1)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;

  return `${Math.floor(s / 86400)}d ago`;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];

  for (const a of list) {
    const titleKey = cleanText(a.title)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 75);

    const urlKey = String(a.url || "").split("?")[0];

    const key = titleKey || urlKey;
    if (!key || seen.has(key)) continue;

    seen.add(key);
    out.push(a);
  }

  return out;
}

function normalize(items, source) {
  return (items || [])
    .filter(Boolean)
    .map(a => {
      const sourceName =
        typeof a.source === "string"
          ? a.source
          : a.source?.name || a.source_name || a.source_id || source;

      return {
        title: cleanText(a.title || a.name || ""),
        description: cleanText(
          a.description ||
            a.snippet ||
            a.summary ||
            a.content ||
            a.excerpt ||
            ""
        ),
        url: a.url || a.link || a.web_url || "",
        image:
          a.image ||
          a.urlToImage ||
          a.image_url ||
          a.thumbnail ||
          a.imageUrl ||
          a.photo_url ||
          "",
        publishedAt:
          a.publishedAt ||
          a.published_at ||
          a.pubDate ||
          a.published ||
          a.date ||
          a.created_at ||
          "",
        source: sourceName || source,
        category: Array.isArray(a.category)
          ? a.category.join(" ")
          : a.category || a.categories || ""
      };
    })
    .filter(a => a.title && a.url);
}

async function safeFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const r = await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });

    clearTimeout(timer);

    if (!r.ok) return null;
    return await r.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function apiCategory(section, api) {
  const cat = section.apiCategory || section.id;

  if (api === "mediastack") {
    if (cat === "world") return "general";
    if (cat === "general") return "general";
    return cat;
  }

  if (api === "newsapi") {
    if (cat === "world") return "general";
    return cat;
  }

  if (api === "thenewsapi") {
    if (cat === "world") return "general";
    return cat;
  }

  if (api === "newsdata") {
    if (cat === "general") return "top";
    return cat;
  }

  return cat;
}

function keyOk(key) {
  return key && !String(key).startsWith("PASTE_");
}

/* ============== FETCHERS ============== */

async function fetchAll(section) {
  const cacheKey = section.id;
  const cached = CACHE.get(cacheKey);

  if (cached && Date.now() - cached.time < 90 * 1000) {
    return cached.items;
  }

  const q = encodeURIComponent(section.q);
  const calls = [];

  if (keyOk(KEYS.gnews)) {
    const cat = apiCategory(section, "gnews");

    calls.push(
      safeFetch(
        `https://gnews.io/api/v4/search?q=${q}&lang=en&max=${MAX_PER_API}&apikey=${KEYS.gnews}`
      ).then(d => normalize(d?.articles, "GNews"))
    );

    calls.push(
      safeFetch(
        `https://gnews.io/api/v4/top-headlines?category=${cat}&lang=en&max=${MAX_PER_API}&apikey=${KEYS.gnews}`
      ).then(d => normalize(d?.articles, "GNews"))
    );
  }

  if (keyOk(KEYS.mediastack)) {
    const cat = apiCategory(section, "mediastack");

    calls.push(
      safeFetch(
        `https://api.mediastack.com/v1/news?access_key=${KEYS.mediastack}&keywords=${q}&languages=en&limit=${MAX_PER_API}&sort=published_desc`
      ).then(d => normalize(d?.data, "MediaStack"))
    );

    calls.push(
      safeFetch(
        `https://api.mediastack.com/v1/news?access_key=${KEYS.mediastack}&categories=${cat}&languages=en&limit=${MAX_PER_API}&sort=published_desc`
      ).then(d => normalize(d?.data, "MediaStack"))
    );
  }

  if (keyOk(KEYS.currents)) {
    const cat = apiCategory(section, "currents");

    calls.push(
      safeFetch(
        `https://api.currentsapi.services/v1/search?keywords=${q}&language=en&apiKey=${KEYS.currents}`
      ).then(d => normalize(d?.news, "Currents"))
    );

    calls.push(
      safeFetch(
        `https://api.currentsapi.services/v1/latest-news?category=${cat}&language=en&apiKey=${KEYS.currents}`
      ).then(d => normalize(d?.news, "Currents"))
    );
  }

  if (keyOk(KEYS.thenewsapi)) {
    const cat = apiCategory(section, "thenewsapi");

    calls.push(
      safeFetch(
        `https://api.thenewsapi.com/v1/news/all?api_token=${KEYS.thenewsapi}&search=${q}&language=en&limit=${MAX_PER_API}`
      ).then(d => normalize(d?.data, "TheNewsAPI"))
    );

    calls.push(
      safeFetch(
        `https://api.thenewsapi.com/v1/news/top?api_token=${KEYS.thenewsapi}&locale=us,in&categories=${cat}&limit=${MAX_PER_API}`
      ).then(d => normalize(d?.data, "TheNewsAPI"))
    );
  }

  if (keyOk(KEYS.newsdata)) {
    const cat = apiCategory(section, "newsdata");

    calls.push(
      safeFetch(
        `https://newsdata.io/api/1/latest?apikey=${KEYS.newsdata}&q=${q}&language=en`
      ).then(d => normalize(d?.results, "NewsData"))
    );

    calls.push(
      safeFetch(
        `https://newsdata.io/api/1/latest?apikey=${KEYS.newsdata}&category=${cat}&language=en`
      ).then(d => normalize(d?.results, "NewsData"))
    );
  }

  if (keyOk(KEYS.thenewsio)) {
    const cat = apiCategory(section, "thenewsio");

    calls.push(
      safeFetch(
        `https://api.thenews.io/v1/news/all?api_token=${KEYS.thenewsio}&search=${q}&language=en&limit=${MAX_PER_API}`
      ).then(d => normalize(d?.data || d?.articles, "TheNews.io"))
    );

    calls.push(
      safeFetch(
        `https://api.thenews.io/v1/news/top?api_token=${KEYS.thenewsio}&categories=${cat}&limit=${MAX_PER_API}`
      ).then(d => normalize(d?.data || d?.articles, "TheNews.io"))
    );
  }

  /*
    NewsAPI often blocks direct browser requests with CORS.
    This is kept, but if it fails, the app will still work with other APIs.
  */
  if (keyOk(KEYS.newsapi)) {
    const cat = apiCategory(section, "newsapi");

    calls.push(
      safeFetch(
        `https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=${MAX_PER_API}&sortBy=publishedAt&apiKey=${KEYS.newsapi}`
      ).then(d => normalize(d?.articles, "NewsAPI"))
    );

    calls.push(
      safeFetch(
        `https://newsapi.org/v2/top-headlines?category=${cat}&language=en&pageSize=${MAX_PER_API}&apiKey=${KEYS.newsapi}`
      ).then(d => normalize(d?.articles, "NewsAPI"))
    );
  }

  const settled = await Promise.allSettled(calls);

  const merged = settled
    .flatMap(r => (r.status === "fulfilled" ? r.value || [] : []))
    .filter(Boolean);

  let filtered = dedupe(merged).filter(a => matchesSection(a, section));

  /*
    For Breaking only, do not over-filter.
    For other sections, strict filters stay active.
  */
  if (section.id === "breaking" && filtered.length < 20) {
    filtered = dedupe(merged);
  }

  filtered.sort(
    (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );

  const finalItems = filtered.slice(0, 60);

  CACHE.set(cacheKey, {
    time: Date.now(),
    items: finalItems
  });

  return finalItems;
}

/* ============== RENDER ============== */

function renderCats() {
  const el = $("#bnCats");
  if (!el) return;

  el.innerHTML = SECTIONS.map(
    s =>
      `<button class="bn-cat ${s.id === state.cat ? "active" : ""}" data-cat="${esc(
        s.id
      )}">${esc(s.label)}</button>`
  ).join("");

  el.onclick = e => {
    const b = e.target.closest(".bn-cat");
    if (!b) return;

    state.cat = b.dataset.cat;
    state.singleCode = null;

    history.replaceState(null, "", `?cat=${encodeURIComponent(state.cat)}`);
    load();
  };
}

function skeletons(n) {
  return Array.from({ length: n })
    .map(
      () => `
      <div class="bn-card skeleton">
        <div class="sk-img"></div>
        <div class="sk-line w90"></div>
        <div class="sk-line w70"></div>
        <div class="sk-line w50"></div>
      </div>`
    )
    .join("");
}

function imageFor(a, code, size = "600/400") {
  return a.image || `https://picsum.photos/seed/${encodeURIComponent(code)}/${size}`;
}

function cardHTML(a, i) {
  const code = shortId(a.url);
  const bm = state.bookmarks.some(b => b.url === a.url);
  const isBc = state.broadcast?.url === a.url;
  const img = imageFor(a, code);

  return `
    <article class="bn-card" data-code="${esc(code)}" style="animation-delay:${i * 30}ms">
      <div class="bn-card-img" style="background-image:url('${esc(img)}')">
        <button class="bn-bookmark ${bm ? "on" : ""}" data-act="bm" title="Bookmark">
          ${bm ? "★" : "☆"}
        </button>
      </div>
      <div class="bn-card-body">
        <span class="bn-chip">${esc(a.source || "News")}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.description || "")}</p>
        <div class="bn-card-foot">
          <span class="bn-meta">${esc(timeAgo(a.publishedAt))} • #${esc(code)}</span>
          <span class="bn-read">${isBc ? "📢 BROADCASTING" : "READ →"}</span>
        </div>
      </div>
    </article>`;
}

function heroHTML(a) {
  if (!a) return "";

  const code = shortId(a.url);
  const img = imageFor(a, code, "1200/700");

  return `
    <div class="bn-hero" data-code="${esc(code)}">
      <div class="bn-hero-img" style="background-image:url('${esc(img)}')"></div>
      <div class="bn-hero-body">
        <span class="bn-chip">${esc(a.source || "Top Story")}</span>
        <h1>${esc(a.title)}</h1>
        <p>${esc(a.description || "")}</p>
        <span class="bn-meta" style="color:rgba(255,255,255,.75)">
          ${esc(timeAgo(a.publishedAt))} • #${esc(code)}
        </span>
      </div>
    </div>`;
}

function featHTML(list) {
  if (!list.length) return "";

  return `
    <div class="bn-featured">
      ${list
        .map(a => {
          const code = shortId(a.url);
          const img = imageFor(a, code, "300/300");

          return `
            <div class="bn-feat" data-code="${esc(code)}">
              <div class="bn-feat-img" style="background-image:url('${esc(img)}')"></div>
              <div class="bn-feat-body">
                <span class="bn-chip">${esc(a.source || "News")}</span>
                <h3>${esc(a.title)}</h3>
                <span class="bn-meta">${esc(timeAgo(a.publishedAt))}</span>
              </div>
            </div>`;
        })
        .join("")}
    </div>`;
}

function render() {
  const section = SECTIONS.find(s => s.id === state.cat) || SECTIONS[0];
  const term = state.search.toLowerCase().trim();

  let list = state.articles.filter(a => {
    const text = articleText(a);
    return !term || text.includes(term);
  });

  if (state.singleCode) {
    const single = findByCode(state.singleCode);
    list = single ? [single] : [];
  }

  const title = $("#bnTitle");
  if (title) {
    title.innerHTML = state.singleCode
      ? `Shared Story <span class="muted">${list.length ? "#" + esc(state.singleCode) : "not found"}</span>`
      : `${esc(section.label)} <span class="muted">${list.length} stories</span>`;
  }

  let hero = list[0];
  let featured = list.slice(1, 4);
  let rest = list.slice(4);

  if (!state.singleCode && state.broadcast) {
    hero = state.broadcast;
    featured = list.filter(a => a.url !== state.broadcast.url).slice(0, 3);
    rest = list.filter(a => a.url !== state.broadcast.url).slice(3);
  }

  const heroEl = $("#bnHero");
  if (heroEl) {
    heroEl.innerHTML = heroHTML(hero) + featHTML(featured);
  }

  const gridEl = $("#bnGrid");
  if (gridEl) {
    gridEl.innerHTML = rest.length
      ? rest.map((a, i) => cardHTML(a, i)).join("")
      : list.length
        ? ""
        : `<div class="bn-empty">
            No filtered stories found for this section right now. Try refresh or another section.
          </div>`;
  }

  updateBmBadge();
  updateTicker(list);
}

function updateBmBadge() {
  const el = $("#bnBmCount");
  if (!el) return;

  if (state.bookmarks.length) {
    el.style.display = "block";
    el.textContent = state.bookmarks.length;
  } else {
    el.style.display = "none";
  }
}

function updateTicker(list) {
  const el = $("#bnTicker");
  if (!el) return;

  const items = list
    .slice(0, 15)
    .map(a => `<a data-code="${esc(shortId(a.url))}">▸ ${esc(a.title)}</a>`)
    .join("");

  el.innerHTML = items + items;
}

/* ============== LOAD ============== */

async function load() {
  renderCats();

  const grid = $("#bnGrid");
  const hero = $("#bnHero");
  const progress = $("#bnProgress");

  if (grid) grid.innerHTML = skeletons(9);
  if (hero) hero.innerHTML = "";
  if (progress) progress.style.width = "30%";

  const section = SECTIONS.find(s => s.id === state.cat) || SECTIONS[0];

  state.articles = await fetchAll(section);

  if (progress) {
    progress.style.width = "100%";
    setTimeout(() => {
      progress.style.width = "0";
    }, 400);
  }

  render();
}

/* ============== MODAL ============== */

function openArticle(code) {
  const a = findByCode(code);
  if (!a) return;

  const cat = encodeURIComponent(state.cat);
  const shareUrl = `${location.origin}${location.pathname}?cat=${cat}&a=${code}`;
  const bcUrl = `${location.origin}${location.pathname}?cat=${cat}&f=${code}`;

  const isBc = state.broadcast?.url === a.url;
  const bm = state.bookmarks.some(b => b.url === a.url);
  const img = imageFor(a, code, "1200/700");

  const modal = document.createElement("div");
  modal.className = "bn-modal";

  modal.innerHTML = `
    <div class="bn-modal-card">
      <button class="bn-modal-close">×</button>
      <div class="bn-modal-img" style="background-image:url('${esc(img)}')"></div>
      <div class="bn-modal-body">
        <span class="bn-chip">${esc(a.source || "News")} • #${esc(code)}</span>
        <h2>${esc(a.title)}</h2>
        <p style="color:var(--muted)">${esc(timeAgo(a.publishedAt))}</p>
        <p>${esc(a.description || "")}</p>

        <div class="bn-modal-actions">
          <a class="bn-btn primary" href="${esc(a.url)}" target="_blank" rel="noopener">
            Read full article ↗
          </a>
          <button class="bn-btn" data-act="share">🔗 Share #${esc(code)}</button>
          <button class="bn-btn" data-act="bm">${bm ? "★ Bookmarked" : "☆ Bookmark"}</button>
          <button class="bn-btn" data-act="bc">
            ${isBc ? "📢 Stop broadcasting" : "📢 Broadcast to everyone"}
          </button>
        </div>

        <p style="font-size:12px;color:var(--muted);margin-top:6px">
          Share link: <code>${esc(shareUrl)}</code><br>
          Broadcast link: <code>${esc(bcUrl)}</code>
        </p>
      </div>
    </div>`;

  document.body.appendChild(modal);
  history.replaceState(null, "", `?cat=${cat}&a=${code}`);

  const close = () => {
    modal.remove();

    if (state.singleCode) {
      history.replaceState(null, "", `?cat=${cat}&a=${state.singleCode}`);
    } else {
      history.replaceState(null, "", `?cat=${cat}`);
    }
  };

  modal.querySelector(".bn-modal-close").onclick = close;

  modal.onclick = e => {
    if (e.target === modal) close();
  };

  modal.querySelector('[data-act="share"]').onclick = async () => {
    const data = {
      title: a.title,
      text: a.title,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert(`Link copied!\n${shareUrl}`);
      }
    } catch {}
  };

  modal.querySelector('[data-act="bm"]').onclick = () => {
    const idx = state.bookmarks.findIndex(b => b.url === a.url);

    if (idx >= 0) state.bookmarks.splice(idx, 1);
    else state.bookmarks.push(a);

    saveBm();
    close();
    render();
  };

  modal.querySelector('[data-act="bc"]').onclick = async () => {
    if (state.broadcast?.url === a.url) state.broadcast = null;
    else state.broadcast = a;

    saveBc();

    try {
      await navigator.clipboard.writeText(bcUrl);
    } catch {}

    close();
    render();

    alert(
      state.broadcast
        ? "Broadcasting! Link copied."
        : "Broadcast stopped."
    );
  };
}

/* ============== GOOGLE TRANSLATE ============== */

function setupTranslate() {
  window.googleTranslateElementInit = function () {
    if (!window.google || !google.translate) return;

    new google.translate.TranslateElement(
      {
        pageLanguage: "en",
        autoDisplay: false,
        includedLanguages:
          "en,ta,hi,te,kn,ml,bn,gu,pa,mr,ur,fr,es,de,ar,zh-CN,ja,ko,ru,pt,it"
      },
      "google_translate_element"
    );
  };

  if (!document.querySelector('script[data-google-translate="true"]')) {
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.dataset.googleTranslate = "true";
    document.body.appendChild(s);
  }
}

/* ============== EVENTS ============== */

function bindEvents() {
  document.addEventListener("click", e => {
    const bm = e.target.closest(".bn-bookmark");

    if (bm) {
      e.stopPropagation();

      const card = bm.closest("[data-code]");
      const a = findByCode(card?.dataset.code);

      if (!a) return;

      const idx = state.bookmarks.findIndex(b => b.url === a.url);

      if (idx >= 0) state.bookmarks.splice(idx, 1);
      else state.bookmarks.push(a);

      saveBm();
      render();
      return;
    }

    const node = e.target.closest("[data-code]");

    if (node) {
      openArticle(node.dataset.code);
    }
  });

  const search = $("#bnSearch");
  if (search) {
    search.oninput = e => {
      state.search = e.target.value;
      render();
    };
  }

  const searchClear = $("#bnSearchClear");
  if (searchClear) {
    searchClear.onclick = () => {
      if (search) search.value = "";
      state.search = "";
      render();
    };
  }

  const themeBtn = $("#bnThemeBtn");
  if (themeBtn) {
    themeBtn.onclick = () => {
      document.documentElement.classList.toggle("dark");

      localStorage.setItem(
        "bn_theme",
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    };
  }

  if (localStorage.getItem("bn_theme") === "dark") {
    document.documentElement.classList.add("dark");
  }

  const bookmarksBtn = $("#bnBookmarksBtn");
  if (bookmarksBtn) {
    bookmarksBtn.onclick = () => {
      if (!state.bookmarks.length) {
        alert("No bookmarks yet.");
        return;
      }

      state.singleCode = null;
      state.articles = state.bookmarks.slice();

      const title = $("#bnTitle");
      if (title) {
        title.innerHTML = `🔖 Bookmarks <span class="muted">${state.bookmarks.length}</span>`;
      }

      render();
    };
  }

  const lang = $("#bnLang");
  if (lang) {
    lang.onchange = e => {
      const selected = e.target.value;

      const setCookie = v => {
        document.cookie = `googtrans=${v};path=/`;
        document.cookie = `googtrans=${v};path=/;domain=.${location.hostname}`;
      };

      setCookie(selected ? `/en/${selected}` : "/en/en");
      location.reload();
    };
  }

  const topBtn = $("#bnTop");
  if (topBtn) {
    topBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

    window.addEventListener("scroll", () => {
      topBtn.style.display = window.scrollY > 500 ? "block" : "none";
    });
  }
}

function tick() {
  const d = new Date();

  const date = $("#bnDate");
  const clock = $("#bnClock");

  if (date) {
    date.textContent = d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  if (clock) {
    clock.textContent = d.toLocaleTimeString();
  }
}

/* ============== INIT ============== */

async function init() {
  bindEvents();
  setupTranslate();

  tick();
  setInterval(tick, 1000);

  const p = new URLSearchParams(location.search);
  const cat = p.get("cat");
  const openCode = p.get("a");
  const bcCode = p.get("f");

  if (cat && SECTIONS.some(s => s.id === cat)) {
    state.cat = cat;
  }

  if (openCode) {
    state.singleCode = openCode;
  }

  await load();

  if (bcCode) {
    const a = findByCode(bcCode);

    if (a) {
      state.broadcast = a;
      saveBc();
      render();
    }
  }

  if (openCode) {
    setTimeout(() => openArticle(openCode), 300);
  }

  setInterval(load, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", init);

