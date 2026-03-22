// ===================== GLOBAL VARS =====================
let users = [];
let removalLog = [];
let currentUser = null;

let stats = JSON.parse(localStorage.getItem("stats")) || {};
let currentPlayer = null;
let currentType = "training";
let shotType = "shot";
let lastSelectedDate = new Date().toISOString().split("T")[0];
let chart, lineChart, savePercentageChart;

let categories = {
  gym:["Tid","Benstyrka","Explosivitet","Bålstyrka","Kondition","Rörlighet","Antal övningar","Vikt"],
  training:["Tid","Avslut","Räddningar","Insläppta","Passningar","1 mot 1"],
  match:["Minuter","Avslut mot mål","Räddningar","Insläppta","1 mot 1","Inlägg","Passningar","Distributioner"]
};

let categoryColors = ["#f87171","#60a5fa","#34d399","#facc15","#a78bfa","#f472b6","#f97316","#0ea5e9"];
let heatColors = [
  "#004D00","#006600","#008000","#009900","#00B300","#00CC00","#00E600","#00FF00",
  "#33FF33","#66FF66","#66FF00","#99FF00","#CCFF00","#E6FF00","#FFFF99","#FFFF00",
  "#FFE600","#FFCC00","#FFB300","#FF9900","#FF8000","#FF6600","#FF4D00","#FF3300",
  "#FF0000","#E60000","#CC0000","#990000","#660000","#330000"
];

// ===================== LOAD USERS =====================
function loadUsers(){
  try { let savedUsers = JSON.parse(localStorage.getItem("users")); if(Array.isArray(savedUsers)) users = savedUsers; } catch(e){ users = []; }
  if(users.length === 0){
    users = [{firstName:"System", lastName:"Admin", username:"Admin", password:"1234", role:"Admin", birthDate:"2000-01-01", lastLogin:"-"}];
  }
  try { let savedLog = JSON.parse(localStorage.getItem("removalLog")); if(Array.isArray(savedLog)) removalLog = savedLog; } catch(e){ removalLog = []; }
}

// ===================== DOM READY =====================
document.addEventListener("DOMContentLoaded", function() {
  loadUsers();

  // ===== LOGIN =====
  document.getElementById("loginBtn").onclick = function(){
    let u = document.getElementById("loginUsername").value;
    let p = document.getElementById("loginPassword").value;
    let r = document.getElementById("loginRole").value;

    let user = users.find(x => x.username===u && x.password===p && x.role===r);

    if(user){
      user.lastLogin = new Date().toLocaleString();
      currentUser = user;
      localStorage.setItem("users", JSON.stringify(users));

      document.getElementById("loginBox").style.display = "none";
      document.getElementById("homePage").style.display = "block";
      document.getElementById("userName").innerText = user.firstName + " " + user.lastName;
      document.getElementById("userRole").innerText = user.role;

      showLoadingEffect();
      initPlayer(user.username);

      document.getElementById("playerSelect").style.display =
        (user.role==="Admin"||user.role==="Coach")?"inline-block":"none";

      document.getElementById("resetStatsBtn").style.display =
        (user.role==="Admin"||user.role==="Coach")?"inline-block":"none";

      if(user.role==="Admin"||user.role==="Coach"){
        document.getElementById("adminPanel").style.display="block";
        buildAdminTable();
      } else {
        document.getElementById("adminPanel").style.display="none";
      }

    } else alert("Fel uppgifter");
  }

  document.getElementById("logoutBtn").onclick = function(){
    document.getElementById("homePage").style.display="none";
    document.getElementById("loginBox").style.display="block";
    document.getElementById("adminPanel").style.display="none";
    currentUser = null;
  }

  // ===== CREATE ACCOUNT =====
  document.getElementById("showCreateBtn").onclick = () =>
    document.getElementById("createPopup").classList.add("show");

  document.getElementById("closePopup").onclick = () =>
    document.getElementById("createPopup").classList.remove("show");

  document.getElementById("createBtn").onclick = () => {
    let f=document.getElementById("firstName").value;
    let l=document.getElementById("lastName").value;
    let u=document.getElementById("newUsername").value;
    let p=document.getElementById("newPassword").value;
    let c=document.getElementById("confirmPassword").value;
    let b=document.getElementById("birthDate").value;
    let r=document.getElementById("newRole").value;

    if(!f||!l||!u||!p||!c||!b){alert("Fyll i alla fält");return;}
    if(p!==c){alert("Lösenorden matchar inte");return;}
    if(users.some(x=>x.username===u)){alert("Användarnamn finns redan");return;}

    users.push({firstName:f,lastName:l,username:u,password:p,role:r,birthDate:b,lastLogin:"-"});    
    if(!stats[u]) stats[u]=[];

    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("stats", JSON.stringify(stats));

    alert("Konto skapat");
    document.getElementById("createPopup").classList.remove("show");

    if(r==="Spelare") initPlayer(u);
  }

  // ===================== INIT =====================
  updatePlayersDropdown();
  buildTypeDropdown();
  buildPrecisionButtons();
  buildHeatmap();
  updateDashboard();

  // ===================== RESET STATISTICS =====================
  document.getElementById("resetStatsBtn").onclick = () => {
    if(!currentUser || !(currentUser.role==="Admin"||currentUser.role==="Coach")) return;
    if(confirm("Är du säker på att du vill rensa statistiken?")){
      if(confirm("Detta kommer ta bort ALL data för spelaren. Fortsätta?")){
        stats[currentPlayer] = [];
        localStorage.setItem("stats", JSON.stringify(stats));
        updateDashboard();
        alert("Statistik rensad!");
      }
    }
  }
});

// ===================== PLAYER INIT =====================
function initPlayer(username){
  currentPlayer = username;
  updatePlayersDropdown();
  buildTypeDropdown();
  buildPrecisionButtons();
  buildHeatmap();
  updateDashboard();
}

// ===================== PLAYER DROPDOWN =====================
function updatePlayersDropdown(){
  let sel = document.getElementById("playerSelect");
  sel.innerHTML="";
  let visiblePlayers = (currentUser && (currentUser.role==="Admin"||currentUser.role==="Coach"))
    ? Object.keys(stats)
    : [currentPlayer];

  visiblePlayers.forEach(p=>{
    let o=document.createElement("option");
    o.value=p;
    o.text=p;
    sel.add(o);
  });

  sel.value = currentPlayer || visiblePlayers[0];
  sel.onchange = ()=>{ currentPlayer = sel.value; updateDashboard(); }
}

// ===================== TYPE DROPDOWN =====================
function buildTypeDropdown(){
  let sel = document.getElementById("typeSelector");
  sel.innerHTML="";
  ["training","gym","match"].forEach(t=>{
    let o=document.createElement("option");
    o.value=t;
    o.text=t.charAt(0).toUpperCase()+t.slice(1);
    sel.add(o);
  });
  sel.value=currentType;
  sel.onchange=()=>{currentType=sel.value;updateDashboard();}
}

// ===================== PRECISION BUTTONS =====================
function buildPrecisionButtons(){
  let container=document.getElementById("precisionButtons");
  container.innerHTML="";
  ["Skott","Mål","Räddningar","Rensa tavlan"].forEach(btn=>{
    let b=document.createElement("button");
    b.textContent=btn;
    if(btn==="Skott") b.onclick=()=>shotType="shot";
    if(btn==="Mål") b.onclick=()=>shotType="goal";
    if(btn==="Räddningar") b.onclick=()=>shotType="save";
    if(btn==="Rensa tavlan") b.onclick=resetPrecision;
    container.appendChild(b);
  });
}

// ===================== PRECISION MAP =====================
document.getElementById("precisionMap").onclick = function(e){
  const rect=this.getBoundingClientRect();
  const x=((e.clientX-rect.left)/rect.width)*100;
  const y=((e.clientY-rect.top)/rect.height)*100;
  if(!stats[currentPlayer]) stats[currentPlayer]=[];
  stats[currentPlayer].push({
    category:"Skott", value:1, type:currentType, result:shotType,
    x:Number(x.toFixed(2)), y:Number(y.toFixed(2)), date:lastSelectedDate
  });
  localStorage.setItem("stats",JSON.stringify(stats));
  updateDashboard();
}

function updatePrecisionMap(data){
  const map=document.getElementById("precisionMap");
  map.innerHTML="";
  let shotsData=data.filter(s=>s.category==="Skott");
  document.getElementById("shotCount").textContent=shotsData.length;
  shotsData.forEach(s=>{
    let dot=document.createElement("div");
    dot.className="precisionDot";
    dot.style.left=s.x+"%";
    dot.style.top=s.y+"%";
    dot.style.backgroundColor = s.result==="goal"?"red":(s.result==="save"?"green":"yellow");
    map.appendChild(dot);
  });
}

function resetPrecision(){
  stats[currentPlayer]=stats[currentPlayer].filter(s=>s.category!=="Skott");
  localStorage.setItem("stats",JSON.stringify(stats));
  updateDashboard();
}

// ===================== HEATMAP =====================
function buildHeatmap(){
  let heat=document.getElementById("heatmap");
  heat.innerHTML="";
  for(let i=0;i<15;i++){
    let div=document.createElement("div");
    div.className="heatZone";
    div.onclick=()=>{
      if(!stats[currentPlayer]) stats[currentPlayer]=[];
      stats[currentPlayer].push({category:"Heatmap",value:1,type:currentType,zone:i,date:lastSelectedDate});
      localStorage.setItem("stats",JSON.stringify(stats));
      updateHeatmap();
    }
    heat.appendChild(div);
  }
}

function updateHeatmap(){
  let heat=document.getElementById("heatmap");
  for(let i=0;i<15;i++){
    let count=stats[currentPlayer].filter(s=>s.category==="Heatmap"&&s.zone===i).length;
    let idx=Math.min(count,heatColors.length-1);
    heat.children[i].style.backgroundColor=heatColors[idx];
    heat.children[i].textContent=count;
  }
}

function resetHeatmap(){
  stats[currentPlayer]=stats[currentPlayer].filter(s=>s.category!=="Heatmap");
  localStorage.setItem("stats",JSON.stringify(stats));
  updateHeatmap();
}

// ===================== DASHBOARD & DIAGRAMS =====================
function updateDashboard() {
  if(!stats[currentPlayer]) stats[currentPlayer]=[];
  let data = stats[currentPlayer].filter(s => s.type===currentType);

  // Totals
  let totals = {};
  categories[currentType].forEach(c => totals[c] = 0);
  data.forEach(s => { if(totals[s.category]!==undefined) totals[s.category] += s.value; });

  // Grid
  let grid = document.getElementById("statsGrid");
  grid.innerHTML = "";
  for(let c in totals) {
    let div = document.createElement("div");
    div.className = "statCard";
    div.innerHTML = `<h3>${c}</h3><p>${totals[c]}</p>`;
    div.onclick = () => openPopup(c);
    grid.appendChild(div);
  }

  // Bar Chart
  let ctx = document.getElementById("chart");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: Object.keys(totals),
      datasets:[{
        label:'Totalt',
        data: Object.values(totals),
        backgroundColor: Object.keys(totals).map((_,i) => categoryColors[i % categoryColors.length]),
        borderRadius: 6
      }]
    },
    options:{
      responsive:true,
      plugins:{legend:{ display:false }, tooltip:{mode:'index',intersect:false}},
      animation:{duration:1500,easing:'easeOutBounce'},
      scales:{y:{ beginAtZero:true }}
    }
  });

  // Line Chart
  let ctx2 = document.getElementById("lineChart");
  if(lineChart) lineChart.destroy();
  let dates = [...new Set(data.map(s=>s.date))].sort();
  let datasetsLC = categories[currentType].map((cat,i) => {
    let catData = data.filter(s => s.category === cat);
    let values = dates.map(d => {
      let item = catData.find(s => s.date===d);
      return item ? item.value : 0;
    });
    return {
      label: cat,
      data: values,
      borderColor: categoryColors[i % categoryColors.length],
      backgroundColor: categoryColors[i % categoryColors.length]+"33",
      fill:false,
      tension:0.4,
      pointRadius:6,
      pointHoverRadius:10,
      borderWidth:3
    };
  });

  lineChart = new Chart(ctx2, {
    type:'line',
    data:{labels: dates, datasets: datasetsLC},
    options:{
      responsive:true,
      animation:{duration:1800,easing:'easeOutQuart'},
      plugins:{
        legend:{display:true, position:'right', labels:{usePointStyle:true, boxWidth:12, padding:20}},
        tooltip:{mode:'nearest', intersect:false}
      },
      scales:{
        x:{title:{display:true, text:"Datum"}, ticks:{autoSkip:true, maxRotation:45, minRotation:0}},
        y:{title:{display:true, text:"Kategori"}, beginAtZero:true}
      }
    }
  });

  updatePrecisionMap(data);
  updateHeatmap();
  updateComments();
  updateSavePercentage(data);
}

// ===================== SAVE PERCENTAGE =====================
function updateSavePercentage(data){
  const saves = data.filter(s => s.category==="Räddningar").reduce((sum,s)=>sum+s.value,0);
  const shots = data.filter(s => s.category==="Avslut").reduce((sum,s)=>sum+s.value,0);
  let percent = shots>0 ? Math.round((saves/shots)*100) : 0;

  document.getElementById("savePercentageText").innerText = percent+"%";
  document.getElementById("savePercentageText").style.color = percent>=50 ? "lime" : "red";

  const ctx = document.getElementById("savePercentageChart").getContext("2d");
  if(savePercentageChart) savePercentageChart.destroy();

  let chartData = shots>0 ? [saves, shots-saves] : [0,1];
  let chartColors = shots>0 ? ['lime','red'] : ['#ccc','#eee'];

  savePercentageChart = new Chart(ctx,{
    type:'doughnut',
    data:{labels:['Räddningar','Missade'], datasets:[{data:chartData, backgroundColor:chartColors, borderWidth:2}]},
    options:{cutout:'70%', plugins:{legend:{display:false}}, animation:{duration:1200, easing:'easeOutQuart'}}
  });
}

// ===================== POPUP =====================
let popupCategory="";
function openPopup(cat){
  popupCategory=cat;
  document.getElementById("popupTitle").textContent=cat;
  document.getElementById("popupValue").value="";
  document.getElementById("popupComment").value="";
  document.getElementById("popupDate").value=lastSelectedDate;
  document.getElementById("popup").classList.add("show");
}
function closePopup(){ document.getElementById("popup").classList.remove("show"); }
function savePopup(){
  let val=Number(document.getElementById("popupValue").value); if(!val) return;
  let date=document.getElementById("popupDate").value; lastSelectedDate=date;
  let comment=document.getElementById("popupComment").value;
  stats[currentPlayer].push({category:popupCategory,value:val,type:currentType,date:date,comment:comment});
  localStorage.setItem("stats",JSON.stringify(stats));
  closePopup(); updateDashboard();
}

// ===================== COMMENTS =====================
function updateComments(){
  let box=document.getElementById("commentsBox"); box.innerHTML="";
  let c=stats[currentPlayer].filter(s=>s.comment);
  if(c.length===0){ box.innerHTML='<div class="noComments">Inga kommentarer ännu</div>'; return; }
  c.forEach(cm=>{
    let div=document.createElement("div");
    div.className="commentItem";
    div.innerHTML=`<div class="commentCategory">${cm.category}</div><div class="commentDate">${cm.date}</div><div class="commentText">${cm.comment}</div>`;
    box.appendChild(div);
  });
}

// ===================== ADMIN PANEL =====================
function buildAdminTable(){
  let t=document.getElementById("adminTable"); t.innerHTML="";
  users.forEach((u,i)=>{
    let btn=`<button class="btn" onclick="removeUser(${i})">Ta bort</button>`;
    t.innerHTML+=`
      <div class="userCard">
        <p><strong>Namn:</strong> ${u.firstName}</p>
        <p><strong>Efternamn:</strong> ${u.lastName}</p>
        <p><strong>Användarnamn:</strong> ${u.username}</p>
        <p><strong>Lösen:</strong> ${u.password}</p>
        <p><strong>Född:</strong> ${u.birthDate}</p>
        <p><strong>Senast inloggad:</strong> ${u.lastLogin}</p>
        ${btn}
      </div>
    `;
  });
}
function removeUser(i){
  let u=users[i];
  if(u.username==="Admin"){alert("Kan inte ta bort Admin"); return;}
  if(!confirm("Ta bort "+u.username+"?")) return;
  users.splice(i,1);
  delete stats[u.username];
  localStorage.setItem("users",JSON.stringify(users));
  localStorage.setItem("stats",JSON.stringify(stats));
  buildAdminTable();
  updatePlayersDropdown();
  updateDashboard();
}
// ===================== PDF EXPORT =====================
document.getElementById("exportPdf").onclick = async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const player = currentPlayer;
  let yOffset = 10;

  doc.setFontSize(18);
  doc.text("Spelarstatistik: " + player, 105, yOffset, { align: "center" });
  yOffset += 12;

  ["gym","training","match"].forEach(type => {
    const playerStats = stats[player].filter(s=>s.type===type) || [];
    if(playerStats.length===0) return;

    doc.setFontSize(14);
    doc.text(type.charAt(0).toUpperCase()+type.slice(1), 10, yOffset);
    yOffset += 8;

    categories[type].forEach(cat => {
      const val = playerStats.filter(s=>s.category===cat).reduce((sum,s)=>sum+s.value,0);
      doc.setFontSize(12);
      doc.text(`${cat}: ${val}`, 15, yOffset);
      yOffset += 7;
      if (yOffset > 280){ doc.addPage(); yOffset=10; }
    });
    yOffset += 5;
  });

  async function addCanvas(id){
    const canvas = document.getElementById(id);
    if(canvas){
      const imgData = await html2canvas(canvas).then(c=>c.toDataURL("image/png"));
      if(yOffset + 80 > 290){ doc.addPage(); yOffset=10; }
      doc.addImage(imgData,"PNG",10,yOffset,180,80);
      yOffset += 85;
    }
  }

  await addCanvas("chart");
  await addCanvas("lineChart");
  await addCanvas("savePercentageChart");

  doc.save(`${player}_statistik.pdf`);
};

// ===================== ENHANCED LOADING EFFECT =====================
function showLoadingEffect() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.85)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 9999;
  overlay.style.opacity = 0;
  overlay.style.transition = "opacity 0.5s ease";

  const spinner = document.createElement("div");
  spinner.style.width = "80px";
  spinner.style.height = "80px";
  spinner.style.border = "8px solid #60a5fa";
  spinner.style.borderTop = "8px solid #3b82f6";
  spinner.style.borderRadius = "50%";
  spinner.style.animation = "spin 1s linear infinite";

  const text = document.createElement("div");
  text.textContent = "Laddar...";
  text.style.color = "#60a5fa";
  text.style.fontSize = "20px";
  text.style.marginTop = "16px";
  text.style.fontFamily = "Arial, sans-serif";
  text.style.textAlign = "center";

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.appendChild(spinner);
  wrapper.appendChild(text);

  overlay.appendChild(wrapper);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.style.opacity = 1);

  setTimeout(() => {
    overlay.style.opacity = 0;
    overlay.addEventListener("transitionend", () => overlay.remove());
  }, 1500);
}

const style = document.createElement("style");
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
document.head.appendChild(style);