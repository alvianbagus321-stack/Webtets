/* Solar Atlas — data, orrery, ledger, palette */
(() => {
  "use strict";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const planets = [
    {name:"Mercury",type:"terrestrial",distance:57.9,period:88,diameter:4879,gravity:3.7,moons:0,color:"#A8A29A",orbit:64,blurb:"The smallest planet completes a year in 88 Earth days, yet one solar day lasts 176 Earth days.",tilt:"0.03°",temp:"167°C mean"},
    {name:"Venus",type:"terrestrial",distance:108.2,period:225,diameter:12104,gravity:8.9,moons:0,color:"#D9B77E",orbit:96,blurb:"Venus rotates backwards beneath a crushing carbon-dioxide atmosphere; its surface is hot enough to melt lead.",tilt:"177.4°",temp:"464°C mean"},
    {name:"Earth",type:"terrestrial",distance:149.6,period:365.25,diameter:12756,gravity:9.8,moons:1,color:"#5C8CB0",orbit:130,blurb:"The only known world with stable surface liquid water, plate tectonics, and a substantial oxygen-rich atmosphere.",tilt:"23.4°",temp:"15°C mean"},
    {name:"Mars",type:"terrestrial",distance:227.9,period:687,diameter:6792,gravity:3.7,moons:2,color:"#B46144",orbit:164,blurb:"Rust-colored Mars hosts Olympus Mons, a shield volcano nearly three times the height of Mount Everest.",tilt:"25.2°",temp:"-65°C mean"},
    {name:"Jupiter",type:"gas",distance:778.5,period:4333,diameter:142984,gravity:24.8,moons:95,color:"#C4A176",orbit:216,blurb:"Jupiter’s magnetic field is the largest structure in the Solar System after the heliosphere itself.",tilt:"3.1°",temp:"-110°C cloud tops"},
    {name:"Saturn",type:"gas",distance:1434,period:10759,diameter:120536,gravity:10.4,moons:146,color:"#D8C08B",orbit:262,blurb:"Saturn’s rings span up to 282,000 km, but are often only around 10 meters thick in places.",tilt:"26.7°",temp:"-140°C cloud tops"},
    {name:"Uranus",type:"ice",distance:2871,period:30687,diameter:51118,gravity:8.9,moons:28,color:"#8FB6B4",orbit:302,blurb:"Uranus is tipped almost completely onto its side, likely after an ancient collision with an Earth-sized object.",tilt:"97.8°",temp:"-195°C cloud tops"},
    {name:"Neptune",type:"ice",distance:4495,period:60190,diameter:49528,gravity:11.2,moons:16,color:"#5F7FB8",orbit:338,blurb:"Neptune has the fastest measured winds in the Solar System, reaching roughly 2,100 km/h.",tilt:"28.3°",temp:"-200°C cloud tops"}
  ];

  const $ = s => document.querySelector(s);
  const fmt = n => n.toLocaleString("en-US");

  /* Theme */
  const themeBtn = $("#themeToggle");
  const setTheme = dark => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeBtn.setAttribute("aria-pressed", String(!dark));
    themeBtn.querySelector(".btn__label").textContent = dark ? "Light" : "Dark";
  };
  setTheme(true);
  themeBtn.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark"));

  /* Hero orbits */
  const heroSet = $("#heroOrbitSet");
  planets.forEach((p,i) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    g.innerHTML = `<ellipse class="orbit${i===2?" orbit--active":""}" cx="260" cy="210" rx="${p.orbit}" ry="${p.orbit*.42}"/>
      <circle class="planet-dot" cx="${260+p.orbit}" cy="210" r="${i<4?3.2:4.4}" fill="${p.color}"/>
      <text class="svg-label" x="${260+p.orbit+8}" y="214">${p.name}</text>`;
    heroSet.append(g);
  });

  /* Count-up */
  const countUp = el => {
    const target = parseFloat(el.dataset.count), dec = +(el.dataset.decimals||0);
    if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
    const start = performance.now(), dur = 850;
    const tick = now => {
      const t = Math.min((now-start)/dur,1), e = 1-Math.pow(1-t,3);
      el.textContent = (target*e).toFixed(dec);
      if (t<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.querySelectorAll("[data-count]").forEach(countUp);

  /* Reveal */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-visible");
    if (e.target.classList.contains("note--wide")) {
      const line = e.target.querySelector(".spark__line");
      if (line) line.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)", line.style.strokeDashoffset = "0";
    }
    io.unobserve(e.target);
  }), {threshold:.18});
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  /* Orrery */
  const svg = $("#orrery"), NS = "http://www.w3.org/2000/svg";
  const cx=380, cy=280;
  const nodes = planets.map(p => {
    const g = document.createElementNS(NS,"g");
    g.innerHTML = `<ellipse class="orbit" cx="${cx}" cy="${cy}" rx="${p.orbit}" ry="${p.orbit*.52}"/>
      <circle class="planet" r="${p.type==="terrestrial"?5:8}" fill="${p.color}"/>
      <text class="svg-label label" x="0" y="-12" text-anchor="middle">${p.name}</text>`;
    svg.append(g);
    return {p, g, circle:g.querySelector(".planet"), label:g.querySelector(".label"), angle:Math.random()*Math.PI*2};
  });

  let day=0, speed=2, playing=true, labelsOn=true, selected=planets[0], focusMode=false;
  const dayEl=$("#simDay"), selectedTitle=$("#selectedTitle"), selectedBlurb=$("#selectedBlurb"), specs=$("#selectedSpecs");

  const renderSpecs = p => {
    selectedTitle.textContent=p.name; selectedBlurb.textContent=p.blurb;
    specs.innerHTML = [
      ["Orbital period",`${fmt(p.period)} days`],
      ["Mean distance",`${fmt(p.distance)} × 10⁶ km`],
      ["Diameter",`${fmt(p.diameter)} km`],
      ["Surface gravity",`${p.gravity} m/s²`],
      ["Axial tilt",p.tilt],
      ["Temperature",p.temp]
    ].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  };
  renderSpecs(selected);

  const draw = () => {
    nodes.forEach(({p,g,circle,label,angle},i) => {
      const a = angle + (day/p.period)*Math.PI*2;
      const x = cx + Math.cos(a)*p.orbit*(focusMode&&selected===p?.42:1);
      const y = cy + Math.sin(a)*p.orbit*.52*(focusMode&&selected===p?.42:1);
      g.setAttribute("transform",`translate(${x} ${y})`);
      circle.setAttribute("r", focusMode&&selected===p ? 10 : p.type==="terrestrial"?5:8);
      label.style.opacity = labelsOn ? 1 : 0;
      g.style.cursor="pointer";
      g.onclick = () => { selected=p; renderSpecs(p); };
    });
    dayEl.textContent = fmt(Math.floor(day));
  };

  let last=performance.now();
  const loop = now => {
    const dt=(now-last)/1000; last=now;
    if (playing) day += dt*speed*8;
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  $("#playPause").addEventListener("click", e => {
    playing=!playing;
    e.currentTarget.setAttribute("aria-pressed",String(playing));
    e.currentTarget.querySelector("span").textContent = playing?"Pause":"Play";
    e.currentTarget.querySelector(".icon").innerHTML = playing?'<path d="M8 5v14M16 5v14"/>':'<path d="M7 4l13 8-13 8z"/>';
  });
  $("#speed").addEventListener("input", e => {
    speed=+e.target.value; $("#speedOut").textContent=`${speed.toFixed(1)}×`;
  });
  document.querySelectorAll("[data-labels]").forEach(b => b.addEventListener("click", () => {
    labelsOn = b.dataset.labels==="on";
    document.querySelectorAll("[data-labels]").forEach(x=>{
      x.classList.toggle("is-active",x===b); x.setAttribute("aria-pressed",String(x===b));
    });
  }));
  $("#focusButton").addEventListener("click", () => { focusMode=!focusMode; });
  addEventListener("keydown", e => {
    if (e.code==="Space" && !e.target.matches("input,select,textarea") && !paletteOpen) {
      e.preventDefault(); $("#playPause").click();
    }
  });

  /* Ledger */
  const body=$("#ledgerBody"), empty=$("#tableEmpty");
  let sortKey="distance", sortDir=1, query="", typeFilter="all";
  const renderTable = () => {
    const rows = planets
      .filter(p => (typeFilter==="all"||p.type===typeFilter) &&
        Object.values(p).join(" ").toLowerCase().includes(query.toLowerCase()))
      .sort((a,b)=> typeof a[sortKey]==="string" ? a[sortKey].localeCompare(b[sortKey])*sortDir : (a[sortKey]-b[sortKey])*sortDir);
    body.innerHTML = rows.map(p=>`<tr>
      <td><span class="body-name">${p.name}</span></td>
      <td><span class="type-tag">${p.type}</span></td>
      <td class="num">${fmt(p.distance)}</td>
      <td class="num">${fmt(p.period)}</td>
      <td class="num">${fmt(p.diameter)}</td>
      <td class="num">${p.gravity.toFixed(1)}</td>
      <td class="num">${p.moons}</td></tr>`).join("");
    empty.hidden = rows.length>0;
  };
  renderTable();
  $("#tableSearch").addEventListener("input", e=>{query=e.target.value;renderTable();});
  $("#typeFilter").addEventListener("change", e=>{typeFilter=e.target.value;renderTable();});
  $("#resetFilters").addEventListener("click",()=>{query="";typeFilter="all";$("#tableSearch").value="";$("#typeFilter").value="all";renderTable();});
  document.querySelectorAll(".sort").forEach(btn=>btn.addEventListener("click",()=>{
    const key=btn.dataset.key;
    sortDir = key===sortKey ? -sortDir : 1; sortKey=key;
    document.querySelectorAll(".sort").forEach(b=>b.removeAttribute("aria-sort"));
    btn.setAttribute("aria-sort",sortDir===1?"ascending":"descending");
    renderTable();
  }));

  /* Command palette */
  const palette=$("#palette"), input=$("#paletteInput"), results=$("#paletteResults");
  let paletteOpen=false, activeIndex=0;
  const commands=[
    ...planets.map(p=>({label:p.name,kind:"Planet",action:()=>{selected=p;renderSpecs(p);document.querySelector("#orrery").scrollIntoView({behavior:reduceMotion?"auto":"smooth"});}})),
    {label:"Open the orrery",kind:"Section",action:()=>location.hash="#orrery"},
    {label:"Planet ledger",kind:"Section",action:()=>location.hash="#ledger"},
    {label:"Field notes",kind:"Section",action:()=>location.hash="#fieldnotes"},
    {label:"Toggle light / dark theme",kind:"Action",action:()=>themeBtn.click()},
    {label:"Pause or resume simulation",kind:"Action",action:()=>$("#playPause").click()}
  ];
  const renderResults=(q="")=>{
    const items=commands.filter(c=>c.label.toLowerCase().includes(q.toLowerCase()));
    activeIndex=0;
    results.innerHTML=items.length?items.map((c,i)=>`<li role="option" aria-selected="${i===0}"><button data-i="${commands.indexOf(c)}" class="${i===0?"is-active":""}"><span>${c.label}</span><span class="kind">${c.kind}</span></button></li>`).join(""):`<li><button disabled><span>No matching command</span></button></li>`;
    return items;
  };
  let currentItems=renderResults();
  const openPalette=()=>{palette.hidden=false;requestAnimationFrame(()=>palette.classList.add("is-open"));paletteOpen=true;input.value="";currentItems=renderResults();input.focus();};
  const closePalette=()=>{palette.classList.remove("is-open");paletteOpen=false;setTimeout(()=>palette.hidden=true,250);};
  $("#paletteButton").addEventListener("click",openPalette);
  palette.addEventListener("click",e=>{if(e.target.dataset.close!==undefined)closePalette();});
  input.addEventListener("input",()=>currentItems=renderResults(input.value));
  results.addEventListener("click",e=>{const b=e.target.closest("button[data-i]");if(!b)return;commands[+b.dataset.i].action();closePalette();});
  addEventListener("keydown",e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();paletteOpen?closePalette():openPalette();}
    if(e.key==="Escape"&&paletteOpen)closePalette();
    if(!paletteOpen)return;
    const buttons=[...results.querySelectorAll("button[data-i]")];
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){
      e.preventDefault();
      activeIndex=(activeIndex+(e.key==="ArrowDown"?1:-1)+buttons.length)%buttons.length;
      buttons.forEach((b,i)=>b.classList.toggle("is-active",i===activeIndex));
      buttons[activeIndex]?.focus();
    }
    if(e.key==="Enter"&&buttons[activeIndex]){commands[+buttons[activeIndex].dataset.i].action();closePalette();}
  });

  /* Magnetic button */
  const magnetic=document.querySelector(".magnetic");
  if(magnetic&&!reduceMotion){
    magnetic.addEventListener("mousemove",e=>{
      const r=magnetic.getBoundingClientRect();
      magnetic.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.14}px)`;
    });
    magnetic.addEventListener("mouseleave",()=>magnetic.style.transform="");
  }

  /* Simulate loading for the orrery skeleton */
  setTimeout(()=>{const s=$("#orrerySkeleton");if(s){s.style.opacity="0";setTimeout(()=>s.remove(),250);}},700);
})();
