/* =========================================================================
 * 手势粒子互动模块（由「手势粒子魔法」项目适配）
 * -------------------------------------------------------------------------
 * 功能：
 *   通过摄像头 + MediaPipe Hands 识别左右手与手势，驱动 26000 个粒子实时
 *   变化造型：文字、爱心、盾牌、能量爆散、粒子扩散旋转等。
 *
 * 对外接口：
 *   window.SecParticles.start() —— 进入「互动体验」栏目时调用（初始化并开始）
 *   window.SecParticles.stop()  —— 离开栏目时调用（停止摄像头与渲染，省资源）
 *
 * 设计说明：
 *   - 采用模块化 IIFE，避免污染全局命名空间；
 *   - three.js 与 MediaPipe 均为「首次进入时」才动态加载（懒加载），
 *     且优先本地 lib/，本地缺失时自动回退到多个 CDN，兼顾离线与在线；
 *   - 粒子使用并行 Float32Array 存储位置/速度/颜色，避免逐帧 GC，保证性能。
 * ========================================================================= */

(async function () {
  /* ========================= 页面元素引用 =========================
   * 对应 index.html 中「互动 EXPERIENCE」栏目内的元素：
   *   particle-video  : 摄像头画面 <video>（CSS 做了镜像，呈现自拍视角）
   *   particle-scene  : Three.js 画布挂载点
   *   particle-status : 顶部状态栏（实时显示模式与左右手）
   *   particle-loading: 加载中的遮罩层
   *   particle-err    : 错误提示文本
   */
  const video = document.getElementById('particle-video');
  const sceneEl = document.getElementById('particle-scene');
  const statusEl = document.getElementById('particle-status');
  const loadingEl = document.getElementById('particle-loading');
  const errEl = document.getElementById('particle-err');

  // 核心元素缺失（栏目被移除等）时直接退出，避免后续报错
  if (!video || !sceneEl) return;

  /* ========================= 生命周期状态 ========================= */
  let started = false;   // 是否处于「运行中」（started=true 表示正在播放）
  let inited = false;    // 是否已完成一次初始化（懒加载资源、建场景）
  let THREE = null;      // three.js 模块命名空间（动态 import 后赋值）
  let renderer = null;   // WebGL 渲染器
  let cam = null;        // MediaPipe Camera 实例
  let hands = null;      // MediaPipe Hands 实例
  let gotFirst = false;  // 是否已收到第一帧手部结果（用于隐藏加载遮罩）

  /* ========================= 左右手状态 =========================
   * 以「屏幕前正对屏幕的人（自拍视角）」定义左右：
   *   left  : 用户伸左手时的状态
   *   right : 用户伸右手时的状态
   * 字段说明：
   *   present    当前帧是否检测到这只手
   *   x / y / z  手心在 3D 世界坐标中的平滑位置（低通滤波）
   *   scale      手的大小（用于计算排斥半径）
   *   gesture    左手：0=无 / 1~4=伸出指数（对应 TEXT_LIST 索引）；
   *              右手：'open'|'burst'|'shield'|'heart' 四种模式
   *   raw / stable 防抖计数：连续 stable 帧伸出指数不变才切换手势
   *   angle / prev / smoothAngVel 右手旋转角速度（驱动粒子涡流旋转）
   */
  const state = {
    left:  { present:false, x:0, y:0, z:0, scale:0, gesture:0, raw:-1, stable:0 },
    right: { present:false, x:0, y:0, z:0, scale:0, gesture:'open', raw:-1, stable:0, angle:0, prev:0, smoothAngVel:0 },
  };

  /* ========================= 常量与全局变量 =========================
   * TEXT_LIST：左手 1~4 指分别对应的粒子文字（索引 0 留空）
   * HWS       ：爱心造型的缩放系数
   * burstBoost：能量爆散强度（0~1.4），触发后逐帧衰减
   * shieldArr ：盾牌造型的采样点数组（由 makeShieldPoints 生成）
   */
  const TEXT_LIST = ['', 'WELCOME', '网络安全社', '欢迎加入我们', 'CTF 等你来'];
  const HWS = 2.4;
  let burstBoost = 0;
  let shieldArr = null;

  // 在加载遮罩上显示错误信息（摄像头失败 / 模型加载失败等）
  function setErr(msg) {
    if (errEl) errEl.textContent = msg;
  }

  /* ------------------------- three.js 多CDN加载 -------------------------
   * three.js 0.160.0 以 ES Module 形式动态加载，依次尝试多个来源：
   *   1. 本地 lib/three/three.module.js（离线优先，已随项目打包）
   *   2~4. 多个 CDN 兜底（在线环境自动回退）
   * 哪个先加载成功就用哪个；全部失败返回 null，由上层提示错误。
   */
  async function loadThree() {
    const urls = [
      './lib/three/three.module.js',
      'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
      'https://unpkg.com/three@0.160.0/build/three.module.js',
      'https://registry.npmmirror.com/three/0.160.0/files/build/three.module.js',
    ];
    for (const u of urls) {
      try { return await import(u); } catch (e) { /* 当前来源失败，尝试下一个 */ }
    }
    return null;
  }

  // 动态向 <head> 注入一个普通 <script>，加载完成后 resolve
  // 用于加载 MediaPipe 的 camera_utils.js 与 hands.js（它们暴露全局 Hands / Camera）
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = () => reject(new Error('加载失败: ' + src));
      document.head.appendChild(s);
    });
  }

  /* ------------------------- MediaPipe 多CDN加载 -------------------------
   * 返回一个「模型文件目录前缀 locate」，供 Hands 构造时定位 .wasm/.tflite/.data。
   * 同样优先本地 lib/，失败后依次回退多个 CDN。
   * 若 Hands / Camera 全局对象已存在（可能被其它脚本提前加载），直接复用。
   */
  async function initMediaPipe() {
    if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') {
      return './lib/mediapipe/hands/';
    }
    const candidates = [
      {
        scripts: [
          './lib/mediapipe/camera_utils/camera_utils.js',
          './lib/mediapipe/hands/hands.js',
        ],
        locate: './lib/mediapipe/hands/',
      },
      {
        scripts: [
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
        ],
        locate: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/',
      },
      {
        scripts: [
          'https://unpkg.com/@mediapipe/camera_utils/camera_utils.js',
          'https://unpkg.com/@mediapipe/hands/hands.js',
        ],
        locate: 'https://unpkg.com/@mediapipe/hands/',
      },
      {
        scripts: [
          'https://registry.npmmirror.com/@mediapipe/camera_utils/0.3.1675466862/files/camera_utils.js',
          'https://registry.npmmirror.com/@mediapipe/hands/0.4.1675469240/files/hands.js',
        ],
        locate: 'https://registry.npmmirror.com/@mediapipe/hands/0.4.1675469240/files/',
      },
    ];
    for (const cand of candidates) {
      try {
        for (const url of cand.scripts) await loadScript(url);
        if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') return cand.locate;
      } catch (e) { /* 切换下一个 */ }
    }
    throw new Error('MediaPipe 加载失败，请检查网络后刷新页面。');
  }

  /* ------------------------- Three.js 场景 ------------------------- */
  /* ------------------------- Three.js 场景与粒子初始化 -------------------------
   * 一次性创建：透明 WebGL 渲染器、透视相机、26000 个粒子的顶点缓冲与目标点。
   * 注意：位置/颜色/速度等全部使用「并行 TypedArray」存储，避免 JS 对象开销，
   * 每帧只更新数组后写回 BufferAttribute，保证 2.6 万粒子仍能流畅运行。
   */
  function buildScene() {
    // 创建透明渲染器，叠加在摄像头画面上
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // 限制像素比，兼顾清晰度与性能
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // 背景透明，露出下方视频
    sceneEl.appendChild(renderer.domElement);

    // 透视相机：视场角 55°，位于 z=9.5 看向原点
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9.5);
    camera.lookAt(0, 0, 0);

    // 窗口尺寸变化时同步更新相机与渲染器
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 生成一个圆形渐变光晕贴图，作为每个粒子的“点”造型（柔和光斑）
    function makeSpriteTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }

    // 粒子数量
    const N = 26000;
    // 直接写入 GPU 的顶点缓冲
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);   // 粒子位置（x,y,z）
    const col = new Float32Array(N * 3);   // 粒子颜色（r,g,b）

    // CPU 侧并行状态数组（长度 N，均为并行数组以提升缓存命中与性能）
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);  // 当前位置
    const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);  // 当前速度
    const hx = new Float32Array(N), hy = new Float32Array(N), hz = new Float32Array(N);  // “家”位置（扩散模式的球形目标点）
    const wn = new Float32Array(N);        // 随机游走强度（每个粒子不同）
    const base = new Float32Array(N * 3);  // 基础颜色（粉色/白色混合）
    const pha = new Float32Array(N);       // 闪烁相位（让粒子亮度随时间微微变化）
    const textIdx = new Int32Array(N);     // 文字模式下，每个粒子绑定一个文字采样点索引
    const shieldIdx = new Int32Array(N);   // 盾牌模式下，每个粒子绑定一个盾牌采样点索引
    const heartPts = new Float32Array(N * 3); // 爱心目标点（参数方程预采样，握拳时使用）

    // 初始化：生成扩散模式的球形“家”位置 + 随机初始位置/颜色
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < N; i++) {
      // 球体均匀分布（cbrt 保证体积均匀）
      const r = Math.cbrt(Math.random()) * 3.6;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      hx[i] = r * Math.sin(ph) * Math.cos(th);
      hy[i] = r * Math.sin(ph) * Math.sin(th) * 0.62; // y 轴压扁，更接近屏幕比例
      hz[i] = r * Math.cos(ph) * 0.5;
      // 初始从画面中心附近小范围散开，形成“汇聚”的入场感
      px[i] = (Math.random() - 0.5) * 0.4;
      py[i] = (Math.random() - 0.5) * 0.4;
      pz[i] = (Math.random() - 0.5) * 0.4;
      wn[i] = 0.5 + Math.random();
      pha[i] = Math.random() * Math.PI * 2;
      // 约 32% 白色，其余为粉色调（HSL：色相 0.935~0.98 附近）
      const c = (Math.random() < 0.32) ? white : new THREE.Color().setHSL(0.935 + Math.random() * 0.045, 0.5 + Math.random() * 0.32, 0.7 + Math.random() * 0.22);
      base[i * 3] = c.r; base[i * 3 + 1] = c.g; base[i * 3 + 2] = c.b;
      textIdx[i] = 0;
    }

    // 爱心目标点：经典心形参数方程 + 半径填充 + z 方向厚度衰减
    // 生成后会在主循环中按 HWS 缩放并叠加心跳脉冲
    for (let i = 0; i < N; i++) {
      const t = Math.random() * Math.PI * 2;
      const cx = 16 * Math.pow(Math.sin(t), 3);
      const cy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const rr = Math.sqrt(Math.random());   // 平方根让填充更均匀
      const x = cx * rr, y = cy * rr;
      const z = (Math.random() - 0.5) * (1 - rr) * 0.6; // 中心厚、边缘薄，形成立体感
      heartPts[i * 3]   = x / 16;
      heartPts[i * 3 + 1] = (y + 1.75) / 22;
      heartPts[i * 3 + 2] = z;
    }

    // 把位置/颜色缓冲挂到几何体上
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    // 点材质：小尺寸光斑、逐顶点颜色、叠加混合（亮处更亮）
    const mat = new THREE.PointsMaterial({
      size: 0.032,
      map: makeSpriteTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(geo, mat));

    // 返回渲染所需的一切，供主循环 updateParticles 使用
    return { scene, camera, renderer, geo, pos, col, px, py, pz, vx, vy, vz, hx, hy, hz, wn, base, pha, textIdx, shieldIdx, heartPts, N };
  }

  /* ------------------------- 盾牌点采样（网络安全主题） -------------------------
   * 右手比「1 指」时粒子集结成盾牌造型。
   * 做法：离屏 canvas 上用路径画一个盾牌轮廓并填充，再逐像素采样出
   * 「哪些坐标被涂白了」的点阵，最后归一化缩放到 3D 世界坐标。
   * 返回数组元素形如 [x, y, z]，每个元素是一个盾牌采样点。
   */
  function makeShieldPoints() {
    const c = document.createElement('canvas');
    const w = 320, h = 400;
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.translate(w / 2, h * 0.5);
    // 绘制盾牌路径：上缘拱形 + 两侧直线 + 底部尖角（类徽章外形）
    g.beginPath();
    g.moveTo(0, -150);
    g.bezierCurveTo(-90, -150, -120, -70, -115, 0);
    g.lineTo(-112, 30);
    g.lineTo(0, 190);
    g.lineTo(112, 30);
    g.lineTo(115, 0);
    g.bezierCurveTo(120, -70, 90, -150, 0, -150);
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
    // 读取画布像素，按 2px 步长收集“不透明”的点（alpha > 100）
    const img = g.getImageData(0, 0, w, h).data;
    const pts = [];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (img[(y * w + x) * 4 + 3] > 100) pts.push([x, y]);
      }
    }
    if (pts.length < 100) return null;
    // 计算包围盒中心，并按目标宽高比缩放（fit 5.4 x 6.8 的世界尺寸）
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const s = Math.min(5.4 / (maxX - minX), 6.8 / (maxY - minY));
    const out = [];
    // 平移到中心、y 轴取反（屏幕坐标向下，3D 坐标向上）、加少量 z 厚度
    for (const p of pts) out.push([(p[0] - cx) * s, -(p[1] - cy) * s, (Math.random() - 0.5) * 0.3]);
    return out;
  }

  /* ------------------------- 文字采样 -------------------------
   * 左手比 1~4 指时，粒子拼出对应文字。
   * 原理：离屏 canvas 用 fillText 写出白色文字，逐像素采样出笔画点阵，
   * 再归一化到世界坐标。中文与英文使用不同字号（中文笔画密，字号略小）。
   * fitW / fitH 是文字在 3D 空间中的目标宽高。
   */
  const fitW = 7.2, fitH = 2.6;
  const textCache = {};  // 缓存已采样过的文字，避免重复计算

  function sampleText(text) {
    // 是否包含拉丁字母：决定字号与字体族
    const isLatin = /[A-Za-z]/.test(text);
    const size = isLatin ? 230 : 170;
    const pad = 40;  // 四周留白，防止文字被画布边缘裁切
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const font = size + 'px ' + (isLatin
      ? '"Arial Black","Arial","Segoe UI",sans-serif'
      : '"Microsoft YaHei","PingFang SC","Noto Sans SC","SimHei",sans-serif');
    g.font = font;
    // 画布尺寸 = 文字宽 + 留白
    const w = Math.ceil(g.measureText(text).width) + pad * 2;
    const h = Math.ceil(size * 1.5) + pad * 2;
    c.width = w; c.height = h;
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(text, w / 2, h / 2);
    // 按 2px 步长采样不透明像素，得到笔画点集
    const img = g.getImageData(0, 0, w, h).data;
    const pts = [];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (img[(y * w + x) * 4 + 3] > 100) pts.push([x, y]);
      }
    }
    if (pts.length < 200) return null;  // 点太少视为渲染失败
    // 归一化：居中 + 缩放到 fitW x fitH 的世界尺寸
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const s = Math.min(fitW / (maxX - minX), fitH / (maxY - minY));
    const out = [];
    // y 取反转换坐标朝向，并给每个点随机 z 厚度，让文字有立体感
    for (const p of pts) out.push([(p[0] - cx) * s, -(p[1] - cy) * s, (Math.random() - 0.5) * 0.35]);
    return out;
  }

  // 带缓存的文字点获取
  function getTextPoints(text) {
    if (!textCache[text]) textCache[text] = sampleText(text);
    return textCache[text];
  }

  /* ------------------------- 心跳 -------------------------
   * 返回 0~1 左右的“心跳”强度，周期 0.82 秒。
   * 用两个时间上错开的高斯脉冲叠加，形成「lub-dub」双峰心跳节奏，
   * 握拳时叠加到爱心目标点上，让爱心随心跳搏动。
   */
  function heartbeat(t) {
    const T = 0.82;
    const ph = t % T;
    const p1 = Math.exp(-Math.pow(ph - 0.12, 2) / (2 * 0.04 * 0.04));
    const p2 = Math.exp(-Math.pow(ph - 0.34, 2) / (2 * 0.06 * 0.06));
    return p1 * 0.95 + p2 * 0.6;
  }

  /* ------------------------- 手势处理 ------------------------- */

  /* 坐标映射：把 MediaPipe 的归一化手部坐标 (nx, ny, nz) 映射到 Three.js 3D 世界。
   * - 处理视频与窗口宽高比不同导致的裁切（object-fit: cover 的等效换算）
   * - sx = 1 - nx：抵消 CSS 镜像（scaleX(-1)）对坐标的影响
   * - 相机 fov=55、z=9.5，据此计算世界坐标的半宽/半高
   * z 方向按深度 *3 放大，让手的深度变化更明显
   */
  function videoToWorld(nx, ny, nz) {
    const cw = window.innerWidth, ch = window.innerHeight;
    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    const sx = 1 - nx;
    const va = vw / vh, ca = cw / ch;
    let px2, py2;
    if (va > ca) {  // 视频更高：左右被裁掉一部分
      const dispW = ch * va;
      px2 = sx * dispW - (dispW - cw) / 2;
      py2 = ny * ch;
    } else {        // 视频更宽：上下被裁掉一部分
      const dispH = cw / va;
      px2 = sx * cw;
      py2 = ny * dispH - (dispH - ch) / 2;
    }
    const halfH = Math.tan(THREE.MathUtils.degToRad(55 / 2)) * 9.5;
    const halfW = halfH * (cw / ch);
    return { x: (px2 / cw * 2 - 1) * halfW, y: -(py2 / ch * 2 - 1) * halfH, z: nz * 3.0 };
  }

  // 手心中心点 = 手腕 + 4 根手指根部（MCP）的平均位置
  function palmCenter(lm) {
    let x = 0, y = 0, z = 0;
    for (const k of [0, 5, 9, 13, 17]) { x += lm[k].x; y += lm[k].y; z += lm[k].z; }
    return videoToWorld(x / 5, y / 5, z / 5);
  }

  /* 统计 4 根手指（食/中/无名/小指）伸出的数量。
   * 判定“伸直”用两个条件同时成立：
   *   1. 指尖到手腕距离 > 掌根(MCP)到手腕距离 × 1.35   → 指尖明显远离手掌
   *   2. 指尖到手腕距离 > 中间指节(PIP)到手腕距离 × 1.05 → 手指没有明显弯曲
   * 条件 1 能可靠区分「握拳」（指尖贴近掌心）与「张开」（指尖远离）。
   * 拇指单独判定（伸出与否不进 count），阈值 1.15。
   */
  function fingersExtended(lm) {
    const wrist = lm[0];
    // MediaPipe 关键点：0=腕，4=拇指尖，8/12/16/20=四指指尖，6/10/14/18=PIP，5/9/13/17=MCP
    const mcps = [5, 9, 13, 17], pips = [6, 10, 14, 18], tips = [8, 12, 16, 20];
    let count = 0;
    for (let f = 0; f < 4; f++) {
      const dTip = Math.hypot(lm[tips[f]].x - wrist.x, lm[tips[f]].y - wrist.y);
      const dPip = Math.hypot(lm[pips[f]].x - wrist.x, lm[pips[f]].y - wrist.y);
      const dMcp = Math.hypot(lm[mcps[f]].x - wrist.x, lm[mcps[f]].y - wrist.y);
      // 伸直：指尖明显远离掌根，且明显长于中间指节
      if (dTip > dMcp * 1.35 && dTip > dPip * 1.05) count++;
    }
    // 拇指伸出：拇指尖明显远离食指 MCP
    const t1 = Math.hypot(lm[4].x - lm[2].x, lm[4].y - lm[2].y);
    const t2 = Math.hypot(lm[3].x - lm[2].x, lm[3].y - lm[2].y);
    return { count, thumb: t1 > t2 * 1.15 };
  }

  // 手的大小：以手腕→食指根(MCP)的世界距离近似，用于计算粒子排斥半径
  function handSize(lm) {
    const a = videoToWorld(lm[0].x, lm[0].y, lm[0].z);
    const b = videoToWorld(lm[5].x, lm[5].y, lm[5].z);
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* 更新某只手的状态（每帧调用）。
   * 平滑：位置/大小用低通滤波（指数滑动平均），减少摄像头抖动。
   * 防抖：伸出指数连续 N 帧不变才切换手势（右手 5 帧、左手 8 帧），避免误触。
   *
   * 右手手势映射（依据伸出指数 count）：
   *   count >= 3  → open   （张开：粒子扩散+跟随旋转）
   *   count == 2  → burst  （2 指：能量爆散，触发时 burstBoost=1.4）
   *   count == 1  → shield （1 指：粒子集结成盾牌）
   *   count <= 0  → heart  （握拳：粒子收缩成爱心）
   *
   * 左手手势：gesture = 伸出指数（1~4），0 表示无文字
   */
  function updateHand(name, lm, dt) {
    const st = state[name];
    // 该手当前帧未检测到：标记为缺席（左手清空文字手势）
    if (!lm) { st.present = false; if (name === 'left') st.gesture = 0; return; }
    st.present = true;
    // 平滑更新手心位置
    const c = palmCenter(lm);
    st.x += (c.x - st.x) * 0.5; st.y += (c.y - st.y) * 0.5; st.z += (c.z - st.z) * 0.5;
    // 平滑更新手的大小
    const hs = handSize(lm);
    st.scale = st.scale ? st.scale * 0.7 + hs * 0.3 : hs;

    if (name === 'right') {
      // —— 右手：额外计算旋转角速度（手腕→中指根连线的旋转），用于粒子涡流 ——
      const a = videoToWorld(lm[0].x, lm[0].y, lm[0].z);
      const b = videoToWorld(lm[9].x, lm[9].y, lm[9].z);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      // 角度差归一化到 [-PI, PI]，避免跨 360° 时的跳变
      let dA = ang - st.prev;
      if (dA > Math.PI) dA -= Math.PI * 2;
      if (dA < -Math.PI) dA += Math.PI * 2;
      st.prev = ang;
      const av = dt > 0 ? dA / dt : 0;
      // 平滑滤波 + 限制幅度，得到稳定的角速度
      st.smoothAngVel = st.smoothAngVel * 0.86 + av * 0.14;
      st.smoothAngVel = Math.max(-5, Math.min(5, st.smoothAngVel));
      // —— 手势防抖判定 ——
      const cnt = fingersExtended(lm).count;
      if (cnt !== st.raw) { st.raw = cnt; st.stable = 0; }
      else st.stable++;
      if (st.stable >= 5) {
        let next;
        if (cnt >= 3) next = 'open';
        else if (cnt === 2) next = 'burst';
        else if (cnt === 1) next = 'shield';
        else next = 'heart';
        if (next !== st.gesture) {
          st.gesture = next;
          // 进入爆散模式的瞬间，给粒子一个强冲击
          if (next === 'burst') burstBoost = 1.4;
        }
      }
    } else {
      // —— 左手：只统计伸出指数，映射为文字 ——
      const cnt = fingersExtended(lm).count;
      if (cnt !== st.raw) { st.raw = cnt; st.stable = 0; }
      else st.stable++;
      if (st.stable >= 8) {
        if (cnt >= 1 && cnt <= 4) st.gesture = cnt;
        else if (cnt === 0) st.gesture = 0;
      }
    }
  }

  /* MediaPipe 回调：每一帧检测结果到达时执行。
   * 这里只做「左右手归属判定」，再交给 updateHand 更新各自状态。
   * 手性优先级：
   *   1. MediaPipe 手性标签 multiHandedness（可靠）
   *   2. 无标签时按屏幕位置兜底（单只手场景）
   * 注意：以「屏幕前正对屏幕的人」的自拍视角为准，因此把 MediaPipe 的
   * Right 映射为我们的 left（用户左手），Left 映射为 right。
   */
  function onResults(results) {
    // 收到第一帧即隐藏加载遮罩
    if (!gotFirst) { gotFirst = true; if (loadingEl) loadingEl.classList.add('is-hidden'); }
    const handsArr = results.multiHandLandmarks || [];
    const handedness = results.multiHandedness || [];
    let left = null, right = null;

    for (let i = 0; i < handsArr.length; i++) {
      const label = handedness[i] && handedness[i].label;
      const lm = handsArr[i];
      if (label === 'Right') left = lm;       // 交换：MediaPipe Right → 用户的左手
      else if (label === 'Left') right = lm;  // 交换：MediaPipe Left  → 用户的右手
      else if (left === null) left = lm;      // 无标签时顺序兜底
      else if (right === null) right = lm;
    }

    // 兜底：单只手且无标签时，按屏幕位置判断
    // 自拍镜像显示中，用户左手在屏幕左侧（对应输入画面 x 较大，sx = 1 - x 较小）
    if (handsArr.length === 1) {
      const lm = handsArr[0];
      if (lm !== left && lm !== right) {
        const sx = 1 - lm[0].x;
        if (sx < 0.5) left = lm;
        else right = lm;
      }
    }

    // 计算帧间隔 dt（用于速度/角速度计算），并更新左右手
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastFrame) / 1000);
    lastFrame = now;
    updateHand('left', left, dt);
    updateHand('right', right, dt);
  }

  let lastFrame = performance.now();

  /* ------------------------- 粒子主循环 -------------------------
   * mode：当前粒子造型模式（diffuse 扩散 / text 文字 / heart 爱心 /
   *       shield 盾牌 / burst 爆散）
   * currentText/textPts/txtScale：文字模式的当前文字与其采样点
   * loop/clock：渲染循环句柄与计时器
   */
  let mode = 'diffuse';
  let currentText = '';
  let textPts = null;
  let txtScale = 1;
  let loop = null;
  let clock = null;

  /* 切换到指定文字：首次切换时才采样点阵（后续走缓存），
   * 并把每个粒子随机绑定到一个文字点，形成“每个粒子负责一个像素”的造型。
   */
  function ensureText(text) {
    if (text === currentText && textPts) return;
    const pts = getTextPoints(text);
    if (!pts) return;
    currentText = text;
    textPts = pts;
    // 计算文字在保证不超出 fitW/fitH 时的最终缩放（上限 1.15 防止过大）
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    txtScale = Math.min(Math.min(fitW / (maxX - minX), fitH / (maxY - minY)), 1.15);
    // 随机洗牌绑定：每个粒子随机指向一个文字采样点
    for (let i = 0; i < S.N; i++) S.textIdx[i] = (Math.random() * pts.length) | 0;
  }

  let S = null; // buildScene 的返回结果（渲染所需全部状态）

  /* 粒子主循环核心：决定模式 → 计算每个粒子的目标点 → 收敛 → 叠加外力 → 更新缓冲。
   * 每帧逻辑：
   *   1. 根据左右手手势决定 want（模式优先级：heart > shield > burst > text > diffuse）
   *   2. 用指数趋近系数 k 把粒子拉向目标点（不同模式收敛速度不同，文字最快）
   *   3. 叠加随机游走（wn 每个粒子不同，形成呼吸感）
   *   4. 扩散模式下叠加右手旋转的切向涡流
   *   5. 左手始终对粒子施加“斥力”（把粒子推开左手附近区域）
   *   6. 速度阻尼、写入 position/color 缓冲
   */
  function updateParticles(dt, t) {
    // —— 1. 决定当前模式（右手手势优先于左手）——
    let want;
    if (state.right.present && state.right.gesture === 'heart') {
      want = 'heart';
    } else if (state.right.present && state.right.gesture === 'shield') {
      want = 'shield';
    } else if (state.right.present && state.right.gesture === 'burst') {
      want = 'burst';
    } else if (state.left.present && state.left.gesture > 0) {
      want = 'text';
      ensureText(TEXT_LIST[state.left.gesture]);
    } else {
      want = 'diffuse';
    }
    mode = want;

    // —— 2. 计算各模式的物理参数 ——
    // 指数趋近系数 k（0~1）：越大收敛越快；文字最快、爱心/盾牌次之、扩散最慢
    const kT = 1 - Math.exp(-7 * dt);
    const kH = 1 - Math.exp(-5 * dt);
    const kD = 1 - Math.exp(-2.2 * dt);
    // 速度阻尼：扩散模式阻尼更强，让粒子快速“安顿”下来
    const damp = Math.exp(-(mode === 'diffuse' ? 4.2 : 2.6) * dt);
    // 随机游走强度：文字模式最轻（保持字形清晰），扩散最重（更有生气）
    const wander = mode === 'text' ? 0.018 : (mode === 'heart' || mode === 'shield' ? 0.02 : 0.022);

    // 右手旋转涡流参数（仅扩散模式使用）
    const haveR = state.right.present;
    const sw = haveR ? state.right.smoothAngVel * 1.1 : 0;  // 角速度 → 涡流强度
    const rx = state.right.x, ry = state.right.y;

    // 左手斥力参数：以手心为中心、按手的大小比例计算排斥半径
    const haveL = state.left.present;
    const lx = state.left.x, ly = state.left.y, lz = state.left.z;
    const LR = haveL ? state.left.scale * 4.2 : 0;

    // 心跳缩放：爱心模式下目标点随心跳放大/缩小
    const beatS = 1 + 0.13 * heartbeat(t);

    const { px, py, pz, vx, vy, vz, hx, hy, hz, wn, base, pha, textIdx, shieldIdx, heartPts, pos, col, geo, N } = S;

    // —— 2.5 能量爆散：对全部粒子施加径向向外的强速度冲击，并逐帧衰减 ——
    if (burstBoost > 0.001) {
      burstBoost *= Math.exp(-3.2 * dt);
      const bf = burstBoost * 7;
      for (let i = 0; i < N; i++) {
        const d = Math.hypot(px[i], py[i], pz[i]) + 1e-4; // 粒子到世界原点的距离（防除零）
        vx[i] += (px[i] / d) * bf;
        vy[i] += (py[i] / d) * bf;
        vz[i] += (pz[i] / d) * bf;
      }
    }

    // —— 3. 逐粒子更新 ——
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      // 3.1 根据模式计算该粒子的目标点 (tx, ty, tz)
      let tx, ty, tz;
      if (mode === 'text') {
        const p = textPts[textIdx[i]];
        tx = p[0] * txtScale; ty = p[1] * txtScale; tz = p[2] * txtScale;
      } else if (mode === 'heart') {
        tx = heartPts[i3] * HWS * beatS;
        ty = heartPts[i3 + 1] * HWS * beatS;
        tz = heartPts[i3 + 2] * HWS * beatS * 0.8;
      } else if (mode === 'shield' && shieldArr) {
        const p = shieldArr[shieldIdx[i]];
        tx = p[0]; ty = p[1]; tz = p[2];
      } else { // diffuse / burst 都收敛到“家”位置
        tx = hx[i]; ty = hy[i]; tz = hz[i];
      }

      // 3.2 向目标收敛（指数趋近）
      const k = mode === 'text' ? kT : (mode === 'heart' || mode === 'shield' ? kH : kD);
      px[i] += (tx - px[i]) * k;
      py[i] += (ty - py[i]) * k;
      pz[i] += (tz - pz[i]) * k;

      // 3.3 低频随机游走（呼吸感），z 方向幅度减半
      vx[i] += (Math.random() - 0.5) * wander * wn[i];
      vy[i] += (Math.random() - 0.5) * wander * wn[i];
      vz[i] += (Math.random() - 0.5) * wander * wn[i] * 0.6;

      // 3.4 扩散模式 + 右手旋转 → 切向涡流（速度垂直指向半径方向）
      if (mode === 'diffuse' && haveR && sw !== 0) {
        const dx = px[i] - rx, dy = py[i] - ry;
        const inv = 1 / (Math.sqrt(dx * dx + dy * dy) + 0.3);
        vx[i] -= dy * inv * sw;
        vy[i] += dx * inv * sw;
      }

      // 3.5 左手斥力：粒子进入排斥半径后，距离越近推力越大（f^2）
      if (haveL) {
        const dx = px[i] - lx, dy = py[i] - ly, dz = pz[i] - lz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < LR * LR) {
          const d = Math.sqrt(d2) + 1e-4;
          const f = 1 - d / LR;
          const push = f * f * 1.5;
          vx[i] += dx / d * push; vy[i] += dy / d * push; vz[i] += dz / d * push * 0.7;
        }
      }

      // 3.6 积分位置 + 速度阻尼
      px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
      vx[i] *= damp; vy[i] *= damp; vz[i] *= damp;

      // 3.7 写入缓冲：颜色 = 基础色 × 亮度闪烁；爆散时向白色偏移
      pos[i3] = px[i]; pos[i3 + 1] = py[i]; pos[i3 + 2] = pz[i];
      const sh = 0.9 + 0.1 * Math.sin(t * 2 + pha[i]);
      let cr = base[i3] * sh, cg = base[i3 + 1] * sh, cb = base[i3 + 2] * sh;
      if (burstBoost > 0.05) {
        const w = Math.min(1, burstBoost);
        cr += (1 - cr) * w;
        cg += (1 - cg) * w;
        cb += (1 - cb) * w;
      }
      col[i3] = cr; col[i3 + 1] = cg; col[i3 + 2] = cb;
    }
    // 通知 GPU 缓冲已更新
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  // 模式名与右手手势名的中文映射（用于顶部状态栏显示）
  const MODE_NAME = { text: '文字造型', heart: '爱心搏动', shield: '盾牌集结', burst: '能量爆散', diffuse: '粒子扩散' };
  const RIGHT_NAME = { open: '张开(扩散)', heart: '握拳(爱心)', shield: '1指(盾牌)', burst: '2指(爆散)' };

  // 刷新顶部状态栏：模式 + 左右手实时状态（便于现场调试）
  function updateStatus() {
    let s = '模式：' + MODE_NAME[mode];
    if (state.left.present) s += ' ｜ 左手：' + (state.left.gesture ? '手势' + state.left.gesture + '（' + TEXT_LIST[state.left.gesture] + '）' : '未识别');
    else s += ' ｜ 左手：未检测';
    if (state.right.present) s += ' ｜ 右手：' + (RIGHT_NAME[state.right.gesture] || '未识别');
    else s += ' ｜ 右手：未检测';
    statusEl.textContent = s;
  }

  // 启动渲染循环（requestAnimationFrame 由 renderer.setAnimationLoop 驱动）
  function startLoop() {
    if (loop || !renderer) return;
    clock = new THREE.Clock();
    loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);  // 限制最大步长，避免卡顿跳帧
      updateParticles(dt, clock.elapsedTime);
      updateStatus();
      renderer.render(S.scene, S.camera);
    };
    renderer.setAnimationLoop(loop);
  }

  // 停止渲染循环（离开互动栏目时调用，释放 GPU 资源）
  function stopLoop() {
    if (renderer && loop) {
      renderer.setAnimationLoop(null);
      loop = null;
    }
  }

  /* 一次性初始化（首次进入互动栏目时执行）：
   *   1. 动态加载 three.js
   *   2. 构建 Three.js 场景与粒子系统
   *   3. 生成盾牌采样点并绑定到粒子
   *   4. 加载 MediaPipe 并配置 Hands / Camera
   * inited 标志保证只初始化一次，重复进入直接复用。
   */
  async function init() {
    if (inited) return;
    inited = true;

    THREE = await loadThree();
    if (!THREE) {
      setErr('three.js 加载失败，请检查网络后刷新页面。');
      throw new Error('three.js load failed');
    }

    S = buildScene();
    shieldArr = makeShieldPoints();
    if (shieldArr) {
      for (let i = 0; i < S.N; i++) S.shieldIdx[i] = (Math.random() * shieldArr.length) | 0;
    }
    // 加载 MediaPipe，返回模型文件目录前缀；构造 Hands 时用它定位 wasm/tflite
    const locate = await initMediaPipe();
    hands = new Hands({ locateFile: (file) => locate + file });
    hands.setOptions({
      maxNumHands: 2,          // 同时识别两只手
      modelComplexity: 1,      // 1 = 完整模型（精度优先）
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    hands.onResults(onResults); // 每帧检测结果回调

    // Camera：把摄像头画面持续送入 Hands 进行识别
    cam = new Camera(video, {
      onFrame: async () => { await hands.send({ image: video }); },
      width: 1280,
      height: 720,
    });
  }

  /* 进入互动栏目：初始化 + 启动摄像头 + 开始渲染循环。
   * 二次调用（已 started）时只恢复渲染循环。
   * 摄像头被拒绝或初始化失败时，把错误显示到加载遮罩并允许重试。
   */
  async function start() {
    if (started) {
      startLoop();
      return;
    }
    started = true;
    if (loadingEl) loadingEl.classList.remove('is-hidden');
    if (statusEl) statusEl.textContent = '正在初始化…';

    try {
      await init();
      startLoop();
      cam.start().catch((e) => {
        setErr('摄像头开启失败：' + (e && e.message ? e.message : e) + '（请使用 localhost / HTTPS 打开，并允许摄像头权限）');
      });
      // 兜底：12 秒后无论如何隐藏加载遮罩（防止永久卡在加载中）
      setTimeout(() => { if (loadingEl) loadingEl.classList.add('is-hidden'); }, 12000);
    } catch (e) {
      // 失败则复位状态，允许下次进入时重新初始化
      started = false;
      inited = false;
      setErr(e.message || String(e));
    }
  }

  /* 离开互动栏目：停止渲染循环与摄像头（释放资源）。
   * 再次进入时 start() 会重新启动，无需重新初始化。
   */
  function stop() {
    if (!started) return;
    started = false;
    stopLoop();
    if (cam) {
      try { cam.stop(); } catch (e) { /* 忽略停止异常 */ }
    }
  }

  window.SecParticles = { start, stop };
})();
