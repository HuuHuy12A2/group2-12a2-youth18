(function(){
'use strict';

/* ==================== CẤU HÌNH & TỐI ƯU MOBILE ==================== */
var isMobile = window.matchMedia("(max-width: 768px)").matches;
var DPR = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2); 
var EPS = 0.0001;
var DEG = Math.PI / 180;
var MAX_RAYS = 6, MIN_RAYS = 2;

var cvB = document.getElementById('dust-b');
var cxB = cvB.getContext('2d');
var cvT = document.getElementById('dust-t');
var cxT = cvT.getContext('2d');

var raysB = [], raysT = [];
var raysBCache = [], raysTCache = [];
var dustB = [], dustT = [];
var spkB = [], spkT = [];
var gTime = 0, lastT = performance.now();
var W, H;
var windTemp = { x: 0, y: 0 };

/* ==================== CANVAS SETUP ==================== */
function sizeCanvas(cv, cx){
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function initSize() {
    W = window.innerWidth; H = window.innerHeight;
    sizeCanvas(cvB, cxB); sizeCanvas(cvT, cxT);
}
initSize();
window.addEventListener('resize', initSize);

/* ==================== PRE-RENDER TEXTURES ==================== */
function mkStripTx(w, fade, r, g, b){
    fade = Math.min(fade, 0.49); w = Math.max(1, Math.ceil(w));
    var c = document.createElement('canvas'); c.width = w; c.height = 2;
    var cx = c.getContext('2d');
    var gr = cx.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba('+r+','+g+','+b+',0)');
    gr.addColorStop(fade, 'rgba('+r+','+g+','+b+',1)');
    gr.addColorStop(1-fade, 'rgba('+r+','+g+','+b+',1)');
    gr.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, w, 2);
    return c;
}
var RY_R=230, RY_G=198, RY_B=45;
var stripTx = [
    mkStripTx(100, 0.15, RY_R, RY_G, RY_B),
    mkStripTx(100, 0.27, RY_R, RY_G, RY_B),
    mkStripTx(100, 0.42, RY_R, RY_G, RY_B)
];

function mkDustTexture(size, r, g, b) {
    var c = document.createElement('canvas'); c.width = c.height = size * 2;
    var cx = c.getContext('2d');
    var gr = cx.createRadialGradient(size, size, 0, size, size, size);
    gr.addColorStop(0, 'rgba('+r+','+g+','+b+',1)');
    gr.addColorStop(0.45, 'rgba('+r+','+g+','+b+',.32)');
    gr.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, size*2, size*2);
    return c;
}
var dustNormWarmTx = mkDustTexture(16, 255, 222, 165);
var dustNormCoolTx = mkDustTexture(16, 212, 192, 148);
var dustCoreTx = mkDustTexture(16, 255, 235, 150);

function mkGlowTx(rad, r, g, b){
    var s = Math.ceil(rad*2), c = document.createElement('canvas');
    c.width = c.height = s; var cx = c.getContext('2d');
    var gr = cx.createRadialGradient(rad,rad,0,rad,rad,rad);
    gr.addColorStop(0, 'rgba('+r+','+g+','+b+',1)');
    gr.addColorStop(0.15, 'rgba('+r+','+g+','+b+',0.5)');
    gr.addColorStop(0.4, 'rgba('+r+','+g+','+b+',0.12)');
    gr.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, s, s);
    return c;
}
var dustGlowTx = mkGlowTx(32, 255, 225, 120);

function mkSparkleTexture() {
    var s = 64; var c = document.createElement('canvas'); c.width = c.height = s;
    var cx = c.getContext('2d');
    var gr = cx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    gr.addColorStop(0, 'rgba(255,253,244,1)');
    gr.addColorStop(0.15, 'rgba(255,248,228,0.6)');
    gr.addColorStop(0.5, 'rgba(255,248,228,0.1)');
    gr.addColorStop(1, 'rgba(255,248,228,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, s, s);
    cx.globalCompositeOperation = 'lighter';
    cx.strokeStyle = 'rgba(255,251,238,0.8)'; cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(s/2 - s/3, s/2); cx.lineTo(s/2 + s/3, s/2);
    cx.moveTo(s/2, s/2 - s/3); cx.lineTo(s/2, s/2 + s/3);
    cx.stroke();
    return c;
}
var sparkleTx = mkSparkleTexture();

/* ==================== TOÁN HỌC CƠ BẢN ==================== */
function cl(v,lo,hi){ return v < lo ? lo : v > hi ? hi : v; }
function lp(a,b,t){ return a + (b - a) * t; }
function h2(ix,iy){ var h = ix * 374761393 + iy * 668265263; h = (h ^ (h >> 13)) * 1274126177; return (h & 0x7fffffff) / 0x7fffffff; }
function n2d(x,y){ var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; var sx = fx*fx*(3-2*fx), sy = fy*fy*(3-2*fy); var a = h2(ix,iy), b = h2(ix+1,iy), c = h2(ix,iy+1), d = h2(ix+1,iy+1); return a + (b-a)*sx + (c-a)*sy + (a-b-c+d)*sx*sy; }

/* ==================== WIND & STEERING ==================== */
function wind(x, y, t, layer, out){
    var s = layer === 'top' ? 1.35 : 0.7;
    out.x = -0.0065*s + Math.sin(y*0.0072+t*0.44)*0.0095*s + Math.cos(x*0.0042+t*0.27)*0.006*s + Math.sin(y*0.0018+t*0.1)*0.008*s;
    out.y = 0.0032*s + Math.cos(x*0.0053+t*0.35)*0.0042*s + Math.sin(y*0.0031+t*0.18)*0.003*s + Math.cos(x*0.0022+t*0.08)*0.005*s;
}

function steer(p, t){
    var dx = p.tx-p.x, dy = p.ty-p.y, d = Math.sqrt(dx*dx+dy*dy);
    if(d < EPS) d = EPS;
    var dvx = (dx/d)*p.ms, dvy = (dy/d)*p.ms;
    var sx = dvx-p.vx, sy = dvy-p.vy;
    var sm = Math.sqrt(sx*sx+sy*sy);
    if(sm > p.mf){ sx=(sx/sm)*p.mf; sy=(sy/sm)*p.mf; }
    wind(p.x, p.y, t, p.ly, windTemp); 
    sx += windTemp.x; sy += windTemp.y;
    sx += Math.sin(t*p.wf+p.ph)*p.wa*0.008;
    sy += Math.cos(t*p.wf*0.67+p.ph)*p.wa*0.006;
    p.vx += sx; p.vy += sy;
    var sp = Math.sqrt(p.vx*p.vx+p.vy*p.vy);
    if(sp > p.ms){ p.vx=(p.vx/sp)*p.ms; p.vy=(p.vy/sp)*p.ms; }
    p.x += p.vx; p.y += p.vy;
    var m = 35;
    if(p.x < -m) p.x = W+m; if(p.x > W+m) p.x = -m;
    if(p.y < -m) p.y = H+m; if(p.y > H+m) p.y = -m;
    if(d < p.th){ p.tx = Math.random()*W; p.ty = Math.random()*H; p.th = 35+Math.random()*90; }
}

/* ==================== KHỞI TẠO HẠT BỤI & SPARKLE ==================== */
function mkDust(layer){
    var top = layer === 'top';
    return { 
        x: Math.random()*W, y: Math.random()*H, 
        vx: (Math.random()-0.5)*0.1, vy: (Math.random()-0.5)*0.1, 
        // TỐC ĐỘ GIẢM 30%
        ms: top ? 0.28+Math.random()*0.34 : 0.14+Math.random()*0.2, 
        mf: top ? 0.01+Math.random()*0.011 : 0.005+Math.random()*0.006, 
        // GIỮ NGUYÊN KÍCH THƯỚC GỐC ĐỂ TRÁNH MẤT HẠT
        sz: Math.max(EPS, top ? 1.2+Math.random()*2.2 : 0.4+Math.random()*1.4), 
        op: top ? 0.22+Math.random()*0.38 : 0.1+Math.random()*0.26, 
        tx: Math.random()*W, ty: Math.random()*H, th: 35+Math.random()*85, 
        ly: layer, ph: Math.random()*Math.PI*2, wf: 0.8+Math.random()*2.2, wa: 0.2+Math.random()*0.6 
    };
}

function mkSparkle(layer){
    var top = layer === 'top';
    return { 
        x: Math.random()*W, y: Math.random()*H, 
        vx: (Math.random()-0.5)*0.08, vy: (Math.random()-0.5)*0.08, 
        // TỐC ĐỘ GIẢM 30%
        ms: top ? 0.22+Math.random()*0.26 : 0.10+Math.random()*0.16, 
        mf: top ? 0.012+Math.random()*0.014 : 0.005+Math.random()*0.009, 
        // GIỮ NGUYÊN KÍCH THƯỚC GỐC
        sz: Math.max(EPS, 0.5+Math.random()*1.5), 
        tx: Math.random()*W, ty: Math.random()*H, th: 45+Math.random()*110, 
        ly: layer, ph: Math.random()*Math.PI*2, wf: 0.9+Math.random()*2.5, wa: 0.15+Math.random()*0.45, 
        flSpd: 1.0+Math.random()*3.0, flPh: Math.random()*Math.PI*2, 
        baseOp: top ? 0.88+Math.random()*0.12 : 0.65+Math.random()*0.3 
    };
}

function initParticles() {
    dustB = []; dustT = []; spkB = []; spkT = [];
    var dustBCount = isMobile ? 45 : 80;
    var dustTCount = isMobile ? 25 : 50;
    var spkBCount = isMobile ? 10 : 18;
    var spkTCount = isMobile ? 6 : 12;
    for(var i = 0; i < dustBCount; i++) dustB.push(mkDust('bottom'));
    for(var i = 0; i < dustTCount; i++) dustT.push(mkDust('top'));
    for(var i = 0; i < spkBCount; i++) spkB.push(mkSparkle('bottom'));
    for(var i = 0; i < spkTCount; i++) spkT.push(mkSparkle('top'));
}
initParticles();

/* ==================== VOLUME RAYS ==================== */
function getRayScale(cw){ return 1.0 + cl((cw - 375) / (1920 - 375), 0, 1) * 1.5; }
function mkCanvasRay(layer){
    var sc = getRayScale(W); var dg = Math.sqrt(W*W + H*H);
    var ang = 0.32 + Math.random()*0.4; var tw = (8 + Math.random()*42) * sc; var bw = tw * (2.5 + Math.random()*2.5);
    var len = dg * (3.0 + Math.random()*1.0); var ox = W*0.15 + Math.random()*W; var oy = -H*0.45 + Math.random()*H*0.6;
    var mR_deg = 10 + Math.random()*10; var rS_deg = 0.15 + Math.random()*0.25; var yD = Math.random() > 0.5 ? 1 : -1;
    var numStrips = isMobile ? (8 + Math.floor(Math.random()*4)) : (16 + Math.floor(Math.random()*7));
    var strips = [];
    for(var s = 0; s < numStrips; s++){
        var f = numStrips===1 ? 0 : (s/(numStrips-1)-0.5)*1.1; f += (Math.random()-0.5)*0.008;
        var absF = Math.abs(f); var tIdx = absF < 0.25 ? 0 : (absF < 0.5 ? 1 : 2);
        var w = (12 + Math.random()*10 + absF*40) * sc;
        strips.push({ f:f, w:w, tIdx:tIdx, alpha: (0.025+Math.random()*0.045)*(1-absF*0.35), nSeed: Math.random()*10000, nSpeed: 0.00008+Math.random()*0.00022, nAmp: (3+Math.random()*5)*sc });
    }
    strips.sort(function(a,b){ return a.tIdx - b.tIdx; });
    return { x:ox, y:oy, ang:ang, len:len, tw:tw, bw:bw, sc:sc, op:0, mxOp: 0.185+Math.random()*0.152, age:0, life: 4000+Math.random()*3000, st:'in', fd: 2500+Math.random()*1500, foS:0, yO:0, yD:yD, yS:3, rO:0, rD: Math.random()>0.5 ? 1 : -1, rS: rS_deg*DEG/1000, mR: mR_deg*DEG, bS: 0.0004+Math.random()*0.0006, bP: Math.random()*Math.PI*2, bA: 0.08+Math.random()*0.10, strips:strips, layer:layer, maskSeed: Math.random()*10000, maskSpeed: 0.00012+Math.random()*0.00028 };
}

function upCanvasRay(r, dtMs, t){
    r.age += dtMs;
    if(r.st === 'in'){ var p = cl(r.age/r.fd, 0, 1); r.op = r.mxOp * (1 - Math.pow(1-p, 5)); if(p >= 1) r.st = 'live'; }
    else if(r.st === 'live'){ var br = Math.sin(t*r.bS + r.bP); r.op = r.mxOp * (1 - r.bA + r.bA*(0.5+0.5*br)); r.yO += r.yD * r.yS * (dtMs/1000); r.rO += r.rD * r.rS * dtMs; if(Math.abs(r.rO) > r.mR) r.rD = -r.rD; if(r.age >= r.life){ r.st = 'out'; r.foS = r.age; } }
    else if(r.st === 'out'){ r.yO += r.yD * r.yS * (dtMs/1000); r.rO += r.rD * r.rS * dtMs; if(Math.abs(r.rO) > r.mR) r.rD = -r.rD; var p2 = cl((r.age - r.foS)/r.fd, 0, 1); r.op = r.mxOp * (1 - p2*p2*p2*p2*p2); if(p2 >= 1) r.st = 'dead'; }
}

function drCanvasRay(cx, r, t){
    if(r.op < 0.001) return;
    cx.save(); cx.translate(r.x, r.y+r.yO); cx.rotate(r.ang+r.rO);
    var hl = r.len/2; var midW = lp(r.tw, r.bw, 0.5);
    for(var i = 0; i < r.strips.length; i++){
        var st = r.strips[i]; cx.globalAlpha = r.op * st.alpha;
        var tx = stripTx[st.tIdx]; var ctrX = st.f * midW;
        var nV = (n2d(st.nSeed, t*st.nSpeed) - 0.5)*2*st.nAmp;
        cx.drawImage(tx, ctrX-st.w/2+nV, -hl, st.w, r.len);
    }
    var mSegs = isMobile ? 4 : 8, mSegL = r.len/mSegs;
    for(var m = 0; m < mSegs; m++){
        var my = -hl + m*mSegL; var mr = (m+0.5)/mSegs; var mlw = lp(r.tw, r.bw, mr);
        var mn = n2d(r.maskSeed+m*3, t*r.maskSpeed); var mOp = Math.max(0, (mn-0.2)) * r.op * 0.18;
        if(mOp < 0.001) continue; cx.globalAlpha = mOp; cx.fillRect(-mlw*0.6, my, mlw*1.2, mSegL+1);
    }
    cx.globalAlpha = r.op * 0.04; cx.fillRect(-r.tw*0.08, -hl, r.tw*0.16, r.len);
    cx.globalAlpha = 1; cx.restore();
}

function buildRayCache(rays, cache){
    cache.length = 0;
    for(var i = 0; i < rays.length; i++){
        var r = rays[i]; if(r.op < 0.01 || r.st === 'dead') continue;
        var a = -(r.ang + r.rO);
        cache.push({ x: r.x, y: r.y+r.yO, ca: Math.cos(a), sa: Math.sin(a), hl: r.len/2, tw: r.tw, bw: r.bw, rOp: r.op/r.mxOp });
    }
}

function dustRayLight(d, cache){
    var maxL = 0;
    for(var i = 0; i < cache.length; i++){
        var r = cache[i]; var dx = d.x-r.x, dy = d.y-r.y; var lx = dx*r.ca - dy*r.sa; var ly = dx*r.sa + dy*r.ca;
        if(ly < -r.hl || ly > r.hl) continue;
        var ratio = (ly+r.hl)/r.len; var halfW = lp(r.tw, r.bw, ratio)*0.5; var dist = Math.abs(lx);
        if(dist > halfW*1.15) continue;
        var depth = 1 - dist/(halfW*1.15); depth = depth * depth; var l = depth * r.rOp;
        if(l > maxL) maxL = l;
    }
    return cl(maxL, 0, 1);
}

function manageCanvasRays(dtMs){
    for(var i = raysB.length-1; i >= 0; i--){ upCanvasRay(raysB[i], dtMs, gTime); if(raysB[i].st === 'dead') raysB.splice(i, 1); }
    for(var j = raysT.length-1; j >= 0; j--){ upCanvasRay(raysT[j], dtMs, gTime); if(raysT[j].st === 'dead') raysT.splice(j, 1); }
    var total = raysB.length + raysT.length;
    if(total < MIN_RAYS){ if(Math.random() > 0.5) raysB.push(mkCanvasRay('bottom')); else raysT.push(mkCanvasRay('top')); }
    else if(total < MAX_RAYS && Math.random() < 0.007){ if(Math.random() > 0.5) raysB.push(mkCanvasRay('bottom')); else raysT.push(mkCanvasRay('top')); }
}

/* ==================== VẼ TỔNG HỢP 1 LỚP ==================== */
function drawBackLayer(t){
    cxB.clearRect(0, 0, W, H);
    for(var i = 0; i < dustB.length; i++){
        var p = dustB[i]; steer(p, t);
        var lf = dustRayLight(p, raysBCache);
        var op = cl(p.op + Math.sin(t * 0.7 + p.ph) * 0.04, 0, 1);
        
        if(lf > 0.05){
            // Nhỏ lại bằng cách giảm hệ số nhân (từ 10 xuống 6)
            var gs = p.sz * 6 * (1 + lf * 1.2); 
            cxB.globalAlpha = op * lf * 0.75;
            cxB.drawImage(dustGlowTx, p.x - gs/2, p.y - gs/2, gs, gs);
            var cs = p.sz * 3 * (1 + lf * 0.5); 
            cxB.globalAlpha = Math.min(1, op * (1.2 + lf * 4.5));
            cxB.drawImage(dustCoreTx, p.x - cs, p.y - cs, cs*2, cs*2);
        } else {
            // Nhỏ lại bằng cách giảm hệ số nhân (từ 2 xuống 1.2)
            var drawSz = p.sz * 1.2;
            cxB.globalAlpha = op * 0.6;
            cxB.drawImage(dustNormCoolTx, p.x - drawSz, p.y - drawSz, drawSz*2, drawSz*2);
        }
    }
    
    for(var j = 0; j < spkB.length; j++){
        var sp = spkB[j]; steer(sp, t);
        var raw = Math.sin(t*sp.flSpd+sp.flPh); var flash = Math.pow(Math.max(0, raw), 4);
        var op = sp.baseOp * flash;
        if(op < 0.012) continue;
        var ss = sp.sz * 6; // Nhỏ lại sparkle
        cxB.globalAlpha = op;
        cxB.drawImage(sparkleTx, sp.x - ss, sp.y - ss, ss*2, ss*2);
    }
    
    for(var k = 0; k < raysB.length; k++) drCanvasRay(cxB, raysB[k], gTime);
    cxB.globalAlpha = 1;
}

function drawTopLayer(t){
    cxT.clearRect(0, 0, W, H);
    for(var k = 0; k < raysT.length; k++) drCanvasRay(cxT, raysT[k], gTime);
    
    for(var i = 0; i < dustT.length; i++){
        var p = dustT[i]; steer(p, t);
        var lf1 = dustRayLight(p, raysBCache);
        var lf2 = dustRayLight(p, raysTCache);
        var lf = lf1 > lf2 ? lf1 : lf2;
        
        var op = cl(p.op + Math.sin(t * 0.7 + p.ph) * 0.04, 0, 1);
        
        if(lf > 0.05){
            var gs = p.sz * 6 * (1 + lf * 1.2);
            cxT.globalAlpha = op * lf * 0.75;
            cxT.drawImage(dustGlowTx, p.x - gs/2, p.y - gs/2, gs, gs);
            var cs = p.sz * 3 * (1 + lf * 0.5);
            cxT.globalAlpha = Math.min(1, op * (1.2 + lf * 4.5));
            cxT.drawImage(dustCoreTx, p.x - cs, p.y - cs, cs*2, cs*2);
        } else {
            var drawSz = p.sz * 1.2;
            cxT.globalAlpha = op * 0.6;
            cxT.drawImage(dustNormWarmTx, p.x - drawSz, p.y - drawSz, drawSz*2, drawSz*2);
        }
    }
    
    for(var j = 0; j < spkT.length; j++){
        var sp = spkT[j]; steer(sp, t);
        var raw = Math.sin(t*sp.flSpd+sp.flPh); var flash = Math.pow(Math.max(0, raw), 4);
        var op = sp.baseOp * flash;
        if(op < 0.012) continue;
        var ss = sp.sz * 6;
        cxT.globalAlpha = op;
        cxT.drawImage(sparkleTx, sp.x - ss, sp.y - ss, ss*2, ss*2);
    }
    
    cxT.globalAlpha = 1;
}

/* ==================== VÒNG LẶP CHÍNH ==================== */
var targetFPS = isMobile ? 30 : 60;
var frameInterval = 1000 / targetFPS;
var lastFrame = 0;
var pageVisible = true;

document.addEventListener("visibilitychange", function(){
    pageVisible = !document.hidden;
    if(pageVisible) lastT = performance.now();
});

setTimeout(function(){ raysB.push(mkCanvasRay('bottom')); }, 180);
setTimeout(function(){ raysT.push(mkCanvasRay('top')); }, 1100);
setTimeout(function(){ raysB.push(mkCanvasRay('bottom')); }, 2600);
setTimeout(function(){ raysT.push(mkCanvasRay('top')); }, 4200);
setTimeout(function(){ raysB.push(mkCanvasRay('bottom')); }, 6800);

function loop(now){
    if(!pageVisible){ requestAnimationFrame(loop); return; }
    if(now - lastFrame < frameInterval){ requestAnimationFrame(loop); return; }
    lastFrame = now;

    var dt = (now - lastT) / 1000; if(dt > 0.1) dt = 0.1; lastT = now; gTime += dt;
    var dtMs = dt * 1000;

    buildRayCache(raysB, raysBCache);
    buildRayCache(raysT, raysTCache);
    manageCanvasRays(dtMs);

    drawBackLayer(gTime);
    drawTopLayer(gTime);

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

})();
/*===== nút home =====*/
const homeBtn = document.getElementById("homeBtn"); window.addEventListener("scroll", () => {
    if (window.scrollY > 200 ) {
        homeBtn.style.display = "flex";
        homeBtn.style.opacity = "1";
    }
    else {
        homeBtn.style.opacity = "0";
        setTimeout(() => homeBtn.style.display = "none", 200);
    }
});
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/*===== toggle mở thu nội dung =====*/
const toggles = document.querySelectorAll(".toggle");
toggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
        e.preventDefault();
        const content = this.previousElementSibling;
        content.classList.toggle("expanded");
        this.textContent = content.classList.contains("expanded")
            ? "Thu gọn"
            : "Xem thêm";
    });
});

/*===== thanh điều hướng (mobile) =====*/
const navibar = document.getElementById("navibar"); window.addEventListener("scroll",() => {
    if (window.scrollY > 120) {
        navibar.classList.add("scrolled");
    }
    else {
        navibar.classList.remove("scrolled")
    }
});
function toggleMenu() {
    document.getElementById("navibar").classList.toggle("show");
}
const menu = document.querySelector(".menu");
const navi = document.querySelectorAll(".navi");
function toggleMenu() {
    navibar.classList.toggle("show");
    menu.textContent = navibar.classList.contains("show") ? "✖" : "☰";
}
navi.forEach(link => {
    link.addEventListener("click", () => {
        navibar.classList.remove("show");
        menu.textContent = "☰";
    });
});
document.addEventListener("click", (e) => {
    if (
        !navibar.contains(e.target) &&
        !menu.contains(e.target)
    ) {
        navibar.classList.remove("show");
        menu.textContent = "☰";
    }
});

/*===== random quotes =====*/
const studentItems = document.querySelectorAll(".student-list li");
const studentNames = Array.from(studentItems).map(li => li.textContent);
function getRandomName() {
    return studentNames[Math.floor(Math.random() * studentNames.length)];
}
const quotes = [
    () => `${getRandomName()} lên bảng nào, học bài chưa em.`,
    () => `${getRandomName()} ơi.`,
    "Số 15 ơi, cậu là người đặc biệt á:3",
    "Ba năm chỉ là bắt đầu của hành trình dài phía trước.",
    "Thanh xuân là thứ đẹp nhất mà chúng ta từng có.",
    "Cảm ơn vì đã là một phần của tuổi 18.",
    "12A2, một thời để nhớ.",
    "Ba năm không dài, nhưng đủ biến người lạ thành 'đồng bọn'.",
    "Chúng ta từng hứa sẽ học chăm hơn... từ tuần sau.",
    "Tuổi 18: chưa già để tiếc nuối, chẳng trẻ để vô tư.",
    "Đi học vì tương lai, ở lại vì bạn bè.",
    "Kỉ niệm nhiều đến mức phải thi lại mới nhớ hết.",
    "Lớp mình không hoàn hảo, nhưng hoàn cảnh đưa đẩy nên thành huyền thoại.",
    "Ơ kìa, đừng khóc chứ!",
    "MƯỜI điểm!",
    "Thanh xuân giống bài kiểm tra 15 phút-trôi qua nhanh mà chưa kịp chuẩn bị.",
    "Thanh xuân là khi ta cười nhiều hơn khóc... và khóc vì Toán Lý Hóa.",
    "Ba năm đủ để nhớ tên nhau, và nhớ cả những lần bị gọi lên bảng.",
    "Nếu thời gian quay lại, chắc mình vẫn chọn ngồi đúng chỗ cũ và cùng người ấy.",
    "Học hành có thể quên, nhưng trò nghịch thì nhớ mãi.",
    "Chúng ta rồi sẽ khác đi, nhưng hi vọng vẫn cười như ngày hôm nay.",
    "Cảm ơn vì đã cùng lớn lên - dù lớn hơi chậm.",
    "Thanh xuân là quãng thời gian ta vừa sợ kiểm tra miệng, vừa sợ một ngày không còn được gọi tên.",
    "Thanh xuân là khi ta giận nhau vì chuyện nhỏ xíu, rồi lại làm hòa bằng một ly trà sữa.",
    "Chúng ta đếm từng ngày ra trường, không ngờ sau này lại đếm từng ngày để nhớ.",
    "Cấp ba dạy ta nhiều thứ:Toán, Văn, Lý, Sử,... và cả cách để thương một người nhưng không dám nói.",
    "Hóa ra điều khó nhất không phải là bài kiểm tra cuối cùng mà là nói lời tạm biệt.",
    "Lấy thanh xuân đầu tư vào HDPE thì ngon luôn!",
    "Ước gì mùa đông đến đây để đóng băng thời gian này lại cùng những kỉ niệm khó phai nhòa.",
    "Thời gian trôi nhanh khiến thanh xuân tuột mất như mất người mãi mãi.",
];

const quoteText = document.querySelector(".quote-text");
function changeQuote() {
    quoteText.classList.add("fade");
    setTimeout(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteText.textContent = typeof randomQuote === "function" 
        ? randomQuote() : randomQuote;
        quoteText.classList.remove("fade");
    }, 500);
}
changeQuote();
setInterval(changeQuote,30000);

/*===== popup gallery =====*/
const popup = document.getElementById("galleryPopup");
const openBtn = document.getElementById("openGallery");
const closeBtn = document.querySelector(".close-btn");
const container = document.querySelector(".media-container");
const totalCount = document.getElementById("totalCount");
const filterContent = document.querySelector(".filter-content");
const filterBox = document.querySelector(".filter");
const toggleFilterBtn = document.querySelector(".toggle-filter");
let mediaData = [];
let filteredData = [];
let activeTags = [];
let loaded = 0;
let scale = 1;
let isDragging = false;
let startX, startY;
let currentX = 0;
let currentY = 0;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const batchSize = 20;

let galleryObserver = null;

/* ================= LOAD JSON ================= */
async function loadMedia() {
    const res = await fetch("data/media.json");
    const data = await res.json();
    mediaData = data.map((m, i) => ({
        id: i,
        type: m.type,
        src: m.src,
        tags: Array.isArray(m.tags) ? m.tags : []
    }));
    renderTags();
    applyFilter();
}
loadMedia();

function isYouTubeUrl(src) {
    try {
        const url = new URL(src);
        return (
            url.hostname === "www.youtube.com" ||
            url.hostname === "youtube.com" ||
            url.hostname === "youtu.be" ||
            url.hostname === "m.youtube.com"
        );
    } catch { return false; }
}

function getYouTubeEmbedUrl(src) {
    try {
        const url = new URL(src);
        let videoId = "";
        if (url.hostname === "youtu.be") videoId = url.pathname.slice(1);
        else if (url.searchParams.has("v")) videoId = url.searchParams.get("v");
        else if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/embed/")[1];
        else if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/shorts/")[1];
        if (!videoId) return null;
        videoId = videoId.split("?")[0].split("&")[0];
        return `https://www.youtube.com/embed/${videoId}`;
    } catch { return null; }
}

/* ================= TAG RENDER ================= */
function renderTags() {
    const tagMap = {};
    mediaData.forEach(m => { m.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }); });
    const sorted = Object.keys(tagMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    sorted.forEach(tag => {
        const btn = document.createElement("button");
        btn.className = "tag-btn";
        btn.dataset.tag = tag;
        btn.textContent = `${tag} (${tagMap[tag]})`;
        filterContent.appendChild(btn);
    });
}

/* ================= FILTER AND ================= */
function applyFilter() {
    if (activeTags.length === 0) filteredData = [...mediaData];
    else filteredData = mediaData.filter(m => activeTags.every(t => m.tags.includes(t)));
    resetGallery();
}

/* ================= RESET ================= */
function resetGallery() {
    if (galleryObserver) galleryObserver.disconnect();
    container.innerHTML = "";
    loaded = 0;
    totalCount.textContent = `Tổng số được chọn: ${filteredData.length} media`;
    initObserver();
    renderBatch();
}

/* ================= INTERSECTION OBSERVER ================= */
function initObserver() {
    galleryObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const item = entry.target;
            if (entry.isIntersecting) loadMediaElement(item);
            else unloadMediaElement(item);
        });
    }, {
        root: document.querySelector(".gallery"),
        rootMargin: "300px 0px",
        threshold: 0
    });
}

// HÀM TẢI MEDIA
function loadMediaElement(wrapper) {
    const el = wrapper.querySelector('img, video, iframe');
    const m = wrapper._mediaData;
    if (!el || !m) return;

    if (el.tagName === "IMG") {
        // Ảnh: Nếu chưa có src thì nạp vào. Nếu có rồi thì chỉ việc bỏ class ẩn đi
        if (!el.src || el.src === window.location.href) {
            el.src = m.src;
        }
        el.classList.remove("img-hidden"); // Rã đông ảnh từ Cache
        wrapper._isLoaded = true;
        wrapper.classList.remove("unloaded");
    } else {
        // Video & YouTube: Chỉ tải 1 lần duy nhất
        if (wrapper._isLoaded) return;
        wrapper._isLoaded = true;
        wrapper.classList.remove("unloaded");

        if (m.type === "video") {
            if (m._embedUrl) {
                el.src = m._embedUrl;
            } else {
                const source = el.querySelector('source');
                if (source) {
                    source.src = m.src;
                    el.load();
                }
            }
        }
    }
}

// HÀM "ĐÓNG BĂNG" MEDIA
function unloadMediaElement(wrapper) {
    if (!wrapper._isLoaded) return;
    
    const el = wrapper.querySelector('img, video, iframe');
    if (!el) return;

    if (el.tagName === "IMG") {
        // ẢNH: KHÔNG XÓA SRC. Chỉ thêm class ẩn để GPU không vẽ nữa -> Giữ lại Cache tiết kiệm Data
        el.classList.add("img-hidden");
    } else if (el.tagName === "IFRAME") {
        // YOUTUBE: Phải xóa src để dừng tiến trình JS nặng nề
        wrapper._isLoaded = false;
        el.src = "";
    } else if (el.tagName === "VIDEO") {
        // VIDEO: Xóa src để giải phóng RAM nặng
        wrapper._isLoaded = false;
        el.pause();
        const source = el.querySelector('source');
        if (source) source.src = "";
        el.load();
    }
}

/* ================= RENDER BATCH ================= */
function renderBatch() {
    if (loaded >= filteredData.length) return;
    
    let itemsAdded = 0; // Chỉ đếm số ảnh/video THỰC SỰ được tạo thành công

    // Vòng lặp chạy cho đến khi tạo ĐỦ 20 item, hoặc hết sạch dữ liệu JSON
    while (itemsAdded < batchSize && loaded < filteredData.length) {
        const m = filteredData[loaded];
        let el = null;

        if (m.type === "image") {
            el = document.createElement("img");
        } else if (m.type === "video") {
            if (isYouTubeUrl(m.src)) {
                const embedUrl = getYouTubeEmbedUrl(m.src);
                if (embedUrl) {
                    m._embedUrl = embedUrl;
                    el = document.createElement("iframe");
                    el.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                    el.allowFullscreen = true;
                }
            } else {
                el = document.createElement("video");
                el.controls = true;
                el.preload = "none";
                const source = document.createElement("source");
                source.type = "video/mp4";
                el.appendChild(source);
            }
        } 
        // Nếu type không phải "image" hoặc "video" (ví dụ "Image", "VIDEO", null...) -> el sẽ bằng null

        if (el) {
            const wrapper = document.createElement("div");
            wrapper.className = "media-item unloaded";
            wrapper.dataset.index = loaded; // Giữ nguyên index gốc để khi click vào viewer vẫn mở đúng ảnh
            wrapper._mediaData = m;
            wrapper._isLoaded = false;

            wrapper.appendChild(el);
            container.appendChild(wrapper);
            galleryObserver.observe(wrapper);
            
            itemsAdded++; // Chỉ cộng biến đếm khi thực sự add được DOM vào màn hình
        } else {
            // In cảnh báo ra Console (F12) để bạn biết file JSON đang bị sai ở dòng nào
            console.warn("Bỏ qua media không hợp lệ tại index:", loaded, "| type:", m.type, "| src:", m.src);
        }

        // LUÔN tăng biến loaded để chuyển sang mục tiếp theo, tránh treo máy
        loaded++; 
    }
}
/* ================= INFINITE SCROLL ================= */
const gallery = document.querySelector(".gallery");
gallery.addEventListener("scroll", () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 200) {
        if (loaded < filteredData.length) renderBatch();
    }
});

/* ================= FILTER CLICK ================= */
document.addEventListener("click", e => {
    if (e.target.classList.contains("tag-btn")) {
        const clickedBtn = e.target;
        const tag = clickedBtn.dataset.tag;
        const allBtns = document.querySelectorAll(".tag-btn");
        if (tag === "all") {
            activeTags = [];
            allBtns.forEach(btn => btn.classList.remove("active"));
            clickedBtn.classList.add("active");
        } else {
            document.querySelector('[data-tag="all"]').classList.remove("active");
            if (activeTags.includes(tag)) {
                activeTags = activeTags.filter(t => t !== tag);
                clickedBtn.classList.remove("active");
            } else {
                activeTags.push(tag);
                clickedBtn.classList.add("active");
            }
            if (activeTags.length === 0) document.querySelector('[data-tag="all"]').classList.add("active");
        }
        applyFilter();
    }
});

/* ================= MOBILE FILTER TOGGLE ================= */
toggleFilterBtn.onclick = () => { filterBox.classList.toggle("open"); };

/* ================= POPUP ================= */
openBtn.onclick = e => { e.preventDefault(); popup.classList.add("show"); document.body.classList.add("lock"); };

function closeViewer() { viewer.classList.remove("show"); stopVideos(); resetZoom(); }
function closePopup() { closeViewer(); popup.classList.remove("show"); document.body.classList.remove("lock"); }

closeBtn.onclick = closePopup;
popup.addEventListener("click", (e) => { if (e.target === popup) closePopup(); });

function stopVideos() { document.querySelectorAll("video").forEach(v => { v.pause(); v.currentTime = 0; }); }

/* ================= VIEWER ================= */
const viewer = document.querySelector(".viewer");
const viewerContent = document.querySelector(".viewer-content");
let currentIndex = 0;

container.addEventListener("click", e => {
    const item = e.target.closest(".media-item");
    if (!item) return;
    currentIndex = Number(item.dataset.index);
    openViewer(currentIndex);
});

function openViewer(i) { viewer.classList.add("show"); renderViewer(i); resetZoom(); }

function renderViewer(i) {
    viewerContent.innerHTML = "";
    if (i < 0 || i >= filteredData.length) return;
    const m = filteredData[i];
    if (!m || !m.src) return;

    let el;
    if (m.type === "image") {
        el = document.createElement("img");
        el.src = m.src;
    } else if (m.type === "video") {
        if (isYouTubeUrl(m.src)) {
            const embedUrl = getYouTubeEmbedUrl(m.src);
            if (!embedUrl) return;
            el = document.createElement("iframe");
            el.src = embedUrl;
            el.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            el.allowFullscreen = true;
        } else {
            el = document.createElement("video");
            el.controls = true; el.autoplay = true;
            const source = document.createElement("source");
            source.src = m.src; source.type = "video/mp4";
            el.appendChild(source);
        }
    }
    if (el) { el.draggable = false; el.addEventListener("dragstart", e => e.preventDefault()); }
    viewerContent.appendChild(el);
}

/*=========zoom viewer==========*/
viewer.addEventListener("wheel", e => {
    if (!viewerContent) return; e.preventDefault();
    const zoomSpeed = 0.1;
    if (e.deltaY < 0) scale += zoomSpeed; else scale -= zoomSpeed;
    scale = Math.max(1, Math.min(scale, MAX_ZOOM));
    viewerContent.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
}, { passive: false });

/*======== dragg ========*/
viewerContent.addEventListener("mousedown", e => {
    if (scale <= 1) return;
    isDragging = true; startX = e.clientX - currentX; startY = e.clientY - currentY;
    viewerContent.style.cursor = "grabbing";
});
window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    currentX = e.clientX - startX; currentY = e.clientY - startY;
    viewerContent.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
});
window.addEventListener("mouseup", () => { isDragging = false; viewerContent.style.cursor = "grab"; });

/*======== Double Click (PC) & Double Tap (Mobile) TOGGLE ZOOM ========*/

// Hàm chung xử lý phóng to/thu nhỏ
function toggleZoom() {
    const media = viewerContent;
    if (!media) return;
    media.style.transition = "transform 0.35s cubic-bezier(.22,.61,.36,1)";
    
    if (scale > 1) {
        // Nếu đang phóng to -> Thu nhỏ về gốc
        scale = 1; 
        currentX = 0; 
        currentY = 0;
        media.style.transform = "translate(0px, 0px) scale(1)";
    } else {
        // Nếu đang ở gốc -> Phóng to lên 2.5 lần
        scale = 2.5; 
        currentX = 0; 
        currentY = 0;
        media.style.transform = `translate(0px, 0px) scale(${scale})`;
    }
    
    // Bỏ transition sau khi animation xong để không bị vướng khi kéo
    setTimeout(() => { media.style.transition = "none"; }, 350);
}

// 1. Lắng nghe cho Máy tính (PC)
viewer.addEventListener("dblclick", toggleZoom);

// 2. Lắng nghe cho Điện thoại (Mobile)
let lastTapTime = 0;
viewerContent.addEventListener('touchend', function(e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    // Phát hiện bấm đúp (2 lần chạm cách nhau dưới 300ms)
    if (tapLength < 300 && tapLength > 0) {
        e.preventDefault(); // Ngăn zoom mặc định của trình duyệt
        toggleZoom();       // Gọi chung hàm xử lý
        lastTapTime = 0;    // Reset để không bị nhận nhầm bấm 3 lần
    } else {
        lastTapTime = currentTime; // Lưu thời gian của lần chạm đầu
    }
});

/*=========close viewer========*/
document.querySelector(".viewer-close").onclick = () => { viewer.classList.remove("show"); resetZoom(); };
viewer.addEventListener("click", (e) => { if (e.target === viewer) { closeViewer(); resetZoom(); } });
document.querySelector(".next").onclick = () => { if (currentIndex < filteredData.length - 1) { currentIndex++; renderViewer(currentIndex); resetZoom(); } };
document.querySelector(".prev").onclick = () => { if (currentIndex > 0) { currentIndex--; renderViewer(currentIndex); resetZoom(); } };

/*========== reset zoom viewer =========*/
function resetZoom() {
    scale = 1; currentX = 0; currentY = 0;
    viewerContent.style.transform = "translate(0px, 0px) scale(1)";
    viewerContent.style.transformOrigin = "center center";
    viewerContent.style.cursor = "zoom-in";
}

/*===========up load=============*/
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
let selectedFiles = [];
const submitButton = document.getElementById("submitButton");
const submitStatus = document.getElementById("submitStatus");
const WORKER_URL = "https://media-upload-api.contactwithus12a2.workers.dev";
init();
async function init() {
    await TagEngine.init();
    renderFiles();
}
fileInput.addEventListener("change", event => {
    addFiles(event.target.files);
    fileInput.value = "";
});
uploadArea.addEventListener("dragover", event => {
    event.preventDefault();
    uploadArea.classList.add("dragover");
});
uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
});
uploadArea.addEventListener("drop", event => {
    event.preventDefault();
    uploadArea.classList.remove("dragover");
    addFiles(event.dataTransfer.files);
});
submitButton.addEventListener("click", submitFiles);
function addFiles(files) {
    [...files].forEach(file => {
        if (!isSupportedFile(file)) {
            return;
        }
        const fileData = createFileData(file);
        selectedFiles.push(fileData);
    });
    renderFiles();
}
function isSupportedFile(file) {
    return file.type.startsWith("image/") || file.type.startsWith("video/");
}
function createFileData(file) {
    const type = file.type.startsWith("image/") ? "image" : "video";
    const extension = getExtension(file.name);
    const baseName = getBaseName(file.name);
    const analysis = TagEngine.analyzeFileName(file.name);
    return {
        id: crypto.randomUUID(),
        file,
        type,
        extension,
        name: file.name,
        baseName,
        analysis,
        previewUrl: URL.createObjectURL(file)
    };
}
function getExtension(fileName) {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot === -1) {
        return "";
    }
    return fileName.slice(lastDot + 1).toLowerCase();
}
function getBaseName(fileName) {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot === -1) {
        return fileName;
    }
    return fileName.slice(0, lastDot);
}
function removeExtension(fileName, extension) {
    const suffix = `.${extension}`;
    if (fileName.toLowerCase().endsWith(suffix.toLowerCase())) {
        return fileName.slice(0, -suffix.length
        );
    }

    return fileName
        .replace(/\.[^/.]+$/, "");
}
function renderFiles() {
    fileList.innerHTML = "";
    if (selectedFiles.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                Chưa có file nào được chọn.
            </div>
        `;
        return;
    }
    selectedFiles.forEach(fileData => {
        fileList.appendChild(createFileElement(fileData));
    });
}
function createFileElement(fileData) {
    const item = document.createElement("article");
    item.className = "file-item";
    item.dataset.id = fileData.id;
    const preview = createPreview(fileData);
    const info = document.createElement("div");
    info.className = "file-info";
    const typeLabel = document.createElement("span");
    typeLabel.className = "file-type";
    typeLabel.textContent = fileData.type;
    const nameLabel = document.createElement("label");
    nameLabel.className = "file-name-label";
    nameLabel.textContent = "Tên file";
    const nameRow = document.createElement("div");
    nameRow.className = "file-name-row";
    const nameInput = document.createElement("input");
    nameInput.className = "file-name-input";
    nameInput.type = "text";
    nameInput.value = fileData.baseName;
    nameInput.placeholder = "Nhập tên file";
    nameInput.addEventListener("input", () => {
        updateFileName(fileData.id, nameInput.value);
    });
    const extension = document.createElement("span");
    extension.className = "file-extension";
    extension.textContent = `.${fileData.extension}`;
    nameRow.append(
        nameInput,
        extension
    );
    const fileSize = document.createElement("div");
    fileSize.className = "file-size";
    fileSize.textContent = `Kích thước: ${formatFileSize(fileData.file.size)}`;
    const keywordTitle = document.createElement("div");
    keywordTitle.className = "keyword-title";
    keywordTitle.textContent = "Tag nhận diện";
    const keywordList = document.createElement("div");
    keywordList.className = "keyword-list";
    renderAnalysis(
        keywordList,
        fileData.analysis
    );
    const actions = document.createElement("div");
    actions.className = "file-actions";
    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.textContent = "Xóa";
    removeButton.addEventListener("click", () => {
        removeFile(fileData.id);
    });
    actions.appendChild(removeButton);
    info.append(
        typeLabel,
        nameLabel,
        nameRow,
        fileSize,
        keywordTitle,
        keywordList,
        actions
    );
    item.append(
        preview,
        info
    );
    return item;
}
function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "Không xác định";
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function createPreview(fileData) {
    const preview = document.createElement("div");
    preview.className = "preview";
    if (fileData.type === "image") {
        const image = document.createElement("img");
        image.src = fileData.previewUrl;
        image.alt = fileData.name;
        preview.appendChild(image);
        return preview;
    }
    const video = document.createElement("video");
    video.src = fileData.previewUrl;
    video.controls = true;
    video.preload = "metadata";
    preview.appendChild(video);
    return preview;
}
function renderAnalysis(container, analysis) {
    container.innerHTML = "";
    if (analysis.length === 0) {
        const empty = document.createElement("span");
        empty.className = "keyword";
        empty.textContent = "Không có keyword";
        container.appendChild(empty);
        return;
    }
    analysis.forEach(item => {
        const element = document.createElement("div");
        element.className = `tag-analysis tag-${item.status}`;
        const keyword = document.createElement("span");
        keyword.className = "tag-keyword";
        keyword.textContent = item.keyword;
        element.appendChild(keyword);
        if (item.status === "matched") {
            const arrow = document.createElement("span");
            arrow.textContent = "→";
            const tag = document.createElement("strong");
            tag.textContent = item.tag;
            element.append(
                arrow,
                tag
            );
        }
        if (item.status === "suggestion") {
            const label = document.createElement("span");
            label.textContent = "Có thể là:";
            element.appendChild(label);
            item.suggestions.forEach(suggestion => {
                const suggestionElement = document.createElement("span");
                suggestionElement.className = "tag-suggestion";
                suggestionElement.textContent = suggestion.name;
                element.appendChild(suggestionElement);
            });
        }
        if (item.status === "new") {
            const label = document.createElement("span");
            label.textContent = "Tag mới:";
            const newTag = document.createElement("strong");
            newTag.textContent = item.tag;
            element.append(
                label,
                newTag
            );
        }
        container.appendChild(element);
    });
}
function updateFileName(id, newName) {
    const fileData = selectedFiles.find(
        item => item.id === id
    );
    if (!fileData) {return}
    const cleanName = removeExtension(
        newName,
        fileData.extension
    );
    fileData.baseName = cleanName;
    fileData.name = `${cleanName}.${fileData.extension}`;
    fileData.analysis = TagEngine.analyzeFileName(
        fileData.name
    );
    const item = document.querySelector(
        `[data-id="${id}"]`
    );
    if (!item) {return;}

    const keywordList = item.querySelector(
        ".keyword-list"
    );
    renderAnalysis(
        keywordList,
        fileData.analysis
    );
}
function removeFile(id) {
    const fileData = selectedFiles.find(item => item.id === id);
    if (fileData) {
        URL.revokeObjectURL(fileData.previewUrl);
    }
    selectedFiles = selectedFiles.filter(item => item.id !== id);
    renderFiles();
}
async function submitFiles() {
    if (selectedFiles.length === 0) {
        setSubmitStatus("Vui lòng chọn ít nhất một file.", "error");
        return;
    }
    const invalidFile = selectedFiles.find(item => !item.name.trim());
    if (invalidFile) {
        setSubmitStatus("Vui lòng nhập tên cho tất cả file.", "error");
        return;
    }
    submitButton.disabled = true;
    setSubmitStatus("Đang gửi đóng góp...", "");
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const fileData = selectedFiles[i];
            setSubmitStatus(
                `Đang gửi ${i + 1}/${selectedFiles.length}: ${fileData.name}`,
                ""
            );
            const formData = new FormData();
            const renamedFile = new File(
                [fileData.file],
                fileData.name,
                {
                    type: fileData.file.type
                }
            );
            formData.append("file", renamedFile);
            formData.append("name", fileData.name);
            formData.append("type", fileData.type);
            formData.append(
                "analysis",
                JSON.stringify(fileData.analysis)
            );
            const response = await fetch(
                `${WORKER_URL}/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );
            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error(
                    `Worker trả về phản hồi không hợp lệ. HTTP ${response.status}`
                );
            }
            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || "Không thể gửi file."
                );
            }
        }
        setSubmitStatus(
            "Đã gửi tất cả đóng góp thành công. Chờ admin duyệt.",
            "success"
        );
        selectedFiles.forEach(fileData => {
            URL.revokeObjectURL(fileData.previewUrl);
        });
        selectedFiles = [];
        renderFiles();
    } catch (error) {
        console.error("Upload error:", error);
        setSubmitStatus(
            error.message || "Có lỗi xảy ra khi gửi.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
    }
}
function setSubmitStatus(message, type) {
    submitStatus.textContent = message;
    submitStatus.className = "submit-status";
    if (type) {
        submitStatus.classList.add(type);
    }
}
