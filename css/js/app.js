/* History by Month & Year - vanilla JS */
const monthSelect = document.getElementById('monthSelect');
const yearInput   = document.getElementById('yearInput');
const btnSearch   = document.getElementById('btnSearch');
const btnClear    = document.getElementById('btnClear');
const btnRandom   = document.getElementById('btnRandom');

const tabList     = document.getElementById('tabList');
const tabTimeline = document.getElementById('tabTimeline');
const tabQuiz     = document.getElementById('tabQuiz');

const resultsEl   = document.getElementById('results');
const timelineEl  = document.getElementById('timeline');
const resultsTitle= document.getElementById('resultsTitle');

const btnCopy     = document.getElementById('btnCopy');
const btnDownload = document.getElementById('btnDownload');
const downloadMenu= document.getElementById('downloadMenu');

const quizWrap    = document.getElementById('quiz');
const quizMeta    = document.getElementById('quizMeta');
const quizArea    = document.getElementById('quizArea');
const quizFooter  = document.getElementById('quizFooter');
const quizScore   = document.getElementById('quizScore');
const quizCount   = document.getElementById('quizCount');
const startQuiz   = document.getElementById('startQuiz');
const submitQuiz  = document.getElementById('submitQuiz');
const resetQuiz   = document.getElementById('resetQuiz');

const yearNow = document.getElementById('yearNow');
yearNow.textContent = new Date().getFullYear();

const MONTHS = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];

// populate month dropdown
(function initMonths(){
  MONTHS.forEach((m,i)=>{
    const op=document.createElement('option');
    op.value = String(i+1);
    op.textContent = m;
    monthSelect.appendChild(op);
  });
})();

// app state
let ALL_EVENTS = [];
let CURRENT = []; // filtered events
let currentView = 'list'; // list | timeline | quiz

// load data
fetch('data/events.json')
  .then(r=>r.json())
  .then(json=>{
    // normalize numbers
    ALL_EVENTS = json.map((e,i)=>({
      id: e.id ?? i+1,
      title: e.title,
      description: e.description,
      year: Number(e.year),
      month: e.month ? Number(e.month) : null,
      day: e.day ? Number(e.day) : null,
      category: e.category || null,
      region: e.region || null,
      source: e.source || null
    }));
    showHint();
    // default: today's month (Any year)
    monthSelect.value = String(new Date().getMonth()+1);
    runSearch();
  })
  .catch(err=>{
    console.error('Failed to load events.json', err);
    alert('Failed to load events data. Check console and file path.');
  });

// search handling
btnSearch.addEventListener('click', runSearch);
btnClear.addEventListener('click', ()=>{
  monthSelect.value = '';
  yearInput.value = '';
  runSearch();
});
btnRandom.addEventListener('click', ()=>{
  const m = Math.floor(Math.random()*12)+1;
  const yrs = ALL_EVENTS.map(e=>e.year);
  const yr = yrs[Math.floor(Math.random()*yrs.length)];
  monthSelect.value = m;
  yearInput.value = yr;
  runSearch();
});

// view toggles
function setView(view){
  currentView = view;
  for(const tab of [tabList, tabTimeline, tabQuiz]) tab.classList.remove('active');
  tabList.classList.toggle('active', view==='list');
  tabTimeline.classList.toggle('active', view==='timeline');
  tabQuiz.classList.toggle('active', view==='quiz');

  resultsEl.hidden = view!=='list';
  timelineEl.hidden = view!=='timeline';
  quizWrap.hidden = view!=='quiz';
}
tabList.addEventListener('click', ()=>{ setView('list'); render(); });
tabTimeline.addEventListener('click', ()=>{ setView('timeline'); render(); });
tabQuiz.addEventListener('click', ()=>{ setView('quiz'); renderQuizSetup(); });

// copy & download
btnCopy.addEventListener('click', async ()=>{
  const txt = toPlaintext(CURRENT);
  try{
    await navigator.clipboard.writeText(txt);
    flash(btnCopy, 'Copied!');
  }catch{
    flash(btnCopy, 'Press Ctrl+C');
  }
});

btnDownload.addEventListener('click', ()=>{
  downloadMenu.hidden = !downloadMenu.hidden;
});
downloadMenu.addEventListener('click', (e)=>{
  if(!(e.target instanceof HTMLButtonElement)) return;
  const fmt = e.target.dataset.format;
  const filenameBase = makeFilename();
  if(fmt==='txt'){
    downloadBlob(toPlaintext(CURRENT), filenameBase+'.txt', 'text/plain;charset=utf-8');
  }else if(fmt==='csv'){
    downloadBlob(toCSV(CURRENT), filenameBase+'.csv', 'text/csv;charset=utf-8');
  }else if(fmt==='json'){
    downloadBlob(JSON.stringify(CURRENT, null, 2), filenameBase+'.json', 'application/json');
  }
  downloadMenu.hidden = true;
});

// main search
function runSearch(){
  const m = monthSelect.value ? Number(monthSelect.value) : null;
  const y = yearInput.value ? Number(yearInput.value) : null;

  CURRENT = ALL_EVENTS.filter(e=>{
    const matchMonth = m ? e.month===m : true;
    const matchYear  = y ? e.year===y : true;
    return matchMonth && matchYear;
  }).sort(compareEvents);

  render();
}

// render views
function render(){
  const mLabel = monthSelect.value ? MONTHS[Number(monthSelect.value)-1] : 'Any month';
  const yLabel = yearInput.value ? yearInput.value : 'any year';
  resultsTitle.textContent = `Results for: ${mLabel}, ${yLabel} — ${CURRENT.length} event${CURRENT.length===1?'':'s'}`;

  if(currentView==='list') renderList();
  if(currentView==='timeline') renderTimeline();
  if(currentView==='quiz') renderQuizSetup();
}

function renderList(){
  resultsEl.innerHTML = '';
  if(CURRENT.length===0){
    resultsEl.innerHTML = '<p style="color:#9fb0c3">No events found for this selection.</p>';
    return;
  }
  for(const e of CURRENT){
    const li = document.createElement('li');
    const date = joinDate(e);
    li.innerHTML = `
      <div class="event-head">
        <span class="event-date">${date}</span>
        <span class="event-title">— ${escapeHtml(e.title)}</span>
      </div>
      <div class="event-desc">${escapeHtml(e.description)}</div>
    `;
    resultsEl.appendChild(li);
  }
}

function renderTimeline(){
  timelineEl.innerHTML='';
  if(CURRENT.length===0){
    timelineEl.innerHTML = '<p style="color:#9fb0c3">No events found for this selection.</p>';
    return;
  }
  for(const e of CURRENT){
    const div = document.createElement('div');
    div.className='tl-item';
    div.innerHTML = `
      <div class="tl-date">${joinDate(e)}</div>
      <div class="tl-title">${escapeHtml(e.title)}</div>
      <div class="event-desc">${escapeHtml(e.description)}</div>
    `;
    timelineEl.appendChild(div);
  }
}

// quiz
function renderQuizSetup(){
  setView('quiz');
  quizArea.innerHTML='';
  quizFooter.hidden = true;
  quizScore.textContent = '';
  quizMeta.textContent = `${CURRENT.length} event${CURRENT.length===1?'':'s'} available`;
  // populate counts
  quizCount.innerHTML='';
  const maxQ = Math.min(15, Math.max(1, CURRENT.length));
  for(let i=1;i<=maxQ;i++){
    const op=document.createElement('option');
    op.value=String(i); op.textContent=String(i);
    if(i===Math.min(5,maxQ)) op.selected=true;
    quizCount.appendChild(op);
  }
}

startQuiz.addEventListener('click', ()=>{
  const n = Number(quizCount.value || 5);
  const qs = generateQuestions(CURRENT, n);
  showQuiz(qs);
});

submitQuiz.addEventListener('click', ()=>{
  const checked = [...document.querySelectorAll('input[type="radio"]:checked')];
  const total = Number(quizArea.dataset.qCount || 0);
  let score = 0;
  checked.forEach(inp=>{
    const isCorrect = inp.value === '1';
    const holder = inp.closest('.quiz-options');
    if(holder){
      [...holder.querySelectorAll('label')].forEach(l=>l.style.outline='none');
      inp.parentElement.style.outline = isCorrect ? '2px solid #51d1b6' : '2px solid #c85a67';
    }
    if(isCorrect) score++;
  });
  quizScore.textContent = `Score: ${score}/${total}`;
});

resetQuiz.addEventListener('click', renderQuizSetup);

// helpers for quiz
function showQuiz(questions){
  quizArea.innerHTML='';
  quizArea.dataset.qCount = String(questions.length);
  questions.forEach((q,idx)=>{
    const wrap = document.createElement('div');
    wrap.className='quiz-card';
    wrap.innerHTML = `
      <div class="quiz-q">${idx+1}. ${escapeHtml(q.text)}</div>
      <div class="quiz-options">
        ${q.options.map((op,i)=>`
          <label>
            <input type="radio" name="q${idx}" value="${op.correct ? 1 : 0}" />
            <span>${escapeHtml(op.label)}</span>
          </label>
        `).join('')}
      </div>
    `;
    quizArea.appendChild(wrap);
  });
  quizFooter.hidden = false;
}

function generateQuestions(events, n){
  const pool = shuffle([...events]).slice(0, n);
  const allYears = Array.from(new Set(events.map(e=>e.year)));
  const allTitles = Array.from(new Set(events.map(e=>e.title)));
  return pool.map(e=>{
    // alternate question types
    if(Math.random()<0.5){
      // Type A: "In which year did <event title> happen?"
      const correct = e.year;
      const options = uniqueSample(allYears.filter(y=>y!==correct), 3).concat([correct]);
      return {
        text: `In which year did this happen: “${e.title}”?`,
        options: shuffle(options).map(y=>({label: String(y), correct: y===correct}))
      };
    }else{
      // Type B: "Which event happened in <Month YYYY>?"
      const dateLabel = `${e.month ? MONTHS[e.month-1]+' ' : ''}${e.year}`;
      const correct = e.title;
      const options = uniqueSample(allTitles.filter(t=>t!==correct), 3).concat([correct]);
      return {
        text: `Which of the following occurred in ${dateLabel}?`,
        options: shuffle(options).map(t=>({label: t, correct: t===correct}))
      };
    }
  });
}

// utilities
function compareEvents(a,b){
  // sort by (day if present), then year ascending
  const dayA = a.day ?? 0;
  const dayB = b.day ?? 0;
  if(a.year!==b.year) return a.year - b.year;
  if((a.month??0)!==(b.month??0)) return (a.month??0) - (b.month??0);
  return dayA - dayB;
}
function joinDate(e){
  const parts = [];
  if(e.day) parts.push(String(e.day).padStart(2,'0'));
  if(e.month) parts.push(MONTHS[e.month-1]);
  parts.push(String(e.year));
  return parts.join(' ');
}
function toPlaintext(items){
  return items.map(e=>`${joinDate(e)} — ${e.title}\n${e.description}`).join('\n\n');
}
function toCSV(items){
  const esc = s => `"${String(s).replaceAll('"','""')}"`;
  const header = ['day','month','year','title','description','category','region','source'];
  const rows = items.map(e=>[e.day??'', e.month??'', e.year, e.title, e.description, e.category??'', e.region??'', e.source??''].map(esc).join(','));
  return [header.join(','), ...rows].join('\n');
}
function downloadBlob(text, filename, mime){
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function makeFilename(){
  const m = monthSelect.value ? MONTHS[Number(monthSelect.value)-1] : 'AnyMonth';
  const y = yearInput.value ? yearInput.value : 'AnyYear';
  return `history_${m}_${y}`.replace(/\s+/g,'_');
}
function flash(el, msg){
  const old = el.textContent;
  el.textContent = msg;
  setTimeout(()=>el.textContent=old, 1000);
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function uniqueSample(arr, n){
  const a=[...arr]; shuffle(a); return a.slice(0, Math.min(n, a.length));
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
function showHint(){
  resultsEl.innerHTML = '<li>Tip: pick a month and (optionally) a year, then switch to <em>Timeline</em> or <em>Quiz</em> tabs.</li>';
}
