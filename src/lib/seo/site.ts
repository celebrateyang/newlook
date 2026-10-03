import type { Metadata } from "next";
import { locales, type Locale } from "@/lib/i18n/locale";
import { translator } from "@/lib/i18n/translate";

// Canonicals always identify the official site, including in local/preview builds.
export const SITE_URL = "https://newself.cc";
export const PUBLIC_PATHS = ["", "/about", "/pricing", "/stylists", "/privacy", "/terms"] as const;

const chinesePages: Record<string, { title: string; description: string }> = {
  "": { title: "AI 发型设计与换发型：上传照片试发型", description: "newself AI 发型顾问：上传自拍，分析脸型与当前头发条件，获取发型推荐、换发型效果图和理发师沟通指南。支持参考图换发型，早期体验每个登录账号每天最多 6 次生成，剪发前先看效果。" },
  "/about": { title: "关于 newself：从 AI 发型推荐到理发师沟通", description: "了解 newself AI 发型顾问如何结合脸型与头发分析、发型预览和理发师沟通指南，帮助你从喜欢的发型走向适合自己的剪发方案。" },
  "/pricing": { title: "免费体验与每日额度：AI 换发型", description: "newself 早期体验免费：每个登录账号每天最多发起 6 次发型生成，试发型、参考图换发型和侧面生成共用额度，北京时间零点重置，失败请求计次。积分、会员与支付尚未开放。" },
  "/stylists": { title: "理发师入驻：newself 中国大陆首批招募", description: "newself 面向中国大陆招募理发师，让你的专业成为顾客选择的理由。提交门店、擅长项目和真实作品，参与首批入驻申请；资料私有，当前尚未开放匹配、预约和接单。" },
  "/privacy": { title: "隐私政策：照片、账户与发型结果保护", description: "了解 newself 如何处理自拍、参考照片、AI 发型结果及账户资料，以及公开分享、数据删除和理发师入驻资料的隐私规则。" },
  "/terms": { title: "服务条款：AI 发型顾问的使用规则", description: "阅读 newself AI 发型顾问的服务条款，了解照片上传、生成效果、公开分享、服务限制和用户责任。AI 发型预览用于沟通参考，实际剪发方案需由理发师确认。" },
  "/upload": { title: "上传照片试发型：开始 AI 发型分析", description: "上传一张清晰正面自拍，开始分析脸型与头发条件，选择推荐发型、发型库或参考照片在线试发型。" },
};

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function languageAlternates(route: string) {
  return { en: absoluteUrl(`/en${route}`), "zh-CN": absoluteUrl(`/zh${route}`), "x-default": absoluteUrl(`/en${route}`) };
}

export function pageMetadata(locale: Locale, pathname: string): Metadata {
  const route = pathname.replace(/^\/(en|zh)(?=\/|$)/, "").replace(/\/+$/, "");
  const canonical = absoluteUrl(`/${locale}${route}`);
  const isPublic = PUBLIC_PATHS.some(path => path === route);
  const t = translator(locale);
  const copy = locale === "zh" ? chinesePages[route] : undefined;
  const title = copy?.title ?? t("newself — AI Hairstyle Advisor");
  const description = copy?.description ?? t("Discover hairstyles that suit your face and hair, try them on, and get a salon-ready guide.");
  const socialTitle = copy ? `${title} | newself` : title;
  const image = { url: absoluteUrl("/example-before-after.png"), width: 1536, height: 1024, alt: locale === "zh" ? "newself AI 换发型前后示例" : "newself AI hairstyle before and after example" };
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: socialTitle, template: "%s | newself" },
    description,
    alternates: { canonical, ...(isPublic ? { languages: languageAlternates(route) } : {}) },
    robots: isPublic
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
      : { index: false, follow: route === "/upload" },
    openGraph: { title: socialTitle, description, type: "website", url: canonical, locale: locale === "zh" ? "zh_CN" : "en_US", alternateLocale: locale === "zh" ? "en_US" : "zh_CN", siteName: "newself", images: [image] },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [image.url] },
  };
}

export function publicPageUrls() {
  return PUBLIC_PATHS.flatMap(route => locales.map(locale => ({ url: absoluteUrl(`/${locale}${route}`), route })));
}
