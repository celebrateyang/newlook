import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("prune expired rating limits", { hours: 1 }, internal.anonymousVotes.pruneLimits);
crons.interval("expire unused photos and retry media deletion", { hours: 1 }, internal.privacy.expire);
crons.interval("adopt legacy photo metadata for retention", { hours: 24 }, internal.privacy.adoptLegacyMedia, { kind: "uploads" });
export default crons;
