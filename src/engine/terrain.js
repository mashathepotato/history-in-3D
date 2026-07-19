// Terrain + water. The city config supplies a heightAt(x, z) function;
// the engine turns it into a colored heightfield mesh and a water plane.
import * as THREE from 'three';

export function buildTerrain(cfg) {
  const size = cfg.terrain.size;
  const seg = cfg.terrain.segments || 220;
  const heightAt = cfg.terrain.heightAt;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(cfg.terrain.grassColor || '#5c7345');
  const cDirt = new THREE.Color(cfg.terrain.dirtColor || '#8a7a58');
  const cSand = new THREE.Color(cfg.terrain.sandColor || '#b5a377');
  const cRock = new THREE.Color(cfg.terrain.rockColor || '#7d7466');
  const tmp = new THREE.Color();
  const waterY = cfg.terrain.waterLevel ?? 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    // color by height band with a little deterministic jitter
    const jitter = (Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1) * 0.05;
    if (h < waterY + 1.5) tmp.copy(cSand);
    else if (h < waterY + 6) tmp.lerpColors(cSand, cGrass, (h - waterY - 1.5) / 4.5);
    else if (h > 55) tmp.lerpColors(cGrass, cRock, Math.min(1, (h - 55) / 30));
    else tmp.lerpColors(cGrass, cDirt, jitter + 0.15);
    tmp.offsetHSL(0, 0, jitter * 0.25 - 0.006);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 1,
  }));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Animated water with gentle waves + fresnel-ish shading.
export function buildWater(cfg) {
  const size = cfg.terrain.size;
  const waterY = cfg.terrain.waterLevel ?? 2;
  const geo = new THREE.PlaneGeometry(size * 0.995, size * 0.995, 90, 90);
  geo.rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(cfg.terrain.waterDeep || '#22506b') },
    uShallow: { value: new THREE.Color(cfg.terrain.waterShallow || '#3f7d96') },
    uSky: { value: new THREE.Color('#a8c8e0') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec3 p = position;
        float w1 = sin(p.x * 0.045 + uTime * 0.9) * cos(p.z * 0.05 + uTime * 0.6);
        float w2 = sin(p.x * 0.11 - uTime * 1.3 + p.z * 0.08);
        p.y += w1 * 0.55 + w2 * 0.25;
        vec3 n = normalize(vec3(-0.04 * cos(p.x * 0.045 + uTime * 0.9), 1.0, 0.05 * sin(p.z * 0.05 + uTime * 0.6)));
        vNormalW = n;
        vPosW = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform float uTime;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPosW);
        float fres = pow(1.0 - max(dot(viewDir, vNormalW), 0.0), 2.2);
        float sparkle = smoothstep(0.97, 1.0, sin(vPosW.x * 0.8 + uTime * 2.0) * sin(vPosW.z * 0.85 - uTime * 1.4));
        vec3 col = mix(uDeep, uShallow, fres * 0.6);
        col = mix(col, uSky, fres * 0.55);
        col += sparkle * 0.25;
        gl_FragColor = vec4(col, 0.92);
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = waterY;
  mesh.name = 'water';
  return { mesh, uniforms };
}

// Sky: inverted dome with vertical gradient + sun glow, all lerpable per era.
export function buildSky() {
  const uniforms = {
    uTop: { value: new THREE.Color('#7fb2e0') },
    uBottom: { value: new THREE.Color('#e8d8b8') },
    uSunDir: { value: new THREE.Vector3(0.5, 0.6, -0.6).normalize() },
    uSunColor: { value: new THREE.Color('#fff2cc') },
    uHaze: { value: 0.4 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w; // push to far plane
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop;
      uniform vec3 uBottom;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uHaze;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uBottom, uTop, pow(h, 0.55));
        float sun = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(sun, 350.0) * 1.2 + pow(sun, 18.0) * 0.28);
        col = mix(col, uBottom, uHaze * pow(1.0 - h, 3.0) * 0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), material);
  mesh.name = 'sky';
  return { mesh, uniforms };
}
