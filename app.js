/* ============== CONFIG ============== */
const KEYS = {
  mediastack: "0ad0ca92ff944378ebf7264ffdeba284",
  gnews:      "555cc6c6d65125cbc73110e2081e40e0",
  newsapi:    "399424383f0245649bb0880bf4d2d0bc",
  currents:   "-FLyVsvYJCMf8ao-JScI_oEyTju2UR5p9jlJDbOvyFmyZK3R",
  thenewsapi: "MkViUMU2mrSb7srxpie2sJNg7tvvYNI5FeFgflnG",
  thenewsio:  "pub_754cb6755ea74340a3ac69299a874e96",
  newsdata:   "pub_61a70084212d4555aa0fb2f4906a7ff4"
};

const SECTIONS = [
  {id:"breaking",      label:"Breaking",       q:"breaking"},
  {id:"international", label:"International",  q:"world international"},
  {id:"national",      label:"National",       q:"india national"},
  {id:"india",         label:"India",          q:"india"},
  {id:"world",         label:"World",          q:"world"},
  {id:"business",      label:"Business",       q:"business"},
  {id:"technology",    label:"Technology",     q:"technology"},
  {id:"sports",        label:"Sports",         q:"sports"},
  {id:"entertainment", label:"Entertainment",  q:"entertainment"},
  {id:"health",        label:"Health",         q:"health"},
  {id:"science",       label:"Science",        q:"science"},
];

const REFRESH_MS = 5 * 60 * 1000;

/* ============== STATE ============== */
const state = {
  cat: "breaking",
  articles: [],
  search: "",
  bookmarks: JSON.parse(localStorage.getItem("bn_bm")||"[]"),
  broadcast: JSON.parse(localStorage.getItem("bn_bc")||"null"),
  idMap: JSON.parse(localStorage.getItem("bn_idmap")||"{}"),
};

/* ============== HELPERS ============== */
const $ = s => document.querySelector(s);
const saveBm = () => localStorage.setItem("bn_bm", JSON.stringify(state.bookmarks));
const saveIdMap = () => localStorage.setItem("bn_idmap", JSON.stringify(state.idMap));
const saveBc = () => localStorage.setItem("bn_bc", JSON.stringify(state.broadcast));

function shortId(url){
  let h = 0;
  for (let i=0;i<url.length;i++) h = ((h<<5)-h + url.charCodeAt(i))|0;
  const code = String(Math.abs(h) % 90000 + 10000);
  if (!state.idMap[code]) { state.idMap[code] = url; saveIdMap(); }
  return code;
}

function findByCode(code){
  const url = state.idMap[code];
  if (!url) return null;
  return state.articles.find(a=>a.url===url) || null;
}

function timeAgo(iso){
  if (!iso) return "";
  const s = Math.floor((Date.now()-new Date(iso))/1000);
  if (s<60) return s+"s ago";
  if (s<3600) return Math.floor(s/60)+"m ago";
  if (s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}

function dedupe(list){
  const seen = new Set(); const out = [];
  for (const a of list) {
    const k = (a.title||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").slice(0,60);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(a);
  }
  return out;
}

function normalize(items, source){
  return items.filter(Boolean).map(a=>({
    title: a.title || a.name || "",
    description: a.description || a.snippet || a.summary || a.content || "",
    url: a.url || a.link || "",
    image: a.image || a.urlToImage || a.image_url || a.thumbnail || a.imageUrl || "",
    publishedAt: a.publishedAt || a.published_at || a.pubDate || a.published || a.date || "",
    source: (a.source && (a.source.name||a.source)) || a.source_name || source,
    category: a.category || ""
  })).filter(a=>a.title && a.url);
}

async function safeFetch(url){
  try {
    const r = await fetch(url);
    if (!r.ok) throw 0;
    return await r.json();
  } catch { return null; }
}

/* ============== FETCHERS ============== */
async function fetchAll(section){
  const q = encodeURIComponent(section.q);
  const cat = section.id;
  const catMap = {breaking:"general", international:"world", national:"general", india:"general"};
  const apiCat = catMap[cat] || cat;

  const calls = [
    safeFetch(`https://gnews.io/api/v4/top-headlines?category=${apiCat==="world"?"world":apiCat}&lang=en&max=40&apikey=${KEYS.gnews}`)
      .then(d=>normalize(d?.articles||[],"GNews")),
    safeFetch(`https://api.mediastack.com/v1/news?access_key=${KEYS.mediastack}&categories=${apiCat==="world"?"general":apiCat}&languages=en&limit=40`)
      .then(d=>normalize(d?.data||[],"MediaStack")),
    safeFetch(`https://api.currentsapi.services/v1/latest-news?category=${apiCat}&language=en&apiKey=${KEYS.currents}`)
      .then(d=>normalize(d?.news||[],"Currents")),
    safeFetch(`https://api.thenewsapi.com/v1/news/top?api_token=${KEYS.thenewsapi}&locale=us,in&categories=${apiCat==="world"?"general":apiCat}&limit=25`)
      .then(d=>normalize(d?.data||[],"TheNewsAPI")),
    safeFetch(`https://api.thenewsapi.com/v1/news/all?api_token=${KEYS.thenewsapi}&search=${q}&language=en&limit=25`)
      .then(d=>normalize(d?.data||[],"TheNewsAPI")),
    safeFetch(`https://newsdata.io/api/1/latest?apikey=${KEYS.newsdata}&category=${apiCat==="world"?"world":apiCat}&language=en`)
      .then(d=>normalize(d?.results||[],"NewsData")),
    safeFetch(`https://api.thenews.io/v1/news?apikey=${KEYS.thenewsio}&category=${apiCat}&limit=40`)
      .then(d=>normalize(d?.data||d?.articles||[],"TheNews.io")),
    safeFetch(`https://newsapi.org/v2/top-headlines?category=${apiCat==="world"?"general":apiCat}&language=en&pageSize=40&apiKey=${KEYS.newsapi}`)
      .then(d=>normalize(d?.articles||[],"NewsAPI")),
  ];
  const results = await Promise.all(calls);
  let merged = dedupe(results.flat());
  merged.sort((a,b)=> new Date(b.publishedAt||0) - new Date(a.publishedAt||0));
  return merged.slice(0, 60);
}

/* ============== RENDER ============== */
function renderCats(){
  $("#bnCats").innerHTML = SECTIONS.map(s=>
    `<button class="bn-cat ${s.id===state.cat?'active':''}" data-cat="${s.id}">${s.label}</button>`
  ).join("");
  $("#bnCats").onclick = e=>{
    const b = e.target.closest(".bn-cat"); if (!b) return;
    state.cat = b.dataset.cat;
    history.replaceState(null,"","?cat="+state.cat);
    load();
  };
}

function skeletons(n){
  return Array.from({length:n}).map(()=>`
    <div class="bn-card skeleton">
      <div class="sk-img"></div>
      <div class="sk-line w90"></div><div class="sk-line w70"></div><div class="sk-line w50"></div>
    </div>`).join("");
}

function cardHTML(a, i){
  const code = shortId(a.url);
  const bm = state.bookmarks.some(b=>b.url===a.url);
  const isBc = state.broadcast?.url===a.url;
  const img = a.image || `https://picsum.photos/seed/${code}/600/400`;
  return `
    <article class="bn-card" data-code="${code}" style="animation-delay:${i*30}ms">
      <div class="bn-card-img" style="background-image:url('${img}')">
        <button class="bn-bookmark ${bm?'on':''}" data-act="bm" title="Bookmark">${bm?'★':'☆'}</button>
      </div>
      <div class="bn-card-body">
        <span class="bn-chip">${a.source||'News'}</span>
        <h3>${a.title}</h3>
        <p>${a.description||''}</p>
        <div class="bn-card-foot">
          <span class="bn-meta">${timeAgo(a.publishedAt)} • #${code}</span>
          <span class="bn-read">${isBc?'📢 BROADCASTING':'READ →'}</span>
        </div>
      </div>
    </article>`;
}

function heroHTML(a){
  if (!a) return "";
  const code = shortId(a.url);
  const img = a.image || `https://picsum.photos/seed/${code}/1200/700`;
  return `
    <div class="bn-hero" data-code="${code}">
      <div class="bn-hero-img" style="background-image:url('${img}')"></div>
      <div class="bn-hero-body">
        <span class="bn-chip">${a.source||'Top Story'}</span>
        <h1>${a.title}</h1>
        <p>${a.description||''}</p>
        <span class="bn-meta" style="color:rgba(255,255,255,.75)">${timeAgo(a.publishedAt)} • #${code}</span>
      </div>
    </div>`;
}

function featHTML(list){
  return `<div class="bn-featured">${list.map(a=>{
    const code = shortId(a.url);
    const img = a.image || `https://picsum.photos/seed/${code}/300/300`;
    return `<div class="bn-feat" data-code="${code}">
      <div class="bn-feat-img" style="background-image:url('${img}')"></div>
      <div class="bn-feat-body">
        <span class="bn-chip">${a.source||'News'}</span>
        <h3>${a.title}</h3>
        <span class="bn-meta">${timeAgo(a.publishedAt)}</span>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function render(){
  const term = state.search.toLowerCase();
  const list = state.articles.filter(a =>
    !term || (a.title+a.description+a.source).toLowerCase().includes(term));

  const sec = SECTIONS.find(s=>s.id===state.cat);
  $("#bnTitle").innerHTML = `${sec.label} <span class="muted">${list.length} stories</span>`;

  let hero = list[0], featured = list.slice(1,4), rest = list.slice(4);
  if (state.broadcast) {
    hero = state.broadcast;
    featured = list.filter(a=>a.url!==state.broadcast.url).slice(0,3);
    rest = list.filter(a=>a.url!==state.broadcast.url).slice(3);
  }

  $("#bnHero").innerHTML = heroHTML(hero) + featHTML(featured);
  $("#bnGrid").innerHTML = rest.length
    ? rest.map((a,i)=>cardHTML(a,i)).join("")
    : (list.length?'':'<div class="bn-empty">No stories loaded. Some APIs may block browser requests (CORS). Try another section.</div>');

  updateBmBadge();
  updateTicker(list);
}

function updateBmBadge(){
  const el = $("#bnBmCount");
  if (state.bookmarks.length){ el.style.display="block"; el.textContent = state.bookmarks.length; }
  else el.style.display="none";
}

function updateTicker(list){
  const items = list.slice(0,15).map(a=>`<a data-code="${shortId(a.url)}">▸ ${a.title}</a>`).join("");
  $("#bnTicker").innerHTML = items + items;
}

/* ============== LOAD ============== */
async function load(){
  renderCats();
  $("#bnGrid").innerHTML = skeletons(9);
  $("#bnHero").innerHTML = "";
  $("#bnProgress").style.width = "30%";
  const sec = SECTIONS.find(s=>s.id===state.cat);
  state.articles = await fetchAll(sec);
  $("#bnProgress").style.width = "100%";
  setTimeout(()=>$("#bnProgress").style.width="0", 400);
  render();
}

/* ============== MODAL ============== */
function openArticle(code){
  const a = findByCode(code); if (!a) return;
  const shareUrl = `${location.origin}${location.pathname}?a=${code}`;
  const bcUrl    = `${location.origin}${location.pathname}?f=${code}`;
  const isBc = state.broadcast?.url===a.url;
  const bm = state.bookmarks.some(b=>b.url===a.url);
  const img = a.image || `https://picsum.photos/seed/${code}/1200/700`;

  const modal = document.createElement("div");
  modal.className = "bn-modal";
  modal.innerHTML = `
    <div class="bn-modal-card">
      <button class="bn-modal-close">×</button>
      <div class="bn-modal-img" style="background-image:url('${img}')"></div>
      <div class="bn-modal-body">
        <span class="bn-chip">${a.source||'News'} • #${code}</span>
        <h2>${a.title}</h2>
        <p style="color:var(--muted)">${timeAgo(a.publishedAt)}</p>
        <p>${a.description||''}</p>
        <div class="bn-modal-actions">
          <a class="bn-btn primary" href="${a.url}" target="_blank" rel="noopener">Read full article ↗</a>
          <button class="bn-btn" data-act="share">🔗 Share (#${code})</button>
          <button class="bn-btn" data-act="bm">${bm?'★ Bookmarked':'☆ Bookmark'}</button>
          <button class="bn-btn" data-act="bc">${isBc?'📢 Stop broadcasting':'📢 Broadcast to everyone'}</button>
        </div>
        <p style="font-size:12px;color:var(--muted);margin-top:6px">Share link: <code>${shareUrl}</code><br>Broadcast link: <code>${bcUrl}</code></p>
      </div>
    </div>`;
  document.body.appendChild(modal);
  history.replaceState(null,"", `?cat=${state.cat}&a=${code}`);

  const close = ()=>{ modal.remove(); history.replaceState(null,"", `?cat=${state.cat}`); };
  modal.querySelector(".bn-modal-close").onclick = close;
  modal.onclick = e=>{ if (e.target===modal) close(); };

  modal.querySelector('[data-act="share"]').onclick = async ()=>{
    const data = { title: a.title, text: a.title, url: shareUrl };
    try { if (navigator.share) await navigator.share(data);
          else { await navigator.clipboard.writeText(shareUrl); alert("Link copied!\n"+shareUrl); }
    } catch{}
  };
  modal.querySelector('[data-act="bm"]').onclick = ()=>{
    const idx = state.bookmarks.findIndex(b=>b.url===a.url);
    if (idx>=0) state.bookmarks.splice(idx,1); else state.bookmarks.push(a);
    saveBm(); close(); render();
  };
  modal.querySelector('[data-act="bc"]').onclick = async ()=>{
    if (state.broadcast?.url===a.url) state.broadcast = null;
    else state.broadcast = a;
    saveBc();
    try { await navigator.clipboard.writeText(bcUrl); } catch{}
    close(); render();
    alert(state.broadcast? "Broadcasting! Link copied — anyone opening it sees this story pinned on top.":"Broadcast stopped.");
  };
}

/* ============== EVENTS ============== */
document.addEventListener("click", e=>{
  const bm = e.target.closest('.bn-bookmark');
  if (bm) {
    e.stopPropagation();
    const card = bm.closest("[data-code]");
    const a = findByCode(card.dataset.code);
    if (!a) return;
    const idx = state.bookmarks.findIndex(b=>b.url===a.url);
    if (idx>=0) state.bookmarks.splice(idx,1); else state.bookmarks.push(a);
    saveBm(); render();
    return;
  }
  const node = e.target.closest("[data-code]");
  if (node) openArticle(node.dataset.code);
});

$("#bnSearch").oninput = e=>{ state.search = e.target.value; render(); };
$("#bnSearchClear").onclick = ()=>{ $("#bnSearch").value=""; state.search=""; render(); };

$("#bnThemeBtn").onclick = ()=>{
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("bn_theme", document.documentElement.classList.contains("dark")?"dark":"light");
};
if (localStorage.getItem("bn_theme")==="dark") document.documentElement.classList.add("dark");

$("#bnBookmarksBtn").onclick = ()=>{
  if (!state.bookmarks.length) return alert("No bookmarks yet.");
  state.articles = state.bookmarks.slice();
  $("#bnTitle").innerHTML = `🔖 Bookmarks <span class="muted">${state.bookmarks.length}</span>`;
  render();
};

$("#bnLang").onchange = e=>{
  const lang = e.target.value;
  const set = v => {
    document.cookie = `googtrans=${v};path=/`;
    document.cookie = `googtrans=${v};path=/;domain=.${location.hostname}`;
  };
  set(lang ? `/en/${lang}` : "/en/en");
  location.reload();
};

$("#bnTop").onclick = ()=> window.scrollTo({top:0,behavior:"smooth"});
window.addEventListener("scroll", ()=>{
  $("#bnTop").style.display = window.scrollY>500?"block":"none";
});

function tick(){
  const d = new Date();
  $("#bnDate").textContent = d.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  $("#bnClock").textContent = d.toLocaleTimeString();
}
tick(); setInterval(tick, 1000);

(function init(){
  const p = new URLSearchParams(location.search);
  if (p.get("cat")) state.cat = p.get("cat");
  const openCode = p.get("a");
  const bcCode = p.get("f");
  load().then(()=>{
    if (bcCode) {
      const a = findByCode(bcCode);
      if (a) { state.broadcast = a; saveBc(); render(); }
    }
    if (openCode) setTimeout(()=>openArticle(openCode), 300);
  });
  setInterval(load, REFRESH_MS);
})();
