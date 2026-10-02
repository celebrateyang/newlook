/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as anonymousVotes from "../anonymousVotes.js";
import type * as crons from "../crons.js";
import type * as generationQuota from "../generationQuota.js";
import type * as generations from "../generations.js";
import type * as hairstyleCatalog from "../hairstyleCatalog.js";
import type * as hairstyles from "../hairstyles.js";
import type * as polls from "../polls.js";
import type * as shares from "../shares.js";
import type * as uploads from "../uploads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  anonymousVotes: typeof anonymousVotes;
  crons: typeof crons;
  generationQuota: typeof generationQuota;
  generations: typeof generations;
  hairstyleCatalog: typeof hairstyleCatalog;
  hairstyles: typeof hairstyles;
  polls: typeof polls;
  shares: typeof shares;
  uploads: typeof uploads;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
