import { getTranslations } from "@/lib/i18n/server";
import { InfoPage } from "@/components/info-page";
export default async function AboutPage() {
  const t = await getTranslations(); return <InfoPage eyebrow={t("ABOUT NEWSELF")} title={t("A clearer way to change your hair.")}><p>{t("newself helps people move from inspiration to a haircut they can confidently ask for. It combines personal analysis, visual try-on, real-world feasibility, and precise salon instructions.")}</p><p>{t("We are building a hair decision system—not another filter. The goal is a result that still looks like you and can be created by a real stylist.")}</p></InfoPage>; }
