(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { image: null, fileName: "", body: [], window: [], activeTab: "body", generated: false };
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const WORLD = 1024;
  const historyKey = "frl_converter_history_v1";

  const els = {
    fileInput: $("fileInput"), dropzone: $("dropzone"), fileMeta: $("fileMeta"),
    fileName: $("fileName"), fileSize: $("fileSize"), removeImage: $("removeImage"),
    bodyCount: $("bodyCount"), windowCount: $("windowCount"), bodyCountValue: $("bodyCountValue"),
    windowCountValue: $("windowCountValue"), quality: $("quality"), qualityValue: $("qualityValue"),
    background: $("background"), generate: $("generateButton"), original: $("originalCanvas"),
    trace: $("traceCanvas"), originalEmpty: $("originalEmpty"), traceEmpty: $("traceEmpty"),
    status: $("previewStatus"), bodyStat: $("bodyStat"), windowStat: $("windowStat"),
    outputStat: $("outputStat"), bodyTabCount: $("bodyTabCount"), windowTabCount: $("windowTabCount"),
    code: $("codeOutput"), copy: $("copyCode"), downloadCurrent: $("downloadCurrent"),
    downloadAll: $("downloadAll"), saveHistory: $("saveHistory"), historyWrap: $("historyWrap"),
    historyList: $("historyList"), codeLabel: $("codeLabel"), tabs: [...document.querySelectorAll(".tab")]
  };

  function formatBytes(n) {
    return n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
  }
  function setCanvasImage(canvas, img) {
    const ctx = canvas.getContext("2d");
    const max = 700;
    const ratio = Math.min(max / img.width, max / img.height, 1);
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  function loadFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return alert("Format file harus PNG, JPG, atau WebP.");
    if (file.size > MAX_FILE_SIZE) return alert("Ukuran file maksimal 10 MB.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (state.image?.src?.startsWith("blob:")) URL.revokeObjectURL(state.image.src);
      state.image = img;
      state.fileName = file.name;
      setCanvasImage(els.original, img);
      els.original.classList.remove("hidden");
      els.originalEmpty.classList.add("hidden");
      els.fileMeta.classList.remove("hidden");
      els.fileName.textContent = file.name;
      $("fileSize").textContent = formatBytes(file.size);
      $("fileThumb").textContent = file.name.split(".").pop().toUpperCase().slice(0, 4);
      els.dropzone.classList.add("hidden");
      els.generate.disabled = false;
      els.status.textContent = "IMAGE READY";
      state.generated = false;
      resetOutput();
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert("Gagal membaca gambar."); };
    img.src = url;
  }
  function resetOutput() {
    state.body = []; state.window = []; state.generated = false;
    els.trace.classList.add("hidden"); els.traceEmpty.classList.remove("hidden");
    els.bodyStat.textContent = "—"; els.windowStat.textContent = "—"; els.outputStat.textContent = "—";
    els.bodyTabCount.textContent = "0"; els.windowTabCount.textContent = "0";
    els.code.value = ""; els.copy.disabled = els.downloadCurrent.disabled = els.downloadAll.disabled = els.saveHistory.disabled = true;
  }


  // Combined Smart Tracing: adaptive palette + connected components + edge-aware quadtree.
  // The existing FRL encoder only supports rectangular shape records (0002), so contours
  // are represented by adaptive, non-overlapping rectangles rather than unsupported polygons.
  function buildSmartShapesFromPixels(data, size, budget, quality) {
    const total = size * size;
    const samples = [];
    const stride = Math.max(1, Math.floor(total / 12000));
    for (let p = 0; p < total; p += stride) {
      const i = p * 4;
      if (data[i + 3] > 24) samples.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (!samples.length) return [];

    const paletteLimit = quality === "fast" ? 16 : quality === "fine" ? 32 : 24;
    // Deterministic farthest-point palette initialization followed by lightweight k-means.
    const palette = [samples[0].slice()];
    while (palette.length < Math.min(paletteLimit, samples.length)) {
      let best = null, bestDistance = -1;
      for (let s = 0; s < samples.length; s++) {
        const c = samples[s];
        let nearest = Infinity;
        for (const q of palette) {
          const d = (c[0]-q[0])**2 + (c[1]-q[1])**2 + (c[2]-q[2])**2;
          if (d < nearest) nearest = d;
        }
        if (nearest > bestDistance) { bestDistance = nearest; best = c; }
      }
      if (!best || bestDistance < 100) break;
      palette.push(best.slice());
    }
    const iterations = quality === "fast" ? 3 : 5;
    for (let it = 0; it < iterations; it++) {
      const sums = palette.map(() => [0,0,0,0]);
      for (const c of samples) {
        let bi=0, bd=Infinity;
        for (let k=0;k<palette.length;k++) {
          const q=palette[k], d=(c[0]-q[0])**2+(c[1]-q[1])**2+(c[2]-q[2])**2;
          if(d<bd){bd=d;bi=k;}
        }
        const a=sums[bi]; a[0]+=c[0];a[1]+=c[1];a[2]+=c[2];a[3]++;
      }
      for(let k=0;k<palette.length;k++) if(sums[k][3]) {
        palette[k]=sums[k].slice(0,3).map(v=>Math.round(v/sums[k][3]));
      }
    }

    const labels = new Int16Array(total);
    const alpha = new Uint8Array(total);
    for(let p=0;p<total;p++) {
      const i=p*4; alpha[p]=data[i+3];
      if(alpha[p] <= 24){labels[p]=-1;continue;}
      let bi=0,bd=Infinity;
      for(let k=0;k<palette.length;k++){
        const q=palette[k],d=(data[i]-q[0])**2+(data[i+1]-q[1])**2+(data[i+2]-q[2])**2;
        if(d<bd){bd=d;bi=k;}
      }
      labels[p]=bi;
    }

    // Connected-component metadata: area, perimeter and palette frequency.
    const seen = new Uint8Array(total), componentAt = new Int32Array(total);
    componentAt.fill(-1);
    const components=[];
    for(let p=0;p<total;p++) {
      if(seen[p] || labels[p]<0) continue;
      const id=components.length, color=labels[p], stack=[p];
      seen[p]=1; let area=0, perimeter=0, minX=size,minY=size,maxX=0,maxY=0;
      while(stack.length){
        const q=stack.pop(),x=q%size,y=(q/size)|0;
        componentAt[q]=id;area++;
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
        const ns=[x? q-1:-1,x+1<size?q+1:-1,y?q-size:-1,y+1<size?q+size:-1];
        for(const n of ns){
          if(n<0 || labels[n]!==color){perimeter++;continue;}
          if(!seen[n]){seen[n]=1;stack.push(n);}
        }
      }
      components.push({id,color,area,perimeter,minX,minY,maxX,maxY});
    }
    const paletteCounts = new Array(palette.length).fill(0);
    for (let p=0;p<total;p++) if(labels[p]>=0) paletteCounts[labels[p]]++;
    const compImportance = components.map(c => {
      const compactness = c.perimeter ? Math.min(1, (4*Math.PI*c.area)/(c.perimeter*c.perimeter)) : 0;
      return Math.log1p(c.area) * (1 + Math.min(2, c.perimeter/Math.max(1,Math.sqrt(c.area)*4))) * (0.85+compactness*0.15);
    });

    const minCell = quality === "fast" ? 4 : quality === "fine" ? 1 : 2;
    const leaves=[];
    function inspect(x,y,w,h){
      let first=-2, mixed=false, edge=0, alphaSum=0, count=0, colorSum=[0,0,0], compScore=0;
      const step=Math.max(1,Math.floor(Math.sqrt(w*h)/12));
      for(let yy=y;yy<y+h;yy+=step) for(let xx=x;xx<x+w;xx+=step){
        const p=yy*size+xx,l=labels[p];
        if(l<0){mixed=true;continue;}
        if(first===-2)first=l; else if(first!==l)mixed=true;
        const a=alpha[p]/255;alphaSum+=a;count++;
        colorSum[0]+=data[p*4];colorSum[1]+=data[p*4+1];colorSum[2]+=data[p*4+2];
        const cid=componentAt[p]; if(cid>=0)compScore=Math.max(compScore,compImportance[cid]);
      }
      // Edge activity catches thin details even when sparse sampling misses a color.
      for(let yy=y;yy<y+h;yy+=Math.max(1,step)) for(let xx=x;xx<x+w;xx+=Math.max(1,step)){
        const p=yy*size+xx,l=labels[p];
        if(xx+1<size && labels[p+1]!==l)edge++;
        if(yy+1<size && labels[p+size]!==l)edge++;
      }
      if(!count)return;
      const split = (mixed || edge>Math.max(0,(w+h)/3)) && Math.max(w,h)>minCell;
      if(split){
        const hw=Math.floor(w/2),hh=Math.floor(h/2);
        if(hw&&hh){inspect(x,y,hw,hh);inspect(x+hw,y,w-hw,hh);inspect(x,y+hh,hw,h-hh);inspect(x+hw,y+hh,w-hw,h-hh);return;}
        if(w>1){inspect(x,y,Math.floor(w/2),h);inspect(x+Math.floor(w/2),y,w-Math.floor(w/2),h);return;}
        if(h>1){inspect(x,y,w,Math.floor(h/2));inspect(x,y+Math.floor(h/2),w,h-Math.floor(h/2));return;}
      }
      const color=count?colorSum.map(v=>Math.round(v/count)):palette[Math.max(0,first)];
      // Score balances area, edge/detail density, component salience and color rarity.
      const rarity=first>=0 ? 1/Math.sqrt(1+(paletteCounts[first]||0)) : 0;
      const area=w*h, detail=edge/(Math.max(1,w+h));
      leaves.push({x,y,w,h,color,alpha:alphaSum/count,
        score:Math.log1p(area)*(1+detail*2)+compScore*0.12+rarity*0.02});
    }
    // Start from square-ish tiles; recursion refines mixed boundaries, avoiding scanline bands.
    const tile=quality==="fast"?32:16;
    for(let y=0;y<size;y+=tile) for(let x=0;x<size;x+=tile)
      inspect(x,y,Math.min(tile,size-x),Math.min(tile,size-y));

    const cap=Math.max(1,Math.floor(budget));
    if(leaves.length>cap){
      leaves.sort((a,b)=>b.score-a.score);
      leaves.length=cap;
    }
    const factor=256/size;
    return leaves.map(s=>({
      x:Math.round(s.x*factor),y:Math.round(s.y*factor),
      w:Math.max(1,Math.round(s.w*factor)),h:Math.max(1,Math.round(s.h*factor)),
      color:s.color,alpha:s.alpha
    }));
  }

  function buildHybridShapes(img, budget, quality, backgroundMode) {
    const size = 256;
    const canvas = $("workCanvas"), ctx = canvas.getContext("2d",{willReadFrequently:true});
    canvas.width=canvas.height=size;
    ctx.clearRect(0,0,size,size);
    if(backgroundMode==="white" || backgroundMode==="black"){
      ctx.fillStyle=backgroundMode==="white"?"#fff":"#000";
      ctx.fillRect(0,0,size,size);
    }
    const scale=Math.min(size/img.width,size/img.height);
    const w=img.width*scale,h=img.height*scale;
    // A tiny blur suppresses isolated compression noise without aggressive smoothing.
    ctx.save();
    ctx.filter="blur(0.25px)";
    ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
    ctx.restore();
    const pixels=ctx.getImageData(0,0,size,size).data;
    return buildSmartShapesFromPixels(pixels,size,budget,quality);
  }

  // Documented record layout: uint16 shape + five int16 values + RGB + opacity + blend + flags.
  // Big-endian output; each record is exactly 18 bytes / 36 hexadecimal characters.
  function int16hex(value) {
    const n=Math.max(-32768,Math.min(32767,Math.round(value)));
    return (n & 0xffff).toString(16).padStart(4,"0").toUpperCase();
  }
  function encodeShape(shape) {
    const cx=(shape.x+shape.w/2)-128, cy=(shape.y+shape.h/2)-128;
    // World canvas is centered at 0, with a 2x coordinate multiplier.
    const px=cx*4, py=cy*4;
    const sx=Math.max(1,shape.w*4), sy=Math.max(1,shape.h*4);
    const rgb=shape.color.map(v=>Math.round(v).toString(16).padStart(2,"0")).join("").toUpperCase();
    const alpha=Math.round(Math.max(0,Math.min(1,shape.alpha))*255).toString(16).padStart(2,"0").toUpperCase();
    return "0002"+int16hex(px)+int16hex(py)+int16hex(sx)+int16hex(sy)+int16hex(0)+rgb+alpha+"00"+"01";
  }
  function makeGroupedCode(records) {
    if (!records.length) return "";

    // Experimental FRL group wrapper; individual shape records remain editable.
    const groupHeader =
      "FFFF00000000006400640000FFFFFFFF0001";

    return [
      groupHeader,
      "<",
      ...records,
      ">"
    ].join("\n");
  }

  function renderTrace(shapes) {
    const canvas=els.trace,ctx=canvas.getContext("2d");
    canvas.width=canvas.height=512;
    ctx.clearRect(0,0,512,512);
    for(const s of shapes){
      ctx.fillStyle=`rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.alpha})`;
      ctx.fillRect(s.x*2,s.y*2,s.w*2,s.h*2);
    }
    els.trace.classList.remove("hidden");els.traceEmpty.classList.add("hidden");
  }
  function generate() {
    if(!state.image) return;
    els.generate.disabled=true;
    els.generate.querySelector("span").textContent="Tracing image…";
    els.status.textContent="PROCESSING";
    // Yield once so the interface can paint the busy state.
    setTimeout(()=>{
      try{
        const quality=els.quality.value,bg=els.background.value;
        const bodyShapes=buildHybridShapes(state.image,Number(els.bodyCount.value),quality,bg);
        const windowShapes=buildHybridShapes(state.image,Number(els.windowCount.value),quality,bg);
        state.body=bodyShapes.map(encodeShape);
        state.window=windowShapes.map(encodeShape);
        state.generated=true;
        renderTrace(bodyShapes);
        els.bodyStat.textContent=state.body.length.toLocaleString("en-US");
        els.windowStat.textContent=state.window.length.toLocaleString("en-US");
        els.bodyTabCount.textContent=state.body.length;
        els.windowTabCount.textContent=state.window.length;
        const total=state.body.join("\n").length+state.window.join("\n").length;
        els.outputStat.textContent=formatBytes(total);
        els.status.textContent="TRACE COMPLETE";
        els.copy.disabled=els.downloadCurrent.disabled=els.downloadAll.disabled=els.saveHistory.disabled=false;
        selectTab(state.activeTab);
      }catch(err){console.error(err);alert("Konversi gagal. Coba gambar lain atau kurangi jumlah shape.");els.status.textContent="TRACE FAILED";}
      finally{els.generate.disabled=false;els.generate.querySelector("span").textContent="Generate livery codes";}
    },30);
  }
  function selectTab(tab) {
    state.activeTab=tab;
    els.tabs.forEach(btn=>{const active=btn.dataset.tab===tab;btn.classList.toggle("active",active);btn.setAttribute("aria-selected",String(active));});
    const records=state[tab]||[];
    els.code.value = makeGroupedCode(records);
    els.codeLabel.textContent=`${tab.toUpperCase()} / HEX SHAPE RECORDS`;
    els.copy.disabled=els.downloadCurrent.disabled=!state.generated;
  }
  function downloadText(filename,text) {
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function copyCode() {
    try{await navigator.clipboard.writeText(els.code.value);els.copy.textContent="✓ Copied";setTimeout(()=>els.copy.textContent="▢ Copy code",1400);}
    catch{els.code.focus();els.code.select();document.execCommand("copy");}
  }
  function exportAll() {
    downloadText(
      "FRL-Body-Code.txt",
      makeGroupedCode(state.body)
    );

    setTimeout(() => {
      downloadText(
        "FRL-Window-Code.txt",
        makeGroupedCode(state.window)
      );
    }, 250);
  }
  function loadHistory() {
    try{return JSON.parse(localStorage.getItem(historyKey)||"[]");}catch{return [];}
  }
  function renderHistory() {
    const items=loadHistory();els.historyList.innerHTML="";
    if(!items.length){els.historyList.innerHTML='<span class="muted">No saved conversions yet.</span>';return;}
    items.forEach((item,index)=>{
      const row=document.createElement("div");row.className="history-item";
      const name=document.createElement("span");name.textContent=`${item.name} · ${item.body} body / ${item.window} window`;
      const restore=document.createElement("button");restore.textContent="Restore codes";
      restore.addEventListener("click",()=>{state.body=item.bodyCode;state.window=item.windowCode;state.generated=true;els.bodyStat.textContent=state.body.length;els.windowStat.textContent=state.window.length;els.bodyTabCount.textContent=state.body.length;els.windowTabCount.textContent=state.window.length;els.copy.disabled=els.downloadCurrent.disabled=els.downloadAll.disabled=els.saveHistory.disabled=false;selectTab("body");});
      row.append(name,restore);els.historyList.append(row);
    });
  }
  function saveHistory() {
    const items=loadHistory();
    items.unshift({name:state.fileName||"Untitled image",body:state.body.length,window:state.window.length,bodyCode:state.body,windowCode:state.window,created:Date.now()});
    localStorage.setItem(historyKey,JSON.stringify(items.slice(0,8)));
    els.historyWrap.classList.remove("hidden");renderHistory();
  }

  els.fileInput.addEventListener("change",e=>loadFile(e.target.files[0]));
  ["dragenter","dragover"].forEach(type=>els.dropzone.addEventListener(type,e=>{e.preventDefault();els.dropzone.classList.add("dragover");}));
  ["dragleave","drop"].forEach(type=>els.dropzone.addEventListener(type,e=>{e.preventDefault();els.dropzone.classList.remove("dragover");}));
  els.dropzone.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));
  els.removeImage.addEventListener("click",()=>{state.image=null;els.fileInput.value="";els.fileMeta.classList.add("hidden");els.dropzone.classList.remove("hidden");els.generate.disabled=true;els.original.classList.add("hidden");els.originalEmpty.classList.remove("hidden");els.status.textContent="WAITING FOR IMAGE";resetOutput();});
  els.bodyCount.addEventListener("input",()=>els.bodyCountValue.textContent=els.bodyCount.value);
  els.windowCount.addEventListener("input",()=>els.windowCountValue.textContent=els.windowCount.value);
  els.quality.addEventListener("change",()=>els.qualityValue.textContent=({fast:"Fast",balanced:"Balanced",fine:"Fine detail"})[els.quality.value]);
  els.generate.addEventListener("click",generate);
  els.tabs.forEach(btn=>btn.addEventListener("click",()=>selectTab(btn.dataset.tab)));
  els.copy.addEventListener("click",copyCode);
  els.downloadCurrent.addEventListener("click",()=>downloadText(`FRL-${state.activeTab}-Code.txt`,els.code.value));
  els.downloadAll.addEventListener("click",exportAll);
  els.saveHistory.addEventListener("click",saveHistory);
  $("clearHistory").addEventListener("click",()=>{localStorage.removeItem(historyKey);renderHistory();});
  $("historyWrap").classList.add("hidden");
})();