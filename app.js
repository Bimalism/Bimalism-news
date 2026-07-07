/* ============================================================
   BIMALISM NEWS - app.js
   7-API aggregator with strict per-section topic filtering
   ============================================================ */

const KEYS = {
  mediastack: "0ad0ca92ff944378ebf7264ffdeba284",
  gnews:      "555cc6c6d65125cbc73110e2081e40e0",
  newsapi:    "399424383f0245649bb0880bf4d2d0bc",
  currents:   "-FLyVsvYJCMf8ao-JScI_oEyTju2UR5p9jlJDbOvyFmyZK3R",
  thenewsapi: "MkViUMU2mrSb7srxpie2sJNg7tvvYNI5FeFgflnG",
  thenewsio:  "pub_754cb6755ea74340a3ac69299a874e96",
  newsdata:   "pub_61a70084212d4555aa0fb2f4906a7ff4",
};

/* ---------- SECTION DEFINITIONS ----------
   include: keywords that MUST appear (any one)
   exclude: keywords that must NOT appear
   country: mediastack/gnews country hint
   category: standard category slug
------------------------------------------ */
const SECTIONS = {
  breaking: {
    label: "Breaking",
    query: "breaking",
    include: [], exclude: [],
    category: "general",
  },
  international: {
    label: "International",
    query: "world",
    include: ["world","global","international","un","nato","us","uk","china","russia","europe","africa","middle east","asia pacific"],
    exclude: ["india","indian","modi","delhi","mumbai","bengaluru","chennai","kolkata","hyderabad","bjp","congress party","rupee"],
    category: "world",
  },
  national: {
    label: "National (India)",
    query: "India",
    include: ["india","indian","modi","delhi","mumbai","bengaluru","chennai","kolkata","hyderabad","bjp","congress","rupee","lok sabha","rajya sabha"],
    exclude: [],
    country: "in",
    category: "general",
  },
  india: {
    label: "India",
    query: "India politics",
    include: ["india","indian","modi","parliament","supreme court india","lok sabha","rajya sabha","bjp","congress","aap"],
    exclude: [],
    country: "in",
    category: "general",
  },
  world: {
    label: "World",
    query: "world news",
    include: ["world","global","us","uk","eu","china","russia","japan","germany","france","brazil","canada","australia"],
    exclude: ["india","modi","bjp","rupee"],
    category: "world",
  },
  business: {
    label: "Business",
    query: "business economy stocks",
    include: ["business","economy","stock","market","ipo","bank","finance","earnings","revenue","gdp","inflation"],
    exclude: [],
    category: "business",
  },
  technology: {
    label: "Technology",
    query: "technology AI software",
    include: ["tech","technology","ai","artificial intelligence","software","chip","semiconductor","startup","google","apple","microsoft","meta","openai","nvidia"],
    exclude: [],
    category: "technology",
  },
  sports: {
    label: "Sports",
    query: "sports",
    include: ["sport","cricket","football","soccer","tennis","hockey","olympic","fifa","ipl","nba","nfl","f1","formula"],
    exclude: [],
    category: "sports",
  },
  entertainment: {
    label: "Entertainment",
    query: "entertainment movies",
    include: ["movie","film","actor","actress","hollywood","bollywood","music","album","concert","netflix","series","tv show","celebrity"],
    exclude: [],
    category: "entertainment",
  },
  health: {
    label: "Health",
    query: "health medicine",
    include: ["health","medicine","doctor","hospital","disease","vaccine","virus","covid","cancer","mental health","fitness","wellness"],
    exclude: [],
    category: "health",
  },
  science: {
    label: "Science",
    query: "science research",
    include: ["science","research","study","nasa","space","physics","biology","chemistry","climate","astronomy","discovery"],
    exclude: [],
    category: "science",
  },
};

/* ---------- STATE ---------- */
const state = {
  section: "breaking",
  articles: [],
  bookmarks: JSON.parse(localStorage.getItem("bn_bm") || "[]"),
  idMap: JSON.parse(localStorage.getItem("bn_ids") || "{}"),
  broadcast: JSON.parse(localStorage.getItem("bn_bc") || "null"),
};

/* ---------- HELPERS ---------- */
const norm = s => (s||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();

function matchesSection(article, sec) {
  const cfg = SECTIONS[sec];
  const text = norm(article.title + " " + (article.description||""));
  if (cfg.exclude?.some(k => text.includes(k))) return false;
  if (cfg.include?.length && !cfg.include.some(k => text.includes(k))) return false;
  return true;
}

function shortId(url) {
  let h = 0;
  for (let i=0; i<url.length; i++) h = ((h<<5)-h + url.charCodeAt(i)) | 0;
  const code = String(Math.abs(h) % 90000 + 10000);
  state.idMap[code] = url;
  localStorage.setItem("bn_ids", JSON.stringify(state.idMap));
  return code;
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime())/1000;
  if (d<60) return "just now";
  if (d<3600) return Math.floor(d/60)+"m ago";
  if (d<86400) return Math.floor(d/3600)+"h ago";
  return Math.floor(d/86400)+"d ago";
}

/* ---------- FETCHERS (browser-safe APIs) ---------- */
async function fromGNews(sec) {
  const cfg = SECTIONS[sec];
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(cfg.query)}&lang=en&max=25&apikey=${KEYS.gnews}`;
  try {
    const r = await fetch(url); const j = await r.json();
    return (j.articles||[]).map(a => ({
      title:a.title, description:a.description, url:a.url,
      image:a.image, source:a.source?.name||"GNews", publishedAt:a.publishedAt
    }));
  } catch { return []; }
}

async function fromCurrents(sec) {
  const cfg = SECTIONS[sec];
  const url = `https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(cfg.query)}&language=en&apiKey=${KEYS.currents}`;
  try {
    const r = await fetch(url); const j = await r.json();
    return (j.news||[]).map(a => ({
      title:a.title, description:a.description, url:a.url,
      image:a.image!=="None"?a.image:"", source:a.author||"Currents", publishedAt:a.published
    }));
  } catch { return []; }
}

async function fromNewsData(sec) {
  const cfg = SECTIONS[sec];
  const url = `https://newsdata.io/api/1/latest?apikey=${KEYS.newsdata}&q=${encodeURIComponent(cfg.query)}&language=en`;
  try {
    const r = await fetch(url); const j = await r.json();
    return (j.results||[]).map(a => ({
      title:a.title, description:a.description, url:a.link,
      image:a.image_url, source:a.source_id||"NewsData", publishedAt:a.pubDate
    }));
  } catch { return []; }
}

async function fromTheNewsAPI(sec) {
  const cfg = SECTIONS[sec];
  const url = `https://api.thenewsapi.com/v1/news/all?api_token=${KEYS.thenewsapi}&search=${encodeURIComponent(cfg.query)}&language=en&limit=25`;
  try {
    const r = await fetch(url); const j = await r.json();
    return (j.data||[]).map(a => ({
      title:a.title, description:a.description, url:a.url,
      image:a.image_url, source:a.source||"TheNewsAPI", publishedAt:a.published_at
    }));
  } catch { return []; }
}

async function fromMediastack(sec) {
  const cfg = SECTIONS[sec];
  const url = `https://api.mediastack.com/v1/news?access_key=${KEYS.mediastack}&keywords=${encodeURIComponent(cfg.query)}&languages=en&limit=25`;
  try {
    const r = await fetch(url); const j = await r.json();
    return (j.data||[]).map(a => ({
      title:a.title, description:a.description, url:a.url,
      image:a.image, source:a.source||"Mediastack", publishedAt:a.published_at
    }));
  } catch { return []; }
}

/* ---------- AGGREGATE ---------- */
async function loadSection(sec) {
  const grid = document.getElementById("grid");
  grid.innerHTML = `<div class="loading">Loading ${SECTIONS[sec].label}…</div>`;

  const results = await Promise.all([
    fromGNews(sec), fromCurrents(sec), fromNewsData(sec),
    fromTheNewsAPI(sec), fromMediastack(sec),
  ]);
  let all = results.flat().filter(a => a.title && a.url);

  // Strict topical filter
  all = all.filter(a => matchesSection(a, sec));

  // Dedupe by normalized title
  const seen = new Set();
  all = all.filter(a => {
    const k = norm(a.title).slice(0,80);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  // Sort newest first
  all.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  state.articles = all.slice(0, 60);
  render();
}

/* ---------- RENDER ---------- */
function render() {
  const grid = document.getElementById("grid");
  if (!state.articles.length) {
    grid.innerHTML = `<div class="loading">No matching articles found.</div>`;
    return;
  }
  const html = [];
  if (state.broadcast) {
    html.push(cardHTML(state.broadcast, true));
  }
  state.articles.forEach(a => html.push(cardHTML(a, false)));
  grid.innerHTML = html.join("");
  bindCards();
}

function cardHTML(a, pinned) {
  const code = shortId(a.url);
  const isBm = state.bookmarks.includes(a.url);
  return `
  <article class="card${pinned?" pinned":""}" data-code="${code}">
    ${pinned?`<div class="pin">📢 Broadcast</div>`:""}
    ${a.image?`<img src="${a.image}" alt="" loading="lazy" onerror="this.style.display='none'">`:""}
    <div class="body">
      <h3>${a.title}</h3>
      <p>${a.description||""}</p>
      <div class="meta">
        <span>${a.source} • ${timeAgo(a.publishedAt)}</span>
        <span class="actions">
          <button data-act="share" title="Share">🔗 #${code}</button>
          <button data-act="bm" title="Bookmark">${isBm?"★":"☆"}</button>
          <button data-act="bc" title="Broadcast">📢</button>
          <a href="${a.url}" target="_blank" rel="noopener">Read</a>
        </span>
      </div>
    </div>
  </article>`;
}

function bindCards() {
  document.querySelectorAll(".card").forEach(card => {
    const code = card.dataset.code;
    const url = state.idMap[code];
    const a = state.articles.find(x=>x.url===url) || state.broadcast;
    card.querySelector('[data-act="share"]')?.addEventListener("click", () => {
      const link = `${location.origin}${location.pathname}?a=${code}`;
      navigator.clipboard.writeText(link);
      alert("Share link copied: "+link);
    });
    card.querySelector('[data-act="bm"]')?.addEventListener("click", e => {
      const i = state.bookmarks.indexOf(url);
      if (i>=0) state.bookmarks.splice(i,1); else state.bookmarks.push(url);
      localStorage.setItem("bn_bm", JSON.stringify(state.bookmarks));
      e.target.textContent = state.bookmarks.includes(url)?"★":"☆";
    });
    card.querySelector('[data-act="bc"]')?.addEventListener("click", () => {
      state.broadcast = a;
      localStorage.setItem("bn_bc", JSON.stringify(a));
      const link = `${location.origin}${location.pathname}?f=${code}`;
      navigator.clipboard.writeText(link);
      alert("Broadcast link copied — everyone opening it sees this pinned:\n"+link);
      render();
    });
  });
}

/* ---------- NAV ---------- */
function buildNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = Object.entries(SECTIONS).map(([k,v]) =>
    `<button data-sec="${k}"${k===state.section?' class="active"':''}>${v.label}</button>`
  ).join("");
  nav.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      state.section = b.dataset.sec;
      nav.querySelectorAll("button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      loadSection(state.section);
    });
  });
}

/* ---------- SHARED-LINK HANDLING ---------- */
function handleShareParams() {
  const p = new URLSearchParams(location.search);
  const a = p.get("a"), f = p.get("f");
  if (f && state.idMap[f]) {
    // broadcast link
    const url = state.idMap[f];
    state.broadcast = { title:"Shared broadcast", description:"", url, image:"", source:"Shared", publishedAt:new Date().toISOString() };
  }
  if (a && state.idMap[a]) {
    window.open(state.idMap[a], "_blank");
  }
}

/* ---------- GOOGLE TRANSLATE ---------- */
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: "en",
    includedLanguages: "en,hi,ta,te,kn,ml,mr,bn,gu,pa,ur,fr,es,de,ja,zh-CN,ar,ru",
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, "google_translate_element");
}
window.googleTranslateElementInit = googleTranslateElementInit;

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  buildNav();
  handleShareParams();
  loadSection(state.section);
  setInterval(() => loadSection(state.section), 5*60*1000);

  document.getElementById("themeBtn")?.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });
});
