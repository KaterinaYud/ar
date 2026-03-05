import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer, reticle;
let hitTestSource = null;
let hitTestSourceInitialized = false;
let localSpace = null;

const veggieModels = []; 
const fruitModels = [];  
let selectedCategory = null; 
let placedCount = 0;
const goal = 5;

window.setMode = (mode) => {
    selectedCategory = mode;
    placedCount = 0;
    const info = document.getElementById('info');
    if (info) info.innerText = mode === 'veggie' ? "🥗 Овочевий (0/5)" : "🍎 Фруктовий (0/5)";
};

init();

function init() {
    scene = new THREE.Scene(); // Сцена
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20); // Камера
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(2, 4, 3);
    scene.add(light);

    // Рендеринг
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    const baseUrl = 'https://katerinayud.github.io/ar/';
    
    const veggies = ['tomato', 'papper', 'carrot', 'eggplant', 'cabbage'];
    const fruits = ['apple', 'pear', 'banana', 'cherry', 'peach'];

    // завантаження моделей
    const loadCategory = (list, targetArray) => {
    list.forEach(name => {
        loader.load(`${baseUrl}${name}/scene.gltf`, (gltf) => {
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.side = THREE.DoubleSide; 
                    if (child.material.map) child.material.map.needsUpdate = true;
                }
            });

            // Вираховуємо реальні габарити моделі, щоб масштабувати її відносно цільової висоти.
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const scale = 0.15 / size.y; 
            model.scale.set(scale, scale, scale);
            targetArray.push(model);
        }, undefined, (error) => {
            console.error(`Помилка завантаження моделі ${name}:`, error);
        });
    });
};

    loadCategory(veggies, veggieModels);
    loadCategory(fruits, fruitModels);
    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);
    addReticleToScene(); // Додавання мітки поверхні на сцену
    document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] }));
    renderer.setAnimationLoop(render);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.1, 0.12, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
}

function onSelect() {
    if (!selectedCategory) {
        alert("Оберіть тип салату!");
        return;
    }
    if (reticle.visible && placedCount < goal) {
        const pool = selectedCategory === 'veggie' ? veggieModels : fruitModels;
        if (pool.length > 0) {
            // випадковий індекс, щоб салат кожного разу виглядав інакше
            const randomIndex = Math.floor(Math.random() * pool.length);
            const item = pool[randomIndex].clone();
            item.position.setFromMatrixPosition(reticle.matrix);
            item.quaternion.setFromRotationMatrix(reticle.matrix);
            scene.add(item);
            placedCount++;
            document.getElementById('info').innerText = `Зібрано: ${placedCount}/${goal}`;
            if (placedCount === goal) {
                setTimeout(() => alert("🥗 Салат готовий!"), 200);
            }
        }
    }
}

// Мета даної функції отримати hitTestSource для відслідковування поверхонь у AR
// та створює referenceSpace, тобто як ми інтерпретуватимемо координати у WebXR
// параметр 'viewer' означає, що ми відстежуємо камеру мобільного пристрою
async function initializeHitTestSource() {
    const session = renderer.xr.getSession(); 
    // 'viewer' базується на пололежнні пристрою під час хіт-тесту
    const viewerSpace = await session.requestReferenceSpace("viewer");

    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    // Далі ми використовуємо 'local' referenceSpace, оскільки він забезпечує 
    // стабільність відносно оточення. Це фіксована координатна система, яка дозволяє стабільно
    // відмальовувати наші 3D-об'єкти, навіть якщо користувач рухається

    localSpace = await session.requestReferenceSpace("local");

    // крок необхідний, щоб постійно не викликати пошук поверхонь
    hitTestSourceInitialized = true;
}

function render(timestamp, frame) {
    if (frame) {
        // Створюємо hitTestSource для усіх кадрів
        if (!hitTestSourceInitialized) initializeHitTestSource();

        // Отримуємо результати hitResults
        if (hitTestSourceInitialized && hitTestSource) {
            // проте результати йдуть окремо для кожного кадру
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];

                // Pose являє собою положення точки на поверхні
                const pose = hit.getPose(localSpace);
                reticle.visible = true;

                // Перетворюємо мітку поверхні відповідно до позиції хіт-тесту
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }
    renderer.render(scene, camera);
}