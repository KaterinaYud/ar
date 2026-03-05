import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"

let container;
let camera, scene, renderer;
let reticle;
let controller;

init();
animate(); 

function init() {
    container = document.createElement("div");
    document.body.appendChild(container);
    scene = new THREE.Scene(); // Сцена
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20); // Камера

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Рендеринг
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1); // Світло
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Контролер додавання об'єкта на сцену
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);
    addReticleToScene(); // Додавання мітки поверхні на сцену

    // Тепер для AR-режиму необхідно застосувати режим hit-test
    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"]
    });
    document.body.appendChild(button);
    window.addEventListener("resize", onWindowResize, false);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial();
    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Додає систему координат, щоб ви краще розуміли, де буде розміщений об'єкт
    reticle.add(new THREE.AxesHelper(1));
}

function onSelect() {
    if (reticle.visible) {
        // Об'єкт буде з'являтись на тому місці, де натиснете по поверхні
        const geometry = new THREE.IcosahedronGeometry(0.1, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff * Math.random(),
            metalness: 0.7,
            roughness: 0.2,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.setFromMatrixPosition(reticle.matrix);
        mesh.quaternion.setFromRotationMatrix(reticle.matrix);
        scene.add(mesh); 
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

// Hit Testing у WebXR повертає лише координати та орієнтацію точки перетину віртуального променя (Raycast) 
// із реальним світом. Але він не надає інформації про саму поверхню, з якою було перетинання (яка саме це поверхня;
// вертикальна чи горизонтальна і тд)
let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;

// Мета даної функції отримати hitTestSource для відслідковування поверхонь у AR
// та створює referenceSpace, тобто як ми інтерпретуватимемо координати у WebXR
// параметр 'viewer' означає, що ми відстежуємо камеру мобільного пристрою
async function initializeHitTestSource() {
    const session = renderer.xr.getSession();  // XRSession

    // 'viewer' базується на пололежнні пристрою під час хіт-тесту
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    // Далі ми використовуємо 'local' referenceSpace, оскільки він забезпечує 
    // стабільність відносно оточення. Це фіксована координатна система, яка дозволяє стабільно
    // відмальовувати наші 3D-об'єкти, навіть якщо користувач рухається.
    localSpace = await session.requestReferenceSpace("local");

    // Цей крок необхідний, щоб постійно не викликати пошук поверхонь
    hitTestSourceInitialized = true;

    // Завершення AR-сесії
    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}

function render(timestamp, frame) {
    if (frame) {
        // Створюємо hitTestSource для усіх наших кадрів
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }
        // Отримуємо результати hitResults
        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource); // проте результати йдуть окремо для кожного кадру
            if (hitTestResults.length > 0) {
                // Ми можемо отримати багато поверхонь у результатах, але та поверхня, яка буде найближчою 
                // до камери буде під номер 1.
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