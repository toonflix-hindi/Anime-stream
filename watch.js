document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const player = document.getElementById('player');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const errorOverlay = document.getElementById('errorOverlay');
  const notFoundOverlay = document.getElementById('notFoundOverlay');

  function hideAllOverlays(){
    [loadingOverlay, errorOverlay, notFoundOverlay].forEach(o => o.classList.remove('show'));
  }

  hideAllOverlays();
  loadingOverlay.classList.add('show');
  document.getElementById('animeTitle').textContent = 'Loading…';

  fetchAnimeOnce().then(() => {
    const anime = id ? getAnimeById(id) : null;
    if (!anime){
      hideAllOverlays();
      notFoundOverlay.classList.add('show');
      document.getElementById('animeTitle').textContent = 'Episode not found';
      document.getElementById('epList').innerHTML = '';
      document.getElementById('epCountLabel').textContent = '0 episodes';
      return;
    }
    initPlayer(anime);
  }).catch(() => {
    hideAllOverlays();
    document.getElementById('errorMsg').textContent =
      'Could not reach the database to load this title. Check your connection and retry.';
    errorOverlay.classList.add('show');
  });

  function initPlayer(anime){
    let currentEp = 1;

    document.getElementById('animeSub').textContent =
      `${(anime.genre||[]).join(' · ')} · ${anime.year} · ★ ${anime.rating}`;
    document.getElementById('synopsisText').textContent = anime.synopsis || '';
    document.getElementById('epCountLabel').textContent = `${anime.episodes} episodes · ${anime.status}`;

    function renderEpisodeList(){
      const list = document.getElementById('epList');
      list.innerHTML = '';
      for (let i = 1; i <= anime.episodes; i++){
        const item = document.createElement('div');
        item.className = 'ep-item' + (i === currentEp ? ' active' : '');
        item.innerHTML = `
          <div class="ep-num">${i}</div>
          <div><b>Episode ${i}</b><span>${anime.title}</span></div>
          <div class="ep-dur">23m</div>`;
        item.addEventListener('click', () => loadEpisode(i));
        list.appendChild(item);
      }
    }

    // Deliberately: ~1 in 6 episodes simulates a broken source, to
    // demonstrate the player's error / retry handling.
    function episodeIsBroken(epNum){
      return epNum % 6 === 0;
    }

    function loadEpisode(epNum, forceRetrySameSrc){
      currentEp = epNum;
      document.getElementById('animeTitle').textContent = `${anime.title} — Episode ${epNum}`;
      renderEpisodeList();
      hideAllOverlays();
      loadingOverlay.classList.add('show');
      player.pause();
      player.removeAttribute('src');

      const broken = episodeIsBroken(epNum) && !forceRetrySameSrc;

      setTimeout(() => {
        if (broken){
          hideAllOverlays();
          document.getElementById('errorMsg').textContent =
            `Episode ${epNum}'s source timed out while loading. This can happen during peak traffic — try again in a moment.`;
          errorOverlay.classList.add('show');
          return;
        }
        const src = DEMO_SOURCES[epNum % DEMO_SOURCES.length];
        player.src = src;
        hideAllOverlays();
      }, 900);
    }

    player.addEventListener('error', () => {
      hideAllOverlays();
      document.getElementById('errorMsg').textContent =
        'The video could not be decoded or the source is unreachable.';
      errorOverlay.classList.add('show');
    });

    document.getElementById('retryBtn').addEventListener('click', () => {
      loadEpisode(currentEp, true);
    });
    document.getElementById('reportBtn').addEventListener('click', () => {
      showToast('Issue reported — thanks for the heads up.');
    });

    document.getElementById('watchlistBtn').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const added = btn.textContent.includes('+');
      btn.textContent = added ? '✓ In watchlist' : '+ Watchlist';
      showToast(added ? `Added "${anime.title}" to your watchlist.` : 'Removed from watchlist.');
    });

    document.querySelectorAll('.player-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.player-tabs button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    document.getElementById('commentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('commentInput');
      if (!input.value.trim()) return;
      const el = document.createElement('div');
      el.className = 'comment';
      el.innerHTML = `
        <div class="avatar"></div>
        <div><b>you</b><span class="time">just now</span><p>${input.value.replace(/</g,'&lt;')}</p></div>`;
      document.getElementById('commentList').prepend(el);
      input.value = '';
      showToast('Comment posted.');
    });

    renderEpisodeList();
    loadEpisode(currentEp);
  }
});
