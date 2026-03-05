import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer, birdsSound;
const plants = []; 

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(2, 5, 3);
    scene.add(light);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; 
    
    const arButton = ARButton.createButton(renderer);
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(arButton); 

    const listener = new THREE.AudioListener();
    camera.add(listener);
    birdsSound = new THREE.Audio(listener);
    
    // Додаю звук пташок 
    const audioLoader = new THREE.AudioLoader();
    const baseUrl = 'https://katerinayud.github.io/ar/';

    audioLoader.load(baseUrl + 'sounds/sounds.mp3', 
        function(buffer) {
            birdsSound.setBuffer(buffer);
            birdsSound.setLoop(true);
            birdsSound.setVolume(0.4);
            console.log("Звук завантажено");
        },
        undefined,
        function(err) {
            console.error("Помилка завантаження звуку:", err);
        }
    );

    const startAudio = () => {
        if (birdsSound && birdsSound.buffer && !birdsSound.isPlaying) {
            birdsSound.play();
            console.log("Пташки співають");
        }
    };

    window.addEventListener('click', startAudio);
    window.addEventListener('touchstart', startAudio);
    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous'); 
    
    const models = [
        { path: 'daisies/scene.gltf', x: 0, y: -0.5, z: -0.7, targetH: 0.1 },             
        { path: 'asiatic_lily/scene.gltf', x: -0.25, y: -0.5, z: -0.3, targetH: 0.18 },  
        { path: 'small_folliage_plant/scene.gltf', x: 0.2, y: -0.5, z: -0.6, targetH: 0.12 }, 
        { path: 'linden_tree/scene.gltf', x: 0.35, y: -0.4, z: -0.8, targetH: 1.1 } 
    ];

    models.forEach((item) => {
        loader.load(baseUrl + item.path, (gltf) => {
            const model = gltf.scene;
            // Вираховую реальні габарити моделі, щоб масштабувати її відносно цільової висоти (targetH)
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const scale = item.targetH / size.y;
            model.scale.set(scale, scale, scale);
            model.position.set(item.x, item.y, item.z); 
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.side = THREE.DoubleSide;
                    // DoubleSide дозволяє бачити пелюстки та листя з обох сторін
                    if (child.material.map) child.material.map.needsUpdate = true;
                }
            });
            scene.add(model);
            plants.push(model);
        });
    });
    renderer.setAnimationLoop(render);
}

function render(time) {
    const speed = time * 0.0015;
    plants.forEach((plant, i) => {
        // ефект легкого погодування на вітрі за допомогою синусоїди
        plant.rotation.z = Math.sin(speed + i) * 0.03; 
    });
    renderer.render(scene, camera);
}