const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const scale = 2;
const rect = canvas.getBoundingClientRect();
canvas.width = rect.width * scale;
canvas.height = rect.height * scale;
const width = canvas.width;
const height = canvas.height;


let score = 0;
let bubbles = [];
let popups = []; 


const gravity = 0.07;
const buoyancy = -0.03;
const friction = 0.975;
const wallBounce = -0.5;
let lastWinX = window.screenX, lastWinY = window.screenY;

const ball = {
    x: width / 3, y: height - 20,
    vx: 0, vy: 0,
    radius: 9 * scale,
    color: '#ff7f50', lineColor: '#8b4500',
    rotation: 0
};
const hoop = {
    x: width - 65 * scale,
    rimY: height / 2 - 20,
    netBottomY: height / 2 + 35,
    w: 38 * scale,
    backboardX: width - 15,
    ballInNet: false
};

function createPopup(text, color) {
    popups.push({ text, color, x: width/2, y: height/2, timer: 45 });
}

function createBubble(x, y, speed) {
    bubbles.push({ x: x, y: y, speed: speed || (1 + Math.random() * 3), size: Math.random() * 4 * scale });
}


canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const clickX = (e.clientX - r.left) * scale;
    
    for (let i = 0; i < 6; i++) createBubble(clickX + (Math.random() - 0.5) * 20, height);
    ball.vy -= 5 + Math.random() * 2;
    if (clickX < width / 2) ball.vx += 3 + Math.random() * 2;
    else ball.vx -= 3 + Math.random() * 2;
    ball.vx += (Math.random() - 0.5);
});


function update() {
    if (hoop.ballInNet) {
        ball.vy += 0.25; ball.vx *= 0.6;
        ball.x += ((hoop.x + hoop.w / 2) - ball.x) * 0.15;
        ball.y += ball.vy; ball.x += ball.vx;
        if (ball.y > hoop.netBottomY) {
            score++; createPopup("+1", "rgba(29, 29, 29, 0.7)");
            for (let i = 0; i < 15; i++) createBubble(ball.x, ball.y, 4);
            hoop.ballInNet = false;
        }
        if (ball.y < hoop.rimY - 10) hoop.ballInNet = false;
        return;
    }

    const dX = window.screenX - lastWinX; const dY = window.screenY - lastWinY;
    if (Math.abs(dX) > 0 || Math.abs(dY) > 0) { ball.vx -= dX * 0.1; ball.vy -= dY * 0.1; }
    lastWinX = window.screenX; lastWinY = window.screenY;

    ball.vy += gravity + buoyancy;
    ball.vx *= friction; ball.vy *= friction;
    ball.x += ball.vx; ball.y += ball.vy;
    ball.rotation += ball.vx * 0.05;

    if (ball.x + ball.radius > width) { ball.x = width - ball.radius; ball.vx *= wallBounce; }
    if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx *= wallBounce; }
    if (ball.y + ball.radius > height) { ball.y = height - ball.radius; ball.vy *= wallBounce; }
    if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy *= wallBounce; }

    if (ball.x + ball.radius > hoop.backboardX && ball.y < hoop.rimY + 40 && ball.y > hoop.rimY - 60) {
        ball.x = hoop.backboardX - ball.radius; ball.vx *= wallBounce;
    }

    if (ball.vy > 0 && ball.y > hoop.rimY && ball.y < hoop.rimY + 15) {
        if (ball.x > hoop.x + 5 && ball.x < hoop.x + hoop.w - 5) { hoop.ballInNet = true; ball.vy *= 0.5; }
    }

    if (!hoop.ballInNet && ball.vy > 0) {
        if (Math.abs(ball.x - hoop.x) < 8 && Math.abs(ball.y - hoop.rimY) < 8) { ball.vy *= -0.7; ball.vx *= -0.7; }
        if (Math.abs(ball.x - (hoop.x + hoop.w)) < 8 && Math.abs(ball.y - hoop.rimY) < 8) { ball.vy *= -0.7; ball.vx *= -0.7; }
    }
}


function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#999'; ctx.fillRect(hoop.backboardX, hoop.rimY - 35, 6, 50);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(hoop.backboardX + 2, hoop.rimY - 10, 4, 4);

    ctx.beginPath();
    const netTopY = hoop.rimY; const netBotY = hoop.netBottomY;
    for (let i = 1; i < 4; i++) {
        let xTop = hoop.x + (hoop.w / 4) * i; let xBot = (hoop.x + 10) + ((hoop.w - 20) / 4) * i;
        ctx.moveTo(xTop, netTopY); ctx.lineTo(xBot, netBotY);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 1; ctx.stroke();
    
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
        let xTop = hoop.x + (hoop.w / 4) * i; let xBot = (hoop.x + 10) + ((hoop.w - 20) / 4) * i;
        ctx.moveTo(xTop, netTopY); ctx.lineTo(xBot, netBotY);
    }
    const midY = netTopY + (netBotY - netTopY) / 2;
    ctx.moveTo(hoop.x + 5, midY); ctx.lineTo(hoop.x + hoop.w - 5, midY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hoop.x, hoop.rimY); ctx.lineTo(hoop.x + hoop.w, hoop.rimY);
    ctx.strokeStyle = '#ad4141'; ctx.lineWidth = 4 * scale; ctx.lineCap = 'round'; ctx.stroke();

    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.rotation);
    ctx.beginPath(); ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = ball.lineColor; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-ball.radius, 0); ctx.lineTo(ball.radius, 0); ctx.moveTo(0, -ball.radius); ctx.lineTo(0, ball.radius); ctx.stroke();
    ctx.restore();

    drawBubblesAndScore();
}

function drawBubblesAndScore() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    bubbles.forEach((b, i) => {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
        b.y -= b.speed; if (b.y < -10) bubbles.splice(i, 1);
    });

    popups.forEach((p, i) => {
        ctx.fillStyle = p.color; ctx.font = '10px "Press Start 2P", cursive';
        ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y);
        p.y -= 0.5; p.timer--; if (p.timer <= 0) popups.splice(i, 1);
    });
    ctx.textAlign = 'left';

    ctx.font = '16px "Press Start 2P", cursive';
    ctx.fillStyle = 'rgba(29, 29, 29, 0.7)';
    ctx.fillText("PTS:" + score, 15, 25);
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
setTimeout(loop, 100);