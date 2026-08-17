(() => {
  "use strict";
  const errBox = document.getElementById('err');
  function fail(msg){ if(errBox){ errBox.style.display='block'; errBox.textContent='⚠ ' + msg; } console.error(msg); }
  window.addEventListener('error', e => fail(e.message || String(e)));

  try {
    const COLS = 21, ROWS = 21;
    const BASE_INTERVAL = 140, MIN_INTERVAL = 80, STEP = 2;

    // ---- levels -------------------------------------------------------------
    // Each level describes where the snake starts, its first food, and the
    // solid wall cells on the board. Hitting a wall (or your own tail) kills.
    const LEVELS = [
      {
        name: 'Open Field',
        snake: [{x:9,y:10},{x:8,y:10},{x:7,y:10}],
        food:  {x:14,y:10},
        walls: [
          // small test wall
          {x:9,y:4},{x:10,y:4},{x:11,y:4},{x:12,y:4},
        ],
      },
    ];
    const LEVEL = LEVELS[0];
    const wallSet = new Set(LEVEL.walls.map(w => w.x+','+w.y));
    function isWall(x,y){ return wallSet.has(x+','+y); }
    function spawnSnake(){ return LEVEL.snake.map(c => ({x:c.x,y:c.y})); }

    // ---- state (initialized up front so the first draw never sees undefined) ----
    let snake = spawnSnake();
    let dir = {x:1,y:0};
    let food = {x:LEVEL.food.x,y:LEVEL.food.y};
    let score = 0, best = 0, eaten = 0;
    let interval = BASE_INTERVAL, speedMult = '1';
    let running=false, paused=false, over=false, started=false;
    let prevHead=null, lastStep=0;
    let particles=[], flash=0, foodPulse=0;
    let inputQueue = [];

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('overlay');
    const elScore=document.getElementById('score'), elBest=document.getElementById('best'), elSpeed=document.getElementById('speed');
    const muteBtn=document.getElementById('mute'), dpad=document.getElementById('dpad');

    let cell=20, boardSize=420;
    function resize(){
      const avail = Math.min(window.innerWidth-48, 560);
      cell = Math.max(12, Math.floor(avail/COLS));
      boardSize = cell*COLS;
      canvas.width  = Math.round(boardSize * devicePixelRatio);
      canvas.height = Math.round(boardSize * devicePixelRatio);
      ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    }
    window.addEventListener('resize', resize);

    // ---- audio ----
    let actx=null, muted=false;
    function ensureAudio(){ if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(actx&&actx.state==='suspended') actx.resume(); }
    function tone(freq,dur,type='square',vol=.12,slideTo=null){
      if(!actx||muted) return;
      const t=actx.currentTime, o=actx.createOscillator(), g=actx.createGain();
      o.type=type; o.frequency.setValueAtTime(freq,t);
      if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
      g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t+dur+.02);
    }
    const sfx={
      eat(){ tone(520,.09,'square',.14,760); },
      die(){ [320,240,170,110].forEach((f,i)=>setTimeout(()=>tone(f,.22,'sawtooth',.16,f*.6),i*80)); },
      start(){ tone(440,.08,'square',.1); setTimeout(()=>tone(660,.1,'square',.1),90); }
    };

    // ---- logic ----
    function freeCells(){ const occ=new Set(snake.map(s=>s.x+','+s.y)); occ.add(food.x+','+food.y);
      const a=[]; for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const k=x+','+y; if(!occ.has(k)&&!wallSet.has(k))a.push({x,y});} return a; }
    function placeFood(){ const c=freeCells(); food = c.length?c[(Math.random()*c.length)|0]:{x:-1,y:-1}; }

function reset(){ snake=spawnSnake(); dir={x:1,y:0};
  inputQueue=[]; score=0; eaten=0; interval=BASE_INTERVAL; speedMult='1'; prevHead=null; particles=[]; placeFood(); updateStats(); }

    function start(){ ensureAudio(); sfx.start(); reset(); running=true; paused=false; over=false; started=true; hideOverlay(); lastStep=performance.now(); }
    function pauseGame(){ if(!running||over) return; paused=true; showOverlay('pause'); }
    function resumeGame(){ if(over) return; paused=false; hideOverlay(); lastStep=performance.now(); }

    function step(){
      prevHead = {x:snake[0].x, y:snake[0].y};
      if(inputQueue.length) dir = inputQueue.shift();   // consume one queued turn per tick
      const head={x:(snake[0].x+dir.x+COLS)%COLS, y:(snake[0].y+dir.y+ROWS)%ROWS};  // wrap around the borders
      if(isWall(head.x,head.y)){ gameOver(); return; }                             // solid walls kill
      for(let i=0;i<snake.length-1;i++){ if(snake[i].x===head.x&&snake[i].y===head.y){ gameOver(); return; } }

      snake.unshift(head);
      if(food && head.x===food.x && head.y===food.y){
        score+=10; eaten++; interval=Math.max(MIN_INTERVAL, BASE_INTERVAL - eaten*STEP); speedMult=(BASE_INTERVAL/interval).toFixed(1);
        flash=1; spawnBurst(head); sfx.eat(); placeFood(); updateStats(true);
      } else snake.pop();
    }

    function gameOver(){ running=false; over=true; sfx.die(); if(score>best){ best=score; try{localStorage.setItem('snake.best',best);}catch(e){} } elBest.textContent=best; showOverlay('over'); }

    function spawnBurst(c){ const cx=(c.x+.5)*cell, cy=(c.y+.5)*cell;
      for(let i=0;i<16;i++){ const a=Math.random()*Math.PI*2, sp=.8+Math.random()*2.4;
        particles.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,decay:.02+Math.random()*.02,size:cell*(.12+Math.random()*.16)}); } }
    function updateParticles(){ for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vx*=.94; p.vy*=.94; p.life-=p.decay; if(p.life<=0) particles.splice(i,1); } }

    // ---- drawing ----
    function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

    function draw(){
      if(!ctx) return;
      ctx.clearRect(0,0,boardSize,boardSize);
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){ if((x+y)%2===0){ ctx.fillStyle='rgba(94,240,168,.035)'; ctx.fillRect(x*cell,y*cell,cell,cell); } }

      for(const w of LEVEL.walls){
        const px=w.x*cell, py=w.y*cell, pad=cell*.12, r=cell*.22;
        ctx.save();
        ctx.shadowColor='rgba(255,150,110,.55)'; ctx.shadowBlur=cell*.5;
        const grd=ctx.createLinearGradient(px,py,px,py+cell);
        grd.addColorStop(0,'#5c6a72'); grd.addColorStop(1,'#313d44');
        ctx.fillStyle=grd;
        roundRect(px+pad,py+pad,cell-2*pad,cell-2*pad,r); ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,.10)';
        roundRect(px+pad,py+pad,cell-2*pad,(cell-2*pad)*.42,r); ctx.fill();
        ctx.restore();
      }

      if(food && food.x>=0){
        const fx=(food.x+.5)*cell, fy=(food.y+.5)*cell;
        const pulse=1+Math.sin(foodPulse*.12)*.09;
        ctx.save();
        ctx.shadowColor='rgba(255,125,92,.8)'; ctx.shadowBlur=cell*.7;
        ctx.fillStyle='#ff7d5c'; ctx.beginPath(); ctx.arc(fx,fy+cell*.04,cell*.32*pulse,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(fx-cell*.1,fy-cell*.06,cell*.08,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#7a4a2e'; ctx.lineWidth=cell*.05; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(fx,fy-cell*.28); ctx.lineTo(fx+cell*.06,fy-cell*.46); ctx.stroke();
        ctx.restore();
      }

      const n=snake.length;
      for(let i=n-1;i>=0;i--){
        const c=snake[i], t=i/n, p=cell*(.08+t*.13), g=.95 - t*.45;
        roundRect(c.x*cell+p,c.y*cell+p,cell-2*p,cell-2*p,cell*(.28-t*.06));
        ctx.fillStyle=`rgb(${Math.round(94*g)},${Math.round(240*g)},${Math.round(168*g)})`; ctx.fill();
      }

      const h=snake[0], hx=h.x*cell, hy=h.y*cell;
      ctx.save();
      ctx.shadowColor='rgba(94,240,168,.7)'; ctx.shadowBlur=cell*.5;
      roundRect(hx+cell*.08,hy+cell*.08,cell*.84,cell*.84,cell*.3); ctx.fillStyle='#c7ffe4'; ctx.fill();
      ctx.restore();
      const ex=hx+cell/2, ey=hy+cell/2, off=cell*.16; let rx,ry;
      if(dir.x!==0){ rx=dir.x*off; ry=0; } else { rx=0; ry=dir.y*off; }
      const perp = dir.x!==0 ? [0,off] : [off,0];
      ctx.fillStyle='#06231c';
      [[-perp[0],-perp[1]],[perp[0],perp[1]]].forEach(o=>{ ctx.beginPath(); ctx.arc(ex+rx+o[0],ey+ry+o[1],cell*.09,0,Math.PI*2); ctx.fill(); });

      for(const p of particles){ ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle='#ffd27d'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1;

      if(flash>0 && prevHead){ const cx=(prevHead.x+.5)*cell, cy=(prevHead.y+.5)*cell;
        ctx.strokeStyle=`rgba(255,210,125,${flash*.9})`; ctx.lineWidth=cell*.14*flash+1;
        ctx.beginPath(); ctx.arc(cx,cy,cell*(.5+(1-flash)*1.6),0,Math.PI*2); ctx.stroke(); }
    }

    function frame(t){
      requestAnimationFrame(frame);
      foodPulse++; updateParticles(); if(flash>0) flash=Math.max(0,flash-.045);
      if(running && !paused){ while(t-lastStep>=interval){ lastStep+=interval; step(); if(!running) break; } }
      draw();
    }

    // ---- UI ----
    function updateStats(bumpScore){ elScore.textContent=score; elBest.textContent=best; elSpeed.textContent=speedMult+'×';
      if(bumpScore){ const s=elScore.closest('.stat'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); } }

    function showOverlay(type){
      overlay.classList.remove('hidden');
      if(type==='start')
        overlay.innerHTML=`<div class="ov-inner"><span class="ov-kicker">arcade terminal</span>
          <h2 class="ov-title">SNAKE</h2><p class="ov-sub">Eat the apples, grow the line — the borders wrap around, so the only thing that bites back is your own tail.</p>
          <button class="btn btn-primary" id="ovBtn">▶ &nbsp;Start</button>
          <span class="ov-hint">press any arrow key to begin</span></div>`;
      else if(type==='pause')
        overlay.innerHTML=`<div class="ov-inner"><span class="ov-kicker">paused</span><h2 class="ov-title">PAUSED</h2>
          <button class="btn btn-primary" id="ovBtn">Resume</button><span class="ov-hint">press space to continue</span></div>`;
      else if(type==='over')
        overlay.innerHTML=`<div class="ov-inner"><span class="ov-kicker">game over</span><h2 class="ov-title">GAME OVER</h2>
          <p class="ov-score">${score} PTS${score>=best&&score>0?'  · NEW BEST':''}</p>
          <button class="btn btn-primary" id="ovBtn">↻ &nbsp;Play again</button><span class="ov-hint">or press space / enter</span></div>`;
      document.getElementById('ovBtn').addEventListener('click',()=>{ if(type==='pause') resumeGame(); else start(); });
    }
    function hideOverlay(){ overlay.classList.add('hidden'); }

    // ---- input ----
    function setDir(nx,ny){
        const last = inputQueue.length ? inputQueue[inputQueue.length-1] : dir;
        if(nx===last.x && ny===last.y) return;        // same as already-queued move
        if(nx===-last.x && ny===-last.y) return;      // would reverse into yourself
        if(inputQueue.length < 2) inputQueue.push({x:nx,y:ny});
    }


    const KEYMAP={ ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0] };
    window.addEventListener('keydown',e=>{
      if(e.code==='Space'){ e.preventDefault(); if(!started||over) start(); else paused?resumeGame():pauseGame(); return; }
      if(e.code==='Enter' && over){ start(); return; }
      const d=KEYMAP[e.code]; if(d){ e.preventDefault(); ensureAudio();
        if(!started||over) start();
        setDir(d[0],d[1]); }
    });

    let ts=null;
    canvas.addEventListener('touchstart',e=>{ const t=e.touches[0]; ts={x:t.clientX,y:t.clientY}; ensureAudio(); if(!started||over) start(); },{passive:true});
    canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
    canvas.addEventListener('touchend',e=>{ if(!ts) return; const t=e.changedTouches[0];
      const dx=t.clientX-ts.x, dy=t.clientY-ts.y; ts=null;
      if(Math.max(Math.abs(dx),Math.abs(dy))<24) return;
      if(Math.abs(dx)>Math.abs(dy)) setDir(Math.sign(dx),0); else setDir(0,Math.sign(dy)); });

    dpad.querySelectorAll('.dbtn').forEach(b=>b.addEventListener('pointerdown',e=>{ e.preventDefault(); ensureAudio();
      const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.dir]; if(!started||over) start(); setDir(m[0],m[1]); }));

    muteBtn.addEventListener('click',()=>{ muted=!muted; muteBtn.textContent=muted?'🔇':'🔊'; });
    document.addEventListener('visibilitychange',()=>{ if(document.hidden && running && !paused) pauseGame(); });

    // ---- boot (order matters: size → state → UI → loop) ----
    try { best = parseInt(localStorage.getItem('snake.best')||'0',10)||0; } catch(e){ best=0; }
    resize();
    reset();          // defines food + snake before any draw
    updateStats();
    showOverlay('start');
    requestAnimationFrame(frame);

  } catch (err) { fail(err && err.message ? err.message : String(err)); }
})();
