const MOCK_USERS = [
  { name:"haruno_k", plan:"Premium", joined:"Jan 2025", status:"Active" },
  { name:"midnight_reel", plan:"Free", joined:"Mar 2025", status:"Active" },
  { name:"sakura.codes", plan:"Premium", joined:"Jun 2024", status:"Active" },
  { name:"ronin_watcher", plan:"Free", joined:"Sep 2025", status:"Suspended" },
  { name:"yuki_otaku", plan:"Premium", joined:"Nov 2025", status:"Active" },
];

const MOCK_REPORTS = [
  { title:"Neon Requiem — Ep 6", issue:"Buffers then stops at 4:12", user:"ronin_watcher", status:"Open" },
  { title:"Void Mechanica — Ep 12", issue:"Audio out of sync", user:"yuki_otaku", status:"Open" },
  { title:"Crimson Ronin — Ep 18", issue:"Subtitles missing", user:"sakura.codes", status:"Resolved" },
  { title:"Frostbound Oath — Ep 6", issue:"404 — source unreachable", user:"midnight_reel", status:"Open" },
];

let catalogue = [];
let editingId = null;       // Firebase key of the title being edited, or null for "add"
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  renderUsers();
  renderReports();
  bindNav();
  bindModal();
  bindSearch();

  document.getElementById('catalogueTableBody').innerHTML =
    `<tr><td colspan="6" style="color:var(--mist-500);text-align:center;padding:26px;">Loading catalogue from Firebase…</td></tr>`;

  seedIfEmpty().then(() => {
    listenAnime(list => {
      catalogue = list;
      renderDashboard();
      const filtered = searchQuery
        ? catalogue.filter(a => a.title.toLowerCase().includes(searchQuery))
        : catalogue;
      renderCatalogueTable(filtered);
    });
  });
});

/* ---------------- NAV / VIEW SWITCH ---------------- */
function bindNav(){
  const titles = {
    dashboard:["Dashboard","Live snapshot of your streaming library."],
    catalogue:["Catalogue","Add, edit, or remove titles from Yozora."],
    users:["Users","Manage registered viewer accounts."],
    reports:["Error reports","Playback issues flagged by your viewers."]
  };
  document.querySelectorAll('.admin-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
      document.getElementById(`view-${btn.dataset.view}`).style.display = 'block';
      document.getElementById('viewTitle').textContent = titles[btn.dataset.view][0];
      document.getElementById('viewSub').textContent = titles[btn.dataset.view][1];
    });
  });
}

/* ---------------- DASHBOARD ---------------- */
function renderDashboard(){
  document.getElementById('statTotal').textContent = catalogue.length;
  const recent = [...catalogue].slice(-5).reverse();
  document.getElementById('recentTableBody').innerHTML = recent.length ? recent.map(a => `
    <tr>
      <td class="row-title"><img src="${a.poster}" alt=""><div><b>${a.title}</b><span>${a.year}</span></div></td>
      <td>${(a.genre||[]).join(', ')}</td>
      <td>${a.episodes}</td>
      <td><span class="status-chip ${(a.status||'').toLowerCase()}">${a.status}</span></td>
      <td>★ ${a.rating}</td>
    </tr>`).join('') : `<tr><td colspan="5" style="color:var(--mist-500);">No titles yet — add one to get started.</td></tr>`;
}

/* ---------------- CATALOGUE TABLE ---------------- */
function renderCatalogueTable(list){
  document.getElementById('catalogueCount').textContent = `${list.length} title${list.length!==1?'s':''}`;
  document.getElementById('catalogueTableBody').innerHTML = list.length ? list.map(a => `
    <tr data-id="${a.id}">
      <td class="row-title"><img src="${a.poster}" alt=""><div><b>${a.title}</b><span>${(a.genre||[]).join(', ')}</span></div></td>
      <td>${(a.genre||[]).join(', ')}</td>
      <td>${a.episodes}</td>
      <td><span class="status-chip ${(a.status||'').toLowerCase()}">${a.status}</span></td>
      <td>★ ${a.rating}</td>
      <td>
        <div class="row-actions">
          <button class="edit" title="Edit" data-id="${a.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
          </button>
          <button class="del" title="Delete" data-id="${a.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('') : `<tr><td colspan="6" style="color:var(--mist-500);text-align:center;padding:26px;">No titles match.</td></tr>`;

  document.querySelectorAll('#catalogueTableBody .edit').forEach(b =>
    b.addEventListener('click', () => openModal(b.dataset.id)));
  document.querySelectorAll('#catalogueTableBody .del').forEach(b =>
    b.addEventListener('click', () => deleteAnime(b.dataset.id)));
}

function deleteAnime(id){
  const target = catalogue.find(a => a.id === id);
  if (!target) return;
  if (!confirm(`Remove "${target.title}" from the catalogue?`)) return;
  deleteAnimeFromDB(id)
    .then(() => showToast(`"${target.title}" removed.`, true))
    .catch(() => showToast('Could not delete — check your connection.', true));
}

function bindSearch(){
  const input = document.getElementById('adminSearch');
  input.addEventListener('input', () => {
    searchQuery = input.value.toLowerCase();
    const filtered = searchQuery
      ? catalogue.filter(a => a.title.toLowerCase().includes(searchQuery))
      : catalogue;
    renderCatalogueTable(filtered);
  });
}

/* ---------------- MODAL (ADD / EDIT) ---------------- */
function bindModal(){
  const backdrop = document.getElementById('modalBackdrop');
  document.getElementById('addAnimeBtn').addEventListener('click', () => openModal(null));
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

  document.getElementById('animeForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      title: document.getElementById('f-title').value.trim(),
      genre: document.getElementById('f-genre').value.split(',').map(s=>s.trim()).filter(Boolean),
      year: Number(document.getElementById('f-year').value) || new Date().getFullYear(),
      episodes: Number(document.getElementById('f-episodes').value) || 1,
      status: document.getElementById('f-status').value,
      synopsis: document.getElementById('f-synopsis').value.trim(),
    };
    if (!data.title){ showToast('Title is required.', true); return; }
    if (!data.genre.length) data.genre = ['Action'];

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const finish = (okMsg) => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save title';
      showToast(okMsg);
      closeModal();
    };
    const fail = () => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save title';
      showToast('Save failed — check your connection and try again.', true);
    };

    if (editingId){
      const existing = catalogue.find(a => a.id === editingId) || {};
      updateAnimeInDB(editingId, { rating: existing.rating || 0, poster: existing.poster, banner: existing.banner, ...data })
        .then(() => finish(`"${data.title}" updated.`))
        .catch(fail);
    } else {
      const fallbackImg = "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop";
      addAnimeToDB({ rating:0, poster:fallbackImg, banner:fallbackImg, ...data })
        .then(() => finish(`"${data.title}" added to catalogue.`))
        .catch(fail);
    }
  });
}

function openModal(id){
  editingId = id;
  const backdrop = document.getElementById('modalBackdrop');
  const form = document.getElementById('animeForm');
  form.reset();
  if (id){
    const a = catalogue.find(x => x.id === id);
    document.getElementById('modalTitle').textContent = `Edit "${a.title}"`;
    document.getElementById('f-title').value = a.title;
    document.getElementById('f-genre').value = (a.genre||[]).join(', ');
    document.getElementById('f-year').value = a.year;
    document.getElementById('f-episodes').value = a.episodes;
    document.getElementById('f-status').value = a.status;
    document.getElementById('f-synopsis').value = a.synopsis || '';
  } else {
    document.getElementById('modalTitle').textContent = 'Add new anime';
  }
  backdrop.classList.add('show');
}
function closeModal(){
  document.getElementById('modalBackdrop').classList.remove('show');
  editingId = null;
}

/* ---------------- USERS (mock — not wired to Firebase) ---------------- */
function renderUsers(){
  document.getElementById('usersTableBody').innerHTML = MOCK_USERS.map(u => `
    <tr>
      <td class="row-title"><div class="avatar" style="width:34px;height:34px;border-radius:50%;background:var(--grad-aurora);"></div><div><b>${u.name}</b></div></td>
      <td>${u.plan}</td>
      <td>${u.joined}</td>
      <td><span class="status-chip ${u.status==='Active'?'ongoing':'completed'}">${u.status}</span></td>
      <td><div class="row-actions"><button title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></td>
    </tr>`).join('');
}

/* ---------------- REPORTS (mock — not wired to Firebase) ---------------- */
function renderReports(){
  document.getElementById('reportsTableBody').innerHTML = MOCK_REPORTS.map((r,i) => `
    <tr>
      <td><b>${r.title}</b></td>
      <td>${r.issue}</td>
      <td>${r.user}</td>
      <td><span class="status-chip ${r.status==='Open'?'completed':'ongoing'}">${r.status}</span></td>
      <td><div class="row-actions"><button class="resolve" data-i="${i}" title="Mark resolved">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
      </button></div></td>
    </tr>`).join('');

  document.querySelectorAll('.resolve').forEach(btn => {
    btn.addEventListener('click', () => {
      MOCK_REPORTS[Number(btn.dataset.i)].status = 'Resolved';
      renderReports();
      showToast('Report marked resolved.');
    });
  });
}
