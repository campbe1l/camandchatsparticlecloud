import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import './style.css';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Light
const light = new THREE.PointLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Loader for OBJ
const loader = new OBJLoader();
loader.load('/assets/Untitled.obj', (obj) => {
    obj.traverse((child) => {
        if (child.isMesh) {
            const geometry = child.geometry;

            // Center geometry
            geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);

            // Main model as glowing points
            const material = new THREE.PointsMaterial({
                size: 0.02,
                transparent: true,
                opacity: 0.6,
                color: 0xffffff,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const points = new THREE.Points(geometry, material);
            scene.add(points);

            // Floating particles (spawn from vertices)
            const vertexPositions = geometry.attributes.position.array;
            const floatingCount = 1000;
            const floatPositions = new Float32Array(floatingCount * 3);
            const speeds = new Float32Array(floatingCount);
            const driftX = new Float32Array(floatingCount);
            const driftZ = new Float32Array(floatingCount);
            const alphas = new Float32Array(floatingCount);

            for (let i = 0; i < floatingCount; i++) {
                const vidx = Math.floor(Math.random() * (vertexPositions.length / 3));
                floatPositions[i * 3] = vertexPositions[vidx * 3];
                floatPositions[i * 3 + 1] = vertexPositions[vidx * 3 + 1];
                floatPositions[i * 3 + 2] = vertexPositions[vidx * 3 + 2];

                speeds[i] = 0.001 + Math.random() * 0.002; // upward speed
                driftX[i] = (Math.random() - 0.5) * 0.0005; // sideways drift
                driftZ[i] = (Math.random() - 0.5) * 0.0005;
                alphas[i] = 1.0;
            }

            const floatingGeometry = new THREE.BufferGeometry();
            floatingGeometry.setAttribute('position', new THREE.BufferAttribute(floatPositions, 3));
            floatingGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

            const floatingMaterial = new THREE.PointsMaterial({
                size: 0.02,
                color: 0xffffff,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const floatingParticles = new THREE.Points(floatingGeometry, floatingMaterial);
            scene.add(floatingParticles);

            // Animate shimmer + rotation + floating drift
            function animate() {
                requestAnimationFrame(animate);

                // Shimmer for main object
                material.size = 0.02 + Math.sin(Date.now() * 0.005) * 0.005;
                material.opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.3;

                // Rotate model
                points.rotation.y += 0.001;
                points.rotation.x += 0.0005;

                // Floating particles drift
                const pos = floatingGeometry.attributes.position.array;
                for (let i = 0; i < floatingCount; i++) {
                    pos[i * 3] += driftX[i]; 
                    pos[i * 3 + 2] += driftZ[i];
                    pos[i * 3 + 1] += speeds[i]; 

                    const height = pos[i * 3 + 1];
                    const fade = Math.max(0, 1.5 - height) / 1.5;
                    alphas[i] = fade;

                    // Respawn
                    if (fade <= 0.01 || height > 3) {
                        const vidx = Math.floor(Math.random() * (vertexPositions.length / 3));
                        pos[i * 3] = vertexPositions[vidx * 3];
                        pos[i * 3 + 1] = vertexPositions[vidx * 3 + 1];
                        pos[i * 3 + 2] = vertexPositions[vidx * 3 + 2];
                        alphas[i] = 1.0;
                        speeds[i] = 0.001 + Math.random() * 0.002;
                        driftX[i] = (Math.random() - 0.5) * 0.0005;
                        driftZ[i] = (Math.random() - 0.5) * 0.0005;
                    }
                }
                floatingGeometry.attributes.position.needsUpdate = true;

                controls.update();
                renderer.render(scene, camera);
            }
            animate();
        }
    });
});

// Resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
