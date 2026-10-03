# 中文 SEO / GEO

## 当前实现

- 中文首页、关于、免费体验、理发师入驻、隐私和条款使用各自的中文标题与摘要；canonical 固定指向正式域名 `https://newself.cc`，英文/中文互设 hreflang。
- 中文首页在服务端输出产品介绍、四步流程、八组问答和相关页面链接。问答覆盖适用人群、脸型参考、身份保留目标、参考图、额度、理发师沟通、隐私和招募状态，不把规划中的功能写成已经开放。
- JSON-LD 包含 Organization、WebSite、WebPage、SoftwareApplication、HowTo 和 FAQPage。步骤和问答与可见正文共用内容源；没有虚构评价、真人背书或效果保证。结构化数据帮助理解页面，不代表能获得 Google FAQ/HowTo 或软件应用富媒体展示。
- `/sitemap.xml` 只列出六类公开页面的两种语言，不列出账户、自拍、个人结果或分享链接；不使用构建时间冒充内容更新时间。
- `/robots.txt` 允许通用搜索与 AI 检索爬虫读取公开页面，禁止抓取 API。个人结果、相册、登录、公开分享和比较页设为 `noindex, nofollow`；重复的上传工具页为 `noindex, follow`。这些 HTML 路径允许抓取，以便爬虫读取 noindex。访问控制仍由原有认证与资源归属校验负责。
- `/llms.txt` 提供中文产品事实和公开链接，作为补充阅读入口，不是搜索引擎或大模型的收录标准。它不会授权访问私人资源，也不能保证大模型引用。
- 公开页面允许摘要和大图预览；Open Graph / X 使用已有公开试戴示例，不使用用户照片。三种抓取入口不参与语言跳转。

## 上线后验证

1. 发布 Web 版本后，检查正式域名上的 `/robots.txt`、`/sitemap.xml`、`/llms.txt` 和 `/zh` 返回正常状态；检查 HTTPS、域名跳转以及 Cloudflare/Vercel 是否对合法爬虫施加挑战或拦截。该改动不需要新的 Convex 部署。
2. 在 Google Search Console、Bing Webmaster Tools 和适用的百度搜索资源平台完成站点所有权验证，提交 `https://newself.cc/sitemap.xml`。所有权凭证由对应平台生成，不在代码中伪造。
3. 用 URL 检查确认 `/zh` 能被抓取、canonical 正确、正文可读；用 Schema Markup Validator 检查 JSON-LD。Rich Results Test 只反映 Google 支持的富媒体类型，不是全部结构化数据的合格标准。
4. 上线后监测索引、中文搜索曝光、点击及可用的 AI 引用报告。站长平台提交、生产抓取与真实排名/引用不能通过本地测试证明。
5. 后续根据真实搜索意图建设中文发型专题：脸型、发长、发质与具体发型。每篇提供适用条件、限制、示例、试戴入口和问答，经过内容审核再发布，避免批量生成重复关键词页面。专题、博客和独立联系页属于后续内容建设，本次不伪造这些页面或将它们加入 sitemap。

## 内容维护

元数据与公开页面清单：`src/lib/seo/site.ts`。中文产品事实、流程和问答：`src/lib/seo/chinese-content.ts`。调整免费额度、导出语言、隐私或招募状态时，同步更新该内容源及相关产品页面。

根布局根据 Proxy 注入的真实路径确定索引规则。不要将个人结果或可撤回分享页加入公开页面清单。新增语言或页面时核对 canonical、hreflang 和 sitemap 是否相互一致。

## 依据

- [Google：AI 搜索与网站](https://developers.google.com/search/docs/appearance/ai-features)：沿用 SEO 基础要求，正文可抓取、内链可发现、结构化数据与正文一致；无需专用 AI 文件，收录与展示不保证。
- [Google：结构化数据概述](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)：使用 JSON-LD 描述页面事实。
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)：面向搜索与 AI 检索提供清晰、可信内容。
- 实现遵循项目安装的 Next.js 16.3.6 metadata、robots、sitemap 与 JSON-LD 文档。
