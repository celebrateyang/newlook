import { getTranslations } from "@/lib/i18n/server";
import { SignIn } from "@clerk/nextjs";
import Link from "@/components/localized-link";

export default async function SignInPage() {
  const t = await getTranslations();
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="grid min-h-screen place-items-center bg-ivory px-5"><div className="max-w-md rounded-3xl bg-white p-9 text-center shadow-xl"><Link className="font-display text-3xl font-bold" href="/">newself<span className="text-coral">.</span></Link><h1 className="mt-8 text-xl font-bold">{t("Authentication is ready to connect")}</h1><p className="mt-3 leading-7 text-ink/55">{t("Add the Clerk keys from")}{" "}<code>.env.example</code> {" "}{t("to")}{" "}<code>.env.local</code>{t(", then restart the development server.")}</p></div></main>;
  return <main className="grid min-h-screen place-items-center bg-clay px-5"><SignIn /></main>;
}
