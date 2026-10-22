function cardHTML(a){
  return `
  <a class="anime-card" href="watch.html?id=${a.id}">
    <div class="ac-poster">
      <img src="${a.poster}" alt="${a.title} poster" loading="lazy">
      <span class="ac-badge">${a.status}</span>
      <span class="ac-ep">EP ${a.episodes}</span>
      <div class="ac-play">
        <svg viewBox="0 0 24 24" fill="white" style="filter:drop-shadow(0 4px 10px rgba(0,0,0,.5))"><circle cx="12" cy="12" r="11" fill="rgba(10,8,18,.55)"/><path d="M10 8.5v7l6-3.5z" fill="white"/></svg>
      </div>
    </div>
    <div class="ac-body">
      <h3>${a.title}</h3>
      <div class="ac-meta">
        <span class="star">★ ${a.rating}</span>
        <span>·</span>
        <span>${a.genre[0]}</span>
        <span>·</span>
        <span>${a.year}</span>
      </div>
    </div>
  </a>`;
}

function renderGrid(el, list){
  el.innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<p style="color:var(--mist-500);grid-column:1/-1;">No results. Try a different title or genre.</p>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const trendingGrid = document.getElementById('trendingGrid');
  const catalogueGrid = document.getElementById('catalogueGrid');
  const genreRow = document.getElementById('genreRow');
  const resultCount = document.getElementById('resultCount');
  const searchInput = document.getElementById('searchInput');

  let activeGenre = 'All';
  let query = '';
  let builtGenreChips = false;

  function applyFilters(all){
    let list = all.filter(a =>
      (activeGenre === 'All' || (a.genre || []).includes(activeGenre)) &&
      a.title.toLowerCase().includes(query.toLowerCase())
    );
    if (catalogueGrid) renderGrid(catalogueGrid, list);
    if (resultCount) resultCount.textContent = query
      ? `${list.length} result${list.length!==1?'s':''} for "${query}"`
      : `Showing ${list.length} series in the library.`;
  }

  function onData(all){
    if (trendingGrid) renderGrid(trendingGrid, getTrending(6));

    if (genreRow && !builtGenreChips){
      const genres = ['All', ...new Set(all.flatMap(a => a.genre || []))];
      genreRow.innerHTML = genres.map(g =>
        `<button class="genre-chip ${g==='All'?'active':''}" data-genre="${g}">${g}</button>`
      ).join('');
      genreRow.addEventListener('click', e => {
        const btn = e.target.closest('.genre-chip');
        if (!btn) return;
        genreRow.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        activeGenre = btn.dataset.genre;
        applyFilters(animeCache);
      });
      builtGenreChips = true;
    }
    applyFilters(all);
  }

  if (searchInput){
    searchInput.addEventListener('input', e => {
      query = e.target.value;
      applyFilters(animeCache);
    });
  }

  if (catalogueGrid) catalogueGrid.innerHTML = `<p style="color:var(--mist-500);grid-column:1/-1;">Loading catalogue…</p>`;

  seedIfEmpty().then(() => listenAnime(onData));
});
