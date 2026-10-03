import { chineseFaqs, chineseOverview, chineseSteps } from "@/lib/seo/chinese-content";
import { absoluteUrl } from "@/lib/seo/site";

// Supplemental public reference, not an indexing requirement or crawler policy.
export const dynamic = "force-static";

export function GET() {
  const text = [
    "# newself — AI 发型顾问",
    `> ${chineseOverview}`,
    "## 中文公开页面",
    ...[["首页：AI 发型设计与换发型", "/zh"], ["关于 newself", "/zh/about"], ["免费体验与每日额度", "/zh/pricing"], ["中国大陆理发师入驻", "/zh/stylists"], ["隐私政策", "/zh/privacy"], ["服务条款", "/zh/terms"]].map(([label, path]) => `- [${label}](${absoluteUrl(path)})`),
    "## 使用流程",
    ...chineseSteps.map(({ title, text }, index) => `${index + 1}. ${title}：${text}`),
    "## 常见问题",
    ...chineseFaqs.map(({ question, answer }) => `### ${question}\n\n${answer}`),
    "## 其他语言",
    `- [English homepage](${absoluteUrl("/en")})`,
  ].join("\n\n");
  return new Response(`${text}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
