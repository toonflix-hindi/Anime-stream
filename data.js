/* ============================================================
   Data layer — now backed by Firebase Realtime Database.
   Node structure:  /anime/{firebaseKey} = { title, genre[], rating,
                     episodes, year, status, poster, banner, synopsis }
   `id` in every object returned here is the Firebase key (string).
   ============================================================ */

// One-time seed data, used only if the /anime node is empty —
// so a brand-new database isn't blank on first load.
const SEED_DATA = [
  { title:"Crimson Ronin", genre:["Action","Samurai"], rating:9.2, episodes:24, year:2024, status:"Ongoing",
    poster:"https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1600&auto=format&fit=crop",
    synopsis:"Exiled from his clan, Kaito wanders a fractured empire, hunting the five generals who betrayed his master — one blade, one storm at a time." },
  { title:"Starlit Academy", genre:["Romance","Slice of Life"], rating:8.6, episodes:12, year:2023, status:"Completed",
    poster:"https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1600&auto=format&fit=crop",
    synopsis:"Two rival stargazers are forced to share the academy's observatory — and slowly, the distance between their telescopes starts to close." },
  { title:"Void Mechanica", genre:["Mecha","Sci-Fi"], rating:9.0, episodes:26, year:2025, status:"Ongoing",
    poster:"https://images.unsplash.com/photo-1536566482680-fca31930a0bd?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1536566482680-fca31930a0bd?q=80&w=1600&auto=format&fit=crop",
    synopsis:"When the sky-cities fall silent, a scrapyard pilot discovers her father's forbidden mech was built to fight a war no one admits happened." },
  { title:"Paper Lantern Ghosts", genre:["Fantasy","Mystery"], rating:8.8, episodes:18, year:2022, status:"Completed",
    poster:"https://images.unsplash.com/photo-1544654803-b69140b285a1?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1544654803-b69140b285a1?q=80&w=1600&auto=format&fit=crop",
    synopsis:"A lantern-maker who can see spirits is hired to solve the one haunting even the dead are afraid to talk about." },
  { title:"Iron Tide", genre:["Action","Adventure"], rating:8.4, episodes:52, year:2021, status:"Completed",
    poster:"https://images.unsplash.com/photo-1601513445506-2ab0d4fb4229?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1601513445506-2ab0d4fb4229?q=80&w=1600&auto=format&fit=crop",
    synopsis:"A crew of orphaned sailors chase a map that supposedly leads to the last free port left on a drowned earth." },
  { title:"Neon Requiem", genre:["Cyberpunk","Thriller"], rating:9.4, episodes:12, year:2025, status:"Ongoing",
    poster:"https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=1600&auto=format&fit=crop",
    synopsis:"A memory-thief has seven nights to steal back her own erased past before the corporation that erased it finds her first." },
  { title:"Wildflower Blade", genre:["Fantasy","Action"], rating:8.9, episodes:24, year:2024, status:"Ongoing",
    poster:"https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1600&auto=format&fit=crop",
    synopsis:"Raised by the forest spirits, Yui must choose between the humans who fear her and the wild that raised her." },
  { title:"Second Moon Diner", genre:["Slice of Life","Comedy"], rating:8.2, episodes:13, year:2023, status:"Completed",
    poster:"https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?q=80&w=1600&auto=format&fit=crop",
    synopsis:"A diner that only appears under the second moon serves one dish a night — and every regret that comes with it." },
  { title:"Frostbound Oath", genre:["Fantasy","Drama"], rating:9.1, episodes:24, year:2022, status:"Completed",
    poster:"https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=1600&auto=format&fit=crop",
    synopsis:"Bound by an oath older than the kingdom itself, a frost-born knight must break her own curse before the thaw ends everything." },
  { title:"Signal Zero", genre:["Sci-Fi","Mystery"], rating:8.7, episodes:24, year:2025, status:"Ongoing",
    poster:"https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=600&auto=format&fit=crop",
    banner:"https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1600&auto=format&fit=crop",
    synopsis:"Every radio on Earth plays the same impossible broadcast at 3:14am. Only a deaf engineer can hear what's underneath it." },
];

// Sample, freely-licensed demo clips used as placeholder video sources.
const DEMO_SOURCES = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
];

let animeCache = [];

/** Writes SEED_DATA to /anime, but only if the node is currently empty. */
function seedIfEmpty(){
  return animeRef.once('value').then(snap => {
    if (snap.exists()) return;
    const payload = {};
    SEED_DATA.forEach(a => { payload[animeRef.push().key] = a; });
    return animeRef.set(payload);
  }).catch(err => console.error('Firebase seed failed:', err));
}

/** Subscribes to live updates on /anime. Calls `callback(list)` on every change. */
function listenAnime(callback){
  animeRef.on('value', snap => {
    const val = snap.val() || {};
    animeCache = Object.entries(val).map(([id, a]) => ({ id, ...a }));
    callback(animeCache);
  }, err => {
    console.error('Firebase read failed:', err);
    showToast('Could not reach the database. Check your connection.', true);
  });
}

/** One-time read (used by the watch page, so a later DB edit elsewhere doesn't reset the player). */
function fetchAnimeOnce(){
  return animeRef.once('value').then(snap => {
    const val = snap.val() || {};
    animeCache = Object.entries(val).map(([id, a]) => ({ id, ...a }));
    return animeCache;
  });
}

function getAnimeById(id){ return animeCache.find(a => a.id === id); }
function getTrending(n=6){ return [...animeCache].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,n); }

function addAnimeToDB(data){ return animeRef.push(data); }
function updateAnimeInDB(id, data){ return animeRef.child(id).update(data); }
function deleteAnimeFromDB(id){ return animeRef.child(id).remove(); }

function showToast(msg, isError=false){
  let el = document.querySelector('.toast');
  if(!el){
    el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="dot"></span><span class="toast-msg"></span>`;
    document.body.appendChild(el);
  }
  el.classList.toggle('err', isError);
  el.querySelector('.toast-msg').textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove('show'), 3200);
}
