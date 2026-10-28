# 中文 SEO / GEO

## 当前实现

- 中文首页、关于、免费体验、理发师入驻、隐私和条款使用各自的中文标题与摘要；canonical 固定指向正式域名 `https://newself.cc`，英文/中文互设 hreflang。
- 中文首页在服务端输出产品介绍、四步流程、八组问答和相关页面链接。问答覆盖适用人群、脸型参考、身份保留目标、参考图、额度、理发师沟通、隐私和招募状态，不把规划中的功能写成已经开放。
- JSON-LD 包含 Organization、WebSite、WebPage、SoftwareApplication、HowTo 和 FAQPage。步骤和问答与可见正文共用内容源；没有虚构评价、真人背书或效果保证。结构化数据帮助理解页面，不代表能获得 Google FAQ/HowTo 或软件应用富媒体展示。
- `/sitemap.xml` 只列出六类公开页面的两种语言，不列出账户、自拍、个人结果或分享链接；不使用构建时间冒充内容更新时间。
- `/robots.txt` 允许通用搜索与 AI 检索爬虫读取公开页面，禁止抓取 API。个人结果、相册、登录、公开分享和比较页设为 `noindex, nofollow`；重复的上传工具页为 `noindex, follow`。这些 HTML 路径允许抓取，以便爬虫读取 noindex。访问控制仍由原有认证与资源归属校验负责。
- `/llms.txt` 提供中文产品事实和公开链接，作为补充阅读入口，不是搜索引擎或大模型的收录标准。它不会授权访问私人资源，也不能保证大模型引用。
- 公开页面允许摘要和大图预览；Open Graph / X 使用已有公开换发型示例，不使用用户照片。三种抓取入口不参与语言跳转。

## 上线后验证

1. 发布 Web 版本后，检查正式域名上的 `/robots.txt`、`/sitemap.xml`、`/llms.txt` 和 `/zh` 返回正常状态；检查 HTTPS、域名跳转以及 Cloudflare/Vercel 是否对合法爬虫施加挑战或拦截。该改动不需要新的 Convex 部署。
2. 在 Google Search Console、Bing Webmaster Tools 和适用的百度搜索资源平台完成站点所有权验证，提交 `https://newself.cc/sitemap.xml`。所有权凭证由对应平台生成，不在代码中伪造。
3. 用 URL 检查确认 `/zh` 能被抓取、canonical 正确、正文可读；用 Schema Markup Validator 检查 JSON-LD。Rich Results Test 只反映 Google 支持的富媒体类型，不是全部结构化数据的合格标准。
4. 上线后监测索引、中文搜索曝光、点击及可用的 AI 引用报告。站长平台提交、生产抓取与真实排名/引用不能通过本地测试证明。
5. 后续根据真实搜索意图建设中文发型专题：脸型、发长、发质与具体发型。每篇提供适用条件、限制、示例、试发型入口和问答，经过内容审核再发布，避免批量生成重复关键词页面。专题、博客和独立联系页属于后续内容建设，本次不伪造这些页面或将它们加入 sitemap。

## 内容维护

### Search Console 实站检查 — 2026-10-27

- 报告中的两条“网页会自动重定向”为 `http://newself.cc/` 和 `https://newself.cc/en/`。实测分别通过 308 跳转至 HTTPS 与无尾斜杠的 `/en`；属于预期 URL 规范化，不需要取消重定向，也不需要对该类别启动修正验证。
- 唯一“网页已编入索引，但没有内容”为 `https://clerk.newself.cc/`，属于 Clerk Frontend API，而非产品首页。该地址实测返回空 JSON 响应和 `X-Robots-Tag: noindex, nofollow`，现有响应已经要求搜索引擎不收录。已在 Search Console 启动修正验证，状态为“已开始”；尚未通过，不代表旧索引已移除。不要修改登录服务 DNS、代理或应用认证来消除此提示。
- 英文首页 `/en` 在 Google 索引报告中已收录。中英文首页均实测返回 200、可见 HTML 正文、自引用 canonical 和 `index, follow`；更换为 Googlebot User-Agent 的 HTTP 检查也通过，但该模拟请求本身不证明真实 Google 抓取。
- `/sitemap.xml` 返回 200 和有效 XML，包含 12 个公开页面；`/robots.txt` 返回 200 并声明正确的 sitemap，未禁止抓取公开页面。已重新提交原 sitemap，Google 显示“已成功提交站点地图”；站点地图报告仍为“无法抓取”，尚不能声称处理完成。Google 网址检查的实时测试另行确认该 XML 地址在 2026-10-27 20:38（北京时间）抓取成功、允许抓取。实时抓取成功与 sitemap 报告处理成功是两个不同状态；不要反复删除或提交、添加随机查询参数来隐藏旧状态。
- 中文首页 `/zh` 此前为“Google 无法识别此网址”。Google 实时测试确认“网址可编入 Google 索引”。首次请求索引遇到 Google reCAPTCHA 服务连接错误；刷新后重试成功，Google 明确显示“已请求编入索引”，并确认已加入优先抓取队列。最终收录仍未确认，不要重复提交同一网页。
- 此次未修改产品代码、登录配置或部署。后续检查 Clerk 验证结果、sitemap 的成功状态/发现页面数及中文首页收录情况。

元数据与公开页面清单：`src/lib/seo/site.ts`。中文产品事实、流程和问答：`src/lib/seo/chinese-content.ts`。调整免费额度、导出语言、隐私或招募状态时，同步更新该内容源及相关产品页面。

根布局根据 Proxy 注入的真实路径确定索引规则。不要将个人结果或可撤回分享页加入公开页面清单。新增语言或页面时核对 canonical、hreflang 和 sitemap 是否相互一致。

## 依据

- [Google：AI 搜索与网站](https://developers.google.com/search/docs/appearance/ai-features)：沿用 SEO 基础要求，正文可抓取、内链可发现、结构化数据与正文一致；无需专用 AI 文件，收录与展示不保证。
- [Google：结构化数据概述](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)：使用 JSON-LD 描述页面事实。
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)：面向搜索与 AI 检索提供清晰、可信内容。
- 实现遵循项目安装的 Next.js 16.3.6 metadata、robots、sitemap 与 JSON-LD 文档。
