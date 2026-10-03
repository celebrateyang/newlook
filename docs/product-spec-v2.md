# newself AI 发型顾问 — 产品与技术设计说明书

版本：V2.0  
正式品牌名：newself
正式域名：newself.cc
产品定位：AI 发型顾问 + 发型试戴 + 现实可实现性分析 + 理发师执行指南  
产品形态：Web First  
目标市场：全球市场，优先英语用户，同时支持中文及多语言

## 2026-10-03 入驻地点标准化补充

入驻门店所在地使用中国大陆省／市／区县（无区县城市支持镇街）三级联动选择，不再自由填写城市和区域。前后端校验完整地区归属；保存国家、标准地区代码、地区名称及数据版本，街道、门牌、楼层／商铺地址单独填写。直辖市与省直辖县级单位需支持。所在地表示实际门店位置，不代表任意服务半径。资料继续保持私有，仅用于当前入驻招募。

首期使用版本固定的地区数据；新增或更名地区通过数据更新维护。入驻支持可选的浏览器手机定位及 Leaflet／OpenStreetMap 免费地图选点，无需地图 Key。地图按需打开，用户确认门店入口后，随私有申请保存 WGS84 经纬度、选点来源、适用时的设备定位精度和服务端确认时间。手动调整标记后不能继续沿用手机定位精度。修改门店地区或街道地址须重新确认位置。定位或地图不可用时允许先提交地址，之后补充或删除坐标。用户确认不等同于运营核验。

无门店坐标时，打开地图先显示已选区县／镇街附近；采用本地 CC0 地区代表点，缺少坐标时逐级回退到城市、省份、全国视野。有已确认或设备定位坐标时优先显示该点。地区代表点仅用于初始视野，不生成门店标记或保存坐标；街道门牌号不参与查询。

地图只请求当前视野所需瓦片并保留来源署名；不调用地址搜索、自动补全、逆地理编码或付费地图 API，不承诺公共地图服务器无限量或稳定可用。设备位置仅在点击按钮并允许浏览器权限后请求，地图第三方连接在表单和隐私政策中说明。后续顾客匹配可按地区代码筛选，或在统一坐标系后按真实距离筛选；当前不实现匹配或预约。

## 2026-10-02 国内理发师入驻首期

优先面向中国大陆招募理发师，导航栏增加“理发师入驻”，桌面和移动端、登录前后均可访问。页面向用户说明：AI 试戴表达发型目标，理发师结合真实头发条件确认方案并帮助实际执行；不承诺效果图一比一实现。

首期只收集私有入驻申请。申请人登录后提交职业称呼、大陆手机号、服务城市和区域、门店及地址、从业年限、擅长项目，以及可选微信号、作品链接和个人介绍。明确取得招募联系同意；申请人可查看、更新及撤回资料，撤回删除申请记录。提交状态为“已收到”，不等于审核通过，不自动创建公开主页。运营人员通过私有后台表查看申请，暂不实现审核工作台、公开理发师列表、匹配、预约、接单和收费。支付继续延后。

## 2026-10-01 双前端规划补充

后续增加面向国内用户的微信小程序，名称定为“NewSelf发型设计”；Web 主要面向海外用户。两端计划共用同一个 Convex 数据库和核心业务函数，小程序通过 HTTP API 接入，正式域名、鉴权、国内网络及数据处理条件待验证。

第一阶段微信与 Web 用户视为两个独立用户，不绑定、不自动合并。积分和会员可共用业务系统，但个人余额、会员、订单、照片与结果各自独立；收费方案及支付实现继续延后。

完整决定、候选场景、企业账号申请、备案和开发发布依据见[双前端与微信小程序规划](wechat-miniprogram-plan.md)。本文后续的 Clerk 登录、浏览器上传和实时订阅描述适用于原 Web 方案；小程序接入按补充规划评估。原价格与支付阶段为早期设想，不构成当前收费决定。

---

## 2026-10-02 Web 每日额度与分享补充

在积分、会员上线前，Web 每个登录账号每天最多发起 6 次发型生成，推荐试戴、参考图迁移与侧面生成共用额度，按北京时间零点重置。失败请求计次，未进入生成流程的校验失败不计次。后端在 AI 调用前以 Convex 事务预留额度。

用户可主动为单张已保存的生成效果图开启公开分享链接，通过微信复制链接、Facebook / X 分享入口或浏览器系统分享功能邀请朋友评分。公开页支持 1–5 分，每个登录账号保留一份可修改的评分，显示平均分、评分人数和体验 newself 的入口。查看无需登录，评分需要登录，作者不能给自己评分。

分享默认关闭，只公开选中的效果图，不公开原图、参考图和账户资料。作者可关闭分享，再次开启使用新链接，旧链接保持失效。外部缓存和已保存副本无法撤回。本补充覆盖旧版“第一阶段不做社交系统”的限制，仅增加 Web 分享和评分，不引入社区或 Feed；微信小程序及支付继续延后。

---

# 1. 产品定位

newself 不是普通的“AI 换发型”工具。

普通产品流程：

上传照片 → 选择发型 → AI 生成图片

newself 的核心目标：

帮助用户找到真正适合自己的发型，并确保推荐的发型在现实中能够被理发师实现。

完整价值链：

用户上传照片  
→ 分析脸型与当前头发条件  
→ AI 推荐适合的发型  
→ 用户试戴不同发型  
→ 比较效果  
→ 判断现实可实现度  
→ 给出剪发 / 烫发 / 染发 / 打理要求  
→ 生成可直接给理发师看的 Hairstylist Guide

核心英文定位：

> Find the hairstyle that actually suits you.

核心副标题：

> See it before you cut it.

中文定位：

> 找到真正适合你的发型，剪之前先看效果。

---

# 2. 与 Gemini / ChatGPT 直接生成发型的差异

newself 不能只是大模型 Wrapper。

必须提供完整工作流：

1. 自动分析脸型
2. 自动分析当前头发长度、发量、发质、发际线
3. 自动推荐适合的发型
4. 自动控制 AI 只修改头发
5. 尽量保持脸完全不变
6. 自动生成多个候选结果
7. 自动检查人脸一致性
8. 提供不同发型可视化比较
9. 判断现实中是否能剪出来
10. 判断是否需要烫发、染发、留长、打薄
11. 判断日常打理成本
12. 输出理发师可直接执行的技术说明
13. 支持上传参考发型照片
14. 后台支持多 AI 模型路由

产品本质：

AI Hairstyle Advisor

而不是：

AI Hairstyle Generator

---

# 3. 技术架构

## 3.1 主技术栈

Framework:
- Next.js App Router
- TypeScript

UI:
- Tailwind CSS
- shadcn/ui

Frontend Hosting:
- Vercel

Authentication:
- Clerk

Backend + Database:
- Convex

File Storage:
- Cloudflare R2

DNS:
- Cloudflare

AI Providers:
- Gemini Image
- FLUX Kontext
- GPT Image

Analytics:
- PostHog

Monitoring:
- Sentry

Payment:
- Polar / Lemon Squeezy / Stripe
- 后续根据审核与费率确定

---

# 4. 系统架构

```text
Browser
   |
   v
Next.js (Vercel)
   |
   +------ Clerk
   |
   +------ Convex
   |          |
   |          +------ users
   |          +------ profiles
   |          +------ hairstyles
   |          +------ analyses
   |          +------ recommendations
   |          +------ generations
   |          +------ credits
   |          +------ orders
   |          +------ stylistGuides
   |
   +------ AI Providers
   |          |
   |          +------ Gemini
   |          +------ FLUX Kontext
   |          +------ GPT Image
   |
   +------ Cloudflare R2
              |
              +------ uploads
              +------ references
              +------ generations
              +------ hairstyle assets
```

---

# 5. 图片上传架构

不要让大图片经过 Vercel Server。

正确流程：

1. Browser 请求上传授权
2. Server 生成 R2 presigned URL
3. Browser 直接上传图片到 R2
4. 上传完成后通知 Convex
5. Convex 保存文件 metadata

流程：

```text
Browser
   |
   | get presigned URL
   v
Next.js / secure endpoint
   |
   v
R2 signed URL

Browser
   |
   | direct upload
   v
Cloudflare R2

Browser
   |
   | save metadata
   v
Convex
```

---

# 6. R2 文件结构

```text
newlook/

uploads/
  user_{userId}/
    original_{uuid}.jpg

references/
  user_{userId}/
    reference_{uuid}.jpg

generations/
  user_{userId}/
    gen_{generationId}_1.webp
    gen_{generationId}_2.webp
    gen_{generationId}_3.webp
    gen_{generationId}_4.webp

hairstyles/
  french-bob/
  wolf-cut/
  butterfly-cut/
```

Bucket 默认 private。

前端访问使用：
- signed URL
或
- 受控 CDN URL

---

# 7. 用户目标

核心用户：

- 准备剪头发但不知道什么发型适合自己
- 怕剪坏
- 想换短发 / 刘海 / 卷发 / 发色
- 在 Instagram / TikTok / Pinterest / 小红书看到喜欢发型
- 想提前给理发师看效果
- 不确定现实中能否实现某个发型

---

# 8. 用户主流程

```text
Home
↓
Upload Selfie
↓
AI Analysis
↓
Face + Hair Profile
↓
Recommended Hairstyles
↓
Try Hairstyle
↓
Generate 4 Results
↓
Choose Best Result
↓
Reality Feasibility
↓
Compare / Save
↓
Show to Stylist
↓
Salon Guide
```

---

# 9. 首页

路径：

/

Hero：

Title:

Find the hairstyle that actually suits you.

Subtitle:

Upload a selfie, discover hairstyles that fit your face and hair, try them on, and get a salon-ready guide.

CTA:

Find My Hairstyle

Secondary CTA:

Try a Hairstyle

---

# 10. 上传页面

路径：

/upload

MVP 只要求一张正面自拍。

提示：

- 正脸
- 自然光
- 不戴帽子
- 不遮挡脸
- 头发清晰可见
- 不使用严重美颜照片

后续可支持：

- 正面
- 左 45°
- 右 45°
- 侧面
- 后脑

---

# 11. Face Analysis

分析字段：

```ts
type FaceAnalysis = {
  faceShape:
    | "oval"
    | "round"
    | "square"
    | "heart"
    | "diamond"
    | "oblong"
    | "triangle";

  confidence: number;

  foreheadHeight: "low" | "medium" | "high";
  foreheadWidth: "narrow" | "medium" | "wide";
  cheekboneWidth: "narrow" | "medium" | "wide";
  jawWidth: "narrow" | "medium" | "wide";
  jawSharpness: "soft" | "medium" | "sharp";
  chinShape: "round" | "pointed" | "square";
  faceLength: "short" | "medium" | "long";
};
```

---

# 12. Hair Analysis

这是核心竞争优势。

```ts
type HairAnalysis = {
  hairLength:
    | "buzz"
    | "very_short"
    | "short"
    | "chin"
    | "shoulder"
    | "collarbone"
    | "chest"
    | "long";

  hairDensity: "low" | "medium" | "high";

  texture:
    | "straight"
    | "slightly_wavy"
    | "wavy"
    | "curly"
    | "coily";

  thickness: "fine" | "medium" | "coarse";

  hairline:
    | "low"
    | "normal"
    | "high"
    | "m_shaped"
    | "receding";

  crownVolume: "flat" | "medium" | "full";
};
```

---

# 13. Hairstyle Recommendation Engine

推荐必须综合：

- Face Shape
- Hair Length
- Hair Density
- Hair Texture
- Hair Thickness
- Hairline
- Crown Volume
- Maintenance Preference
- Gender / Style Preference

输出：

Top 5–10 recommendations

每个 recommendation：

```ts
type HairstyleRecommendation = {
  hairstyleId: string;
  matchReason: string;
  maintenanceLevel: "low" | "medium" | "high";
  feasibility: "high" | "medium" | "low";
  requiresPerm: boolean;
  requiresColor: boolean;
};
```

---

# 14. Hairstyle 数据结构

```ts
type Hairstyle = {
  slug: string;
  nameEn: string;
  nameZh: string;

  gender: "female" | "male" | "unisex";

  category: string;

  length: string;
  texture: string[];

  bangType?: string;
  layerType?: string;
  volume?: string;

  maintenanceLevel: "low" | "medium" | "high";

  requiresPerm: boolean;
  requiresColor: boolean;

  minHairLength: string;

  recommendedFaceShapes: string[];
  notRecommendedFaceShapes: string[];

  recommendedDensity: string[];
  recommendedTexture: string[];

  referenceImages: string[];

  promptTemplate: string;
};
```

---

# 15. 初始发型库

女性：

- Bob
- French Bob
- Italian Bob
- Blunt Bob
- Layered Bob
- Long Bob
- Pixie
- Bixie
- Wolf Cut
- Butterfly Cut
- Shag
- Hime Cut
- Curtain Bangs
- Air Bangs
- Wispy Bangs
- Long Straight
- Long Layered
- Beach Waves
- Loose Curls
- Korean Layered Hair
- Shoulder Length Layers
- French Layers
- Soft Mullet
- Collarbone Cut

男性：

- Buzz Cut
- Crew Cut
- French Crop
- Textured Crop
- Curtains
- Two Block
- Undercut
- Side Part
- Middle Part
- Wolf Cut
- Short Quiff
- Messy Fringe

亚洲发型：

- 八字刘海
- 空气刘海
- 公主切
- 锁骨发
- 羊毛卷
- 木马卷
- 挂耳短发
- 日系短发
- 韩系层次

---

# 16. Try On 模块

用户选择某个发型：

输入：

- 原始自拍
- hairstyle prompt
- identity preservation prompt

核心原则：

Change only the hairstyle.

Preserve exactly:

- identity
- facial structure
- eyes
- nose
- lips
- skin
- expression
- body
- clothes
- background

禁止：

- face beautification
- face reshaping
- skin retouching
- age change
- makeup change

一次默认生成：

4 个候选结果

前端展示：

2 × 2 grid

---

# 17. AI Provider 抽象层

不能把代码锁死在 Gemini。

```ts
interface ImageEditProvider {
  generate(params: ImageEditParams): Promise<ImageResult[]>;
}
```

实现：

- GeminiProvider
- FluxProvider
- OpenAIProvider

Provider selector：

```ts
function selectProvider(task: GenerationTask) {
  // future routing logic
}
```

未来可以根据：

- hairstyle 类型
- 成本
- 延迟
- 失败率
- identity score
- 用户套餐

动态路由。

---

# 18. AI 调用位置

不要在 Browser 直接调用 AI API。

正确：

```text
Browser
↓
Convex action / secure server function
↓
AI Provider
↓
Result
↓
R2
↓
Convex
```

API Key 必须保存在 server environment。

---

# 19. Convex Job 状态

Generation 状态：

```text
queued
processing
completed
failed
```

流程：

```text
User clicks Generate
↓
Convex mutation creates generation
status = queued
↓
schedule Convex action
↓
status = processing
↓
call AI
↓
upload outputs to R2
↓
save generationResults
↓
status = completed
```

前端使用 Convex realtime query 自动更新。

不需要 polling。

---

# 20. Identity Consistency

V1.1 增加。

流程：

```text
Original
↓
Face Embedding

Generated
↓
Face Embedding

Similarity
↓
threshold check
```

如果低于 threshold：

自动重新生成。

字段：

```ts
faceSimilarity?: number
identityPassed?: boolean
```

---

# 21. Reference Hairstyle Transfer

用户上传：

A：本人照片

B：参考发型照片

系统迁移：

- hairstyle silhouette
- length
- bangs
- layering
- volume
- texture

默认不迁移：

- face
- makeup
- clothes
- skin
- background

Hair Color：

默认 OFF

用户可以选择：

Copy Hair Color

---

# 22. Reality Feasibility

这是 newself 最关键的差异化。

每个生成结果必须分析：

目标发型与用户当前头发之间的现实差距。

输出：

- High
- Medium
- Low

同时必须解释原因。

例如：

High

Your current hair length and density are already suitable for this hairstyle.

Medium

You may need approximately 6–8 weeks of growth before achieving this exact shape.

Low

Your current hair density and length make this exact result difficult without extensions or significant styling.

---

# 23. Reality Check 字段

```ts
type FeasibilityResult = {
  level: "high" | "medium" | "low";

  reason: string;

  currentLengthSuitable: boolean;

  estimatedGrowthWeeks?: number;

  requiresPerm: boolean;

  requiresColor: boolean;

  requiresExtensions: boolean;

  thinningRecommended: boolean;

  dailyStylingMinutes: number;

  maintenanceWeeks: number;

  notes: string[];
};
```

---

# 24. Salon Feasibility 展示

```text
Real-world feasibility: HIGH

Why:
Your current hair length is sufficient.
Your density can support this cut.
Your natural texture is compatible.

Salon requirements:
Cut: Yes
Perm: Optional
Color: No
Daily styling: 5–10 min
Maintenance: Every 6–8 weeks
```

---

# 25. Hairstylist Guide

按钮：

Show to Stylist

路径：

/guide/[id]

内容：

- 目标发型名称
- AI 效果图
- 正面图
- 可选 45°
- 可选侧面

Cut Instructions：

- Length
- Front
- Bangs
- Crown
- Back
- Thinning
- Styling
- Perm
- Color

例：

```text
Length:
2 cm below jawline

Front:
Face-framing layers starting at cheekbone

Bangs:
Long curtain bangs

Crown:
Light layering for volume

Back:
Soft U-shaped perimeter

Thinning:
Avoid excessive thinning

Styling:
Blow dry crown upward for volume

Perm:
Optional light texture perm
```

---

# 26. Hairdresser Mode

理发师页面只显示：

- 图片
- 技术说明
- 必要备注

不要显示：

- 价格
- credits
- 广告
- 营销内容

按钮：

- Full Screen
- Save Image
- Download PDF
- Copy Instructions

---

# 27. Compare 功能

最多比较 4 个发型。

页面：

```text
Original | Style A | Style B | Style C
```

支持：

Before / After slider

用户可以查看：

- 哪个更显脸小
- 哪个最容易打理
- 哪个最符合当前发质
- 哪个需要最少 salon work

---

# 28. Convex Schema

建议 tables：

```text
users
userProfiles
uploads
faceAnalyses
hairAnalyses
hairstyles
recommendations
generations
generationResults
favorites
referenceImages
stylistGuides
creditTransactions
orders
promptTemplates
modelUsage
```

---

# 29. generations

建议字段：

```ts
{
  userId: Id<"users">,
  uploadId: Id<"uploads">,
  hairstyleId: Id<"hairstyles">,

  provider: string,
  model: string,

  promptVersion: string,

  status:
    | "queued"
    | "processing"
    | "completed"
    | "failed",

  creditsUsed: number,

  generationTimeMs?: number,

  createdAt: number
}
```

---

# 30. generationResults

```ts
{
  generationId: Id<"generations">,

  r2Key: string,

  faceSimilarity?: number,

  identityPassed?: boolean,

  selected: boolean,

  createdAt: number
}
```

---

# 31. uploads

```ts
{
  userId: Id<"users">,

  type:
    | "original"
    | "reference",

  r2Key: string,

  mimeType: string,

  size: number,

  width?: number,
  height?: number,

  createdAt: number
}
```

---

# 32. Prompt Management

Prompt 不要写死。

Convex table：

promptTemplates

字段：

```ts
{
  taskType: string,
  provider: string,
  version: string,

  systemPrompt: string,
  userPromptTemplate: string,

  active: boolean,

  createdAt: number
}
```

taskType：

- hair_try_on
- reference_transfer
- face_analysis
- hair_analysis
- feasibility_analysis
- stylist_guide

---

# 33. Clerk 集成

Clerk 负责：

- Sign up
- Login
- OAuth
- Session
- Password reset

Convex 通过 Clerk identity 获取用户。

禁止自己存密码。

---

# 34. Credits

推荐第一版：

Free:

1 hairstyle

Standard:

$0.99
5 images

Popular:

$2.99
20 images

Salon Pack:

$4.99

包含：

- 完整推荐分析
- 10 hairstyle renders
- reality check
- stylist guide
- multi-view

价格后续 A/B Test。

---

# 35. 免费策略

新用户必须能免费体验一次。

免费：

- 上传
- 基础分析
- 1 个发型
- 1–2 张结果

收费：

- 更多发型
- Reference Hairstyle
- 高清
- 多角度
- 完整推荐
- Stylist Guide
- Salon Pack

---

# 36. 图片隐私

用户上传人脸图片。

必须提供：

- Privacy Policy
- 删除机制
- retention policy
- AI provider disclosure

建议：

游客：

24–72 小时自动删除原始图

普通登录用户：

默认 7 天

Favorite：

用户主动保存则长期保留

生成失败图片：

立即删除或短期清理

R2 bucket：

private

---

# 37. SEO

核心 Landing Pages：

```text
/ai-hairstyle-try-on
/ai-hairstyle-advisor

/hairstyle-for-round-face
/hairstyle-for-oval-face
/hairstyle-for-square-face
/hairstyle-for-heart-face

/wolf-cut
/bob-haircut
/french-bob
/pixie-cut
/curtain-bangs
/korean-hairstyle

/short-hairstyles-for-women
/hairstyles-for-men
/hairstyles-for-thin-hair
/hairstyles-for-women-over-40
```

每页：

- Intro
- Who it suits
- Who it may not suit
- Example
- Try-on CTA
- FAQ

---

# 38. GEO / 大模型发现

固定产品描述：

> newself is an AI hairstyle advisor that helps people discover hairstyles that suit their face and hair, virtually try them on, and create salon-ready haircut instructions.

不要频繁改变品牌定位描述。

Schema：

- Organization
- SoftwareApplication
- FAQPage
- HowTo

必须有：

- About
- Pricing
- Privacy
- Terms
- Contact
- Blog

---

# 39. 多语言

第一阶段：

- English
- Chinese

后续：

- Japanese
- Korean
- Thai
- Spanish
- French
- German

URL：

```text
/en/
/zh/
/ja/
/ko/
```

---

# 40. Analytics

使用 PostHog。

核心 events：

```text
landing_view
upload_started
upload_completed
analysis_completed
recommendation_viewed
hairstyle_selected
generation_started
generation_completed
generation_failed
result_selected
reference_uploaded
feasibility_viewed
stylist_guide_opened
payment_started
payment_completed
favorite_saved
```

---

# 41. 核心 KPI

1. Upload Conversion
2. Generation Success Rate
3. Identity Pass Rate
4. Try → Purchase Conversion
5. Average Generations per User
6. Stylist Guide Open Rate
7. Favorite Rate
8. Reference Upload Rate
9. Generation Cost per Paid User
10. Gross Margin

---

# 42. MVP 必做

V1：

1. 首页
2. Clerk 登录
3. 上传一张自拍
4. R2 存储
5. AI 基础脸型分析
6. AI 基础头发分析
7. 30 个发型
8. 推荐 5 个
9. 发型 Try-on
10. 一次生成多个结果
11. Reference Hairstyle
12. Reality Feasibility
13. Stylist Guide
14. Credits
15. Payment
16. Save result
17. SEO pages

---

# 43. 第一阶段不要做

不要做：

- 实时摄像头 AR
- 3D 模型
- 实时发型 tracking
- 原生 App
- 社区
- Feed
- 社交系统
- 自己训练基础模型
- GPU 自部署
- 复杂会员等级

---

# 44. V1.1

增加：

- Face similarity
- Automatic retry
- Multi-model routing
- Before/After slider
- Compare 4 hairstyles
- Multi-angle generation

---

# 45. V2

可以扩展：

- Hair color
- Hairline analysis
- Thin hair analysis
- Hair volume simulator
- Beard
- Eyebrows
- Glasses
- Makeup
- Salon API
- White-label salon widget

---

# 46. 推荐项目目录

```text
src/
  app/
    (marketing)/
      page.tsx
      pricing/
      about/
      blog/

    (app)/
      dashboard/
      upload/
      analysis/
      recommendations/
      generation/
      compare/
      saved/
      guide/[id]/

    api/
      r2/
        upload-url/
      webhook/
        payment/

  components/
    upload/
    hairstyle/
    analysis/
    generation/
    compare/
    guide/
    ui/

  lib/
    ai/
      providers/
        gemini.ts
        flux.ts
        openai.ts
      prompts/
      router.ts

    r2/
      client.ts
      presign.ts

    clerk/
    payments/
    analytics/

convex/
  schema.ts
  users.ts
  uploads.ts
  analyses.ts
  hairstyles.ts
  recommendations.ts
  generations.ts
  generationActions.ts
  credits.ts
  orders.ts
  stylistGuides.ts
  promptTemplates.ts
```

---

# 47. Environment Variables

示例：

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

GEMINI_API_KEY=
FAL_KEY=
OPENAI_API_KEY=

POSTHOG_KEY=
SENTRY_DSN=

PAYMENT_SECRET=
PAYMENT_WEBHOOK_SECRET=
```

禁止把 server secret 暴露为 NEXT_PUBLIC_*。

---

# 48. AI Agent 开发顺序

Phase 1：

- 初始化 Next.js
- Tailwind
- shadcn/ui
- Clerk
- Convex
- Vercel deployment

Phase 2：

- R2
- presigned upload
- uploads table
- image preview

Phase 3：

- hairstyle table
- hairstyle seed data
- hairstyle selection UI

Phase 4：

- Gemini Provider
- Try-on generation
- Convex generation state
- R2 output storage

Phase 5：

- face analysis
- hair analysis
- recommendation engine

Phase 6：

- reference hairstyle transfer

Phase 7：

- reality feasibility
- stylist guide

Phase 8：

- credits
- payment
- entitlement checks

Phase 9：

- SEO
- analytics
- monitoring

Phase 10：

- identity similarity
- multi-model router
- automatic retry

---

# 49. Agent 开发原则

Coding Agent 必须遵守：

1. TypeScript strict mode
2. 不允许在 client 暴露任何 AI / R2 / payment secret
3. 所有用户资源必须验证 Clerk identity
4. Convex query / mutation 必须检查资源 ownership
5. 所有上传必须限制 mime type 和 size
6. R2 bucket 默认 private
7. AI 调用必须记录 model、cost、duration、status
8. Generation 必须具备 retry / error handling
9. 不要把 Prompt 散落在组件中
10. Prompt 必须集中管理
11. 页面必须 mobile-first
12. SEO 页面使用 Server Components
13. AI 操作页面可以使用 Client Components
14. 不要过度工程化
15. 优先完成可运行 MVP

---

# 50. 产品成功标准

如果用户使用完后能够说：

> “我本来不知道剪什么，现在我知道了，而且我可以直接把这个给我的理发师看。”

产品成功。

如果用户只是：

> “这个 AI 图片挺好玩的。”

产品定位失败。

---

# 51. 最终一句话

newself 是：

> 一个帮助用户找到真正适合自己的发型、提前看到真实效果，并把可执行方案直接交给理发师的 AI 发型顾问。

核心不是：

AI image generation

而是：

Hair Decision System

---

# 52. Web 发型比较分享（2026-10-02 更新）

用户可以在“我的发型”查看自己的全部已保存生成结果，分页加载正面与侧面效果，并选择 2–6 张生成图创建公开比较页面。公开范围仅包括明确选中的生成图、发型名称和评分汇总；原始自拍、参考照片和账户信息保持私有。用户可以关闭分享链接。

朋友无需登录即可逐张打 1–5 分，页面显示平均分和排名。相同浏览器可以修改评分；登录用户使用账户身份。匿名评分通过签名浏览器 Cookie 识别，清理 Cookie 或更换设备可能重复参与，因此定位为朋友帮助选择发型的非正式评分，不承诺独立真人投票。已登录的分享者不能给自己的页面评分。

生成 1200×630 拼图作为社交链接预览，并提供 X 文案及链接预填、Facebook 链接分享、复制帖子文案、微信复制链接和浏览器原生分享。Facebook 发帖正文由用户粘贴；实际预览展示取决于平台抓取及缓存，需上线验证。关闭分享不能撤回平台缓存或别人保存的图片。

评分写入需要 Web 服务签发的短时 HMAC 凭据，服务端校验来源并限制每分钟每访问者 20 次、每网络 60 次评分请求。Web 与对应 Convex 环境必须配置相同的服务端 `SHARING_SIGNING_SECRET`，密钥不进入客户端。
