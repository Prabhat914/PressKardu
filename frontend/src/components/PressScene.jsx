import { useEffect, useRef } from "react";
import * as THREE from "three";

function createRoundedPanel(width, height, radius, color, opacity) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide
    })
  );
}

function PressScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mountNode = mountRef.current;

    if (!mountNode) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#062b33", 12, 34);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountNode.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      34,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 2.8, 13.5);

    scene.add(new THREE.AmbientLight("#8de6d9", 0.7));

    const keyLight = new THREE.SpotLight("#b8fff2", 120, 36, 0.35, 0.45, 1.2);
    keyLight.position.set(-6, 11, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.target.position.set(0, 1.2, 0);

    const warmFill = new THREE.PointLight("#ff9259", 22, 30, 2);
    warmFill.position.set(6, 3, 6);

    const rimLight = new THREE.SpotLight("#68fff2", 80, 34, 0.42, 0.5, 1.4);
    rimLight.position.set(8, 9, -5);
    rimLight.target.position.set(0, 2, -2);

    const floorGlow = new THREE.PointLight("#17c3b2", 12, 20, 2);
    floorGlow.position.set(0, -1.6, 2);

    scene.add(keyLight, keyLight.target, warmFill, rimLight, rimLight.target, floorGlow);

    const world = new THREE.Group();
    scene.add(world);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 10.5, 0.7, 64),
      new THREE.MeshStandardMaterial({
        color: "#0a2026",
        roughness: 0.9,
        metalness: 0.22
      })
    );
    floor.position.y = -2.1;
    floor.receiveShadow = true;
    world.add(floor);

    const runway = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.22, 3.4),
      new THREE.MeshStandardMaterial({
        color: "#0d3941",
        emissive: "#09323a",
        roughness: 0.55,
        metalness: 0.45
      })
    );
    runway.position.set(0, -1.72, 0.15);
    runway.receiveShadow = true;
    world.add(runway);

    const runwayLines = [];
    for (let index = 0; index < 8; index += 1) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.06),
        new THREE.MeshBasicMaterial({
          color: "#72f7e1",
          transparent: true,
          opacity: 0.3
        })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(-4 + index * 1.15, -1.6, 1.5);
      runwayLines.push(line);
      world.add(line);
    }

    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 0.38, 1.6),
      new THREE.MeshStandardMaterial({
        color: "#05181d",
        roughness: 0.55,
        metalness: 0.65
      })
    );
    belt.position.set(0, -1.43, 0.08);
    belt.castShadow = true;
    belt.receiveShadow = true;
    world.add(belt);

    const rollerLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 1.8, 32),
      new THREE.MeshStandardMaterial({
        color: "#88d6cb",
        emissive: "#0d6b67",
        roughness: 0.35,
        metalness: 0.8
      })
    );
    rollerLeft.rotation.z = Math.PI / 2;
    rollerLeft.position.set(-5.15, -1.43, 0.08);

    const rollerRight = rollerLeft.clone();
    rollerRight.position.x = 5.15;

    world.add(rollerLeft, rollerRight);

    const rack = new THREE.Group();
    const rackMaterial = new THREE.MeshStandardMaterial({
      color: "#9ae5d9",
      roughness: 0.25,
      metalness: 0.92
    });
    const horizontalBar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.2, 24), rackMaterial);
    horizontalBar.rotation.z = Math.PI / 2;
    horizontalBar.position.y = 3.55;
    horizontalBar.castShadow = true;
    rack.add(horizontalBar);

    [-3.4, 3.4].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 5.2, 24), rackMaterial);
      leg.position.set(x, 1.05, 0);
      leg.castShadow = true;
      rack.add(leg);
    });

    const baseBar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.4, 24), rackMaterial);
    baseBar.rotation.z = Math.PI / 2;
    baseBar.position.set(0, -1.4, 0);
    baseBar.castShadow = true;
    rack.add(baseBar);
    rack.position.set(0, 0.15, -1.8);
    world.add(rack);

    const garmentRail = new THREE.Group();
    const garmentPalette = ["#1dc7b6", "#f3f8ff", "#f58c58", "#173b48", "#ffd485"];
    const garments = [];

    for (let index = 0; index < 5; index += 1) {
      const hanger = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.026, 12, 32, Math.PI),
        new THREE.MeshStandardMaterial({
          color: "#edf9f6",
          roughness: 0.32,
          metalness: 0.85
        })
      );
      hanger.position.set(-2.7 + index * 1.35, 3.15, 0);
      hanger.rotation.z = Math.PI;
      garmentRail.add(hanger);

      const hook = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.34, 12),
        hanger.material
      );
      hook.position.set(hanger.position.x, 3.27, 0);
      garmentRail.add(hook);

      const garment = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 1.28, 0.1),
        new THREE.MeshPhysicalMaterial({
          color: garmentPalette[index],
          roughness: 0.8,
          metalness: 0.03,
          sheen: 0.65,
          sheenColor: new THREE.Color("#ffffff")
        })
      );
      garment.position.set(hanger.position.x, 2.28, 0);
      garment.castShadow = true;
      garmentRail.add(garment);
      garments.push(garment);
    }

    garmentRail.position.set(0.3, 0, -1.8);
    world.add(garmentRail);

    const pressingRig = new THREE.Group();
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 3.4, 8, 16),
      new THREE.MeshStandardMaterial({
        color: "#87fff0",
        emissive: "#0a655f",
        roughness: 0.22,
        metalness: 0.8
      })
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.set(0.1, 1.35, 0);
    arm.castShadow = true;
    pressingRig.add(arm);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.1, 1.2),
      new THREE.MeshStandardMaterial({
        color: "#effefd",
        roughness: 0.2,
        metalness: 0.6
      })
    );
    body.position.set(1.55, 1.35, 0);
    body.castShadow = true;
    pressingRig.add(body);

    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.34, 0.84, 24),
      new THREE.MeshStandardMaterial({
        color: "#ffb580",
        emissive: "#a94c25",
        roughness: 0.18,
        metalness: 0.7
      })
    );
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(2.7, 1.05, 0);
    nozzle.castShadow = true;
    pressingRig.add(nozzle);

    const pressPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.22, 1.2),
      new THREE.MeshStandardMaterial({
        color: "#f2ffff",
        emissive: "#114a50",
        roughness: 0.28,
        metalness: 0.82
      })
    );
    pressPlate.position.set(1.65, 0.35, 0);
    pressPlate.castShadow = true;
    pressingRig.add(pressPlate);
    pressingRig.position.set(-1.25, 0.6, 1.1);
    world.add(pressingRig);

    const foldedStack = new THREE.Group();
    const stackColors = ["#fdfdf8", "#ffc38d", "#163a46"];
    stackColors.forEach((color, index) => {
      const fold = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.18, 1.15),
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.78,
          metalness: 0.02,
          sheen: 0.5
        })
      );
      fold.position.set(0, -0.05 + index * 0.17, 0);
      fold.rotation.z = (index - 1) * 0.08;
      fold.castShadow = true;
      fold.receiveShadow = true;
      foldedStack.add(fold);
    });
    foldedStack.position.set(3.9, -1.18, 1.1);
    world.add(foldedStack);

    const heroShirt = new THREE.Group();
    const shirtBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.95, 0.14),
      new THREE.MeshPhysicalMaterial({
        color: "#f9fffe",
        roughness: 0.64,
        metalness: 0.01,
        sheen: 0.88,
        sheenColor: new THREE.Color("#d9fffa")
      })
    );
    shirtBody.castShadow = true;
    heroShirt.add(shirtBody);

    const collarLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.28, 0.08),
      new THREE.MeshStandardMaterial({ color: "#dffef8", roughness: 0.5, metalness: 0.08 })
    );
    collarLeft.position.set(-0.28, 0.98, 0.06);
    collarLeft.rotation.z = 0.48;
    heroShirt.add(collarLeft);

    const collarRight = collarLeft.clone();
    collarRight.position.x = 0.28;
    collarRight.rotation.z = -0.48;
    heroShirt.add(collarRight);

    const sleeveLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.9, 0.12),
      shirtBody.material
    );
    sleeveLeft.position.set(-1.02, 0.35, 0);
    sleeveLeft.rotation.z = 0.72;
    sleeveLeft.castShadow = true;
    heroShirt.add(sleeveLeft);

    const sleeveRight = sleeveLeft.clone();
    sleeveRight.position.x = 1.02;
    sleeveRight.rotation.z = -0.72;
    heroShirt.add(sleeveRight);

    heroShirt.position.set(-4.6, -1.02, 0.08);
    heroShirt.rotation.x = -0.08;
    world.add(heroShirt);

    const underGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 1.6),
      new THREE.MeshBasicMaterial({
        color: "#14d4c2",
        transparent: true,
        opacity: 0.22
      })
    );
    underGlow.rotation.x = -Math.PI / 2;
    underGlow.position.set(-4.6, -1.22, 0.08);
    world.add(underGlow);

    const backgroundPanel = createRoundedPanel(16, 9.2, 0.55, "#083944", 0.45);
    backgroundPanel.position.set(0, 2.1, -6.2);
    world.add(backgroundPanel);

    const lightBars = [];
    for (let index = 0; index < 4; index += 1) {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 7.2),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? "#41f0df" : "#ff9968",
          transparent: true,
          opacity: 0.38
        })
      );
      bar.position.set(-4.5 + index * 3, 2.2, -5.8);
      world.add(bar);
      lightBars.push(bar);
    }

    const steamCount = 220;
    const steamPositions = new Float32Array(steamCount * 3);
    const steamSeeds = new Float32Array(steamCount);
    const steamGeometry = new THREE.BufferGeometry();

    for (let index = 0; index < steamCount; index += 1) {
      const stride = index * 3;
      steamPositions[stride] = 2.4 + (Math.random() - 0.5) * 0.9;
      steamPositions[stride + 1] = 0.2 + Math.random() * 2.4;
      steamPositions[stride + 2] = (Math.random() - 0.5) * 1;
      steamSeeds[index] = Math.random() * Math.PI * 2;
    }

    steamGeometry.setAttribute("position", new THREE.BufferAttribute(steamPositions, 3));
    const steam = new THREE.Points(
      steamGeometry,
      new THREE.PointsMaterial({
        color: "#cbfff7",
        transparent: true,
        opacity: 0.68,
        size: 0.13,
        depthWrite: false
      })
    );
    world.add(steam);

    const sparkCount = 140;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkSeeds = new Float32Array(sparkCount);
    const sparkGeometry = new THREE.BufferGeometry();

    for (let index = 0; index < sparkCount; index += 1) {
      const stride = index * 3;
      sparkPositions[stride] = (Math.random() - 0.5) * 10;
      sparkPositions[stride + 1] = Math.random() * 6.5 - 0.5;
      sparkPositions[stride + 2] = -4.8 + Math.random() * 6;
      sparkSeeds[index] = Math.random() * Math.PI * 2;
    }

    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    const sparks = new THREE.Points(
      sparkGeometry,
      new THREE.PointsMaterial({
        color: "#fff4c0",
        transparent: true,
        opacity: 0.85,
        size: 0.06,
        depthWrite: false
      })
    );
    world.add(sparks);

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
      const loop = elapsed * 0.28;
      const loopPhase = loop % 1;
      const ease = 0.5 - Math.cos(loopPhase * Math.PI) / 2;

      heroShirt.position.x = -4.6 + ease * 8.9;
      heroShirt.position.y = -1.02 + Math.sin(elapsed * 3.2) * 0.05;
      heroShirt.rotation.z = Math.sin(elapsed * 1.8) * 0.04;
      heroShirt.rotation.y = Math.sin(elapsed * 1.2) * 0.08;
      underGlow.position.x = heroShirt.position.x;
      underGlow.material.opacity = 0.16 + Math.sin(elapsed * 4.6) * 0.04;

      const pressZone = THREE.MathUtils.smoothstep(heroShirt.position.x, -0.55, 1.95);
      pressPlate.position.y = 0.35 - pressZone * 0.34 + Math.sin(elapsed * 8) * 0.012;
      nozzle.scale.x = 1 + pressZone * 0.22;
      nozzle.material.emissiveIntensity = 0.7 + pressZone * 0.8;
      warmFill.intensity = 22 + pressZone * 12;

      pressingRig.rotation.y = Math.sin(elapsed * 0.55) * 0.08;
      pressingRig.position.z = 1.1 + Math.sin(elapsed * 0.8) * 0.16;
      foldedStack.rotation.y = Math.sin(elapsed * 0.7) * 0.14;
      foldedStack.children.forEach((fold, index) => {
        fold.position.y = -0.05 + index * 0.17 + Math.sin(elapsed * 1.8 + index) * 0.01;
      });

      garmentRail.position.x = 0.3 + Math.sin(elapsed * 0.45) * 0.28;
      garments.forEach((garment, index) => {
        garment.rotation.z = Math.sin(elapsed * 1.6 + index * 0.7) * 0.07;
        garment.position.y = 2.28 + Math.cos(elapsed * 1.4 + index * 0.65) * 0.04;
      });

      rollerLeft.rotation.x = elapsed * 3.8;
      rollerRight.rotation.x = elapsed * 3.8;
      runwayLines.forEach((line, index) => {
        line.position.x = -4 + ((elapsed * 2.2 + index * 1.15) % 9.2);
        line.material.opacity = 0.16 + ((index + elapsed * 2) % 1) * 0.2;
      });

      const steamAttribute = steam.geometry.attributes.position;
      for (let index = 0; index < steamCount; index += 1) {
        const stride = index * 3;
        const seed = steamSeeds[index];
        steamAttribute.array[stride] += Math.sin(elapsed * 1.4 + seed) * 0.002;
        steamAttribute.array[stride + 1] += 0.018 + pressZone * 0.01;
        steamAttribute.array[stride + 2] += Math.cos(elapsed * 1.1 + seed) * 0.0018;

        if (steamAttribute.array[stride + 1] > 4.9) {
          steamAttribute.array[stride] = 2.4 + (Math.random() - 0.5) * 1.1;
          steamAttribute.array[stride + 1] = 0.15 + Math.random() * 0.4;
          steamAttribute.array[stride + 2] = (Math.random() - 0.5) * 1;
        }
      }
      steamAttribute.needsUpdate = true;
      steam.material.opacity = 0.34 + pressZone * 0.5;

      const sparkAttribute = sparks.geometry.attributes.position;
      for (let index = 0; index < sparkCount; index += 1) {
        const stride = index * 3;
        const seed = sparkSeeds[index];
        sparkAttribute.array[stride] += Math.sin(elapsed * 0.8 + seed) * 0.003;
        sparkAttribute.array[stride + 1] += Math.sin(elapsed * 1.3 + seed) * 0.0015;
        sparkAttribute.array[stride + 2] += 0.006;
        if (sparkAttribute.array[stride + 2] > 2) {
          sparkAttribute.array[stride] = (Math.random() - 0.5) * 10;
          sparkAttribute.array[stride + 1] = Math.random() * 6.5 - 0.5;
          sparkAttribute.array[stride + 2] = -4.8;
        }
      }
      sparkAttribute.needsUpdate = true;

      lightBars.forEach((bar, index) => {
        bar.material.opacity = 0.22 + Math.sin(elapsed * 1.8 + index) * 0.12;
      });

      camera.position.x = Math.sin(elapsed * 0.34) * 1.8;
      camera.position.y = 2.9 + Math.cos(elapsed * 0.52) * 0.35;
      camera.position.z = 13 + Math.sin(elapsed * 0.28) * 0.8;
      camera.lookAt(0.35 + Math.sin(elapsed * 0.44) * 0.35, 0.65, 0.1);

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
  }, []);

  return <div className="press-scene press-scene--cinematic" ref={mountRef} aria-hidden="true" />;
}

export default PressScene;
