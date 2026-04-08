import { useEffect, useRef } from "react";
import * as THREE from "three";

function OpeningScene({ fast = false }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mountNode = mountRef.current;

    if (!mountNode) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#081e2a", 10, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountNode.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      32,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      100
    );
    camera.position.set(-2.8, 2.8, 12.4);

    scene.add(new THREE.AmbientLight("#9ae8ff", 0.76));

    const keyLight = new THREE.SpotLight("#d4fff4", 130, 34, 0.34, 0.42, 1.15);
    keyLight.position.set(-8, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.target.position.set(0, 1.6, 0);

    const warmBack = new THREE.PointLight("#ff9965", 26, 34, 2);
    warmBack.position.set(7, 4, 5);

    const tealRim = new THREE.SpotLight("#52f1da", 88, 34, 0.4, 0.46, 1.25);
    tealRim.position.set(8, 10, -5);
    tealRim.target.position.set(0, 2, -2);

    scene.add(keyLight, keyLight.target, warmBack, tealRim, tealRim.target);

    const world = new THREE.Group();
    scene.add(world);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 11.4, 0.8, 64),
      new THREE.MeshStandardMaterial({
        color: "#091a22",
        roughness: 0.92,
        metalness: 0.18
      })
    );
    floor.position.y = -2.2;
    floor.receiveShadow = true;
    world.add(floor);

    const floorRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.6, 0.08, 18, 90),
      new THREE.MeshBasicMaterial({
        color: "#4ef0dd",
        transparent: true,
        opacity: 0.42
      })
    );
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = -1.76;
    world.add(floorRing);

    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 10),
      new THREE.MeshBasicMaterial({
        color: "#0a3943",
        transparent: true,
        opacity: 0.46
      })
    );
    backdrop.position.set(0, 2.1, -6.4);
    world.add(backdrop);

    const lightColumns = [];
    for (let index = 0; index < 5; index += 1) {
      const lightColumn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 7.8),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? "#4ef0dd" : "#ff9965",
          transparent: true,
          opacity: 0.24
        })
      );
      lightColumn.position.set(-5.6 + index * 2.8, 1.8, -6);
      lightColumns.push(lightColumn);
      world.add(lightColumn);
    }

    const table = new THREE.Group();
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: "#dff3f6",
      roughness: 0.3,
      metalness: 0.28
    });

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.22, 2.25), tableMaterial);
    tableTop.position.y = 0.28;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    table.add(tableTop);

    [-1.9, 1.9].forEach((x) => {
      [-0.85, 0.85].forEach((z) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 1.85, 18),
          new THREE.MeshStandardMaterial({
            color: "#93d9d1",
            roughness: 0.35,
            metalness: 0.86
          })
        );
        leg.position.set(x, -0.7, z);
        leg.castShadow = true;
        table.add(leg);
      });
    });
    table.position.set(1.25, -0.55, 0.4);
    world.add(table);

    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.08, 1.34),
      new THREE.MeshPhysicalMaterial({
        color: "#ff9163",
        roughness: 0.84,
        metalness: 0.01,
        sheen: 0.72,
        sheenColor: new THREE.Color("#fff8f2")
      })
    );
    cloth.position.set(1.15, 0.44, 0.28);
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    world.add(cloth);

    const iron = new THREE.Group();
    const ironBody = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 1.45, 8, 18),
      new THREE.MeshStandardMaterial({
        color: "#effffe",
        roughness: 0.18,
        metalness: 0.62
      })
    );
    ironBody.rotation.z = Math.PI / 2;
    ironBody.castShadow = true;
    iron.add(ironBody);

    const ironHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.08, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({
        color: "#24414f",
        roughness: 0.42,
        metalness: 0.38
      })
    );
    ironHandle.rotation.z = Math.PI / 2;
    ironHandle.position.set(-0.42, 0.22, 0);
    iron.add(ironHandle);

    const ironSole = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.16, 0.82),
      new THREE.MeshStandardMaterial({
        color: "#c7fffb",
        emissive: "#0b5b5c",
        roughness: 0.15,
        metalness: 0.86
      })
    );
    ironSole.position.set(0.16, -0.25, 0);
    ironSole.castShadow = true;
    iron.add(ironSole);
    iron.position.set(0.15, 0.78, 0.32);
    world.add(iron);

    const worker = new THREE.Group();

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: "#e2b28e",
      roughness: 0.88,
      metalness: 0.02
    });
    const fabricMaterial = new THREE.MeshPhysicalMaterial({
      color: "#102f40",
      roughness: 0.72,
      metalness: 0.02,
      sheen: 0.52
    });
    const apronMaterial = new THREE.MeshPhysicalMaterial({
      color: "#28c9b9",
      roughness: 0.66,
      metalness: 0.02,
      sheen: 0.64
    });

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.58, 1.9, 8, 18),
      fabricMaterial
    );
    torso.position.set(-2.2, 0.85, 0.18);
    torso.castShadow = true;
    worker.add(torso);

    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.4, 0.12),
      apronMaterial
    );
    apron.position.set(-2.18, 0.55, 0.73);
    apron.castShadow = true;
    worker.add(apron);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 28, 28),
      skinMaterial
    );
    head.position.set(-2.3, 2.4, 0.26);
    head.castShadow = true;
    worker.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 28, 28, 0, Math.PI * 2, 0, Math.PI / 1.9),
      new THREE.MeshStandardMaterial({
        color: "#112431",
        roughness: 0.84,
        metalness: 0.06
      })
    );
    hair.position.set(-2.3, 2.5, 0.2);
    hair.rotation.z = -0.08;
    hair.castShadow = true;
    worker.add(hair);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.24, 12),
      skinMaterial
    );
    neck.position.set(-2.28, 1.96, 0.24);
    worker.add(neck);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.9, 6, 12),
      fabricMaterial
    );
    upperArm.castShadow = true;
    const foreArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.82, 6, 12),
      skinMaterial
    );
    foreArm.castShadow = true;
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      skinMaterial
    );
    hand.castShadow = true;

    const armLeft = new THREE.Group();
    const armLeftUpper = upperArm.clone();
    armLeftUpper.position.y = -0.38;
    const armLeftFore = foreArm.clone();
    armLeftFore.position.set(0.45, -0.84, 0.02);
    armLeftFore.rotation.z = -0.52;
    const armLeftHand = hand.clone();
    armLeftHand.position.set(0.84, -1.06, 0.05);
    armLeft.add(armLeftUpper, armLeftFore, armLeftHand);
    armLeft.position.set(-1.68, 1.42, 0.58);
    armLeft.rotation.z = -1.18;
    worker.add(armLeft);

    const armRight = new THREE.Group();
    const armRightUpper = upperArm.clone();
    armRightUpper.position.y = -0.38;
    const armRightFore = foreArm.clone();
    armRightFore.position.set(0.36, -0.8, -0.02);
    armRightFore.rotation.z = -0.34;
    const armRightHand = hand.clone();
    armRightHand.position.set(0.66, -1.05, 0.02);
    armRight.add(armRightUpper, armRightFore, armRightHand);
    armRight.position.set(-2.72, 1.3, -0.02);
    armRight.rotation.z = -0.56;
    worker.add(armRight);

    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.15, 1.22, 6, 12),
      new THREE.MeshStandardMaterial({
        color: "#173243",
        roughness: 0.76,
        metalness: 0.04
      })
    );
    leg.castShadow = true;
    const legLeft = leg.clone();
    legLeft.position.set(-2, -1.12, 0.14);
    legLeft.rotation.z = 0.08;
    const legRight = leg.clone();
    legRight.position.set(-2.48, -1.1, -0.08);
    legRight.rotation.z = -0.06;
    worker.add(legLeft, legRight);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.14, 0.78),
      new THREE.MeshStandardMaterial({
        color: "#dff8f6",
        roughness: 0.42,
        metalness: 0.18
      })
    );
    shoe.castShadow = true;
    const shoeLeft = shoe.clone();
    shoeLeft.position.set(-1.92, -1.8, 0.26);
    const shoeRight = shoe.clone();
    shoeRight.position.set(-2.52, -1.8, -0.06);
    worker.add(shoeLeft, shoeRight);

    world.add(worker);

    const steamCount = 180;
    const steamPositions = new Float32Array(steamCount * 3);
    const steamSeeds = new Float32Array(steamCount);
    const steamGeometry = new THREE.BufferGeometry();

    for (let index = 0; index < steamCount; index += 1) {
      const stride = index * 3;
      steamPositions[stride] = -0.15 + (Math.random() - 0.5) * 1.1;
      steamPositions[stride + 1] = 0.7 + Math.random() * 2;
      steamPositions[stride + 2] = 0.2 + (Math.random() - 0.5) * 0.9;
      steamSeeds[index] = Math.random() * Math.PI * 2;
    }

    steamGeometry.setAttribute("position", new THREE.BufferAttribute(steamPositions, 3));
    const steam = new THREE.Points(
      steamGeometry,
      new THREE.PointsMaterial({
        color: "#dcfff8",
        transparent: true,
        opacity: 0.66,
        size: 0.12,
        depthWrite: false
      })
    );
    world.add(steam);

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
      const speed = fast ? 1.7 : 1;
      const phase = elapsed * speed;

      const pressCycle = (Math.sin(phase * 1.4) + 1) / 2;
      iron.position.x = 0.15 + Math.sin(phase * 1.4) * 0.85;
      iron.position.y = 0.78 + Math.cos(phase * 2.8) * 0.04;
      iron.rotation.z = Math.sin(phase * 1.4) * 0.08;
      iron.rotation.x = Math.cos(phase * 0.9) * 0.04;

      cloth.rotation.z = Math.sin(phase * 1.4) * 0.03;
      cloth.scale.z = 1 + pressCycle * 0.05;
      cloth.position.y = 0.44 + Math.sin(phase * 2.8) * 0.018;

      armLeft.rotation.z = -1.18 + Math.sin(phase * 1.4) * 0.22;
      armLeft.position.y = 1.42 + Math.cos(phase * 2.8) * 0.03;
      armRight.rotation.z = -0.56 + Math.cos(phase * 1.4) * 0.08;
      worker.position.y = Math.sin(phase * 1.4) * 0.04;
      head.rotation.y = Math.sin(phase * 0.7) * 0.12;
      torso.rotation.z = Math.sin(phase * 0.7) * 0.02;
      apron.rotation.z = Math.sin(phase * 0.9) * 0.03;

      const steamAttribute = steam.geometry.attributes.position;
      for (let index = 0; index < steamCount; index += 1) {
        const stride = index * 3;
        const seed = steamSeeds[index];
        steamAttribute.array[stride] += Math.sin(phase * 1.1 + seed) * 0.0016;
        steamAttribute.array[stride + 1] += 0.018 + pressCycle * 0.008;
        steamAttribute.array[stride + 2] += Math.cos(phase + seed) * 0.0014;

        if (steamAttribute.array[stride + 1] > 4.8) {
          steamAttribute.array[stride] = -0.15 + (Math.random() - 0.5) * 1.1;
          steamAttribute.array[stride + 1] = 0.7 + Math.random() * 0.24;
          steamAttribute.array[stride + 2] = 0.2 + (Math.random() - 0.5) * 0.9;
        }
      }
      steamAttribute.needsUpdate = true;
      steam.material.opacity = 0.34 + pressCycle * 0.4;

      lightColumns.forEach((lightColumn, index) => {
        lightColumn.material.opacity = 0.16 + Math.sin(phase * 1.5 + index) * 0.08;
      });

      floorRing.scale.setScalar(1 + Math.sin(phase * 0.7) * 0.02);
      floorRing.material.opacity = 0.22 + pressCycle * 0.24;
      warmBack.intensity = 22 + pressCycle * 12;

      camera.position.x = -2.8 + Math.sin(phase * 0.42) * 0.95;
      camera.position.y = 2.8 + Math.cos(phase * 0.38) * 0.24;
      camera.position.z = 12.4 + Math.sin(phase * 0.28) * 0.4;
      camera.lookAt(-0.15, 0.8, 0.3);

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mountNode.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((node) => {
        if (node.geometry) {
          node.geometry.dispose();
        }

        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((material) => material.dispose());
          } else {
            node.material.dispose();
          }
        }
      });
    };
  }, [fast]);

  return <div className="opening-scene" ref={mountRef} aria-hidden="true" />;
}

export default OpeningScene;
