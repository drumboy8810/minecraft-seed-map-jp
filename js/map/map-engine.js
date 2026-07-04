import { getBiomeAt } from "./biome-provider.js?v=5.1.0";
import { isSlimeChunkAt } from "./slime-provider.js?v=5.1.0";
import { STRUCTURE_SOURCES, getCategoryColor, getCategorySymbol, normalizeStructureCategory } from "../structures/config.js?v=5.1.0";
import { blockToChunk } from "../utils.js?v=5.1.0";

const ZOOM_LEVELS = [
  { id: "overview", label: "広域", scale: 0.028, tile: 192 },
  { id: "wide", label: "広域+", scale: 0.052, tile: 96 },
  { id: "standard", label: "標準", scale: 0.1, tile: 48 },
  { id: "detail", label: "詳細", scale: 0.22, tile: 16 },
  { id: "close", label: "近距離", scale: 0.46, tile: 8 },
];

const MAX_TERRAIN_CACHE = 12000;

export class MapEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.callbacks = callbacks;
    this.centerX = 0;
    this.centerZ = 0;
    this.zoomIndex = 2;
    this.seed = 0n;
    this.edition = "java";
    this.version = "java-1.21";
    this.structures = [];
    this.manualMarkers = [];
    this.layers = {
      terrain: true,
      slime: true,
      structures: true,
      manual: true,
      origin: true,
    };
    this.drag = null;
    this.pixelRatio = 1;
    this.frameRequest = null;
    this.pendingFastRender = false;
    this.terrainCache = new Map();
    this.bindEvents();
    this.resize();
    this.requestRender();
  }

  setState(state) {
    Object.assign(this, state);
    this.layers = { terrain: true, slime: true, structures: true, manual: true, origin: true, ...this.layers };
    this.resize();
    this.requestRender();
  }

  setLayers(layers) {
    this.layers = { ...this.layers, ...layers };
    this.requestRender();
  }

  setView(centerX, centerZ) {
    this.centerX = centerX;
    this.centerZ = centerZ;
    this.requestRender();
  }

  getZoomLabel() {
    return ZOOM_LEVELS[this.zoomIndex].label;
  }

  getZoomStatus() {
    const level = ZOOM_LEVELS[this.zoomIndex];
    return `${level.label} / ${Math.round(level.scale * 100)}%`;
  }

  getScale() {
    return ZOOM_LEVELS[this.zoomIndex].scale;
  }

  getBounds() {
    const scale = this.getScale();
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    return {
      minX: this.centerX - width / 2 / scale,
      maxX: this.centerX + width / 2 / scale,
      minZ: this.centerZ - height / 2 / scale,
      maxZ: this.centerZ + height / 2 / scale,
    };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width || 960));
    const height = Math.max(360, Math.floor(rect.height || 620));
    if (this.canvas.width !== Math.floor(width * this.pixelRatio) || this.canvas.height !== Math.floor(height * this.pixelRatio)) {
      this.canvas.width = Math.floor(width * this.pixelRatio);
      this.canvas.height = Math.floor(height * this.pixelRatio);
    }
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  requestRender(fast = false) {
    this.pendingFastRender = this.pendingFastRender || fast;
    if (this.frameRequest !== null) return;
    this.frameRequest = requestAnimationFrame(() => {
      const useFastRender = this.pendingFastRender;
      this.frameRequest = null;
      this.pendingFastRender = false;
      this.render({ fast: useFastRender });
    });
  }

  render({ fast = false } = {}) {
    this.resize();
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#101510";
    this.ctx.fillRect(0, 0, width, height);

    if (this.layers.terrain) this.drawTerrain(fast);
    this.drawGrid(width, height);
    if (!fast && this.layers.slime) this.drawSlimeChunks();
    if (this.layers.structures) this.drawStructures(this.structures);
    if (this.layers.manual) this.drawStructures(this.manualMarkers);
    if (this.layers.origin) this.drawOriginMarker();
    this.drawCrosshair(width, height);
  }

  worldToScreen(x, z) {
    const scale = this.getScale();
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    return {
      x: (x - this.centerX) * scale + width / 2,
      y: (z - this.centerZ) * scale + height / 2,
    };
  }

  screenToWorld(x, y) {
    const scale = this.getScale();
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    return {
      x: this.centerX + (x - width / 2) / scale,
      z: this.centerZ + (y - height / 2) / scale,
    };
  }

  drawTerrain(fast = false) {
    const scale = this.getScale();
    const baseTile = ZOOM_LEVELS[this.zoomIndex].tile;
    const tile = fast ? baseTile * 2 : baseTile;
    const bounds = this.getBounds();
    const startX = Math.floor(bounds.minX / tile) * tile;
    const startZ = Math.floor(bounds.minZ / tile) * tile;

    for (let z = startZ; z <= bounds.maxZ; z += tile) {
      for (let x = startX; x <= bounds.maxX; x += tile) {
        const biome = this.getCachedBiome(x, z, tile);
        const point = this.worldToScreen(x, z);
        this.ctx.fillStyle = biome.color;
        this.ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(tile * scale) + 1, Math.ceil(tile * scale) + 1);
      }
    }
  }

  getCachedBiome(x, z, tile) {
    const key = `${this.seed}:${this.edition}:${this.version}:${tile}:${x}:${z}`;
    const cached = this.terrainCache.get(key);
    if (cached) return cached;

    const biome = getBiomeAt(this.seed, this.edition, this.version, x, z);
    this.terrainCache.set(key, biome);
    if (this.terrainCache.size > MAX_TERRAIN_CACHE) {
      const deleteCount = Math.ceil(MAX_TERRAIN_CACHE * 0.2);
      for (const oldKey of this.terrainCache.keys()) {
        this.terrainCache.delete(oldKey);
        if (this.terrainCache.size <= MAX_TERRAIN_CACHE - deleteCount) break;
      }
    }
    return biome;
  }

  drawGrid(width, height) {
    const scale = this.getScale();
    const bounds = this.getBounds();
    const gridStep = scale >= 0.4 ? 16 : scale >= 0.18 ? 32 : scale >= 0.08 ? 64 : 256;
    const startX = Math.floor(bounds.minX / gridStep) * gridStep;
    const startZ = Math.floor(bounds.minZ / gridStep) * gridStep;
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "rgba(16, 21, 16, 0.38)";

    for (let x = startX; x <= bounds.maxX; x += gridStep) {
      const point = this.worldToScreen(x, bounds.minZ);
      this.ctx.beginPath();
      this.ctx.moveTo(Math.round(point.x) + 0.5, 0);
      this.ctx.lineTo(Math.round(point.x) + 0.5, height);
      this.ctx.stroke();
    }
    for (let z = startZ; z <= bounds.maxZ; z += gridStep) {
      const point = this.worldToScreen(bounds.minX, z);
      this.ctx.beginPath();
      this.ctx.moveTo(0, Math.round(point.y) + 0.5);
      this.ctx.lineTo(width, Math.round(point.y) + 0.5);
      this.ctx.stroke();
    }
  }

  drawSlimeChunks() {
    const scale = this.getScale();
    if (scale < 0.08) return;
    const bounds = this.getBounds();
    const minChunkX = Math.floor(bounds.minX / 16);
    const maxChunkX = Math.floor(bounds.maxX / 16);
    const minChunkZ = Math.floor(bounds.minZ / 16);
    const maxChunkZ = Math.floor(bounds.maxZ / 16);
    this.ctx.fillStyle = "rgba(123, 220, 104, 0.26)";

    for (let z = minChunkZ; z <= maxChunkZ; z += 1) {
      for (let x = minChunkX; x <= maxChunkX; x += 1) {
        if (!isSlimeChunkAt(this.seed, this.edition, x, z)) continue;
        const point = this.worldToScreen(x * 16, z * 16);
        this.ctx.fillRect(point.x, point.y, Math.max(2, 16 * scale), Math.max(2, 16 * scale));
      }
    }
  }

  drawStructures(structures) {
    const bounds = this.getBounds();
    for (const structure of structures) {
      if (structure.x < bounds.minX || structure.x > bounds.maxX || structure.z < bounds.minZ || structure.z > bounds.maxZ) {
        continue;
      }
      const point = this.worldToScreen(structure.x, structure.z);
      const category = normalizeStructureCategory(structure.type);
      const symbol = getCategorySymbol(category);
      const color = getCategoryColor(category);
      const isAuto = structure.source === STRUCTURE_SOURCES.AUTO;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, isAuto ? 9 : 8, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.lineWidth = isAuto ? 2 : 1;
      this.ctx.strokeStyle = isAuto ? "#f6fff2" : "#101510";
      this.ctx.setLineDash(isAuto ? [3, 2] : []);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = "#0d180c";
      this.ctx.font = "700 9px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(symbol.slice(0, 1), point.x, point.y + 0.5);
      this.ctx.restore();
    }
  }

  drawOriginMarker() {
    const point = this.worldToScreen(0, 0);
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    if (point.x < -80 || point.x > width + 80 || point.y < -80 || point.y > height + 80) return;

    this.ctx.save();
    this.ctx.strokeStyle = "#fff6a6";
    this.ctx.fillStyle = "#fff6a6";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 16, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(point.x - 24, point.y);
    this.ctx.lineTo(point.x + 24, point.y);
    this.ctx.moveTo(point.x, point.y - 24);
    this.ctx.lineTo(point.x, point.y + 24);
    this.ctx.stroke();
    this.ctx.font = "800 12px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("0,0 初期地点", point.x + 20, point.y - 18);
    this.ctx.restore();
  }

  drawCrosshair(width, height) {
    this.ctx.strokeStyle = "rgba(255,255,255,0.56)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(width / 2 - 9, height / 2);
    this.ctx.lineTo(width / 2 + 9, height / 2);
    this.ctx.moveTo(width / 2, height / 2 - 9);
    this.ctx.lineTo(width / 2, height / 2 + 9);
    this.ctx.stroke();
  }

  bindEvents() {
    this.canvas.addEventListener("pointerdown", (event) => {
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.classList.add("is-dragging");
      this.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        centerX: this.centerX,
        centerZ: this.centerZ,
        moved: false,
      };
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.drag) return;
      const scale = this.getScale();
      const dx = event.clientX - this.drag.startX;
      const dy = event.clientY - this.drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
      this.centerX = this.drag.centerX - dx / scale;
      this.centerZ = this.drag.centerZ - dy / scale;
      this.callbacks.onViewChange?.(this.centerX, this.centerZ, { live: true });
      this.requestRender(true);
    });

    this.canvas.addEventListener("pointerup", (event) => {
      if (!this.drag) return;
      const wasDrag = this.drag.moved;
      this.drag = null;
      this.canvas.classList.remove("is-dragging");
      if (wasDrag) {
        this.callbacks.onViewChange?.(this.centerX, this.centerZ, { live: false });
        this.requestRender(false);
        return;
      }
      this.handleClick(event);
    });

    this.canvas.addEventListener("pointercancel", () => {
      this.drag = null;
      this.canvas.classList.remove("is-dragging");
      this.requestRender(false);
    });

    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const previousScale = this.getScale();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const before = this.screenToWorld(mouseX, mouseY);
      this.zoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, this.zoomIndex + (event.deltaY > 0 ? -1 : 1)));
      const nextScale = this.getScale();
      if (nextScale !== previousScale) {
        this.centerX = before.x - (mouseX - rect.width / 2) / nextScale;
        this.centerZ = before.z - (mouseY - rect.height / 2) / nextScale;
        this.callbacks.onZoomChange?.(this.getZoomStatus(), this.getScale());
        this.callbacks.onViewChange?.(this.centerX, this.centerZ, { live: false });
      }
      this.requestRender(true);
      window.clearTimeout(this.zoomDetailTimer);
      this.zoomDetailTimer = window.setTimeout(() => this.requestRender(false), 80);
    }, { passive: false });

    window.addEventListener("resize", () => this.requestRender());
  }

  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const world = this.screenToWorld(x, y);
    const markers = [...this.structures, ...this.manualMarkers]
      .map((structure) => ({
        structure,
        point: this.worldToScreen(structure.x, structure.z),
      }))
      .filter((item) => Math.hypot(item.point.x - x, item.point.y - y) <= 14)
      .sort((a, b) => Math.hypot(a.point.x - x, a.point.y - y) - Math.hypot(b.point.x - x, b.point.y - y))
      .slice(0, 8)
      .map((item) => item.structure);

    this.callbacks.onSelect?.({
      chunkX: blockToChunk(world.x),
      chunkZ: blockToChunk(world.z),
      blockX: Math.round(world.x),
      blockZ: Math.round(world.z),
      markers,
    });
  }
}
