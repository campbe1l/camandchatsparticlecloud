import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'https://unpkg.com/three@0.152.2/examples/jsm/loaders/OBJLoader.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3.5);

// Controls for rotation (no zoom/pan to keep it minimal — enable rotate only)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = true; // allow minor zoom
controls.enablePan = false;
controls.rotateSpeed = 0.8;
controls.minDistance = 1.5;
controls.maxDistance = 8;

// Ambient subtle light so 3D looks nice (points will mainly glow themselves)
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// Uniforms for shader
const uniforms = {
  uTime: { value: 0.0 },
  uPixelRatio: { value: window.devicePixelRatio || 1.0 },
  uSize: { value: 2.5 }
};

// Simple vertex + fragment shaders for soft glowing points with subtle noise-based drift
const vertexShader = `
uniform float uTime;
uniform float uSize;
attribute float aRandom;
varying float vRandom;
varying float vDepth;

float hash(float n){ return fract(sin(n)*43758.5453123); }

void main(){
  vRandom = aRandom;
  // base position
  vec3 pos = position;

  // create a subtle per-vertex wobble: combine sin with hashed phase and small amplitude
  float phase = aRandom * 6.28318;
  float drift = sin(uTime * 0.6 + phase) * 0.015 * aRandom;
  // also add a higher-frequency shimmer
  float shimmer = sin(uTime * 3.2 + phase * 1.37) * 0.006;

  // radial outward push based on vertex normal-ish (here use normalized pos)
  vec3 n = normalize(pos);
  pos += n * (drift + shimmer);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  // adapt point size with perspective
  float size = uSize * (1.0 + aRandom * 0.5);
  size *= (300.0 / -mvPosition.z) * (uPixelRatio);
  gl_PointSize = clamp(size, 1.0, 50.0);

  vDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
precision mediump float;
varying float vRandom;
varying float vDepth;
uniform float uTime;

void main(){
  // draw circular soft point
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float dist = length(uv);
  float alpha = smoothstep(1.0, 0.2, dist);

  // color: slight bluish-white with variation
  vec3 base = vec3(0.85, 0.9, 1.0);
  float flick = 0.6 + 0.4 * sin(uTime * 2.0 + vRandom * 10.0);
  vec3 col = base * (0.6 + 0.8 * vRandom) * flick;

  // depth-based fade: farther points are dimmer
  float depthFade = smoothstep(8.0, 2.0, vDepth);

  gl_FragColor = vec4(col, alpha * depthFade * 0.95);
  if(gl_FragColor.a < 0.01) discard;
}
`;

// Load OBJ and convert to points
const objUrl = 'assets/Untitled.obj';

const loader = new OBJLoader();
loader.load(objUrl, (obj) => {
  // merge geometry from children meshes
  let combined = new THREE.BufferGeometry();
  const positions = [];
  obj.traverse((child) => {
    if(child.isMesh){
      const geom = child.geometry;
      // ensure position attribute exists
      const posAttr = geom.attributes.position;
      for(let i=0; i<posAttr.count; i++){
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      }
    }
  });

  const positionArray = new Float32Array(positions);
  combined.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

  // create random attribute per vertex for varied motion and brightness
  const count = positionArray.length / 3;
  const randoms = new Float32Array(count);
  for(let i=0;i<count;i++) randoms[i] = Math.random();

  combined.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

  // center geometry
  combined.computeBoundingBox();
  const bbox = combined.boundingBox;
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const positionsVec = combined.attributes.position.array;
  for(let i=0;i<positionsVec.length;i+=3){
    positionsVec[i]   -= center.x;
    positionsVec[i+1] -= center.y;
    positionsVec[i+2] -= center.z;
  }
  combined.attributes.position.needsUpdate = true;

  // scale to fit
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scaleFactor = 1.6 / maxDim;
  const posArr = combined.attributes.position.array;
  for(let i=0;i<posArr.length;i++) posArr[i] *= scaleFactor;
  combined.attributes.position.needsUpdate = true;

  // shader material for points
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: false
  });

  const points = new THREE.Points(combined, material);
  scene.add(points);
}, undefined, (err) => {
  console.error('Error loading OBJ:', err);
  // Show simple fallback geometry
  const geo = new THREE.TorusKnotGeometry(0.6, 0.2, 200, 32);
  const count = geo.attributes.position.count;
  const randoms = new Float32Array(count);
  for(let i=0;i<count;i++) randoms[i] = Math.random();
  geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent:true,
    depthTest:true,
    blending:THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, material);
  scene.add(points);
});

// Resize handler
function onWindowResize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  uniforms.uPixelRatio.value = window.devicePixelRatio || 1.0;
}
window.addEventListener('resize', onWindowResize, false);

// Animation loop
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  uniforms.uTime.value = clock.getElapsedTime();
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Touch/trackpad friendly tweaks: make drag feel natural by enabling OrbitControls over whole canvas
// No additional UI required. The small instructional texts are fixed and non-interactive.
