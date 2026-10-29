import { clerkSetup } from "@clerk/testing/playwright";
import { access, mkdir, writeFile, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { clerkApi, guard, statePath, type TestState } from "./safety";
import teardown from "./teardown";
export default async function setup() {
  guard();
  const previous = await access(statePath).then(() => true, () => false);
  if (previous) {
    const old = JSON.parse(await readFile(statePath, "utf8")) as TestState;
    if (!/^[a-f0-9-]{36}$/.test(old.runId)) throw Error("Invalid previous test manifest");
    await writeFile(`e2e/.state/${old.runId}.json`, JSON.stringify(old));
    await teardown();
  }
  // Save after each creation so a failed run still has a precise cleanup manifest.
  await mkdir("e2e/.state", { recursive: true });
  const data: TestState = { runId: randomUUID(), users: [] };
  await writeFile(statePath, JSON.stringify(data));
  try {
  for (const role of ["owner", "other"]) {
    const email = `newself-${role}-${data.runId}+clerk_test@example.com`;
    const user = await clerkApi("/users", "POST", { email_address: [email], skip_password_requirement: true, private_metadata: { newselfE2ERun: data.runId } });
    data.users.push({ id: user.id, email });
    await writeFile(statePath, JSON.stringify(data));
  }
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  await clerkSetup();
  } catch (error) {
    await teardown();
    throw error;
  }
}
