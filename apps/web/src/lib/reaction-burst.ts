/**
 * A tiny confetti burst that throws copies of a reaction image from a point.
 * One shared full-screen canvas is created on demand and removed when idle.
 */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  life: number;
  ttl: number;
};

const images = new Map<string, Promise<HTMLImageElement>>();
let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let particles: Array<Particle & { image: HTMLImageElement }> = [];
let frame = 0;
let lastTime = 0;

function loadImage(src: string) {
  let promise = images.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`cannot load ${src}`));
      image.src = src;
    });
    images.set(src, promise);
  }
  return promise;
}

function ensureCanvas() {
  if (canvas && context) return context;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80;';
  document.body.appendChild(canvas);
  context = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return context;
}

function resize() {
  if (!canvas || !context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function teardown() {
  if (frame) window.cancelAnimationFrame(frame);
  frame = 0;
  window.removeEventListener('resize', resize);
  canvas?.remove();
  canvas = null;
  context = null;
  particles = [];
}

function tick(now: number) {
  const ctx = context;
  if (!ctx || !canvas) return;
  const delta = Math.min(48, now - (lastTime || now)) / 1000;
  lastTime = now;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  particles = particles.filter((particle) => {
    particle.life += delta;
    if (particle.life >= particle.ttl) return false;
    particle.vy += 1500 * delta;
    particle.vx *= 0.985;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.rotation += particle.spin * delta;
    const progress = particle.life / particle.ttl;
    const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    const size = particle.size * (0.85 + 0.3 * Math.sin(progress * Math.PI));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.drawImage(particle.image, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
  });

  if (particles.length > 0) {
    frame = window.requestAnimationFrame(tick);
  } else {
    teardown();
  }
}

export async function burstReaction(src: string, origin: { x: number; y: number }, count = 14) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let image: HTMLImageElement;
  try {
    image = await loadImage(src);
  } catch {
    return;
  }
  const ctx = ensureCanvas();
  if (!ctx) return;

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 420 + Math.random() * 380;
    particles.push({
      image,
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: (Math.random() - 0.5) * Math.PI,
      spin: (Math.random() - 0.5) * 8,
      size: 16 + Math.random() * 14,
      life: 0,
      ttl: 0.9 + Math.random() * 0.5,
    });
  }

  if (!frame) {
    lastTime = 0;
    frame = window.requestAnimationFrame(tick);
  }
}
