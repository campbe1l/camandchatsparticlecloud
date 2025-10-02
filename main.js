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

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = true;
controls.enablePan = false;
controls.rotateSpeed = 0.8;
controls.minDistance = 1.5;
controls.maxDistance = 8;

scene.add(new THREE.AmbientLight(0xffffff, 0.3));

const uniforms = {
  uTime: { value: 0.0 },
  uPixelRatio: { value: window.devicePixelRatio || 1.0 },
  uSize: { value: 2.5 }
};

const vertexShader = `
uniform float uTime;
uniform float uSize;
attribute float aRandom;
varying float vRandom;
varying float vDepth;

void main(){
  vRandom = aRandom;
  vec3 pos = position;
  float phase = aRandom * 6.28318;
  float drift = sin(uTime * 0.6 + phase) * 0.015 * aRandom;
  float shimmer = sin(uTime * 3.2 + phase * 1.37) * 0.006;
  vec3 n = normalize(pos);
  pos += n * (drift + shimmer);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
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
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float dist = length(uv);
  float alpha = smoothstep(1.0, 0.2, dist);
  vec3 base = vec3(0.85, 0.9, 1.0);
  float flick = 0.6 + 0.4 * sin(uTime * 2.0 + vRandom * 10.0);
  vec3 col = base * (0.6 + 0.8 * vRandom) * flick;
  float depthFade = smoothstep(8.0, 2.0, vDepth);
  gl_FragColor = vec4(col, alpha * depthFade * 0.95);
  if(gl_FragColor.a < 0.01) discard;
}
`;

const objUrl = 'assets/Untitled.obj';
const loader = new OBJLoader();
loader.load(objUrl, (obj) => {
  let combined = new THREE.BufferGeometry();
  const positions = [];
  obj.traverse((child) => {
    if(child.isMesh){
      const geom = child.geometry;
      const posAttr = geom.attributes.position;
      for(let i=0; i<posAttr.count; i++){
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      }
    }
  });
  const positionArray = new Float32Array(positions);
  combined.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  const count = positionArray.length / 3;
  const randoms = new Float32Array(count);
  for(let i=0;i<count;i++) randoms[i] = Math.random();
  combined.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
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
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scaleFactor = 1.6 / maxDim;
  const posArr = combined.attributes.position.array;
  for(let i=0;i<posArr.length;i++) posArr[i] *= scaleFactor;
  combined.attributes.position.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(combined, material);
  scene.add(points);
}, undefined, (err) => {
  console.error('Error loading OBJ:', err);
});

function onWindowResize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  uniforms.uPixelRatio.value = window.devicePixelRatio || 1.0;
}
window.addEventListener('resize', onWindowResize, false);

const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  uniforms.uTime.value = clock.getElapsedTime();
  controls.update();
  renderer.render(scene, camera);
}
animate();
