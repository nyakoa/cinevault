"use strict";

/*
  TMDB setup:
  1. Create/rotate your TMDB API key in your TMDB account.
  2. Paste the new v3 API key below.
  3. A key used in browser JavaScript is visible to visitors. For a public website,
     move TMDB requests to a server/serverless function instead.
*/
const TMDB_API_KEY = "ee74925cfd0df3316ea359842eb64d76";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const STORAGE_KEY = "cinevault_movies_v2";

const GENRES = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
  27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",
  878:"Science Fiction",10770:"TV Movie",53:"Thriller",10752:"War",37:"Western"
};

const $ = (selector, root = document) => root.querySelector(selector);
const movieList = $("#movie-list");
const movieForm = $("#movie-form");
let movies = loadMovies();
let activeFilter = "all";
let toastTimer;
let searchController;

function loadMovies() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (error) {
    console.warn("Could not read saved CineVault data:", error);
  }
  return [
    {id:"demo-1",tmdbId:null,title:"Interstellar",year:2014,genre:"Science Fiction",poster:"https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",status:"watched",rating:5,favorite:true,notes:"A beautiful journey through space and time.",addedAt:1},
    {id:"demo-2",tmdbId:null,title:"The Grand Budapest Hotel",year:2014,genre:"Comedy, Drama",poster:"https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",status:"watchlist",rating:"",favorite:false,notes:"",addedAt:2},
    {id:"demo-3",tmdbId:null,title:"Inception",year:2010,genre:"Science Fiction, Action",poster:"https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",status:"watched",rating:5,favorite:true,notes:"",addedAt:3},
    {id:"demo-4",tmdbId:null,title:"Little Women",year:2019,genre:"Drama, Romance",poster:"https://image.tmdb.org/t/p/w500/yn5ihoddehVnGQOd9e1S0q6p0rN.jpg",status:"watchlist",rating:"",favorite:false,notes:"",addedAt:4}
  ];
}

function saveMovies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}

function safeImageUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:","https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function posterMarkup(movie, extraClass = "") {
  const poster = safeImageUrl(movie.poster || "");
  return poster
    ? `<img class="${extraClass}" src="${escapeHTML(poster)}" alt="${escapeHTML(movie.title)} poster" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'poster-placeholder',textContent:'${escapeHTML(movie.title).replace(/'/g,"&#39;")}'}))">`
    : `<div class="poster-placeholder">${escapeHTML(movie.title)}</div>`;
}

function renderMovies() {
  const query = $("#movie-search").value.trim().toLowerCase();
  let visible = movies.filter(movie => {
    const matchesQuery = `${movie.title} ${movie.genre} ${movie.year}`.toLowerCase().includes(query);
    const matchesFilter = activeFilter === "all" ||
      (activeFilter === "favorites" ? movie.favorite : movie.status === activeFilter);
    return matchesQuery && matchesFilter;
  });

  const sort = $("#sort-movies").value;
  visible.sort((a,b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "year") return (b.year || 0) - (a.year || 0);
    if (sort === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  $("#result-count").textContent = `${visible.length} ${visible.length === 1 ? "film" : "films"}`;
  $("#empty-state").hidden = visible.length > 0;
  movieList.innerHTML = visible.map(movie => `
    <article class="movie-card" data-id="${escapeHTML(movie.id)}">
      <div class="poster-wrapper" data-action="details">${posterMarkup(movie)}
        <span class="status-badge">${movie.status === "watched" ? "✓ Watched" : "◷ Watchlist"}</span>
        ${movie.favorite ? '<span class="favorite-badge" aria-label="Favourite">★</span>' : ""}
      </div>
      <div class="movie-info">
        <div class="movie-meta"><span>${escapeHTML(movie.year || "Year unknown")}</span><span>${movie.favorite ? "★ Favourite" : ""}</span></div>
        <h3 title="${escapeHTML(movie.title)}">${escapeHTML(movie.title)}</h3>
        <p class="movie-genre">${escapeHTML(movie.genre || "Genre not set")}</p>
        ${movie.rating ? `<p class="movie-rating">★ ${Number(movie.rating).toFixed(1)} / 5</p>` : '<p class="movie-rating unrated">Not rated yet</p>'}
      </div>
      <div class="card-actions">
        <button class="card-action" data-action="edit">Edit</button>
        <button class="card-action" data-action="toggle">${movie.status === "watched" ? "Unwatch" : "Watched"}</button>
        <button class="card-action delete" data-action="delete">Delete</button>
      </div>
    </article>`).join("");

  updateStats();
}

function updateStats() {
  const watched = movies.filter(m => m.status === "watched").length;
  const rated = movies.filter(m => Number(m.rating) > 0);
  const average = rated.length ? (rated.reduce((sum,m) => sum + Number(m.rating),0) / rated.length).toFixed(1) : "—";
  const percent = movies.length ? Math.round(watched / movies.length * 100) : 0;
  $("#stat-total").textContent = movies.length;
  $("#stat-watched").textContent = watched;
  $("#stat-watchlist").textContent = movies.length - watched;
  $("#stat-rating").textContent = average === "—" ? "—" : `${average}★`;
  $("#progress-percent").textContent = `${percent}%`;
  $("#progress-label").textContent = `${watched} of ${movies.length} watched`;
  $("#progress-fill").style.width = `${percent}%`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
  const focusable = modal.querySelector("input:not([type=hidden]),button,textarea,select");
  if (focusable) setTimeout(() => focusable.focus(), 50);
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
  if (!$(".modal-overlay.open")) document.body.classList.remove("modal-open");
}

function resetForm() {
  movieForm.reset();
  $("#movie-id").value = "";
  $("#movie-tmdb-id").value = "";
  $("#modal-title").textContent = "Add a movie";
}

function openAddModal(prefill = null) {
  resetForm();
  if (prefill) {
    $("#movie-title").value = prefill.title || "";
    $("#movie-year").value = prefill.year || "";
    $("#movie-genre").value = prefill.genre || "";
    $("#movie-poster").value = prefill.poster || "";
    $("#movie-tmdb-id").value = prefill.tmdbId || "";
    $("#movie-status").value = "watchlist";
  }
  openModal("movie-modal");
}

function editMovie(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;
  resetForm();
  $("#modal-title").textContent = "Edit movie";
  $("#movie-id").value = movie.id;
  $("#movie-tmdb-id").value = movie.tmdbId || "";
  $("#movie-title").value = movie.title;
  $("#movie-year").value = movie.year || "";
  $("#movie-genre").value = movie.genre || "";
  $("#movie-poster").value = movie.poster || "";
  $("#movie-status").value = movie.status;
  $("#movie-rating").value = movie.rating || "";
  $("#movie-notes").value = movie.notes || "";
  $("#movie-favorite").checked = Boolean(movie.favorite);
  openModal("movie-modal");
}

movieForm.addEventListener("submit", event => {
  event.preventDefault();
  const id = $("#movie-id").value;
  const title = $("#movie-title").value.trim();
  const poster = $("#movie-poster").value.trim();
  if (!title) return;
  if (poster && !safeImageUrl(poster)) {
    showToast("Please enter a valid http(s) poster URL.");
    return;
  }
  const existing = movies.find(m => m.id === id);
  const movie = {
    id: id || `movie-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tmdbId: $("#movie-tmdb-id").value || null,
    title,
    year: Number($("#movie-year").value) || "",
    genre: $("#movie-genre").value.trim(),
    poster: poster ? safeImageUrl(poster) : "",
    status: $("#movie-status").value,
    rating: $("#movie-rating").value ? Number($("#movie-rating").value) : "",
    notes: $("#movie-notes").value.trim(),
    favorite: $("#movie-favorite").checked,
    addedAt: existing?.addedAt || Date.now()
  };
  if (existing) movies = movies.map(m => m.id === id ? movie : m);
  else movies.unshift(movie);
  saveMovies();
  renderMovies();
  closeModal("movie-modal");
  showToast(existing ? "Movie updated." : "Movie added to your library.");
});

function showDetails(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;
  $("#movie-details-content").innerHTML = `
    <div class="details-poster-wrap">${posterMarkup(movie,"details-poster")}</div>
    <div class="details-copy"><p class="eyebrow">FROM YOUR COLLECTION</p><h2 id="details-title">${escapeHTML(movie.title)}</h2>
    <div class="details-meta">${escapeHTML(movie.year || "Year unknown")} <span>•</span> ${escapeHTML(movie.genre || "Genre not set")}</div>
    <p class="details-status">${movie.status === "watched" ? "✓ Watched" : "◷ On your watchlist"} ${movie.favorite ? " · ★ Favourite" : ""}</p>
    <p class="details-rating">${movie.rating ? `Your rating: ★ ${Number(movie.rating).toFixed(1)} / 5` : "You have not rated this film yet."}</p>
    <p>${escapeHTML(movie.notes || "No personal notes yet. Edit this movie to add your thoughts.")}</p>
    <button class="primary-button details-edit" data-detail-edit="${escapeHTML(movie.id)}">Edit movie</button></div>`;
  openModal("details-modal");
}

movieList.addEventListener("click", event => {
  const card = event.target.closest(".movie-card");
  if (!card) return;
  const id = card.dataset.id;
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "details") showDetails(id);
  if (action === "edit") editMovie(id);
  if (action === "toggle") {
    movies = movies.map(m => m.id === id ? {...m,status:m.status === "watched" ? "watchlist" : "watched"} : m);
    saveMovies(); renderMovies();
  }
  if (action === "delete" && confirm("Remove this movie from your library?")) {
    movies = movies.filter(m => m.id !== id);
    saveMovies(); renderMovies(); showToast("Movie removed.");
  }
});

$("#movie-details-content").addEventListener("click", event => {
  const button = event.target.closest("[data-detail-edit]");
  if (button) { const id = button.dataset.detailEdit; closeModal("details-modal"); editMovie(id); }
});

$("#open-add").addEventListener("click", () => openAddModal());
$("#empty-add").addEventListener("click", () => openAddModal());
$("#movie-search").addEventListener("input", renderMovies);
$("#sort-movies").addEventListener("change", renderMovies);
$("#filter-row").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  $("#filter-row").querySelectorAll(".filter-button").forEach(b => b.classList.toggle("active", b === button));
  renderMovies();
});

document.addEventListener("click", event => {
  const close = event.target.closest("[data-close]");
  if (close) closeModal(close.dataset.close);
  if (event.target.classList.contains("modal-overlay")) closeModal(event.target.id);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") document.querySelectorAll(".modal-overlay.open").forEach(m => closeModal(m.id));
  if (event.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault(); $("#movie-search").focus();
  }
});

function tmdbConfigured() {
  return TMDB_API_KEY && !TMDB_API_KEY.includes("PASTE_YOUR");
}

async function searchMovies(query) {
  if (!tmdbConfigured()) throw new Error("Add your TMDB API key in script.js to enable movie discovery.");
  if (searchController) searchController.abort();
  searchController = new AbortController();
  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.search = new URLSearchParams({api_key:TMDB_API_KEY,query,include_adult:"false",language:"en-US",page:"1"});
  const response = await fetch(url, {signal:searchController.signal});
  if (!response.ok) {
    if (response.status === 401) throw new Error("TMDB rejected the API key. Check that the new key is correct.");
    throw new Error(`TMDB request failed (${response.status}). Please try again.`);
  }
  const data = await response.json();
  return data.results || [];
}

function renderDiscoverResults(results) {
  const container = $("#discover-results");
  container.innerHTML = results.map(movie => {
    const title = movie.title || movie.original_title || "Untitled";
    const year = movie.release_date ? movie.release_date.slice(0,4) : "";
    const genre = (movie.genre_ids || []).map(id => GENRES[id]).filter(Boolean).slice(0,2).join(", ");
    const poster = movie.poster_path ? `${TMDB_IMAGE_URL}${movie.poster_path}` : "";
    const alreadyAdded = movies.some(m => String(m.tmdbId) === String(movie.id));
    return `<article class="movie-card discovery-card">
      <div class="poster-wrapper">${poster ? `<img src="${escapeHTML(poster)}" alt="${escapeHTML(title)} poster" loading="lazy">` : `<div class="poster-placeholder">${escapeHTML(title)}</div>`}
        ${movie.vote_average ? `<span class="status-badge">TMDB ★ ${Number(movie.vote_average).toFixed(1)}</span>` : ""}
      </div>
      <div class="movie-info"><div class="movie-meta"><span>${escapeHTML(year || "Release date unknown")}</span></div><h3 title="${escapeHTML(title)}">${escapeHTML(title)}</h3><p class="movie-genre">${escapeHTML(genre || "Genre unavailable")}</p><p class="discover-overview">${escapeHTML(movie.overview || "No synopsis available.")}</p></div>
      <div class="card-actions"><button class="card-action add-discovery" data-add-tmdb="${Number(movie.id)}" ${alreadyAdded ? "disabled" : ""}>${alreadyAdded ? "✓ In your library" : "+ Add to library"}</button></div>
    </article>`;
  }).join("");
}

$("#discover-form").addEventListener("submit", async event => {
  event.preventDefault();
  const query = $("#discover-input").value.trim();
  if (!query) { $("#discover-status").textContent = "Enter a movie title to search."; return; }
  const status = $("#discover-status");
  const results = $("#discover-results");
  status.textContent = "Searching the movie universe…";
  results.innerHTML = "";
  try {
    const found = await searchMovies(query);
    if (!found.length) { status.textContent = `No films found for “${query}”. Try another title.`; return; }
    status.textContent = `${found.length} results for “${query}”.`;
    renderDiscoverResults(found);
  } catch (error) {
    if (error.name === "AbortError") return;
    status.textContent = error.message;
  }
});

$("#discover-results").addEventListener("click", event => {
  const button = event.target.closest("[data-add-tmdb]");
  if (!button || button.disabled) return;
  const tmdbId = button.dataset.addTmdb;
  const title = button.closest(".discovery-card").querySelector("h3").textContent;
  // The selected result is kept in the current result set to avoid a second API request.
  const query = $("#discover-input").value.trim();
  searchMovies(query).then(found => {
    const selected = found.find(m => String(m.id) === String(tmdbId));
    if (!selected) throw new Error("Could not retrieve this movie. Search again.");
    if (movies.some(m => String(m.tmdbId) === String(selected.id))) return;
    const genre = (selected.genre_ids || []).map(id => GENRES[id]).filter(Boolean).join(", ");
    movies.unshift({
      id:`tmdb-${selected.id}`,tmdbId:selected.id,title:selected.title || selected.original_title || title,
      year:selected.release_date ? Number(selected.release_date.slice(0,4)) : "",
      genre,poster:selected.poster_path ? `${TMDB_IMAGE_URL}${selected.poster_path}` : "",
      status:"watchlist",rating:"",favorite:false,notes:"",addedAt:Date.now()
    });
    saveMovies(); renderMovies(); renderDiscoverResults(found); showToast("Added to your watchlist.");
  }).catch(error => showToast(error.message));
});

$("#discover-input").addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); $("#discover-form").requestSubmit(); }
});

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
    link.classList.add("active");
  });
});

renderMovies();
console.info("CineVault initialized successfully. Loaded", movies.length, "movies.");
