import { getBiomeAt } from "./biome-provider.js?v=5.0.1";
import { isSlimeChunkAt } from "./slime-provider.js?v=5.0.1";
import { STRUCTURE_SOURCES, getCategoryColor, getCategorySymbol, normalizeStructureCategory } from "../structures/config.js?v=5.0.1";
import { blockToChunk } from "../utils.js?v=5.0.1";

const ZOOM_LEVELS = [
  { id: "wide", label: "広域", scale: 0.045, tile: 96 },
  { id: "standard", label: "標準", scale: 0.09, tile: 48 },
  { id: "detail", label: "詳細", scale: 0.18, tile: 24 },
];

export class MapEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.callbacks = callbacks;
    this.centerX = 0;
    this.centerZ = 0;
    this.zoomIndex = 1;
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
    };
    this.drag = null;
    this.bindEvents();
    this.resize();
  }

  setState(state) {
    Object.assign(this, state);
    this.resize();
    this.render();
  }

  setLayers(layers) {
    this.layers = { ...this.layers, ...layers };
    this.render();
  }

  setView(centerX, centerZ) {
    this.centerX = centerX;
    this.centerZ = centerZ;
    this.render();
  }

  getZoomLabel() {
    return ZOOM_LEVELS[this.zoomIndex].label;
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

  render() {
    this.resize();
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#101510";
    this.ctx.fillRect(0, 0, width, height);

    if (this.layers.terrain) this.drawTerrain();
    this.drawGrid(width, height);
    if (this.layers.slime) this.drawSlimeChunks();
    if (this.layers.structures) this.drawStructures(this.structures);
    if (this.layers.manual) this.drawStructures(this.manualMarkers);
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

  drawTerrain() {
    const scale = this.getScale();
    const tile = ZOOM_LEVELS[this.zoomIndex].tile;
    const bounds = this.getBounds();
    const startX = Math.floor(bounds.minX / tile) * tile;
    const startZ = Math.floor(bounds.minZ / tile) * tile;

    for (let z = startZ; z <= bounds.maxZ; z += tile) {
      for (let x = startX; x <= bounds.maxX; x += tile) {
        const biome = getBiomeAt(this.seed, this.edition, this.version, x, z);
        const point = this.worldToScreen(x, z);
        this.ctx.fillStyle = biome.color;
        this.ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(tile * scale) + 1, Math.ceil(tile * scale) + 1);
      }
    }
  }

  drawGrid(width, height) {
    const scale = this.getScale();
    const bounds = this.getBounds();
    const gridStep = scale > 0.13 ? 16 : scale > 0.06 ? 64 : 256;
    const startX = Math.floor(bounds.minX / gridStep) * gridStep;
    const startZ = Math.floor(bounds.minZ / gridStep) * gridStep;
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "rgba(16, 21, 16, 0.34)";

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
    this.ctx.fillStyle = "rgba(123, 220, 104, 0.28)";

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

  drawCrosshair(width, height) {
    this.ctx.strokeStyle = "rgba(255,255,255,0.58)";
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
      this.render();
    });

    this.canvas.addEventListener("pointerup", (event) => {
      if (!this.drag) return;
      const wasDrag = this.drag.moved;
      this.drag = null;
      if (wasDrag) {
        this.callbacks.onViewChange?.(this.centerX, this.centerZ, { live: false });
        return;
      }
      this.handleClick(event);
    });

    this.canvas.addEventListener("pointercancel", () => {
      this.drag = null;
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
        this.callbacks.onZoomChange?.(this.getZoomLabel());
        this.callbacks.onViewChange?.(this.centerX, this.centerZ, { live: false });
      }
      this.render();
    }, { passive: false });

    window.addEventListener("resize", () => this.render());
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
