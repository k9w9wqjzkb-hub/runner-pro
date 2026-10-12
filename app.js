/* Runner Pro - prima versione PWA. Tutti i dati vengono salvati localmente nel browser. */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORE_KEY = "runner-pro-db-v1";
const DAYS = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const DAY_NAMES = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
const GOALS = {"5k":5000,"10k":10000,"half":21097,"marathon":42195};
const GOAL_LABELS = {"5k":"5 km","10k":"10 km","half":"Mezza maratona","marathon":"Maratona"};
const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const dateAdd = (date, days) => { const d=new Date(date+"T12:00:00"); d.setDate(d.getDate()+days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"short"}) : "Da impostare";
const n = v => Number(v)||0;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
const escapeHTML = s => String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const defaultDB = () => ({
  profile:{name:"Runner",age:57,height:175,weight:78,targetWeight:72,experience:"intermedio",weeklyKm:25,goal:"half",raceDate:dateAdd(todayISO(),120),days:[0,2,4,6],sessions:4,theme:"dark",units:"metric"},
  plan:[], foods:[], foodLog:[], gels:[
    {id:uid(),brand:"Esempio",name:"Gel carboidrati 40 g",flavor:"Neutro",carbs:40,kcal:160,caffeine:0,size:"1 gel"}
  ], weights:[{id:uid(),date:todayISO(),weight:78}], settings:{calorieGoal:2200,proteinGoal:130,carbGoal:250,fatGoal:70,carbPerHour:60,notifications:false}, planCreated:false
});
let db = loadDB();
let currentPage = "home";
function loadDB(){ try { const raw=localStorage.getItem(STORE_KEY); if(!raw) return defaultDB(); const parsed=JSON.parse(raw); return {...defaultDB(),...parsed,profile:{...defaultDB().profile,...parsed.profile},settings:{...defaultDB().settings,...parsed.settings}}; } catch(e){ return defaultDB(); } }
function save(){ localStorage.setItem(STORE_KEY,JSON.stringify(db)); }
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2300);}
function sum(arr,key){return arr.reduce((a,x)=>a+n(x[key]),0);}
function todayLog(){return db.foodLog.filter(x=>x.date===todayISO());}
function dayIndex(date){let d=new Date(date+"T12:00:00").getDay();return (d+6)%7;}
function selectedGoal(){return GOAL_LABELS[db.profile.goal]||"Mezza maratona";}
function plannedForDate(date){return db.plan.find(x=>x.date===date);}
function createPlan(){
  const p=db.profile, race=p.raceDate||dateAdd(todayISO(),84), goal=GOALS[p.goal]||21097;
  const start=new Date(todayISO()+"T12:00:00"), end=new Date(race+"T12:00:00");
  let weeks=Math.max(4,Math.ceil((end-start)/(7*86400000)));
  weeks=Math.min(weeks,40);
  const startDate=dateAdd(race,-(weeks-1)*7-dayIndex(race));
  const plan=[];
  const days=(p.days||[0,2,4,6]).slice().sort((a,b)=>a-b);
  if(!days.length){toast("Seleziona almeno un giorno di allenamento.");return;}
  for(let w=0;w<weeks;w++){
    const progress=(w+1)/weeks;
    const taper=w>=weeks-2;
    const longBase=goal===5000?7:goal===10000?10:goal===21097?14:18;
    let longKm=Math.max(5,longBase*(.65+Math.min(progress,.85)*.6));
    if(taper) longKm*=w===weeks-1?.55:.75;
    const weekStart=dateAdd(startDate,w*7);
    days.forEach((day,j)=>{
      const date=dateAdd(weekStart,day);
      if(date<todayISO() || date>race) return;
      let type,km;
      if(j===days.length-1){type="Fondo lungo";km=longKm;}
      else if(days.length>=3 && j===1 && !taper){type="Qualità controllata";km=Math.max(4,Math.min(longKm*.65,(p.weeklyKm||20)/days.length*1.2));}
      else {type=j===0?"Corsa facile":"Corsa facile / ritmo";km=Math.max(3,Math.min(longKm*.58,(p.weeklyKm||20)/days.length*(taper?.7:1.05)));}
      if(goal===5000 && type==="Fondo lungo") type="Fondo aerobico";
      plan.push({id:uid(),date,type,km:Math.round(km*10)/10,minutes:Math.round(km*(type.includes("Qualità")?5.7:6.2)),pace:type.includes("Qualità")?"Progressivo, controllato":"Facile e conversazionale",notes:type.includes("Qualità")?"Riscaldamento 10 minuti, tratti a ritmo sostenuto ma controllato, recupero e defaticamento.":"Corri a intensità comoda; termina con sensazione di poter continuare.",done:false,actualKm:null,actualMinutes:null});
    });
  }
  db.plan=plan; db.planCreated=true; save(); render(); toast("Piano creato. Puoi modificare ogni seduta.");
}
function headerDate(){ $("#todayLabel").textContent=new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"}).toUpperCase(); }
function setPage(page){
  currentPage=page;
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.nav===page));
  const titles={home:"Ciao, "+(db.profile.name||"runner"),plan:"Il tuo piano",gels:"Fueling & gel",food:"Nutrizione",settings:"Impostazioni"};
  $("#pageHeading").textContent=titles[page]||"Runner Pro";
  render();
}
function render(){
  headerDate();
  const views={home:renderHome,plan:renderPlan,gels:renderGels,food:renderFood,settings:renderSettings};
  $("#view").innerHTML=(views[currentPage]||renderHome)();
  bindView();
}
function section(title,sub="",right=""){return `<div class="section-head"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:""}</div>${right}</div>`;}
function metric(icon,value,label,extra=""){return `<div class="card metric"><div class="metric-top"><span class="metric-icon">${icon}</span>${extra}</div><div class="metric-value">${value}</div><div class="metric-label">${label}</div></div>`;}
function renderHome(){
  const today=todayISO(), workout=plannedForDate(today), logs=todayLog();
  const kcal=sum(logs,"kcal"), protein=sum(logs,"protein"), carbs=sum(logs,"carbs"), fat=sum(logs,"fat");
  const kmDone=db.plan.filter(x=>x.done).reduce((a,x)=>a+n(x.actualKm??x.km),0);
  const weekStart=dateAdd(today,-dayIndex(today)), weekEnd=dateAdd(weekStart,6);
  const week=db.plan.filter(x=>x.date>=weekStart&&x.date<=weekEnd), weekKm=week.reduce((a,x)=>a+n(x.km),0), weekDone=week.filter(x=>x.done).length;
  const lastWeight=[...db.weights].sort((a,b)=>b.date.localeCompare(a.date))[0]?.weight ?? db.profile.weight;
  return `
    <div class="card hero">
      <div class="eyebrow">IL TUO PROSSIMO TRAGUARDO</div>
      <div class="hero-row"><div><h2>${escapeHTML(selectedGoal())}<br>un passo alla volta.</h2><p>Gara obiettivo · ${fmtDate(db.profile.raceDate)}</p><div class="hero-number">${Math.max(0,Math.ceil((new Date((db.profile.raceDate||today)+"T12:00:00")-new Date(today+"T12:00:00"))/86400000))}<span class="hero-unit"> giorni</span></div></div><div class="hero-icon">🏃🏻</div></div>
      <div class="actions"><button class="btn" data-action="goto-plan">Apri il piano ↗</button><button class="btn secondary" data-action="quick-food">＋ Alimento</button></div>
    </div>
    ${section("La tua settimana","Piccoli progressi, costanza nel tempo")}
    <div class="grid">
      ${metric("↗",`${weekKm.toFixed(1)} <span style="font-size:12px">km</span>`,"Km pianificati",`<span class="pill">${weekDone}/${week.length} sedute</span>`)}
      ${metric("⚖",`${n(lastWeight).toFixed(1)} <span style="font-size:12px">kg</span>`,"Ultimo peso",`<span class="pill blue">Obiettivo ${n(db.profile.targetWeight).toFixed(1)}</span>`)}
    </div>
    ${section("Allenamento di oggi",fmtDate(today))}
    ${workout?`<div class="card"><div class="row"><div class="row-start"><div class="item-icon">🏃</div><div><div class="item-title">${escapeHTML(workout.type)}</div><div class="item-sub">${workout.km} km · circa ${workout.minutes} min</div></div></div><span class="pill ${workout.done?"":"orange"}">${workout.done?"Completato":"In programma"}</span></div><p>${escapeHTML(workout.notes)}</p><div class="actions"><button class="btn ${workout.done?"secondary":""}" data-action="toggle-done" data-id="${workout.id}">${workout.done?"Segna da fare":"✓ Completa allenamento"}</button><button class="btn secondary" data-action="edit-workout" data-id="${workout.id}">Dettagli</button></div></div>`:`<div class="card empty"><strong>Nessun allenamento pianificato oggi</strong>Il riposo fa parte del percorso. Puoi controllare o creare il tuo piano.<div class="actions" style="justify-content:center"><button class="btn secondary" data-nav="plan">Vai al piano</button></div></div>`}
    ${section("Nutrizione di oggi","Inserisci ciò che mangi per aggiornare i totali")}
    <div class="card">
      <div class="row"><div><div class="item-title">Energia assunta</div><div class="item-sub">Obiettivo ${n(db.settings.calorieGoal)} kcal</div></div><div style="text-align:right"><strong style="font-size:23px">${Math.round(kcal)}</strong><div class="item-sub">kcal</div></div></div>
      <div class="progress"><span style="width:${Math.min(100,kcal/Math.max(1,n(db.settings.calorieGoal))*100)}%"></span></div>
      <div class="macro-row"><div class="macro"><strong>${Math.round(protein)} g</strong><span>Proteine</span></div><div class="macro"><strong>${Math.round(carbs)} g</strong><span>Carboidrati</span></div><div class="macro"><strong>${Math.round(fat)} g</strong><span>Grassi</span></div></div>
      <div class="actions"><button class="btn full" data-action="quick-food">＋ Aggiungi alimento</button></div>
    </div>
    ${section("Accessi rapidi")}
    <div class="grid">
      <button class="card" data-nav="gels" style="text-align:left;color:var(--text);border:1px solid #ffffff12"><div class="metric-top"><span class="metric-icon">⚡</span><span>↗</span></div><h3>Gel energetici</h3><div class="item-sub">Prodotti e strategia gara</div></button>
      <button class="card" data-nav="settings" style="text-align:left;color:var(--text);border:1px solid #ffffff12"><div class="metric-top"><span class="metric-icon">⚙</span><span>↗</span></div><h3>Il tuo profilo</h3><div class="item-sub">Obiettivi e preferenze</div></button>
    </div>`;
}
function renderPlan(){
  const p=db.profile;
  const sorted=[...db.plan].sort((a,b)=>a.date.localeCompare(b.date));
  const upcoming=sorted.filter(x=>x.date>=todayISO());
  const weekStart=dateAdd(todayISO(),-dayIndex(todayISO()));
  const week=sorted.filter(x=>x.date>=weekStart&&x.date<=dateAdd(weekStart,6));
  return `
    ${section("Obiettivo sportivo","Piano adattato ai giorni che scegli")}
    <div class="card">
      <div class="form-grid">
        <div class="field full"><label>Obiettivo</label><select id="goalSelect">${Object.entries(GOAL_LABELS).map(([k,v])=>`<option value="${k}" ${p.goal===k?"selected":""}>${v}</option>`).join("")}</select></div>
        <div class="field"><label>Data della gara</label><input id="raceDate" type="date" value="${p.raceDate||""}" min="${todayISO()}"></div>
        <div class="field"><label>Km settimanali attuali</label><input id="weeklyKm" type="number" min="0" max="250" step="1" value="${p.weeklyKm}"></div>
        <div class="field full"><label>Giorni disponibili</label><div class="chips" id="dayPicker">${DAY_NAMES.map((d,i)=>`<button class="chip ${p.days.includes(i)?"selected":""}" type="button" data-day="${i}">${DAYS[i]}</button>`).join("")}</div></div>
      </div>
      <div class="notice" style="margin-top:14px">Il piano generato è una base orientativa. Valuta recupero, salute, livello attuale e consigli di un professionista; non aumentare il carico se compaiono dolore o affaticamento persistente.</div>
      <div class="actions"><button class="btn full" data-action="generate-plan">⚡ ${db.planCreated?"Rigenera piano":"Crea il mio piano"}</button></div>
    </div>
    ${section("Questa settimana",`${week.filter(x=>x.done).length} di ${week.length} sedute completate`)}
    <div class="card"><div class="week-strip">${DAYS.map((d,i)=>{const date=dateAdd(weekStart,i),w=plannedForDate(date);return `<div class="day-chip ${w?"has-workout":""} ${w?.done?"done":""}"><span>${d}</span><strong>${new Date(date+"T12:00:00").getDate()}</strong>${w?(w.done?"✓":`${w.km}k`):"·"}</div>`}).join("")}</div></div>
    ${section("Prossime sedute",`${upcoming.length} allenamenti in programma`)}
    <div class="list">${upcoming.slice(0,18).map(w=>workoutCard(w)).join("")||`<div class="card empty"><strong>Il piano è vuoto</strong>Imposta obiettivo, gara e giorni disponibili, poi crea il piano.</div>`}</div>
    ${db.plan.length?`<div class="actions"><button class="btn secondary full" data-action="export-plan">Esporta piano in CSV</button></div>`:""}`;
}
function workoutCard(w){
 return `<div class="card"><div class="row"><div class="row-start"><div class="item-icon">${w.type.includes("lungo")||w.type.includes("aerobico")?"🛣️":w.type.includes("Qualità")?"⏱️":"🏃"}</div><div><div class="day-label">${DAY_NAMES[dayIndex(w.date)]} · ${fmtDate(w.date)}</div><div class="item-title" style="margin-top:4px">${escapeHTML(w.type)}</div><div class="item-sub">${w.km} km · ${w.minutes} min · ${escapeHTML(w.pace)}</div></div></div><span class="pill ${w.done?"":"orange"}">${w.done?"Fatto":"In programma"}</span></div><div class="actions"><button class="btn small ${w.done?"secondary":""}" data-action="toggle-done" data-id="${w.id}">${w.done?"↶ Da fare":"✓ Completa"}</button><button class="btn small secondary" data-action="edit-workout" data-id="${w.id}">Modifica</button></div></div>`;
}
function renderGels(){
 return `${section("Il tuo fueling","Organizza i carboidrati per le uscite lunghe")}
 <div class="card"><div class="form-grid"><div class="field"><label>Durata prevista (minuti)</label><input id="gelDuration" type="number" min="0" value="120"></div><div class="field"><label>Obiettivo carboidrati (g/ora)</label><input id="gelTarget" type="number" min="0" value="${n(db.settings.carbPerHour)}"></div><div class="field full"><label>Gel da utilizzare</label><select id="gelSelect">${db.gels.map(g=>`<option value="${g.id}">${escapeHTML(g.brand)} — ${escapeHTML(g.name)} (${g.carbs} g)</option>`).join("")}</select></div><div class="field"><label>Quantità gel</label><input id="gelCount" type="number" min="0" value="3"></div></div><div class="actions"><button class="btn full" data-action="calculate-gels">Calcola strategia</button></div><div id="gelResult" style="margin-top:12px"></div></div>
 ${section("I tuoi prodotti","Aggiungi le etichette dei gel che usi")}
 <div class="list">${db.gels.map(g=>`<div class="card"><div class="row"><div class="row-start"><div class="item-icon">⚡</div><div><div class="item-title">${escapeHTML(g.brand)} · ${escapeHTML(g.name)}</div><div class="item-sub">${escapeHTML(g.flavor||"")}${g.caffeine?` · ${g.caffeine} mg caffeina`:""} · ${g.kcal} kcal</div></div></div><span class="pill">${g.carbs} g CHO</span></div><div class="actions"><button class="btn small secondary" data-action="edit-gel" data-id="${g.id}">Modifica</button><button class="btn small ghost" data-action="delete-gel" data-id="${g.id}">Elimina</button></div></div>`).join("")||`<div class="card empty">Nessun gel inserito.</div>`}</div>
 <div class="actions"><button class="btn full" data-action="add-gel">＋ Aggiungi un gel</button></div>
 <div class="notice" style="margin-top:16px">Le quantità di carboidrati sono indicative: la tolleranza gastrointestinale varia. Prova la strategia in allenamento, leggi le etichette e personalizza l’idratazione. Per indicazioni individuali rivolgiti a un professionista.</div>`;
}
function renderFood(){
 const logs=todayLog(), kcal=sum(logs,"kcal"), protein=sum(logs,"protein"), carbs=sum(logs,"carbs"), fat=sum(logs,"fat");
 const date=$("#foodDate")?.value||todayISO();
 const shown=db.foodLog.filter(x=>x.date===date);
 return `${section("Diario alimentare","Inserisci gli alimenti manualmente")}
 <div class="card"><div class="row"><div><div class="item-title">Riepilogo ${fmtDate(date)}</div><div class="item-sub">Valori aggiornati in base alle quantità inserite</div></div><input id="foodDate" type="date" value="${date}" style="width:auto;max-width:150px"></div>
 <div class="progress"><span style="width:${Math.min(100,kcal/Math.max(1,n(db.settings.calorieGoal))*100)}%"></span></div>
 <div class="row" style="margin-top:12px"><span class="item-sub">Energia</span><strong>${Math.round(sum(shown,"kcal"))} / ${n(db.settings.calorieGoal)} kcal</strong></div>
 <div class="macro-row"><div class="macro"><strong>${sum(shown,"protein").toFixed(1)} g</strong><span>Proteine</span></div><div class="macro"><strong>${sum(shown,"carbs").toFixed(1)} g</strong><span>Carboidrati</span></div><div class="macro"><strong>${sum(shown,"fat").toFixed(1)} g</strong><span>Grassi</span></div></div>
 <div class="actions"><button class="btn full" data-action="add-food">＋ Aggiungi alimento</button><button class="btn secondary full" data-action="add-weight">⚖ Registra peso</button></div></div>
 ${section("Alimenti della giornata",`${shown.length} voci registrate`)}
 <div class="list">${shown.map(f=>`<div class="card"><div class="row"><div class="row-start"><div class="item-icon">${f.meal==="Colazione"?"☕":f.meal==="Pranzo"?"🥗":f.meal==="Cena"?"🍽️":"🍎"}</div><div><div class="item-title">${escapeHTML(f.name)}</div><div class="item-sub">${escapeHTML(f.meal)} · ${f.qty}${escapeHTML(f.unit)} · ${Math.round(f.kcal)} kcal</div></div></div><button class="btn small secondary" data-action="edit-food" data-id="${f.id}">Modifica</button></div><div class="item-sub" style="margin-top:9px">P ${f.protein.toFixed(1)} g · C ${f.carbs.toFixed(1)} g · G ${f.fat.toFixed(1)} g</div><div class="actions"><button class="btn small ghost" data-action="delete-food" data-id="${f.id}">Elimina</button></div></div>`).join("")||`<div class="card empty"><strong>Nessun alimento registrato</strong>Aggiungi ciò che hai mangiato e inserisci i valori nutrizionali riportati in etichetta o in una fonte affidabile.</div>`}</div>
 ${section("Storico del peso","Il peso può variare naturalmente da un giorno all’altro")}
 <div class="card">${renderWeightHistory()}</div>`;
}
function renderWeightHistory(){
 const weights=[...db.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
 if(!weights.length)return `<div class="empty">Ancora nessuna pesata.</div>`;
 const vals=weights.map(x=>n(x.weight)), min=Math.min(...vals), max=Math.max(...vals);
 return weights.map(w=>`<div class="statline"><span>${fmtDate(w.date)}</span><strong>${n(w.weight).toFixed(1)} kg</strong></div>`).join("")+`<div class="small-note">Obiettivo: ${n(db.profile.targetWeight).toFixed(1)} kg · ${Math.abs(n(weights[0].weight)-n(db.profile.targetWeight)).toFixed(1)} kg di differenza</div>`;
}
function renderSettings(){
 const p=db.profile,s=db.settings;
 return `${section("Profilo personale","Questi dati aiutano a contestualizzare gli obiettivi")}
 <form id="profileForm" class="card"><div class="form-grid">
 <div class="field"><label>Nome</label><input name="name" value="${escapeHTML(p.name)}" maxlength="40"></div>
 <div class="field"><label>Età</label><input name="age" type="number" min="13" max="100" value="${p.age}"></div>
 <div class="field"><label>Altezza (cm)</label><input name="height" type="number" min="100" max="230" value="${p.height}"></div>
 <div class="field"><label>Peso attuale (kg)</label><input name="weight" type="number" min="30" max="300" step=".1" value="${p.weight}"></div>
 <div class="field"><label>Peso obiettivo (kg)</label><input name="targetWeight" type="number" min="30" max="300" step=".1" value="${p.targetWeight}"></div>
 <div class="field"><label>Esperienza</label><select name="experience"><option ${p.experience==="principiante"?"selected":""}>principiante</option><option ${p.experience==="intermedio"?"selected":""}>intermedio</option><option ${p.experience==="avanzato"?"selected":""}>avanzato</option></select></div>
 </div><div class="actions"><button class="btn full" type="submit">Salva profilo</button></div></form>
 ${section("Obiettivi nutrizionali","Stime modificabili: non sono prescrizioni dietetiche")}
 <form id="nutritionForm" class="card"><div class="form-grid">
 <div class="field"><label>Calorie / giorno</label><input name="calorieGoal" type="number" min="1000" max="6000" value="${s.calorieGoal}"></div>
 <div class="field"><label>Proteine (g)</label><input name="proteinGoal" type="number" min="0" max="400" value="${s.proteinGoal}"></div>
 <div class="field"><label>Carboidrati (g)</label><input name="carbGoal" type="number" min="0" max="800" value="${s.carbGoal}"></div>
 <div class="field"><label>Grassi (g)</label><input name="fatGoal" type="number" min="0" max="300" value="${s.fatGoal}"></div>
 <div class="field full"><label>Carboidrati gel (g/ora)</label><input name="carbPerHour" type="number" min="0" max="120" value="${s.carbPerHour}"></div>
 </div><div class="actions"><button class="btn full" type="submit">Salva obiettivi</button></div></form>
 ${section("Preferenze","Aspetto e gestione dei dati")}
 <div class="card"><div class="statline"><span>Tema</span><strong>Scuro · predefinito</strong></div><div class="statline"><span>Salvataggio</span><strong>Locale sul dispositivo</strong></div><div class="statline"><span>Versione</span><strong>0.1.0</strong></div><div class="actions"><button class="btn secondary full" data-action="backup">Esporta backup JSON</button><button class="btn secondary full" data-action="restore">Ripristina backup</button><button class="btn secondary full" data-action="export-food">Esporta diario CSV</button><button class="btn danger full" data-action="reset">Azzera tutti i dati</button><input id="restoreFile" type="file" accept="application/json,.json" hidden></div></div>
 <div class="notice" style="margin-top:14px">Privacy: in questa versione i dati vengono salvati nel browser del dispositivo. Non c’è sincronizzazione automatica con altri dispositivi né connessione a Garmin Connect. Conserva periodicamente un backup. I piani e i calcoli sono orientativi e non sostituiscono valutazioni mediche o dietistiche.</div>`;
}
function bindView(){
  $$("[data-nav]").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.nav)));
  $$("[data-action]").forEach(b=>b.addEventListener("click",()=>handleAction(b.dataset.action,b.dataset.id)));
  const pf=$("#profileForm"); if(pf)pf.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(pf);["name","experience"].forEach(k=>db.profile[k]=f.get(k));["age","height","weight","targetWeight"].forEach(k=>db.profile[k]=n(f.get(k)));save();render();toast("Profilo salvato.");});
  const nf=$("#nutritionForm"); if(nf)nf.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(nf);Object.keys(db.settings).filter(k=>f.has(k)).forEach(k=>db.settings[k]=n(f.get(k)));save();render();toast("Obiettivi nutrizionali salvati.");});
  const dp=$("#dayPicker");if(dp)$$("[data-day]",dp).forEach(b=>b.addEventListener("click",()=>{const d=n(b.dataset.day);db.profile.days.includes(d)?db.profile.days=db.profile.days.filter(x=>x!==d):db.profile.days.push(d);b.classList.toggle("selected");}));
  const gd=$("#goalSelect");if(gd)gd.addEventListener("change",()=>db.profile.goal=gd.value);
  const rd=$("#raceDate");if(rd)rd.addEventListener("change",()=>db.profile.raceDate=rd.value);
  const wk=$("#weeklyKm");if(wk)wk.addEventListener("change",()=>db.profile.weeklyKm=n(wk.value));
  const fd=$("#foodDate");if(fd)fd.addEventListener("change",()=>render());
}
function handleAction(action,id){
 switch(action){
  case "goto-plan":setPage("plan");break;
  case "quick-food":setPage("food");openFoodModal();break;
  case "add-food":openFoodModal();break;
  case "edit-food":openFoodModal(id);break;
  case "delete-food":if(confirm("Eliminare questa voce dal diario?")){db.foodLog=db.foodLog.filter(x=>x.id!==id);save();render();toast("Voce eliminata.");}break;
  case "add-weight":openWeightModal();break;
  case "generate-plan":createPlan();break;
  case "toggle-done":{const w=db.plan.find(x=>x.id===id);if(w){w.done=!w.done;if(w.done){w.actualKm=w.km;w.actualMinutes=w.minutes;}save();render();toast(w.done?"Allenamento completato!":"Allenamento riaperto.");}break;}
  case "edit-workout":openWorkoutModal(id);break;
  case "add-gel":openGelModal();break;
  case "edit-gel":openGelModal(id);break;
  case "delete-gel":if(confirm("Eliminare questo gel?")){db.gels=db.gels.filter(x=>x.id!==id);save();render();toast("Gel eliminato.");}break;
  case "calculate-gels":calculateGels();break;
  case "backup":download("runner-pro-backup.json",JSON.stringify(db,null,2),"application/json");toast("Backup esportato.");break;
  case "restore":$("#restoreFile").click();break;
  case "export-food":exportFood();break;
  case "export-plan":exportPlan();break;
  case "reset":if(confirm("Vuoi eliminare TUTTI i dati salvati su questo dispositivo? Scarica un backup prima di procedere.")){localStorage.removeItem(STORE_KEY);db=defaultDB();save();render();toast("Dati azzerati.");}break;
 }
}
function modalOpen(title,body){
 const dlg=$("#modal");$("#modalContent").innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close-btn" type="button" data-close>×</button></div>${body}`;
 $$("[data-close]",$("#modalContent")).forEach(b=>b.addEventListener("click",()=>dlg.close()));
 dlg.showModal();
}
function openFoodModal(id=null){
 const old=id?db.foodLog.find(x=>x.id===id):null;
 modalOpen(old?"Modifica alimento":"Aggiungi alimento",`<form id="foodForm"><div class="form-grid">
 <div class="field full"><label>Alimento / bevanda</label><input name="name" required maxlength="100" placeholder="Es. yogurt bianco" value="${escapeHTML(old?.name||"")}"></div>
 <div class="field"><label>Data</label><input name="date" type="date" required value="${old?.date||$("#foodDate")?.value||todayISO()}"></div>
 <div class="field"><label>Pasto</label><select name="meal">${["Colazione","Spuntino","Pranzo","Merenda","Cena","Altro"].map(x=>`<option ${old?.meal===x?"selected":""}>${x}</option>`).join("")}</select></div>
 <div class="field"><label>Quantità</label><input name="qty" type="number" min="0" step=".1" required value="${old?.qty??100}"></div>
 <div class="field"><label>Unità</label><select name="unit"><option ${old?.unit==="g"||!old?"selected":""}>g</option><option ${old?.unit==="ml"?"selected":""}>ml</option><option ${old?.unit==="porzione"?"selected":""}>porzione</option></select></div>
 <div class="field"><label>Kcal per 100 g/ml*</label><input name="kcal100" type="number" min="0" step=".1" required value="${old?old.kcal*100/Math.max(.1,old.qty):""}" placeholder="es. 120"></div>
 <div class="field"><label>Proteine g per 100*</label><input name="protein100" type="number" min="0" step=".1" required value="${old?old.protein*100/Math.max(.1,old.qty):""}" placeholder="es. 4"></div>
 <div class="field"><label>Carboidrati g per 100*</label><input name="carbs100" type="number" min="0" step=".1" required value="${old?old.carbs*100/Math.max(.1,old.qty):""}" placeholder="es. 15"></div>
 <div class="field"><label>Grassi g per 100*</label><input name="fat100" type="number" min="0" step=".1" required value="${old?old.fat*100/Math.max(.1,old.qty):""}" placeholder="es. 3"></div>
 </div><p class="small-note">*Inserisci i valori nutrizionali riferiti a 100 g/ml. Per “porzione”, usa comunque i valori per porzione e imposta quantità 1.</p><div class="form-actions"><button class="btn secondary" type="button" data-close>Annulla</button><button class="btn" type="submit">Salva alimento</button></div></form>`);
 $("#foodForm").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.currentTarget),qty=n(f.get("qty")),factor=f.get("unit")==="porzione"?qty:qty/100;
  const item={id:old?.id||uid(),name:f.get("name").trim(),date:f.get("date"),meal:f.get("meal"),qty,unit:f.get("unit"),kcal:n(f.get("kcal100"))*factor,protein:n(f.get("protein100"))*factor,carbs:n(f.get("carbs100"))*factor,fat:n(f.get("fat100"))*factor};
  if(old)db.foodLog=db.foodLog.map(x=>x.id===old.id?item:x);else db.foodLog.push(item);
  save();$("#modal").close();render();toast("Diario aggiornato.");
 });
}
function openWeightModal(){
 modalOpen("Registra il peso",`<form id="weightForm"><div class="form-grid"><div class="field"><label>Data</label><input name="date" type="date" required value="${todayISO()}"></div><div class="field"><label>Peso (kg)</label><input name="weight" type="number" min="30" max="300" step=".1" required value="${db.profile.weight}"></div></div><div class="form-actions"><button class="btn secondary" type="button" data-close>Annulla</button><button class="btn" type="submit">Salva peso</button></div></form>`);
 $("#weightForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget),w={id:uid(),date:f.get("date"),weight:n(f.get("weight"))};db.weights.push(w);db.profile.weight=w.weight;save();$("#modal").close();render();toast("Peso registrato.");});
}
function openWorkoutModal(id){
 const w=db.plan.find(x=>x.id===id);if(!w)return;
 modalOpen("Dettagli allenamento",`<form id="workoutForm"><div class="form-grid">
 <div class="field full"><label>Tipo di allenamento</label><input name="type" required value="${escapeHTML(w.type)}"></div>
 <div class="field"><label>Data</label><input name="date" type="date" required value="${w.date}"></div>
 <div class="field"><label>Distanza prevista (km)</label><input name="km" type="number" min="0" max="100" step=".1" required value="${w.km}"></div>
 <div class="field"><label>Durata prevista (min)</label><input name="minutes" type="number" min="0" max="1000" value="${w.minutes}"></div>
 <div class="field"><label>Ritmo / intensità</label><input name="pace" value="${escapeHTML(w.pace)}"></div>
 <div class="field"><label>Distanza effettiva (km)</label><input name="actualKm" type="number" min="0" max="100" step=".1" value="${w.actualKm??""}"></div>
 <div class="field"><label>Durata effettiva (min)</label><input name="actualMinutes" type="number" min="0" max="1000" value="${w.actualMinutes??""}"></div>
 <div class="field full"><label>Note e struttura</label><textarea name="notes">${escapeHTML(w.notes)}</textarea></div>
 <div class="field full"><label><input name="done" type="checkbox" style="width:auto;min-height:0" ${w.done?"checked":""}> Allenamento completato</label></div>
 </div><div class="form-actions"><button class="btn secondary" type="button" data-close>Annulla</button><button class="btn" type="submit">Salva modifiche</button></div></form>`);
 $("#workoutForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget);w.type=f.get("type");w.date=f.get("date");w.km=n(f.get("km"));w.minutes=n(f.get("minutes"));w.pace=f.get("pace");w.actualKm=f.get("actualKm")===""?null:n(f.get("actualKm"));w.actualMinutes=f.get("actualMinutes")===""?null:n(f.get("actualMinutes"));w.notes=f.get("notes");w.done=f.has("done");save();$("#modal").close();render();toast("Allenamento aggiornato.");});
}
function openGelModal(id=null){
 const old=id?db.gels.find(x=>x.id===id):null;
 modalOpen(old?"Modifica gel":"Aggiungi gel",`<form id="gelForm"><div class="form-grid">
 <div class="field"><label>Marca</label><input name="brand" required value="${escapeHTML(old?.brand||"")}"></div>
 <div class="field"><label>Nome prodotto</label><input name="name" required value="${escapeHTML(old?.name||"")}"></div>
 <div class="field"><label>Gusto</label><input name="flavor" value="${escapeHTML(old?.flavor||"")}"></div>
 <div class="field"><label>Carboidrati (g)</label><input name="carbs" type="number" min="0" step=".1" required value="${old?.carbs??40}"></div>
 <div class="field"><label>Calorie (kcal)</label><input name="kcal" type="number" min="0" step="1" value="${old?.kcal??160}"></div>
 <div class="field"><label>Caffeina (mg)</label><input name="caffeine" type="number" min="0" step="1" value="${old?.caffeine??0}"></div>
 </div><div class="form-actions"><button class="btn secondary" type="button" data-close>Annulla</button><button class="btn" type="submit">Salva gel</button></div></form>`);
 $("#gelForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget),g={id:old?.id||uid(),brand:f.get("brand").trim(),name:f.get("name").trim(),flavor:f.get("flavor").trim(),carbs:n(f.get("carbs")),kcal:n(f.get("kcal")),caffeine:n(f.get("caffeine"))};if(old)db.gels=db.gels.map(x=>x.id===old.id?g:x);else db.gels.push(g);save();$("#modal").close();render();toast("Catalogo gel aggiornato.");});
}
function calculateGels(){
 const mins=n($("#gelDuration").value), target=n($("#gelTarget").value), count=n($("#gelCount").value), gel=db.gels.find(g=>g.id===$("#gelSelect").value);
 if(!gel){$("#gelResult").innerHTML=`<div class="notice">Aggiungi prima un gel al catalogo.</div>`;return;}
 const hours=mins/60, need=target*hours, provided=count*n(gel.carbs), diff=provided-need;
 $("#gelResult").innerHTML=`<div class="card" style="background:#0d1726"><div class="eyebrow">STIMA STRATEGIA</div><div class="grid"><div><div class="metric-value">${provided.toFixed(0)} g</div><div class="metric-label">Carboidrati dai gel</div></div><div><div class="metric-value">${need.toFixed(0)} g</div><div class="metric-label">Obiettivo impostato</div></div></div><div class="progress"><span style="width:${Math.min(100,provided/Math.max(1,need)*100)}%"></span></div><p>${count} × ${escapeHTML(gel.name)} · ${mins} min · ${gel.caffeine?count*gel.caffeine+" mg caffeina complessivi":"senza caffeina registrata"}</p><div class="notice">${diff>=0?"La quantità selezionata raggiunge o supera l’obiettivo impostato.":"La quantità selezionata è inferiore all’obiettivo impostato di circa "+Math.abs(diff).toFixed(0)+" g."} È solo una stima: considera anche gli altri alimenti, l’acqua e la tolleranza individuale.</div></div>`;
}
function download(filename,content,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function csvEscape(v){return `"${String(v??"").replace(/"/g,'""')}"`;}
function exportFood(){const rows=[["Data","Pasto","Alimento","Quantità","Unità","Kcal","Proteine g","Carboidrati g","Grassi g"],...db.foodLog.map(x=>[x.date,x.meal,x.name,x.qty,x.unit,x.kcal,x.protein,x.carbs,x.fat])];download("runner-pro-diario.csv","\ufeff"+rows.map(r=>r.map(csvEscape).join(";")).join("\n"),"text/csv;charset=utf-8");}
function exportPlan(){const rows=[["Data","Allenamento","Km","Minuti","Ritmo","Completato","Km effettivi","Minuti effettivi","Note"],...db.plan.map(x=>[x.date,x.type,x.km,x.minutes,x.pace,x.done?"Sì":"No",x.actualKm,x.actualMinutes,x.notes])];download("runner-pro-piano.csv","\ufeff"+rows.map(r=>r.map(csvEscape).join(";")).join("\n"),"text/csv;charset=utf-8");}
$("#restoreFile").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!parsed.profile||!parsed.settings)throw new Error("Formato non riconosciuto");db={...defaultDB(),...parsed};save();render();toast("Backup ripristinato.");}catch(err){alert("Impossibile ripristinare il file: verifica che sia un backup Runner Pro valido.");}e.target.value="";});
if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
