// Simple Balloon Pop game (no external assets)
// Author: Copilot-style example for kids

const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverModal = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');

let score = 0;
let timeLeft = 30;
let spawnTimer = null;
let gameTimer = null;
let running = false;
let audioCtx = null;

const COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#B388FF','#FF9F1C'];

// start game
startBtn.addEventListener('click', startGame);
restartBtn?.addEventListener('click', startGame);

function startGame(){
  if (running) return;
  running = true;
  score = 0;
  timeLeft = 30;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  gameArea.innerHTML = '';
  gameOverModal.classList.add('hidden');
  gameOverModal.setAttribute('aria-hidden','true');
  // spawn faster gradually by decreasing interval
  let spawnInterval = 900;
  spawnTimer = setInterval(()=> {
    spawnBalloon();
    // slowly ramp difficulty
    spawnInterval = Math.max(350, spawnInterval - 8);
    clearInterval(spawnTimer);
    spawnTimer = setInterval(() => spawnBalloon(), spawnInterval);
  }, spawnInterval);

  // second-based game timer
  gameTimer = setInterval(()=>{
    timeLeft--;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

// end game
function endGame(){
  running = false;
  clearAllTimers();
  // remove remaining balloons interactable
  gameArea.querySelectorAll('.balloon').forEach(b => b.style.pointerEvents = 'none');
  finalScoreEl.textContent = score;
  gameOverModal.classList.remove('hidden');
  gameOverModal.setAttribute('aria-hidden','false');
}

// clear timers helper
function clearAllTimers(){
  if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
}

// spawn a balloon
function spawnBalloon(){
  const b = document.createElement('div');
  b.className = 'balloon';
  const size = randRange(48, 120);
  b.style.width = size + 'px';
  b.style.height = size + 'px';
  const left = randRange(6, 92); // percent
  b.style.left = left + '%';
  // random color
  const color = COLORS[Math.floor(Math.random()*COLORS.length)];
  b.style.background = color;
  b.style.color = '#fff';
  // random float speed
  const duration = randRange(4500, 12000);
  b.style.animation = `floatUp ${duration}ms linear forwards`;
  // slight rotation origin
  b.style.transformOrigin = '50% 80%';

  // clicking/tapping to pop
  const onPop = (e) => {
    e.stopPropagation();
    if (!running) return;
    popBalloon(b, color);
  };

  b.addEventListener('click', onPop, {passive:true});
  b.addEventListener('touchstart', onPop, {passive:true});

  // remove balloon when animation ends (it floated off)
  b.addEventListener('animationend', () => {
    // remove from DOM
    if (b.parentNode) b.parentNode.removeChild(b);
  });

  gameArea.appendChild(b);
  // make appear slightly with scale
  requestAnimationFrame(()=> b.style.transform = 'translateY(0)');

  // small bobbing using CSS transform via requestFrame for nicer entrance
}

// handle popping
function popBalloon(balloonEl, color){
  // prevent double pops
  if (!balloonEl.isConnected) return;

  // play sound
  playPopSound();

  // increment score
  score += 1;
  scoreEl.textContent = score;

  // create a ring and particles at balloon center
  const rect = balloonEl.getBoundingClientRect();
  const parentRect = gameArea.getBoundingClientRect();
  const cx = rect.left - parentRect.left + rect.width/2;
  const cy = rect.top - parentRect.top + rect.height/2;

  createPopRing(cx, cy, color);
  createParticles(cx, cy, color, Math.min(12, Math.round(rect.width/10)));

  // remove balloon
  balloonEl.remove();
}

// pop ring
function createPopRing(x,y,color){
  const ring = document.createElement('div');
  ring.className = 'pop-ring';
  ring.style.left = (x - 10) + 'px';
  ring.style.top = (y - 10) + 'px';
  ring.style.width = '20px';
  ring.style.height = '20px';
  ring.style.borderColor = lightenColor(color, 0.6);
  gameArea.appendChild(ring);
  setTimeout(()=> ring.remove(), 420);
}

// particles
function createParticles(x,y,color,count=8){
  for (let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = (x - 4) + 'px';
    p.style.top = (y - 4) + 'px';
    p.style.background = color;
    // random direction
    const angle = Math.random()*Math.PI*2;
    const dist = randRange(18, 80);
    const dx = Math.cos(angle)*dist;
    const dy = Math.sin(angle)*dist - randRange(6, 30);
    p.style.setProperty('--dx', Math.round(dx)+'px');
    p.style.setProperty('--dy', Math.round(dy)+'px');
    gameArea.appendChild(p);
    setTimeout(()=> p.remove(), 800);
  }
}

// small helpers
function randRange(min, max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

function lightenColor(hex, amt){
  // hex like #RRGGBB
  const c = hex.replace('#','');
  const num = parseInt(c,16);
  let r = (num >> 16) + Math.round(255*amt);
  let g = ((num >> 8) & 0x00FF) + Math.round(255*amt);
  let b = (num & 0x0000FF) + Math.round(255*amt);
  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);
  return '#' + ( (1<<24) + (r<<16) + (g<<8) + b ).toString(16).slice(1);
}

// simple pop sound using WebAudio (short noise burst)
function playPopSound(){
  try{
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const duration = 0.06;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++){
      // decaying white noise
      data[i] = (Math.random()*2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    // optional filter to make it sharper
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration + 0.02);
  }catch(e){
    // audio not available or blocked; ignore
    // console.log('Audio failed', e);
  }
}

// Accessibility: allow pressing Enter on Start when focused
startBtn.addEventListener('keyup', (e)=> { if (e.key === 'Enter') startBtn.click(); });
restartBtn?.addEventListener('keyup', (e)=> { if (e.key === 'Enter') restartBtn.click(); });

// Clean up when page becomes hidden
document.addEventListener('visibilitychange', ()=>{
  if (document.hidden && running) {
    // pause game timers
    clearAllTimers();
  } else if (!document.hidden && running && !gameTimer) {
    // resume: start a simple countdown to continue (safe fallback)
    gameTimer = setInterval(()=>{
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) endGame();
    }, 1000);
  }
});
