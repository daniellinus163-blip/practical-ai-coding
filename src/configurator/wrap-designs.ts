import { CanvasTexture, RepeatWrapping, type Texture } from "three";

export type WrapDesignId =
  | "none"
  | "racing-stripes"
  | "dual-tone"
  | "honeycomb"
  | "gulf"
  | "martini"
  | "digital-camo"
  | "satin-fade";

export const wrapDesigns: ReadonlyArray<{ id: WrapDesignId; label: string; description: string }> = [
  { id: "none", label: "Factory paint", description: "Solid colour only." },
  { id: "racing-stripes", label: "Racing stripes", description: "Centre rally stripes over your base colour." },
  { id: "dual-tone", label: "Dual tone", description: "Roof and shoulders in a contrast shade." },
  { id: "honeycomb", label: "Honeycomb", description: "Subtle hex mesh — popular on track builds." },
  { id: "gulf", label: "Gulf heritage", description: "Light blue panel with orange centre band." },
  { id: "martini", label: "Martini stripes", description: "Wide colour bands in motorsport style." },
  { id: "digital-camo", label: "Digital camo", description: "Soft pixel camo overlay." },
  { id: "satin-fade", label: "Satin fade", description: "Matte wrap fade from nose to tail." },
];

const wrapIds = new Set<string>(wrapDesigns.map((item) => item.id));

export function isWrapDesignId(value: string): value is WrapDesignId {
  return wrapIds.has(value);
}

const textureCache = new Map<WrapDesignId, CanvasTexture>();

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 1.5): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_2d_unavailable");
  draw(ctx, size);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = "srgb";
  texture.needsUpdate = true;
  return texture;
}

function drawRacingStripes(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const stripe = size * 0.09;
  const gap = size * 0.38;
  ctx.fillRect(size / 2 - gap / 2 - stripe, 0, stripe, size);
  ctx.fillRect(size / 2 + gap / 2, 0, stripe, size);
}

function drawDualTone(ctx: CanvasRenderingContext2D, size: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "rgba(30,30,30,0.85)");
  grad.addColorStop(0.42, "rgba(30,30,30,0.85)");
  grad.addColorStop(0.43, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

function drawHoneycomb(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  const r = 18;
  const h = r * Math.sqrt(3);
  for (let y = -h; y < size + h; y += h) {
    for (let x = -r; x < size + r; x += r * 3) {
      const ox = x + (Math.floor(y / h) % 2) * (r * 1.5);
      hex(ctx, ox, y, r);
    }
  }
}

function hex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawGulf(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "rgba(130,185,220,0.75)";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(235,120,45,0.9)";
  ctx.fillRect(0, size * 0.38, size, size * 0.14);
}

function drawMartini(ctx: CanvasRenderingContext2D, size: number) {
  const bands = ["rgba(180,30,40,0.75)", "rgba(235,235,235,0.85)", "rgba(40,70,170,0.7)"];
  const h = size / bands.length;
  bands.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, index * h, size, h);
  });
}

function drawDigitalCamo(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, size, size);
  const cell = 16;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      if ((x ^ y) % 3 === 0) {
        ctx.fillStyle = "rgba(220,220,220,0.18)";
        ctx.fillRect(x, y, cell - 1, cell - 1);
      }
    }
  }
}

function drawSatinFade(ctx: CanvasRenderingContext2D, size: number) {
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, "rgba(255,255,255,0.35)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.05)");
  grad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

export function getWrapTexture(id: WrapDesignId): Texture | null {
  if (id === "none") return null;
  const cached = textureCache.get(id);
  if (cached) return cached;

  let texture: CanvasTexture;
  switch (id) {
    case "racing-stripes":
      texture = canvasTexture(drawRacingStripes, 2);
      break;
    case "dual-tone":
      texture = canvasTexture(drawDualTone, 1);
      break;
    case "honeycomb":
      texture = canvasTexture(drawHoneycomb, 3);
      break;
    case "gulf":
      texture = canvasTexture(drawGulf, 1);
      break;
    case "martini":
      texture = canvasTexture(drawMartini, 1);
      break;
    case "digital-camo":
      texture = canvasTexture(drawDigitalCamo, 4);
      break;
    case "satin-fade":
      texture = canvasTexture(drawSatinFade, 1.2);
      break;
    default:
      return null;
  }
  textureCache.set(id, texture);
  return texture;
}
