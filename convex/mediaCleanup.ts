"use node";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ownsMedia } from "../shared/media";

export const drain = internalAction({
  args: {},
  handler: async ctx => {
    const items = await ctx.runQuery(internal.privacy.due, {});
    if (!items.length) return;
    const account = process.env.CLOUDFLARE_ACCOUNT_ID, key = process.env.R2_ACCESS_KEY_ID, secret = process.env.R2_SECRET_ACCESS_KEY, bucket = process.env.R2_BUCKET_NAME;
    const client = account && key && secret && bucket ? new S3Client({ region: "auto", endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId: key, secretAccessKey: secret } }) : null;
    for (const candidate of items) {
      const item = await ctx.runMutation(internal.privacy.claim, { id: candidate._id });
      if (!item) continue;
      let success = false;
      try {
        if (!client || !bucket) throw new Error("Media cleanup is not configured");
        if (!ownsMedia(item.clerkId, item.r2Key)) throw new Error("Invalid cleanup scope");
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.r2Key }), { abortSignal: AbortSignal.timeout(60_000) });
        success = true;
      } catch { console.error("Media cleanup pending", item._id); }
      await ctx.runMutation(internal.privacy.acknowledged, { id: item._id, success });
    }
    if (items.length === 100) await ctx.scheduler.runAfter(0, internal.mediaCleanup.drain, {});
  },
});

