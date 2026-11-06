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

  // Reads pixels on a square transparent canvas; preserves aspect ratio.
  function makePixelBuffer(img, backgroundMode) {
    const size = 256, canvas = $("workCanvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    if (backgroundMode === "white") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size); }
    if (backgroundMode === "black") { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size); }
    const scale = Math.min(size / img.width, size / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return { data: ctx.getImageData(0, 0, size, size).data, size };
  }
  function regionStats(data, size, x, y, w, h) {
    // Sample a compact grid to estimate color variance and edge activity.
    const samples = [], stepX = Math.max(1, Math.floor(w / 8)), stepY = Math.max(1, Math.floor(h / 8));
    let r=0,g=0,b=0,a=0,n=0, lumMin=255,lumMax=0,edge=0,prev=null;
    for (let yy=y; yy<y+h; yy+=stepY) {
      prev = null;
      for (let xx=x; xx<x+w; xx+=stepX) {
        const i=(yy*size+xx)*4, alpha=data[i+3]/255;
        if (alpha < .025) continue;
        const rr=data[i],gg=data[i+1],bb=data[i+2], lum=.2126*rr+.7152*gg+.0722*bb;
        r+=rr*alpha;g+=gg*alpha;b+=bb*alpha;a+=alpha;n++;
        lumMin=Math.min(lumMin,lum);lumMax=Math.max(lumMax,lum);
        if(prev!==null) edge+=Math.abs(lum-prev);
        prev=lum;samples.push([rr,gg,bb,alpha]);
      }
    }
    if(!n) return {empty:true, color:[0,0,0], alpha:0, score:0};
    const color=[Math.round(r/a),Math.round(g/a),Math.round(b/a)];
    const variance=(lumMax-lumMin)/255, edgeScore=samples.length>1?edge/(samples.length*255):0;
    return {empty:false,color,alpha:Math.min(1,a/n),score:variance*.72+edgeScore*.55};
  }
  function buildHybridShapes(img, budget, quality, backgroundMode) {
    const {data,size}=makePixelBuffer(img,backgroundMode);
    const threshold = quality==="fast" ? .48 : quality==="fine" ? .19 : .31;
    const minCell = quality==="fast" ? 16 : quality==="fine" ? 5 : 8;
    const leaves=[];
    function split(x,y,w,h,depth) {
      const stats=regionStats(data,size,x,y,w,h);
      if(stats.empty) return;
      const canSplit=w>minCell*2 && h>minCell*2 && leaves.length+4<=budget && depth<7;
      if(canSplit && stats.score>threshold) {
        const w1=Math.floor(w/2),h1=Math.floor(h/2);
        split(x,y,w1,h1,depth+1);
        split(x+w1,y,w-w1,h1,depth+1);
        split(x,y+h1,w1,h-h1,depth+1);
        split(x+w1,y+h1,w-w1,h-h1,depth+1);
      } else {
        leaves.push({x,y,w,h,...stats});
      }
    }
    split(0,0,size,size,0);
    // If the tree leaves unused budget, split the most visually complex cells.
    while(leaves.length<budget) {
      let idx=-1,best=-1;
      for(let i=0;i<leaves.length;i++){
        const c=leaves[i],score=c.score*Math.min(c.w,c.h);
        if(c.w>=minCell*2&&c.h>=minCell*2&&score>best){best=score;idx=i;}
      }
      if(idx<0) break;
      const c=leaves.splice(idx,1)[0],w1=Math.floor(c.w/2),h1=Math.floor(c.h/2);
      for(const [x,y,w,h] of [[c.x,c.y,w1,h1],[c.x+w1,c.y,c.w-w1,h1],[c.x,c.y+h1,w1,c.h-h1],[c.x+w1,c.y+h1,c.w-w1,c.h-h1]]){
        const s=regionStats(data,size,x,y,w,h);if(!s.empty)leaves.push({x,y,w,h,...s});
      }
    }
    return leaves.slice(0,budget);
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
    els.code.value=records.join("\n");
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
    downloadText("FRL-Body-Code.txt",state.body.join("\n"));
    setTimeout(()=>downloadText("FRL-Window-Code.txt",state.window.join("\n")),250);
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