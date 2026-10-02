import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("prune expired rating limits", { hours: 1 }, internal.anonymousVotes.pruneLimits);
export default crons;
