const API = "https://api.alquran.cloud/v1";
const $ = (s) => document.querySelector(s);
const surahListEl = $("#surahList"), ayahListEl = $("#ayahList"), bookmarkGrid = $("#bookmarkGrid");
const audioPlayer = $("#audioPlayer");
let surahs = [], currentSurah = 1, currentAyahs = [], fontSize = 31, toastTimer;
let surahQueue = [], queueIndex = -1, fullSurahMode = false;
const RECITER = "ar.alafasy";
let bookmarks = readBookmarks();

function readBookmarks(){try{return JSON.parse(localStorage.getItem("theQuranBookmarks")||"[]")}catch{return []}}
function persistBookmarks(){localStorage.setItem("theQuranBookmarks",JSON.stringify(bookmarks))}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2500)}
function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function api(path){const response=await fetch(`${API}/${path}`);if(!response.ok)throw new Error("Unable to load Quran data");const json=await response.json();if(json.code!==200)throw new Error(json.status||"API error");return json.data}
function transliterationName(s){return s.englishName||s.name||`Surah ${s.number}`}
function renderSurahList(filter=""){
 const term=filter.trim().toLowerCase();
 const matches=surahs.filter(s=>`${s.number} ${s.englishName} ${s.englishNameTranslation} ${s.name}`.toLowerCase().includes(term));
 if(!matches.length){surahListEl.innerHTML='<div class="no-results">No Surahs found.</div>';return}
 surahListEl.innerHTML=matches.map(s=>`<button class="surah-item ${s.number===currentSurah?"active":""}" data-surah="${s.number}">
 <span class="surah-number"><span>${s.number}</span></span><span class="surah-item-copy"><b>${esc(s.englishName)}</b><small>${esc(s.englishNameTranslation)} · ${s.numberOfAyahs} Ayahs</small></span><span class="surah-arabic" dir="rtl">${esc(s.name)}</span></button>`).join("");
}
function setReaderHeading(s){$("#currentSurahName").textContent=s.englishName;$("#currentSurahMeta").textContent=`${s.englishNameTranslation} · ${s.numberOfAyahs} Ayahs`;$("#readerProgress").textContent=`Surah ${s.number} of ${surahs.length}`;$("#prevSurah").disabled=s.number===1;$("#nextSurah").disabled=s.number===surahs.length;$("#bismillah").style.display=s.number===1||s.number===9?"none":"block"}
async function loadSurah(number,scroll=false){
 if(!surahs.length)return;
 audioPlayer.pause();audioPlayer.removeAttribute("src");fullSurahMode=false;surahQueue=[];queueIndex=-1;updateSurahPlayer();
 currentSurah=number;const s=surahs[number-1];setReaderHeading(s);renderSurahList($("#surahSearch").value);
 ayahListEl.innerHTML='<div class="loading">Opening your reading space…</div>';
 try{
   const translation=$("#translationSelect").value;
   const editions=translation==="urdu"?"quran-uthmani,ur.jalandhry":translation==="english"?"quran-uthmani,en.sahih":"quran-uthmani,ur.jalandhry,en.sahih";
   const data=await api(`surah/${number}/editions/${editions}`);
   const arabic=data[0].ayahs, urdu=data.find(x=>x.edition.language==="ur")?.ayahs, english=data.find(x=>x.edition.language==="en")?.ayahs;
   currentAyahs=arabic.map((a,i)=>({number:a.number,numberInSurah:a.numberInSurah,text:a.text,urdu:urdu?.[i]?.text||"",english:english?.[i]?.text||"",surah:number,audio:a.audio}));
   renderAyahs();if(scroll)$("#reader").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(err){ayahListEl.innerHTML=`<div class="empty-reader">Could not load Quran data. Please check your internet connection and try again.<br><br><button class="button button-outline" id="retryLoad">Try again</button></div>`;$("#retryLoad")?.addEventListener("click",()=>loadSurah(number));toast("Could not connect to Quran data.")}
}
function renderAyahs(){
 const translation=$("#translationSelect").value;
 ayahListEl.innerHTML=currentAyahs.map(a=>{
 const saved=bookmarks.some(b=>b.number===a.number&&b.surah===a.surah);
 return `<article class="ayah-card" id="ayah-${a.number}">
 <div class="ayah-topline"><div class="ayah-ref"><span class="ayah-badge">${a.numberInSurah}</span> SURAH ${a.surah} · AYAH ${a.numberInSurah}</div>
 <div class="ayah-actions"><button class="ayah-action ${saved?"saved":""}" data-bookmark="${a.number}" title="Bookmark Ayah" aria-label="Bookmark Ayah">${saved?"♥":"♡"}</button><button class="ayah-action" data-copy="${a.number}" title="Copy Ayah" aria-label="Copy Ayah">⧉</button></div></div>
 <p class="arabic-text" dir="rtl">${esc(a.text)}</p>
 ${translation!=="english"&&a.urdu?`<p class="translation urdu" dir="rtl"><span class="translation-label">اردو ترجمہ</span>${esc(a.urdu)}</p>`:""}
 ${translation!=="urdu"&&a.english?`<p class="translation"><span class="translation-label">ENGLISH TRANSLATION</span>${esc(a.english)}</p>`:""}
 </article>`}).join("");
 $(".arabic-text")?.style.setProperty("font-size",`${fontSize}px`);
}
function toggleBookmark(ayah){
 const existing=bookmarks.findIndex(b=>b.number===ayah.number&&b.surah===ayah.surah);
 if(existing>=0){bookmarks.splice(existing,1);toast("Bookmark removed")}
 else{bookmarks.unshift({number:ayah.number,surah:ayah.surah,numberInSurah:ayah.numberInSurah,text:ayah.text,urdu:ayah.urdu,english:ayah.english,surahName:surahs[ayah.surah-1]?.englishName||`Surah ${ayah.surah}`});toast("Ayah saved to bookmarks")}
 persistBookmarks();renderAyahs();renderBookmarks();
}
function renderBookmarks(){
 if(!bookmarks.length){bookmarkGrid.innerHTML='<div class="bookmark-empty"><span>♡</span><b>Your saved Ayahs will appear here</b><p>Tap the heart beside any verse to keep it close.</p></div>';return}
 bookmarkGrid.innerHTML=bookmarks.map((b,i)=>`<article class="bookmark-card"><button class="remove-bookmark" data-remove="${i}" aria-label="Remove bookmark">×</button><div class="bookmark-ref">${esc(b.surahName||`Surah ${b.surah}`)} · AYAH ${b.numberInSurah}</div><div class="bookmark-arabic" dir="rtl">${esc(b.text)}</div><div class="bookmark-translation">${esc(b.english||b.urdu||"Saved Ayah")}</div><button class="open-bookmark" data-open="${b.surah}" data-ayah="${b.numberInSurah}">Open in reader ↗</button></article>`).join("");
}
function findAyah(number){return currentAyahs.find(a=>a.number===Number(number))}
function updateSurahPlayer(){
 const playBtn=$("#playSurah");
 if(!playBtn)return;
 playBtn.textContent=fullSurahMode&&!audioPlayer.paused?"Ⅱ Pause":"▶ Play Full Surah";
 $("#surahPlayerTitle").textContent=fullSurahMode?"Full Surah recitation":"Play full Surah";
 $("#surahPlayerStatus").textContent=fullSurahMode&&queueIndex>=0
   ?`Playing Ayah ${surahQueue[queueIndex]?.numberInSurah||queueIndex+1} of ${surahQueue.length}`
   :"Tap once to play the whole Surah continuously";
}
async function playQueueIndex(index){
 if(index<0||index>=surahQueue.length){fullSurahMode=false;queueIndex=-1;updateSurahPlayer();toast("Surah recitation complete");return}
 queueIndex=index;
 const ayah=surahQueue[queueIndex];
 try{
   const reciter=RECITER;
   const audio=await api(`ayah/${ayah.number}/${reciter}`);
   audioPlayer.src=audio.audio;
   await audioPlayer.play();
   document.getElementById(`ayah-${ayah.number}`)?.scrollIntoView({behavior:"smooth",block:"nearest"});
   updateSurahPlayer();
 }catch{fullSurahMode=false;updateSurahPlayer();toast("Audio could not be played. Check your connection and try again.")}
}
async function startFullSurah(){
 if(!currentAyahs.length){toast("Wait for the Surah to load first");return}
 surahQueue=[...currentAyahs];queueIndex=0;fullSurahMode=true;
 await playQueueIndex(queueIndex);
}
async function init(){
 renderBookmarks();
 try{surahs=await api("surah");renderSurahList();await loadSurah(1)}
 catch{surahListEl.innerHTML='<div class="no-results">Internet connection is needed to load Surahs.</div>';ayahListEl.innerHTML='<div class="empty-reader">Connect to the internet and reload to access Quran text, translations and recitations.</div>';toast("Quran data needs an internet connection")}
}
surahListEl.addEventListener("click",e=>{const btn=e.target.closest("[data-surah]");if(btn)loadSurah(Number(btn.dataset.surah))});
$("#surahSearch").addEventListener("input",e=>renderSurahList(e.target.value));
$("#translationSelect").addEventListener("change",()=>loadSurah(currentSurah));
ayahListEl.addEventListener("click",async e=>{
 const book=e.target.closest("[data-bookmark]");if(book){const a=findAyah(book.dataset.bookmark);if(a)toggleBookmark(a);return}
 const copy=e.target.closest("[data-copy]");if(copy){const a=findAyah(copy.dataset.copy);if(a){const text=`${a.text}
${a.urdu}
${a.english}`;try{await navigator.clipboard.writeText(text);toast("Ayah copied")}catch{toast("Clipboard access unavailable")}}return}
});
bookmarkGrid.addEventListener("click",e=>{
 const remove=e.target.closest("[data-remove]");if(remove){bookmarks.splice(Number(remove.dataset.remove),1);persistBookmarks();renderBookmarks();renderAyahs();toast("Bookmark removed");return}
 const open=e.target.closest("[data-open]");if(open){loadSurah(Number(open.dataset.open),true).then(()=>setTimeout(()=>document.getElementById(`ayah-${Number(open.dataset.ayah)}`)?.scrollIntoView({behavior:"smooth",block:"center"}),500))}
});
$("#readerBookmark").addEventListener("click",()=>{const first=currentAyahs[0];if(first)toggleBookmark(first)});
$("#dailyBookmark").addEventListener("click",()=>{const existing=bookmarks.some(b=>b.surah===94&&b.numberInSurah===5);if(existing){bookmarks=bookmarks.filter(b=>!(b.surah===94&&b.numberInSurah===5));toast("Daily Ayah removed")}else{bookmarks.unshift({surah:94,number:0,numberInSurah:5,text:"فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",english:"For indeed, with hardship comes ease.",urdu:"بے شک مشکل کے ساتھ آسانی ہے۔",surahName:"Ash-Sharh"});toast("Daily Ayah saved")}persistBookmarks();renderBookmarks();$("#dailyBookmark").classList.toggle("saved",!existing);$("#dailyBookmark").textContent=existing?"♡":"♥"});
$("#fontPlus").addEventListener("click",()=>{fontSize=Math.min(48,fontSize+2);document.querySelectorAll(".arabic-text").forEach(el=>el.style.fontSize=`${fontSize}px`)});
$("#fontMinus").addEventListener("click",()=>{fontSize=Math.max(22,fontSize-2);document.querySelectorAll(".arabic-text").forEach(el=>el.style.fontSize=`${fontSize}px`)});
$("#prevSurah").addEventListener("click",()=>{if(currentSurah>1)loadSurah(currentSurah-1,true)});
$("#nextSurah").addEventListener("click",()=>{if(currentSurah<surahs.length)loadSurah(currentSurah+1,true)});
$("#startReading").addEventListener("click",()=>$("#reader").scrollIntoView({behavior:"smooth"}));
$("#continueTop").addEventListener("click",()=>$("#reader").scrollIntoView({behavior:"smooth"}));
$("#jumpBookmarks").addEventListener("click",()=>$("#bookmarks").scrollIntoView({behavior:"smooth"}));
$("#clearBookmarks").addEventListener("click",()=>{if(!bookmarks.length){toast("No bookmarks to clear");return}if(confirm("Remove all saved Ayahs?")){bookmarks=[];persistBookmarks();renderBookmarks();renderAyahs();toast("All bookmarks cleared")}});
$("#themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");const dark=document.body.classList.contains("dark");$("#themeToggle").textContent=dark?"☾":"☼";localStorage.setItem("theQuranTheme",dark?"dark":"light")});
if(localStorage.getItem("theQuranTheme")==="dark"){document.body.classList.add("dark");$("#themeToggle").textContent="☾"}
$("#mobileMenu").addEventListener("click",()=>$(".desktop-nav").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>$(".desktop-nav").classList.remove("open")));
document.addEventListener("keydown",e=>{if(e.key==="/"&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();$("#surahSearch").focus()}if(e.key==="Escape"){$(".desktop-nav").classList.remove("open");$("#surahSearch").blur()}});
$("#playSurah").addEventListener("click",async()=>{
 if(fullSurahMode&&!audioPlayer.paused){audioPlayer.pause();updateSurahPlayer();return}
 if(fullSurahMode&&audioPlayer.paused&&audioPlayer.src){try{await audioPlayer.play();updateSurahPlayer();return}catch{}}
 await startFullSurah();
});
audioPlayer.addEventListener("ended",()=>{
 if(fullSurahMode){playQueueIndex(queueIndex+1)}else{updateSurahPlayer()}
});
init();
