import { removeTestUser, state } from "./safety";
import { ConvexHttpClient } from "convex/browser";
import { createHmac } from "node:crypto";
import { api } from "../convex/_generated/api";
export default async function teardown() {
  const data = await state();
  for (const user of data.users) {
    await removeTestUser(user, data.runId);
    const secret = process.env.SHARING_SIGNING_SECRET;
    if (!secret || secret.length < 32) throw Error("Development cleanup signing secret required");
    const issuedAt = Date.now();
    const signature = createHmac("sha256", secret).update(`newself-account-deletion-v1|${user.id}|${issuedAt}`).digest("hex");
    await new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!).mutation(api.privacy.eraseFromWebhook, { clerkId: user.id, issuedAt, signature });
  }
  // Keep the private manifest locally so interrupted media cleanup can be resumed.
}
