// The 3D map as a self-contained three.js scene mounted into a DOM element.
// Web only: the React wrapper creates it and feeds it the game state.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { LOCATIONS, type ClassId, type LocationId } from '@/game';

import { GLYPHS } from '../art/glyphs';
import { LOCATION_ART } from '../art/registry';
import { TONES } from '../art/tones';
import { locationPoint, pointAlong, routeBetween, type Point } from '../map-data';
import { buildLandmarks, buildTrain, buildVegetation, createMaterials, type Landmark, type Materials } from './props';
import { createRider, type Rider } from './rider';
import { HeightGrid, buildRailway, buildRoads, buildTerrain, buildWater } from './terrain';

export interface MapSceneState {
  locationId: LocationId;
  trip: { from: LocationId; to: LocationId; start: number; end: number } | null;
  classId: ClassId;
  horseId?: string;
}

interface Options {
  night: boolean;
  onSelect: (id: LocationId) => void;
}

/** Where the rider waits at each place, relative to its centre in map units. */
const IDLE_SPOT: Record<LocationId, Point> = {
  town: { x: 0.5, y: 1.2 },
  ranch: { x: -1.2, y: 2.4 },
  forest: { x: 0.4, y: 2.8 },
  river: { x: 1.8, y: -1.4 },
  mine: { x: -1.2, y: 2.8 },
  railroad: { x: -0.5, y: 3.5 },
  canyon: { x: -1.8, y: 2.8 },
};

const TRAIL_DOTS = 60;

const SKY = {
  day: { css: 'linear-gradient(180deg, #F7DFB0 0%, #EBC48C 100%)', fog: '#EED3A3' },
  night: { css: 'linear-gradient(180deg, #0C1222 0%, #1D2944 100%)', fog: '#141C30' },
};

function badgeSvg(id: LocationId): string {
  const art = LOCATION_ART[id];
  const tone = TONES[art.tone];
  return `<svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="ft3d-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${tone.top}"/><stop offset="1" stop-color="${tone.bottom}"/>
    </linearGradient></defs>
    <circle cx="50" cy="50" r="46" fill="url(#ft3d-${id})" stroke="${tone.rim}" stroke-width="5"/>
    <g transform="translate(17 17) scale(0.129)"><path d="${GLYPHS[art.glyph]}" fill="${tone.ink}"/></g>
  </svg>`;
}

function hatSvg(): string {
  const tone = TONES.gold;
  return `<svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="${tone.bottom}" stroke="${tone.rim}" stroke-width="5"/>
    <g transform="translate(17 17) scale(0.129)"><path d="${GLYPHS['western-hat']}" fill="${tone.ink}"/></g>
  </svg>`;
}

export class MapScene {
  private readonly container: HTMLElement;
  private readonly options: Options;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 1, 700);
  private readonly controls: OrbitControls;
  private readonly grid = new HeightGrid(128);
  private readonly materials: Materials;
  private readonly landmarks: Landmark[];
  private readonly pickables: THREE.Object3D[] = [];
  private readonly overlay: HTMLDivElement;
  private readonly labels = new Map<
    LocationId,
    { el: HTMLButtonElement; ring: HTMLSpanElement; height: number; halfWidth: number }
  >();
  private readonly marker: HTMLDivElement;
  private readonly hemi = new THREE.HemisphereLight();
  private readonly sun = new THREE.DirectionalLight();
  private readonly fireLights: THREE.PointLight[] = [];
  private readonly flames: THREE.Object3D[] = [];
  private readonly water: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly trail: THREE.InstancedMesh;
  private readonly resizeObserver: ResizeObserver;
  private readonly raycaster = new THREE.Raycaster();
  private readonly scratch = new THREE.Vector3();
  private rider: Rider | null = null;
  private riderKey = '';
  private state: MapSceneState | null = null;
  private route: { key: string; points: Point[] } | null = null;
  private active = true;
  private night = false;
  private needsRender = true;
  private lastRender = 0;
  private interactUntil = 0;
  private pointerDown: { x: number; y: number; t: number } | null = null;
  private width = 1;
  private height = 1;

  constructor(container: HTMLElement, options: Options) {
    this.container = container;
    this.options = options;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;';
    container.appendChild(canvas);

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    container.appendChild(this.overlay);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 28;
    this.controls.maxDistance = 185;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = 1.12;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.9;
    this.controls.screenSpacePanning = false;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.addEventListener('change', () => {
      this.needsRender = true;
      const target = this.controls.target;
      target.x = Math.max(-45, Math.min(45, target.x));
      target.z = Math.max(-45, Math.min(45, target.z));
      target.y = 0;
    });
    this.controls.addEventListener('start', () => {
      this.interactUntil = Infinity;
    });
    this.controls.addEventListener('end', () => {
      this.interactUntil = performance.now() + 1500;
    });
    this.resetView();

    this.materials = createMaterials();
    this.scene.add(buildTerrain(this.grid));
    this.water = buildWater();
    this.scene.add(this.water);
    this.scene.add(buildRoads(this.grid));
    this.scene.add(buildRailway(this.grid));
    this.scene.add(buildVegetation(this.grid));
    this.landmarks = buildLandmarks(this.materials, this.grid);
    for (const landmark of this.landmarks) {
      this.scene.add(landmark.group);
      this.pickables.push(landmark.group);
    }
    const train = buildTrain(this.materials, this.grid);
    this.scene.add(train);
    this.pickables.push(train);

    this.scene.updateMatrixWorld(true);
    this.scene.traverse((object) => {
      if (object.name !== 'flame') return;
      this.flames.push(object);
      const light = new THREE.PointLight('#FF8A3D', 0, 22, 2);
      object.getWorldPosition(light.position);
      light.position.y += 1.2;
      this.fireLights.push(light);
      this.scene.add(light);
    });
    const townLight = new THREE.PointLight('#FFB45A', 0, 28, 2);
    townLight.position.set(0, 6, 2);
    this.fireLights.push(townLight);
    this.scene.add(townLight);

    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -72;
    shadowCamera.right = 72;
    shadowCamera.top = 72;
    shadowCamera.bottom = -72;
    shadowCamera.near = 20;
    shadowCamera.far = 320;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.05, 32),
      new THREE.MeshBasicMaterial({ color: '#F2C14E', transparent: true, opacity: 0.8, depthWrite: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.scene.add(this.ring);

    this.trail = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#F2C14E', emissive: '#C98A12', emissiveIntensity: 0.7 }),
      TRAIL_DOTS,
    );
    this.trail.count = 0;
    this.scene.add(this.trail);

    for (const landmark of this.landmarks) this.createLabel(landmark);
    this.marker = document.createElement('div');
    this.marker.style.cssText =
      'position:absolute;left:0;top:0;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.45));transform:translate(-9999px,-9999px);';
    this.marker.innerHTML = hatSvg();
    this.overlay.appendChild(this.marker);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.setNight(options.night);
    this.renderer.setAnimationLoop(this.frame);
  }

  setState(state: MapSceneState): void {
    this.state = state;
    const key = `${state.classId}:${state.horseId ?? 'foot'}`;
    if (key !== this.riderKey) {
      if (this.rider) this.scene.remove(this.rider.root);
      this.rider = createRider(state.classId, state.horseId);
      this.rider.root.scale.setScalar(2.1);
      this.scene.add(this.rider.root);
      this.riderKey = key;
    }
    for (const [id, label] of this.labels) {
      const here = !state.trip && state.locationId === id;
      const target = state.trip?.to === id;
      label.ring.style.borderColor = here ? '#C9582E' : target ? '#F2C14E' : 'transparent';
    }
    this.needsRender = true;
  }

  setNight(night: boolean): void {
    this.night = night;
    const sky = night ? SKY.night : SKY.day;
    this.container.style.background = sky.css;
    this.scene.fog = new THREE.Fog(sky.fog, 190, 420);
    this.hemi.color.set(night ? '#7088B8' : '#FFF0D6');
    this.hemi.groundColor.set(night ? '#1B140F' : '#8A6A45');
    this.hemi.intensity = night ? 0.55 : 1.3;
    this.sun.color.set(night ? '#A9BEEA' : '#FFD39A');
    this.sun.intensity = night ? 0.8 : 2.6;
    this.sun.position.set(night ? 55 : -60, night ? 90 : 80, night ? -35 : 55);
    this.renderer.toneMappingExposure = night ? 1.05 : 1;
    this.materials.window.emissiveIntensity = night ? 2 : 0;
    (this.water.material as THREE.MeshStandardMaterial).color.set(night ? '#2E5A7A' : '#4E8DB6');
    for (const light of this.fireLights) light.intensity = night ? 60 : 0;
    this.needsRender = true;
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    this.renderer.setAnimationLoop(active ? this.frame : null);
    this.needsRender = true;
  }

  /** Swings the camera round to the rider. */
  focusRider(): void {
    if (!this.rider) return;
    const target = this.rider.root.position;
    const offset = this.camera.position.clone().sub(this.controls.target).setLength(62);
    this.controls.target.set(target.x, 0, target.z);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.needsRender = true;
  }

  resetView(): void {
    this.controls.target.set(0, 0, 3);
    const distance = 205;
    const polar = 0.78;
    const azimuth = 0.1;
    this.camera.position.set(
      Math.sin(polar) * Math.sin(azimuth) * distance,
      Math.cos(polar) * distance,
      3 + Math.sin(polar) * Math.cos(azimuth) * distance,
    );
    this.controls.update();
    this.needsRender = true;
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.controls.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
    });
    this.renderer.dispose();
    canvas.remove();
    this.overlay.remove();
  }

  private createLabel(landmark: Landmark): void {
    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', LOCATIONS[landmark.id].name);
    el.style.cssText =
      'position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;padding:0;margin:0;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;transform:translate(-9999px,-9999px);';
    const ring = document.createElement('span');
    ring.style.cssText = 'display:flex;border-radius:999px;border:3px solid transparent;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));';
    ring.innerHTML = badgeSvg(landmark.id);
    const name = document.createElement('span');
    name.textContent = LOCATIONS[landmark.id].name;
    name.style.cssText =
      'font:800 11px/1.3 system-ui,-apple-system,sans-serif;color:#FFF1DE;background:rgba(46,29,16,0.86);padding:1px 6px;border-radius:4px;white-space:nowrap;';
    el.append(ring, name);
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      this.options.onSelect(landmark.id);
    });
    this.overlay.appendChild(el);
    this.labels.set(landmark.id, { el, ring, height: landmark.labelHeight, halfWidth: 0 });
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }

  private riderPlacement(now: number): { x: number; y: number; angle: number; moving: boolean } | null {
    const state = this.state;
    if (!state) return null;
    if (state.trip) {
      const { from, to, start, end } = state.trip;
      const key = `${from}>${to}`;
      if (this.route?.key !== key) this.route = { key, points: routeBetween(from, to) };
      const share = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
      const p = pointAlong(this.route.points, share);
      return { x: p.x, y: p.y, angle: p.angle, moving: share < 1 };
    }
    const home = locationPoint(state.locationId);
    const spot = IDLE_SPOT[state.locationId];
    return { x: home.x + spot.x, y: home.y + spot.y, angle: Math.PI / 2 - 0.5, moving: false };
  }

  private updateTrail(share: number): void {
    const state = this.state;
    if (!state?.trip || !this.route) {
      this.trail.count = 0;
      return;
    }
    const matrix = new THREE.Matrix4();
    let count = 0;
    for (let i = 1; i <= TRAIL_DOTS; i++) {
      const t = share + ((1 - share) * i) / TRAIL_DOTS;
      if (i % 2 === 1) continue;
      const p = pointAlong(this.route.points, t);
      matrix.makeTranslation(p.x - 50, this.grid.sample(p.x, p.y) + 0.45, p.y - 50);
      this.trail.setMatrixAt(count, matrix);
      count += 1;
    }
    this.trail.count = count;
    this.trail.instanceMatrix.needsUpdate = true;
  }

  private readonly frame = (): void => {
    if (!this.active) return;
    const clock = performance.now();
    const cameraMoved = this.controls.update();
    const travelling = !!this.state?.trip;
    const busy = travelling || cameraMoved || this.needsRender || clock < this.interactUntil;
    if (!busy && clock - this.lastRender < 125) return;

    const now = Date.now();
    const time = clock / 1000;
    const placement = this.riderPlacement(now);
    if (this.rider && placement) {
      const root = this.rider.root;
      root.position.set(placement.x - 50, this.grid.sample(placement.x, placement.y), placement.y - 50);
      root.rotation.y = -placement.angle;
      this.rider.animate(time, placement.moving);
      this.ring.position.set(root.position.x, root.position.y + 0.25, root.position.z);
      const pulse = 0.55 + Math.sin(time * 3) * 0.25;
      (this.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      this.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.06);
      const trip = this.state?.trip;
      this.updateTrail(trip ? Math.min(1, Math.max(0, (now - trip.start) / Math.max(1, trip.end - trip.start))) : 0);
    }
    for (const flame of this.flames) {
      flame.scale.set(1, 0.85 + Math.sin(time * 9 + flame.id) * 0.15, 1);
    }
    if (this.night) {
      this.fireLights.forEach((light, index) => {
        if (index < this.flames.length) light.intensity = 55 + Math.sin(time * 11 + index) * 12;
      });
    }

    this.renderer.render(this.scene, this.camera);
    this.placeOverlays();
    this.needsRender = false;
    this.lastRender = clock;
  };

  private project(position: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = this.scratch.copy(position).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.width,
      y: (-v.y * 0.5 + 0.5) * this.height,
      visible: v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.2 && v.y < 1.2,
    };
  }

  private placeOverlays(): void {
    for (const landmark of this.landmarks) {
      const label = this.labels.get(landmark.id);
      if (!label) continue;
      const anchor = landmark.group.position.clone();
      anchor.y += label.height;
      const p = this.project(anchor);
      if (!label.halfWidth) label.halfWidth = label.el.offsetWidth / 2;
      // Keep labels inside the frame even when their place is near an edge.
      const x = Math.min(this.width - label.halfWidth - 4, Math.max(label.halfWidth + 4, p.x));
      label.el.style.transform = p.visible ? `translate(${x}px, ${p.y}px) translate(-50%, -100%)` : 'translate(-9999px,-9999px)';
    }
    // The hat marker only shows on the road; at a place its label is highlighted instead.
    if (this.rider && this.state?.trip) {
      const anchor = this.rider.root.position.clone();
      anchor.y += 6.2;
      const p = this.project(anchor);
      this.marker.style.transform = p.visible ? `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)` : 'translate(-9999px,-9999px)';
    } else {
      this.marker.style.transform = 'translate(-9999px,-9999px)';
    }
  }

  private pick(event: PointerEvent): LocationId | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
    return (hit?.object.userData.locationId as LocationId | undefined) ?? null;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY, t: performance.now() };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (moved > 8 || performance.now() - down.t > 500) return;
    const id = this.pick(event);
    if (id) this.options.onSelect(id);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    this.renderer.domElement.style.cursor = this.pick(event) ? 'pointer' : 'grab';
  };
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
