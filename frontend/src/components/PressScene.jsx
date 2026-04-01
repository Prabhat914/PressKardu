import { useEffect, useRef } from "react";
import * as THREE from "three";

function PressScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mountNode = mountRef.current;

    if (!mountNode) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#f6ecdd", 8, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountNode.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      42,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.8, 8);

    const ambientLight = new THREE.AmbientLight("#fff6ea", 1.8);
    const keyLight = new THREE.DirectionalLight("#ffffff", 2);
    keyLight.position.set(3, 5, 6);
    const rimLight = new THREE.PointLight("#ffb25b", 16, 30, 2);
    rimLight.position.set(-3, 1, 3);

    scene.add(ambientLight, keyLight, rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 64),
      new THREE.MeshStandardMaterial({
        color: "#efe2cf",
        roughness: 0.95,
        metalness: 0.05
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    scene.add(floor);

    const base = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 2.8, 8, 18),
      new THREE.MeshStandardMaterial({
        color: "#20382f",
        roughness: 0.45,
        metalness: 0.35
      })
    );
    base.rotation.z = Math.PI / 2;
    base.position.set(0.5, -0.05, 0);
    scene.add(base);

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.12, 18, 48, Math.PI),
      new THREE.MeshStandardMaterial({
        color: "#b36d2c",
        roughness: 0.55,
        metalness: 0.15
      })
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-1.3, 0.4, 0);
    scene.add(handle);

    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.42, 1.75),
      new THREE.MeshStandardMaterial({
        color: "#f8f3eb",
        roughness: 0.3,
        metalness: 0.65
      })
    );
    sole.position.set(0.3, -0.6, 0);
    scene.add(sole);

    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 4.1, 28, 28),
      new THREE.MeshStandardMaterial({
        color: "#d76f2d",
        side: THREE.DoubleSide,
        roughness: 0.82,
        metalness: 0.04
      })
    );
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.set(0.1, -1.05, 0);
    scene.add(cloth);

    const particleGeometry = new THREE.BufferGeometry();
    const steamCount = 160;
    const positions = new Float32Array(steamCount * 3);
    const seeds = new Float32Array(steamCount);

    for (let index = 0; index < steamCount; index += 1) {
      const stride = index * 3;
      positions[stride] = (Math.random() - 0.5) * 2.1;
      positions[stride + 1] = Math.random() * 3.5 - 0.5;
      positions[stride + 2] = (Math.random() - 0.5) * 1.2;
      seeds[index] = Math.random() * Math.PI * 2;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const steam = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.6,
        size: 0.12,
        depthWrite: false
      })
    );
    steam.position.set(-0.5, -0.2, 0);
    scene.add(steam);

    const clock = new THREE.Clock();

    const handleResize = () => {
      const { clientWidth, clientHeight } = mountNode;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener("resize", handleResize);

    let frameId = 0;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const clothPositions = cloth.geometry.attributes.position;

      for (let index = 0; index < clothPositions.count; index += 1) {
        const x = clothPositions.getX(index);
        const y = clothPositions.getY(index);
        const wave = Math.sin(elapsed * 1.2 + x * 1.8 + y * 0.9) * 0.12;
        clothPositions.setZ(index, wave);
      }

      clothPositions.needsUpdate = true;

      const steamPositions = steam.geometry.attributes.position;
      for (let index = 0; index < steamCount; index += 1) {
        const stride = index * 3;
        const seed = seeds[index];
        steamPositions.array[stride] += Math.sin(elapsed + seed) * 0.0015;
        steamPositions.array[stride + 1] += 0.015 + Math.cos(elapsed * 0.8 + seed) * 0.001;
        steamPositions.array[stride + 2] += Math.cos(elapsed * 0.7 + seed) * 0.0015;

        if (steamPositions.array[stride + 1] > 3.8) {
          steamPositions.array[stride] = (Math.random() - 0.5) * 2.1;
          steamPositions.array[stride + 1] = -0.5;
          steamPositions.array[stride + 2] = (Math.random() - 0.5) * 1.2;
        }
      }

      steamPositions.needsUpdate = true;

      base.rotation.y = Math.sin(elapsed * 0.45) * 0.18;
      handle.rotation.x = Math.sin(elapsed * 0.7) * 0.05;
      steam.rotation.y = elapsed * 0.08;
      camera.position.x = Math.sin(elapsed * 0.3) * 0.45;
      camera.lookAt(0, -0.1, 0);

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mountNode.removeChild(renderer.domElement);
      floor.geometry.dispose();
      floor.material.dispose();
      base.geometry.dispose();
      base.material.dispose();
      handle.geometry.dispose();
      handle.material.dispose();
      sole.geometry.dispose();
      sole.material.dispose();
      cloth.geometry.dispose();
      cloth.material.dispose();
      steam.geometry.dispose();
      steam.material.dispose();
      renderer.dispose();
    };
  }, []);

  return <div className="press-scene" ref={mountRef} aria-hidden="true" />;
}

export default PressScene;
