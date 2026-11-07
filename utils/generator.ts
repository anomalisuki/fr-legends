/**
 * FRL Smart Livery Collaborator
 * Local, deterministic computer-vision pipeline. No external AI/API is required.
 * The FRL 36-character shape record and FFFF parent header are kept intact.
 */

export function toSignedHex(value: number): string {
  const n = Math.max(-32768, Math.min(32767, Math.round(value)));
  return (n < 0 ? 0x10000 + n : n).toString(16).padStart(4, '0').toUpperCase();
}

type RGB = { r: number; g: number; b: number };
type Rect = { x: number; y: number; w: number; h: number; color: RGB; area: number; score: number; label: number };
type Options = { maxLayers?: number; quality?: 'detail' | 'balanced' | 'lite'; colorCount?: number; preserveBackground?: boolean };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist2 = (a: RGB, b: RGB) => (a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2;

/** Build a compact RGB histogram after 5-bit channel quantization. */
function buildHistogram(data: Uint8Array, width: number, height: number) {
  const hist = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < width * height; i++) {
    const p = i * 4, a = data[p + 3];
    if (a < 24) continue;
    const r = data[p], g = data[p+1], b = data[p+2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const v = hist.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    v.count++; v.r += r; v.g += g; v.b += b; hist.set(key, v);
  }
  return [...hist.values()].map(v => ({ count: v.count, color: { r: v.r/v.count, g: v.g/v.count, b: v.b/v.count } }));
}

/** Weighted deterministic k-means over histogram bins (small, browser/server friendly). */
function quantize(data: Uint8Array, width: number, height: number, requested: number) {
  const bins = buildHistogram(data, width, height);
  if (!bins.length) return { labels: new Int16Array(width*height).fill(-1), palette: [] as RGB[], populations: [] as number[] };
  const k = clamp(Math.min(requested, bins.length), 2, 32);
  const sorted = [...bins].sort((a,b) => b.count-a.count);
  const centers: RGB[] = [];
  centers.push({ ...sorted[0].color });
  while (centers.length < k) {
    let best = sorted[0].color, bestScore = -1;
    for (const bin of sorted) {
      const nearest = Math.min(...centers.map(c => dist2(c, bin.color)));
      const score = nearest * Math.sqrt(bin.count);
      if (score > bestScore) { bestScore = score; best = bin.color; }
    }
    centers.push({ ...best });
  }
  const assignments = new Int16Array(bins.length);
  for (let iter=0; iter<7; iter++) {
    const sums = centers.map(() => ({ r:0,g:0,b:0,n:0 }));
    bins.forEach((bin, i) => {
      let best=0, bd=Infinity;
      centers.forEach((c,j) => { const d=dist2(c,bin.color); if(d<bd){bd=d;best=j;} });
      assignments[i]=best; const s=sums[best]; s.r+=bin.color.r*bin.count; s.g+=bin.color.g*bin.count; s.b+=bin.color.b*bin.count; s.n+=bin.count;
    });
    centers.forEach((c,i) => { const s=sums[i]; if(s.n){c.r=s.r/s.n;c.g=s.g/s.n;c.b=s.b/s.n;} });
  }
  const binToLabel = new Map<number,number>();
  bins.forEach((bin,i) => {
    const key = ((Math.round(bin.color.r) >> 3) << 10) | ((Math.round(bin.color.g) >> 3) << 5) | (Math.round(bin.color.b) >> 3);
    binToLabel.set(key, assignments[i]);
  });
  const labels = new Int16Array(width*height); labels.fill(-1);
  const populations = new Array(centers.length).fill(0);
  for(let i=0;i<width*height;i++){
    const p=i*4; if(data[p+3]<24) continue;
    const key=((data[p]>>3)<<10)|((data[p+1]>>3)<<5)|(data[p+2]>>3);
    let label=binToLabel.get(key);
    if(label===undefined){let bd=Infinity;label=0;centers.forEach((c,j)=>{const d=dist2(c,{r:data[p],g:data[p+1],b:data[p+2]});if(d<bd){bd=d;label=j;}});}
    labels[i]=label; populations[label]++;
  }
  return { labels, palette: centers.map(c=>({r:Math.round(c.r),g:Math.round(c.g),b:Math.round(c.b)})), populations };
}

/** 4-connected component extraction. Keeps disconnected same-color objects separate. */
function components(labels: Int16Array, width: number, height: number) {
  const seen = new Uint8Array(labels.length);
  const result: Array<{ label:number; pixels:number[]; area:number; touchesEdge:boolean; minX:number; minY:number; maxX:number; maxY:number; perimeter:number }> = [];
  const queue = new Int32Array(labels.length);
  for(let start=0;start<labels.length;start++){
    const label=labels[start]; if(label<0 || seen[start]) continue;
    let head=0,tail=0; queue[tail++]=start; seen[start]=1;
    const pixels:number[]=[]; let minX=width,minY=height,maxX=0,maxY=0,touchesEdge=false,perimeter=0;
    while(head<tail){
      const idx=queue[head++], x=idx%width, y=(idx/width)|0; pixels.push(idx);
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      if(x===0||y===0||x===width-1||y===height-1) touchesEdge=true;
      const neighbors=[x>0?idx-1:-1,x<width-1?idx+1:-1,y>0?idx-width:-1,y<height-1?idx+width:-1];
      for(const n of neighbors){ if(n<0 || labels[n]!==label){perimeter++;continue;} if(!seen[n]){seen[n]=1;queue[tail++]=n;} }
    }
    result.push({label,pixels,area:pixels.length,touchesEdge,minX,minY,maxX,maxY,perimeter});
  }
  return result;
}

/** Turn component masks into vertically merged horizontal runs, not one-pixel scanline strips. */
function componentRects(comp: ReturnType<typeof components>[number], width: number, palette: RGB[], colorFrequency: number): Rect[] {
  const rows = new Map<number, number[]>();
  for(const idx of comp.pixels){const y=(idx/width)|0; const xs=rows.get(y)||[];xs.push(idx%width);rows.set(y,xs);}
  const active = new Map<string, {x:number;y:number;w:number;h:number}>();
  const rects: Rect[]=[];
  const ys=[...rows.keys()].sort((a,b)=>a-b);
  let previousY=-2;
  const flush=(key:string,r:{x:number;y:number;w:number;h:number})=>{
    const area=r.w*r.h;
    // Importance favors area, boundary-rich shapes and uncommon colors; tiny isolated noise is downweighted.
    const compactness=comp.perimeter>0 ? Math.min(2.5, comp.area/Math.max(1,comp.perimeter)) : 1;
    const edgeFactor=1 + Math.min(1.8, comp.perimeter/Math.max(1,comp.area)*2.2);
    const rarity=1 + Math.min(0.8, 1/Math.sqrt(Math.max(1,colorFrequency))*5);
    const noisePenalty=area<=2 ? 0.35 : area<=5 ? 0.7 : 1;
    rects.push({x:r.x,y:r.y,w:r.w,h:r.h,color:palette[comp.label],area,label:comp.label,score:Math.sqrt(area)*edgeFactor*rarity*noisePenalty*(0.8+Math.min(1.2,compactness))});
  };
  for(const y of ys){
    if(y!==previousY+1){ for(const [k,r] of active) flush(k,r); active.clear(); }
    const xs=rows.get(y)!.sort((a,b)=>a-b); const runs:Array<{x:number;w:number}>=[];
    for(let i=0;i<xs.length;){let j=i+1;while(j<xs.length&&xs[j]===xs[j-1]+1)j++;runs.push({x:xs[i],w:xs[j-1]-xs[i]+1});i=j;}
    const next=new Map<string,{x:number;y:number;w:number;h:number}>();
    for(const run of runs){const key=`${run.x}:${run.w}`;const old=active.get(key);next.set(key,old?{...old,h:old.h+1}:{x:run.x,y,w:run.w,h:1});}
    for(const [k,r] of active) if(!next.has(k)) flush(k,r);
    active.clear(); for(const [k,r] of next) active.set(k,r);
    previousY=y;
  }
  for(const [k,r] of active) flush(k,r);
  return rects;
}

export function analyzeImage(pixels: Uint8Array, width: number, height: number, options: Options = {}) {
  const quality=options.quality||'balanced';
  const colorCount=options.colorCount || (quality==='detail'?32:quality==='lite'?16:24);
  const q=quantize(pixels,width,height,colorCount);
  const comps=components(q.labels,width,height);
  const dominant=q.populations.indexOf(Math.max(...q.populations));
  const dominantArea=q.populations[dominant]||0;
  // Remove only a dominant background component connected to the image border and large enough to be background-like.
  const bgCandidate=comps.filter(c=>c.label===dominant&&c.touchesEdge).sort((a,b)=>b.area-a.area)[0];
  const bgIds=new Set<number>();
  if(!options.preserveBackground && bgCandidate && bgCandidate.area >= width*height*0.06) bgCandidate.pixels.forEach(i=>bgIds.add(i));
  const allRects:Rect[]=[];
  for(const c of comps){if(c===bgCandidate && bgIds.size) continue;allRects.push(...componentRects(c,width,q.palette,q.populations[c.label]||1));}
  const cap=clamp(options.maxLayers||1300,1,10000);
  allRects.sort((a,b)=>b.score-a.score || b.area-a.area);
  const selected=allRects.slice(0,cap);
  selected.sort((a,b)=>a.y-b.y||a.x-b.x);
  const totalArea=selected.reduce((s,r)=>s+r.area,0);
  return { rects:selected, stats:{ colors:q.palette.length, components:comps.length, candidateShapes:allRects.length, shapes:selected.length, coverage:Math.round(totalArea/(width*height)*100), removedBackground:bgIds.size>0, quality } };
}

/**
 * Collaborator pass: evaluate several quantization strategies and retain the best
 * result against coverage, detail retention, and layer-budget objectives.
 */
export function generateCollaborativeResult(pixels: Uint8Array, width: number, height: number, spriteId='0002', options: Options = {}) {
  const quality=options.quality||'balanced';
  const paletteTrials=options.colorCount ? [options.colorCount] : quality==='detail' ? [24,28,32] : quality==='lite' ? [12,16,20] : [16,24,32];
  const cap=clamp(options.maxLayers||1300,1,10000);
  let best: ReturnType<typeof analyzeImage> | null=null;
  let bestScore=-Infinity;
  let bestColors=paletteTrials[0];
  for(const colors of paletteTrials){
    const candidate=analyzeImage(pixels,width,height,{...options,maxLayers:cap,colorCount:colors});
    const fill=candidate.stats.coverage/100;
    const layerUse=candidate.stats.shapes/cap;
    const colorUse=candidate.stats.colors/32;
    const truncation=candidate.stats.candidateShapes>cap ? Math.min(1,(candidate.stats.candidateShapes-cap)/Math.max(1,cap)) : 0;
    const score=fill*55 + Math.min(1,layerUse)*18 + colorUse*18 - truncation*12;
    if(score>bestScore){bestScore=score;best=candidate;bestColors=colors;}
  }
  const chosen=best || analyzeImage(pixels,width,height,{...options,maxLayers:cap});
  let code='FFFF00000000006400640000FFFFFFFF0001\n<\n';
  const halfW=width/2,halfH=height/2;
  for(const shape of chosen.rects){
    const posX=toSignedHex((shape.x-halfW)*8), posY=toSignedHex((shape.y-halfH)*8);
    const xSize=clamp(Math.round(shape.w*8),1,65535).toString(16).padStart(4,'0').toUpperCase();
    const ySize=clamp(Math.round(shape.h*8),1,65535).toString(16).padStart(4,'0').toUpperCase();
    const color=`${shape.color.r.toString(16).padStart(2,'0')}${shape.color.g.toString(16).padStart(2,'0')}${shape.color.b.toString(16).padStart(2,'0')}`.toUpperCase();
    code+=`  ${spriteId}${posX}${posY}${xSize}${ySize}0000${color}FF0001\n`;
  }
  return { code:code+'>', stats:{...chosen.stats, selectedPalette:bestColors, optimizerPasses:paletteTrials.length, score:Math.round(bestScore*10)/10} };
}

/** Encode each rectangle using the repository's existing 36-character FRL record layout. */
export function generateFRLCode(pixels: Uint8Array, width: number, height: number, spriteId='0002', maxLayers=1300, options: Options = {}): string {
  if(width<1||height<1||pixels.length<width*height*4) throw new Error('Invalid image buffer dimensions');
  const analysis=analyzeImage(pixels,width,height,{...options,maxLayers:options.maxLayers||maxLayers});
  let output='FFFF00000000006400640000FFFFFFFF0001\n<\n';
  const halfW=width/2,halfH=height/2;
  for(const shape of analysis.rects){
    const posX=toSignedHex((shape.x-halfW)*8);
    const posY=toSignedHex((shape.y-halfH)*8);
    const xSize=clamp(Math.round(shape.w*8),1,65535).toString(16).padStart(4,'0').toUpperCase();
    const ySize=clamp(Math.round(shape.h*8),1,65535).toString(16).padStart(4,'0').toUpperCase();
    const color=`${shape.color.r.toString(16).padStart(2,'0')}${shape.color.g.toString(16).padStart(2,'0')}${shape.color.b.toString(16).padStart(2,'0')}`.toUpperCase();
    output+=`  ${spriteId}${posX}${posY}${xSize}${ySize}0000${color}FF0001\n`;
  }
  return output+'>';
}

export default { toSignedHex, analyzeImage, generateFRLCode };
