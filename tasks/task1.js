import * as THREE from 'three'
import { ARButton } from 'three/addons/webxr/ARButton.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let camera, scene, renderer, controls;
let mesh1, mesh2, mesh3; 

init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    scene = new THREE.Scene(); // Сцена
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40); // Камера

    // Об'єкт рендерингу
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); 
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; 
    container.appendChild(renderer.domElement);

     // Світло
    const directionalLight = new THREE.DirectionalLight(0xffffff, 4); 
    directionalLight.position.set(3, 3, 3);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, 10); 
    pointLight.position.set(-2, 2, 2);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
    scene.add(ambientLight);

    // Перший об'єкт - іксаедр
    const geo1 = new THREE.IcosahedronGeometry(0.1, 2);
    // Матеріал для першого об'єкта
    const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1,
        roughness: 0.3,
    });
    // Створюю меш
    mesh1 = new THREE.Mesh(geo1, goldMaterial);
    mesh1.position.set(-0.25, 0, -0.5); 
    scene.add(mesh1);

    // Другий об'єкт - октаедр
    const geo2 = new THREE.OctahedronGeometry(0.12);
    // Матеріал для другого об'єкта
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0000FF, 
        transparent: true,
        opacity: 0.6,
        roughness: 0.2,
        metalness: 0.5,
        reflectivity: 1.0,
        transmission: 0.8, 
    });
    // Створюю меш
    mesh2 = new THREE.Mesh(geo2, glassMaterial);
    mesh2.position.set(0, 0, -0.5); 
    scene.add(mesh2);

    // Третій об'єкт - капсула
    const geo3 = new THREE.CapsuleGeometry(0.08, 0.15, 4, 8);
    // Матеріал для третього об'єкта
    const emissiveMaterial = new THREE.MeshStandardMaterial({
        color: 0x013220,       
        emissive: 0x006400,    
        emissiveIntensity: 0.8, 
        metalness: 0.7,        
        roughness: 0.2
    });
    // Створюю меш
    mesh3 = new THREE.Mesh(geo3, emissiveMaterial);
    mesh3.position.set(0.3, 0, -0.5); 
    scene.add(mesh3);

    // Позиція для камери
    camera.position.z = 2; 

    // Контролери для 360 огляду на вебсторінці, але не під час AR-сеансу
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    document.body.appendChild(ARButton.createButton(renderer));
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
    controls.update();
}

function render() {
    rotateObjects();
    renderer.render(scene, camera);
}

function rotateObjects() {
    mesh1.rotation.y -= 0.01;
    mesh2.rotation.x -= 0.01;
    mesh2.rotation.y -= 0.01;
    mesh3.rotation.z -= 0.005;
}