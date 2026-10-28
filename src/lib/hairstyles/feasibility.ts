import type { AdvisorPreferences, VisibleHair } from "../../../shared/advisor";
import type { Locale } from "@/lib/i18n/locale";
import { GENERAL_STYLING_MINUTES, getStarterHairstyle } from "./catalog";

export type Feasibility = { status: "discuss" | "grow" | "compatible"; title: string; reasons: string[]; nextSteps: string[]; limitations: string };

// Conservative discussion rules, not a prediction of salon results or a measured fit score.
export function assessFeasibility(slug: string, hair: VisibleHair, preferences: AdvisorPreferences, locale: Locale): Feasibility | undefined {
  const style = getStarterHairstyle(slug);
  if (!style) return undefined;
  const zh = locale === "zh";
  const say = (en: string, cn: string) => zh ? cn : en;
  const reasons: string[] = [], nextSteps: string[] = [];
  const current = { "very short": 0, short: 1, medium: 2, long: 3, "very long": 4, unclear: -1 }[hair.hairLength];
  const target = style.category === "Bangs" ? current : style.length === "Short" ? 1 : style.length === "Chin" ? 1.5 : style.length === "Long" ? 3 : 2;
  let status: Feasibility["status"] = "compatible";
  if ([hair.texture, hair.hairDensity, hair.thickness].includes("unclear")) {
    status = "discuss";
    reasons.push(say("Some hair characteristics are unclear in this photo. Confirm texture and density before choosing the cut or styling method.", "照片中的部分头发条件不够清楚，请先确认真实纹理与发量，再决定剪法和造型方式。"));
  }
  if (current < 0) {
    status = "discuss";
    reasons.push(say("The photo does not show enough length detail to judge the starting point.", "照片中的发长信息不足，暂时无法判断起点。"));
  } else if (style.category === "Bangs") {
    status = "discuss";
    reasons.push(say("Overall hair length does not establish whether the front sections can form these bangs. Check their dry length, natural fall and cowlicks in person.", "整体发长不能说明额前头发是否足够形成这款刘海，需要现场检查额前干发长度、自然垂落和发旋。"));
  } else if (target > current && target - current < 1) {
    status = "discuss";
    reasons.push(say("The photo's broad length category overlaps this chin-length cut. Measure the dry resting length before deciding whether growth is needed.", "照片中的粗略发长分类与下巴长度发型可能重叠，请先测量干发落点，再判断是否需要留长。"));
  } else if (target > current) {
    status = "grow";
    reasons.push(say("The target silhouette appears to need more length than is visible in your photo.", "目标轮廓可能需要比照片中更长的头发。"));
    nextSteps.push(say("Ask your stylist to measure the missing length and plan an interim cut. A photo alone cannot establish a reliable growth date.", "请理发师测量缺少的长度并设计过渡发型；仅凭照片不能可靠估计留长时间。"));
  } else {
    reasons.push(say("Your visible length appears sufficient to discuss this silhouette; exact lengths still need an in-person check.", "从照片看，现有长度可以作为讨论这个轮廓的起点；具体长度仍需现场确认。"));
  }
  if (current >= 0 && target < current && preferences.lengthChange !== "open") {
    status = status === "grow" ? status : "discuss";
    reasons.unshift(say("This cut could remove more length than your stated preference. Agree on the shortest acceptable length before cutting.", "这款可能比你期望剪掉的长度更多，请先与理发师确认最短能接受的位置。"));
  }
  if (hair.hairDensity === "low" || hair.thickness === "fine") {
    reasons.push(say("The photo suggests fine strands or lower visible density. Preserve perimeter weight and discuss restrained layering.", "照片提示发丝较细或可见发量偏少，建议保留轮廓厚度，谨慎处理层次。"));
    nextSteps.push(say("Ask the stylist to check density in person before thinning or adding short crown layers.", "打薄或剪短头顶层次前，请理发师现场检查真实发量。"));
  }
  if (["curly", "coily"].includes(hair.texture)) {
    status = status === "grow" ? status : "discuss";
    reasons.unshift(say("Your visible curl pattern needs a dry-length and shrinkage check; a smooth preview may require a different daily finish.", "照片中的卷曲纹理需要检查干发长度和回缩；顺滑效果图可能需要不同的日常造型方式。"));
  }
  const texturedTarget = /waves|curls|curly|coily|afro|quiff|pompadour/.test(slug);
  if (texturedTarget && hair.texture === "straight") {
    status = status === "grow" ? status : "discuss";
    reasons.unshift(say("The pictured movement is not established by your natural straight texture. Discuss temporary styling and whether a perm is necessary.", "你目前的直发纹理未必自然形成目标弧度，需要讨论临时造型方式，以及是否真的需要烫发。"));
    if (preferences.perm === "no") nextSteps.push(say("You prefer no perm: ask for a cut-only alternative and a realistic unstyled finish.", "你选择不烫发：请优先讨论只剪不烫的替代方案及不造型时的效果。"));
  }
  const estimate = GENERAL_STYLING_MINUTES[style.maintenance];
  if (estimate > Number(preferences.dailyMinutes)) {
    status = status === "grow" ? status : "discuss";
    reasons.unshift(say("This style's general upkeep category may exceed your daily styling budget. Ask for a simpler finish or an alternative.", "这款发型的一般打理要求可能超过你愿意投入的时间，建议讨论更省事的造型或替代方案。"));
  }
  nextSteps.push(say("Show both the original and preview. Confirm dry resting length, natural fall, cowlicks and a repeatable at-home routine.", "同时展示原图与效果图，确认干发落点、自然垂落、发旋及在家可重复的打理方法。"));
  return { status, title: status === "grow" ? say("Discuss a growth plan", "先讨论留长与过渡方案") : status === "discuss" ? say("Adjust before committing", "剪之前需要调整确认") : say("A starting point to discuss", "可以作为沟通起点"), reasons, nextSteps, limitations: say("Based on visible photo cues and your preferences, using conservative rules. Not a salon examination; colour, damage, chemical history and hidden density need an in-person check.", "依据照片可见信息和你的偏好，通过保守规则给出建议。不能替代现场检查；发色、受损情况、烫染历史和被遮挡的发量仍需理发师确认。") };
}
