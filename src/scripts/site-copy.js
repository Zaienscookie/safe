/* =========================================================================
 * 全站文案配置（site-copy.js）
 * -------------------------------------------------------------------------
 * 作用：集中管理页面所有可替换文字，避免逐个改 HTML。
 * 入口：页面加载时由 enter.js 的 applyCopyUpdates() 读取并注入到各屏幕。
 *
 * 修改指引：想改哪块文字，直接改下面对应字段即可，无需动 index.html。
 *   品牌/标题     → brandTitle、enter、homepage
 *   授权过场      → auth
 *   首页简介      → homepage.lines（注意：要与 index.html 里
 *                  .homepage-copy__line 的数量一一对应）
 *   关于页        → headquarters
 *   纳新轮播文案  → memberDescriptions（共 6 条，对应 6 张卡片）
 *   方向面板      → department（前 5 条为方向，后 5 条为入口，入口用 linkKey
 *                  指向 enter.js siteConfig.links 里的键）
 *   活动计划      → research.items（3 项，对应 R-1/R-2/R-3 切换）
 *   联系方式弹窗  → contactModal
 * ========================================================================= */
window.siteCopy = {
  /* 全站品牌名（替换所有屏幕左上角的品牌标记） */
  brandTitle: "网络安全社",

  /* —— 进入页（欢迎页）—— */
  enter: {
    title: "网络安全社",
    copy: "欢迎来到网络安全社纳新入口。研究 Web 安全、二进制逆向与 CTF，一起打靶场、写工具、做实验。",
    hint: "RECRUITMENT OPEN · 2026",
  },

  /* —— 授权过场 —— */
  auth: {
    subcopy: "主节点校验完成，网络安全社纳新通道已就绪，欢迎加入我们。",
  },

  /* —— 首页 —— */
  homepage: {
    titleHtml: '网络安全社<span class="homepage-copy__accent">.SEC.</span>', // 支持内嵌标签
    lines: [
      "我们是学院的网络安全社团，聚集一群对计算机技术充满好奇的人。",
      "研究范围覆盖 Web 安全、二进制逆向、密码学与 CTF 竞赛。",
      "定期组织训练、靶场实战与安全分享会。",
      "无论基础如何，只要有兴趣，都欢迎加入我们。",
      "在这里我们会给你提供优质的比赛资源。"
    ],
  },

  /* —— 关于页 —— */
  headquarters: {
    summaryHtml: "网络安全社是一个面向学院全体同学的安全技术社团。<br />我们通过训练、竞赛与实践，把安全知识变成真正可上手的能力。",
    statusHtml: '纳新通道 <span class="headquarters-copy__status-online">OPEN</span>',
  },

  /* —— 纳新栏目：6 张轮播卡片的简介 —— */
  memberDescriptions: [
    "学习常见漏洞原理与利用，运用靶场实战，独立完成渗透测试。",
    "分析可执行程序与协议，学习反汇编、脱壳与漏洞挖掘基础。",
    "组队参加校内外各种计算机比赛，在解题中训练实战与团队协作能力。",
    "研究古典与现代密码、加解密原理，从数学到工程的完整链路。",
    "负责社团服务器与实验环境，学习网络基础、Linux 与系统运维。",
    "负责纳新宣传、活动策划与图文设计，让更多人了解网络安全。",
  ],

  /* —— 方向栏目：10 张交互卡片 ——
   * 前 5 条：左侧“方向”卡片（仅信息展示）
   * 后 5 条：右侧“入口”卡片（带 linkKey，指向 enter.js siteConfig.links）
   */
  department: [
    /* —— WEB 安全方向 —— */
    {
      key: "web",                          // 对应详情页 direction.html?d=web
      linkKey: "web",                      // 点击卡片跳转 direction.html?d=web
      title: "WEB 安全",
      subtitle: "PENTEST / VULN ANALYSIS",
      copy: "从前端到后端、从注入到提权，带你打穿 Web 的每一层防线。",
      slogan: "浏览器的边界，就是我们的战场。见微知著，在繁杂的 HTTP 请求中寻找致命的逻辑裂缝。",
      roadmap: [
        "基础筑基：HTML / JS / PHP / Python 基础，HTTP 协议深度解析。",
        "工具武装：Burp Suite 抓包改包，SQLMap 自动化注入。",
        "漏洞实战：OWASP Top 10 漏洞原理与利用（SQLi, XSS, RCE, SSRF 等）。",
        "进阶内功：主流 CMS / Java / PHP 代码审计，WAF 绕过技巧。",
        "武器研发：编写专属 Python 自动化扫描脚本，打造 RCE 利用链。",
      ],
      tags: ["SQL注入", "XSS跨站", "代码审计", "WAF绕过", "逻辑漏洞", "反序列化", "SSRF", "API安全"],
      quote: "不需要你一开始就懂代码，只需要你有探究网页背后秘密的好奇心。从前端到后端，从注入到提权，我们带你打穿 Web 的每一层防线。",
    },
    /* —— 逆向 · 二进制方向 —— */
    {
      key: "rev",
      linkKey: "rev",
      title: "逆向 · 二进制",
      subtitle: "REVERSE ENGINEERING",
      copy: "在没有源代码的迷宫中，用反汇编与调试还原程序真相。",
      slogan: "拆解代码的迷宫，还原最初的真相。洞悉程序深处的运行逻辑，在没有源代码的迷宫中寻找出口。",
      roadmap: [
        "语言基础：C / C++、汇编语言，熟悉 Windows / Linux 系统底层。",
        "静态分析：熟练掌握 IDA Pro、Ghidra，识别编译器特征，还原函数结构。",
        "动态调试：熟练使用 x64dbg、GDB，追踪内存与寄存器状态。",
        "对抗技术：脱壳（UPX, VMP）、反混淆、反调试绕过。",
        "实战进阶：病毒 / 木马样本行为分析，Android（Smali / Frida）逆向破解。",
      ],
      tags: ["IDA Pro", "动态调试", "脱壳", "反混淆", "恶意分析", "Frida", "ELF/PE", "算法还原"],
      quote: "逆向是安全领域的“法医”。如果你喜欢解谜，享受从晦涩难懂的汇编指令中还原出核心算法、将恶意代码剥丝抽茧的成就感，欢迎加入 REV 组。",
    },
    /* —— 漏洞利用 · 渗透方向（PWN）—— */
    {
      key: "pwn",
      linkKey: "pwn",
      title: "漏洞利用 · 渗透",
      subtitle: "PWN / EXPLOITATION",
      copy: "在 0 和 1 的缝隙中，构建通往系统最高权限的桥梁。",
      slogan: "没有绝对安全的程序，只有不够精准的溢出。在 0 和 1 的底层缝隙中，构建通往系统最高权限的桥梁。",
      roadmap: [
        "底层语言：C 语言、x86 / x64 汇编、Linux 系统调用。",
        "机制理解：ELF / PE 文件结构，栈帧布局，堆管理机制（glibc malloc）。",
        "入门漏洞：栈溢出、Ret2text、Ret2shellcode、格式化字符串。",
        "高级利用：ROP（返回导向编程）、堆漏洞（UAF, Double Free, Tcache Poisoning）。",
        "终极挑战：内核态漏洞利用，浏览器沙箱逃逸，真实环境提权。",
      ],
      tags: ["栈溢出", "堆利用", "ROP", "Shellcode", "GDB", "pwntools", "内核提权", "沙箱逃逸"],
      quote: "如果你对底层机制充满好奇，渴望体验一发 Payload 直接 Get Shell 的极致快感，PWN 方向将是你挑战系统极限的最佳舞台。准备好迎接硬核的二进制挑战了吗？",
    },
    /* —— 密码学方向（CRY）—— */
    {
      key: "cry",
      linkKey: "cry",
      title: "密码学",
      subtitle: "CRYPTOGRAPHY",
      copy: "用数学的利刃斩断坚不可摧的密文，在无序中寻找必然的规律。",
      slogan: "以数学为刃，破译隐匿的机密。用数学的利刃斩断坚不可摧的密文，在无序中寻找必然的规律。",
      roadmap: [
        "数学基础：初等数论、线性代数、概率论。",
        "古典密码：凯撒、维吉尼亚、栅栏密码及其变种（CTF 签到题）。",
        "现代密码：AES（对称）、RSA / ECC（非对称）、哈希算法。",
        "攻击手法：低加密指数攻击、共模攻击、长度扩展攻击、哈希碰撞。",
        "高阶前沿：格密码（Lattice）基础、侧信道攻击、随机数预测、SageMath 实战。",
      ],
      tags: ["RSA", "AES", "数论", "格密码", "SageMath", "哈希碰撞", "流密码", "侧信道"],
      quote: "数学是安全的基石，也是破解密码的钥匙。不要被复杂的公式吓倒，在这里，你将学会用 Python 和 SageMath，解开一个个看似无解的数学谜题，直击加密核心。",
    },
    /* —— 运维 · 网络方向（OPS）—— */
    {
      key: "ops",
      linkKey: "ops",
      title: "运维 · 网络",
      subtitle: "INFRA & NETWORK",
      copy: "运筹帷幄于内网，决胜千里于攻防，做网络空间的守夜人。",
      slogan: "静谧的网络深处，有我们守着最后一道防线。运筹帷幄于内网，决胜千里于攻防，做网络空间的守夜人。",
      roadmap: [
        "网络基础：TCP / IP 协议栈、路由交换、Linux / Windows 系统管理。",
        "流量分析：Wireshark / Tcpdump 抓包，恶意流量特征识别，日志审计。",
        "内网渗透：信息收集、隧道代理、横向移动、权限维持。",
        "域渗透：Kerberos 协议攻击、域控提权、黄金 / 白银票据。",
        "红蓝对抗：免杀技术、应急响应、入侵溯源、基础设施加固。",
      ],
      tags: ["内网渗透", "流量分析", "域渗透", "应急响应", "免杀", "红蓝对抗", "隧道代理", "溯源"],
      quote: "攻防博弈，不仅在于突破，更在于潜伏与守护。如果你渴望在真实的 AWD 对抗中运筹帷幄，或者想成为能在海量日志中揪出黑客踪迹的“网络侦探”，OPS 是你的绝佳选择。",
    },
    {
      mode: "CATEGORY ENTRY",              // 入口型卡片标记
      title: "CTF 靶场",
      subtitle: "TRAIN & PRACTICE",
      copy: "进入 OJ 靶场，在线刷题练习，在解题与实践中持续成长。",
      linkKey: "ctf",                      // 指向 siteConfig.links.ctf
    },
    {
      mode: "CATEGORY ENTRY",
      title: "靶场 · 实验",
      subtitle: "EXPERIMENT LAB",
      copy: "搭建与使用漏洞靶场，在受控环境中反复练习攻防技巧。",
      linkKey: "range",           // 点击先探测内网靶场，可达则进入，否则提示页
    },
    {
      mode: "CATEGORY ENTRY",
      title: "荣誉 · 殿堂",
      subtitle: "GLORY & ACHIEVEMENTS",
      copy: "记录社团光辉历程，展示各项网络安全赛事、攻防演练的获奖成果与荣誉证书。",
      linkKey: "honor",            // 点击打开荣誉殿堂页 honors.html
    },
    {
      mode: "CATEGORY ENTRY",
      title: "学习 · 训练",
      subtitle: "TRAINING TRACK",
      copy: "每周训练与分享会安排，覆盖从入门到进阶的完整学习路线。",
      linkKey: "training",       // 点击打开学习训练页 training.html
    },
    {
      mode: "CATEGORY ENTRY",
      title: "报名 · 加入",
      subtitle: "RECRUITMENT ENTRY",
      copy: "扫描纳新群二维码，加入网络安全社，和我们一起开始。",
      linkKey: "join",            // 点击打开加入页 join.html
    },
  ],

  /* —— 活动栏目 —— */
  research: {
    panelTitle: "纳新计划",
    progressLabel: "计划进度",
    // 招新标语（quote）：用 \n 在“星海长路”处分为两段显示
    quote: "在0和1的旷野里，所有伟大的架构都始于一次勇敢的编译。\n星海长路，代码为证，我们愿陪你敲下第一行命令，共赴属于你的极客诗篇。",
    items: [
      {
        status: "R-1 / PRIMARY FOCUS",
        title: "纳新宣讲会",
        subtitle: "RECRUITMENT TALK",
        copy: "面向全校同学举办纳新宣讲，介绍社团方向、训练体系与加入方式。",
        linkKey: "article4",
      },
      {
        status: "R-2 / BASICS BOOTCAMP",
        title: "安全基础训练营",
        subtitle: "LINUX / NETWORK / WEB",
        copy: "从基础概念到实践操作，帮助大家循序渐进地提升能力。",
        linkKey: "article3",
      },
      {
        status: "R-3 / CTF TRAINING",
        title: "计算机竞赛实训",
        subtitle: "WEB / REV / PWN / CRYPTO",
        copy: "围绕各类赛题练习，积累实战经验，备战信息安全赛事。",
        linkKey: "article5",
      },
    ],
  },

  /* —— 首页快捷入口弹窗标题 —— */
  contactModal: {
    emailTitle: "CONTACT CHANNEL",
    qqTitle: "纳新 微信 群",
  },
};
