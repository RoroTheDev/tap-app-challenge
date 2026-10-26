import { describe, expect, it } from "vitest";
import {
  createPlanningSession,
  getPlanningSession,
  type PlanningSessionStore,
  updatePlanningSession,
  updatePlanningSessionSchema,
} from "./planning-sessions.js";

type Stored = Awaited<ReturnType<PlanningSessionStore["read"]>> extends infer T ? Exclude<T, null> : never;

class MemoryStore implements PlanningSessionStore {
  values = new Map<string, Stored>();
  private key(uid: string, id: string) { return `${uid}/${id}`; }
  async create(uid: string, id: string, value: Stored) { this.values.set(this.key(uid, id), structuredClone(value)); }
  async read(uid: string, id: string) { return structuredClone(this.values.get(this.key(uid, id)) ?? null); }
  async update(uid: string, id: string, value: Partial<Stored>) {
    const key = this.key(uid, id);
    const current = this.values.get(key);
    if (!current) throw new Error("missing");
    this.values.set(key, { ...current, ...structuredClone(value) });
  }
  async delete(uid: string, id: string) { this.values.delete(this.key(uid, id)); }
  async deleteAll(uid: string) {
    for (const key of this.values.keys()) if (key.startsWith(`${uid}/`)) this.values.delete(key);
  }
}

describe("planning sessions", () => {
  const now = new Date("2026-10-25T18:00:00.000Z");

  it("creates a bounded temporary session without returning owner metadata", async () => {
    const store = new MemoryStore();
    const result = await createPlanningSession("user-a", { id: "session_1234", request: "Find a gentle activity" }, store, now);
    expect(result).toMatchObject({ id: "session_1234", request: "Find a gentle activity", phase: "understanding", status: "planning" });
    expect(result.expiresAt).toBe("2026-10-26T18:00:00.000Z");
    expect(result).not.toHaveProperty("ownerUid");
  });

  it("isolates sessions by authenticated owner", async () => {
    const store = new MemoryStore();
    await createPlanningSession("user-a", { id: "session_1234", request: "Go shopping" }, store, now);
    await expect(getPlanningSession("user-b", "session_1234", store, now)).rejects.toMatchObject({ status: 404 });
  });

  it("expires and deletes old sessions", async () => {
    const store = new MemoryStore();
    await createPlanningSession("user-a", { id: "session_1234", request: "Go shopping" }, store, now);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1_000);
    await expect(getPlanningSession("user-a", "session_1234", store, tomorrow)).rejects.toMatchObject({ status: 410 });
    expect(store.values.size).toBe(0);
  });

  it("accepts only strict, bounded state updates", async () => {
    const store = new MemoryStore();
    await createPlanningSession("user-a", { id: "session_1234", request: "Go shopping" }, store, now);
    const updated = await updatePlanningSession("user-a", "session_1234", { phase: "ready", status: "ready", selectedOptionRank: 1 }, store, new Date(now.getTime() + 1_000));
    expect(updated).toMatchObject({ phase: "ready", status: "ready", selectedOptionRank: 1 });
    expect(() => updatePlanningSessionSchema.parse({ ownerUid: "user-b" })).toThrow();
    expect(() => updatePlanningSessionSchema.parse({ plan: { text: "x".repeat(25_000) } })).toThrow();
  });
});
