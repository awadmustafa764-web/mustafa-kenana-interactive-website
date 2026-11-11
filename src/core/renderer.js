import * as THREE from 'three';
import { QUALITY } from '../config/theme.js';

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Composite: portal wipe between two worlds (16:9 frame growing from an origin),
// then tone mapping, sRGB, grain and vignette — the unified "lens" of the site.
const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform float uMix;        // 0 = A only, 1 = B only
  uniform vec2 uOrigin;      // portal centre, uv space
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uGrain;
  uniform float uVignette;
  uniform vec3 uFrameColor;
  uniform sampler2D tBloom1;
  uniform sampler2D tBloom2;
  uniform float uBloom;
  uniform float uMask;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec4 a = texture2D(tA, vUv);
    // mask mode: A is premultiplied over B (the prologue opening onto the hall)
    if (uMask > 0.5) a = vec4(a.rgb + texture2D(tB, vUv).rgb * (1.0 - clamp(a.a, 0.0, 1.0)), 1.0);
    vec4 col = a;
    float frameLine = 0.0;

    if (uMix > 0.0001) {
      float aspect = uRes.x / uRes.y;
      // centre moves from origin to screen centre as the portal grows
      float m = uMix;
      vec2 c = mix(uOrigin, vec2(0.5), smoothstep(0.0, 0.85, m));
      vec2 p = (vUv - c) * vec2(aspect, 1.0);
      // 16:9 box, half-size grows to cover the farthest corner
      float cover = length(vec2(aspect, 1.0)) * 1.15;
      float s = pow(m, 1.6) * cover;
      vec2 hs = vec2(16.0, 9.0) / 16.0 * s;
      hs.y = max(hs.y, 0.0001);
      vec2 d = abs(p) - hs;
      float box = max(d.x, d.y);           // < 0 inside
      // slight edge wobble so the frame feels physical, not CSS
      float wob = (hash(floor(vUv * uRes / 3.0) + floor(uTime * 24.0)) - 0.5) * 0.002;
      float inside = step(box + wob, 0.0);
      vec2 refr = normalize(p + 1e-5) * 0.012 * (1.0 - m) * inside * smoothstep(-0.12, 0.0, box);
      vec4 b = texture2D(tB, vUv - refr);
      col = mix(a, b, inside);
      float px = 1.5 / uRes.y;
      frameLine = (1.0 - smoothstep(0.0, px * 2.0, abs(box))) * (1.0 - smoothstep(0.85, 1.0, m));
    }

    vec3 bloom = texture2D(tBloom1, vUv).rgb * 0.7 + texture2D(tBloom2, vUv).rgb;
    gl_FragColor = vec4(col.rgb + bloom * uBloom, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    vec3 outc = gl_FragColor.rgb;
    outc = mix(outc, uFrameColor, frameLine);

    // vignette + grain in display space
    vec2 q = vUv - 0.5;
    outc *= 1.0 - dot(q, q) * uVignette;
    float g = hash(vUv * uRes + fract(uTime * 7.13) * 100.0) - 0.5;
    outc += g * uGrain;
    gl_FragColor = vec4(outc, 1.0);
  }
`;

// Bloom prefilter: reproduces the portal mask so bloom follows the transition.
const PREFILTER_FRAG = /* glsl */ `
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform float uMix;
  uniform vec2 uOrigin;
  uniform vec2 uRes;
  uniform float uThreshold;
  uniform vec2 uTexel;
  uniform float uMask;
  varying vec2 vUv;
  vec3 sceneAt(vec2 uv) {
    vec4 a4 = texture2D(tA, uv);
    if (uMask > 0.5) return a4.rgb + texture2D(tB, uv).rgb * (1.0 - clamp(a4.a, 0.0, 1.0));
    vec3 a = a4.rgb;
    if (uMix < 0.0001) return a;
    float aspect = uRes.x / uRes.y;
    vec2 c = mix(uOrigin, vec2(0.5), smoothstep(0.0, 0.85, uMix));
    vec2 p = (uv - c) * vec2(aspect, 1.0);
    float s = pow(uMix, 1.6) * length(vec2(aspect, 1.0)) * 1.15;
    vec2 d = abs(p) - vec2(1.0, 0.5625) * s;
    return max(d.x, d.y) < 0.0 ? texture2D(tB, uv).rgb : a;
  }
  void main() {
    vec3 c = sceneAt(vUv + uTexel * vec2(-1.0, -1.0)) + sceneAt(vUv + uTexel * vec2(1.0, -1.0))
           + sceneAt(vUv + uTexel * vec2(-1.0, 1.0)) + sceneAt(vUv + uTexel * vec2(1.0, 1.0));
    c *= 0.25;
    float l = max(c.r, max(c.g, c.b));
    float k = max(l - uThreshold, 0.0) / max(l, 1e-4);
    gl_FragColor = vec4(min(c * k, vec3(24.0)), 1.0);
  }
`;
const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tMap;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tMap, vUv).rgb * 0.2270270270;
    c += texture2D(tMap, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(tMap, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(tMap, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
    c += texture2D(tMap, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const NO_BLOOM = { strength: 0, threshold: 1 };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.NeutralToneMapping;
    this.gl.toneMappingExposure = 1.0;
    this.gl.shadowMap.enabled = QUALITY.shadows;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;

    this.dpr = Math.min(window.devicePixelRatio || 1, QUALITY.maxDpr);
    // HDR targets need a renderable half-float format; some mobile GPUs lack it
    const ext = this.gl.extensions;
    this.hdr = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    const RT_TYPE = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const rtOpts = {
      type: RT_TYPE,
      samples: QUALITY.msaa,
      depthBuffer: true,
    };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts);

    this.uniforms = {
      tA: { value: this.rtA.texture },
      tB: { value: this.rtB.texture },
      uMix: { value: 0 },
      uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uGrain: { value: 0.045 },
      uVignette: { value: 0.9 },
      uFrameColor: { value: new THREE.Color('#ece6da') },
      tBloom1: { value: null },
      tBloom2: { value: null },
      uBloom: { value: 0 },
      uMask: { value: 0 },
    };
    // bloom chain at 1/4 and 1/8 resolution
    const lo = { type: RT_TYPE, depthBuffer: false };
    this.bl = [0, 1, 2, 3].map(() => new THREE.WebGLRenderTarget(1, 1, lo));
    this.uniforms.tBloom1.value = this.bl[1].texture;
    this.uniforms.tBloom2.value = this.bl[3].texture;
    this.preU = {
      tA: { value: this.rtA.texture }, tB: { value: this.rtB.texture }, uMix: this.uniforms.uMix,
      uOrigin: this.uniforms.uOrigin, uRes: this.uniforms.uRes, uMask: this.uniforms.uMask, uThreshold: { value: 1 }, uTexel: { value: new THREE.Vector2() },
    };
    this.preMat = new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: PREFILTER_FRAG, uniforms: this.preU, depthTest: false, depthWrite: false });
    this.blurU = { tMap: { value: null }, uDir: { value: new THREE.Vector2() } };
    this.blurMat = new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: BLUR_FRAG, uniforms: this.blurU, depthTest: false, depthWrite: false });
    this.composite = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: COMPOSITE_FRAG,
        uniforms: this.uniforms,
        depthTest: false,
        depthWrite: false,
        toneMapped: true,
      })
    );
    this.composite.frustumCulled = false;
    this.compositeMat = this.composite.material;
    this.postScene = new THREE.Scene();
    this.postScene.add(this.composite);
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.resize();
  }

  setDpr(dpr) {
    this.dpr = dpr;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.gl.setPixelRatio(this.dpr);
    this.gl.setSize(w, h, false);
    const pw = Math.floor(w * this.dpr);
    const ph = Math.floor(h * this.dpr);
    this.rtA.setSize(pw, ph);
    this.rtB.setSize(pw, ph);
    this.uniforms.uRes.value.set(pw, ph);
    const q = [Math.max(1, pw >> 2), Math.max(1, ph >> 2)];
    const e = [Math.max(1, pw >> 3), Math.max(1, ph >> 3)];
    this.bl[0].setSize(...q); this.bl[1].setSize(...q);
    this.bl[2].setSize(...e); this.bl[3].setSize(...e);
    this.preU.uTexel.value.set(1 / pw, 1 / ph);
  }

  renderScene(sceneObj, target) {
    this.gl.setRenderTarget(target);
    this.gl.setClearColor(sceneObj.clearColor, sceneObj.clearAlpha ?? 1);
    this.gl.clear();
    this.gl.render(sceneObj.scene, sceneObj.camera);
  }

  pass(mat, target) {
    this.composite.material = mat;
    this.gl.setRenderTarget(target);
    this.gl.render(this.postScene, this.postCamera);
  }

  bloom(strength, threshold) {
    if (!this.hdr) strength = 0;   // no HDR range to bloom from
    this.uniforms.uBloom.value = strength;
    if (strength <= 0.001) return;
    this.preU.uThreshold.value = threshold;
    this.pass(this.preMat, this.bl[0]);
    const blur = (src, dst, dx, dy, w, h) => {
      this.blurU.tMap.value = src.texture;
      this.blurU.uDir.value.set(dx / w, dy / h);
      this.pass(this.blurMat, dst);
    };
    const [w1, h1] = [this.bl[0].width, this.bl[0].height];
    const [w2, h2] = [this.bl[2].width, this.bl[2].height];
    blur(this.bl[0], this.bl[1], 1, 0, w1, h1);
    blur(this.bl[1], this.bl[0], 0, 1, w1, h1);
    blur(this.bl[0], this.bl[1], 2, 0, w1, h1);   // wider second iteration
    blur(this.bl[1], this.bl[2], 0, 2, w2, h2);   // downsample to 1/8
    blur(this.bl[2], this.bl[3], 1, 0, w2, h2);
    blur(this.bl[3], this.bl[2], 0, 1, w2, h2);
    blur(this.bl[2], this.bl[3], 2, 0, w2, h2);
    blur(this.bl[3], this.bl[2], 0, 2, w2, h2);
    // results: bl[1] (1/4, tight) and bl[2] (1/8, wide)
    this.uniforms.tBloom1.value = this.bl[1].texture;
    this.uniforms.tBloom2.value = this.bl[2].texture;
  }

  // a: scene object, b: scene object or null, mix 0..1.
  // mask mode: a is drawn over b using the alpha of a (no portal wipe).
  frame(a, b, mix, origin, time, mask = false) {
    this.renderScene(a, this.rtA);
    const u = this.uniforms;
    if (mask && !b) mask = false;
    u.uMask.value = mask ? 1 : 0;
    if (mask) {
      this.renderScene(b, this.rtB);
      u.uMix.value = 0;
      u.uTime.value = time;
      this.bloom(a.bloom.strength, a.bloom.threshold);
      this.pass(this.compositeMat, null);
      return;
    }
    if (b && mix > 0.0001) {
      this.renderScene(b, this.rtB);
      u.uMix.value = mix;
      u.uOrigin.value.copy(origin);
    } else {
      u.uMix.value = 0;
    }
    u.uTime.value = time;
    const ba = a.bloom || NO_BLOOM;
    const bb = (b && b.bloom) || NO_BLOOM;
    const m = u.uMix.value;
    this.bloom(ba.strength * (1 - m) + bb.strength * m, ba.threshold * (1 - m) + bb.threshold * m);
    this.pass(this.compositeMat, null);
  }
}
