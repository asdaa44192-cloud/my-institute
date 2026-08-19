import { afterAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/auth";

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedUser(overrides: Partial<{ email: string; phone: string; password: string }> = {}) {
  const password = overrides.password ?? "correct-password";
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: overrides.email ?? "auth-test@institute.test",
      phone: overrides.phone ?? "+1 (555) 000-1111",
      passwordHash,
      role: "TEACHER",
    },
  });
  return { user, password };
}

describe("authorizeCredentials", () => {
  it("logs in with the correct email and password", async () => {
    const { user, password } = await seedUser();
    const result = await authorizeCredentials({ identifier: user.email, password });
    expect(result?.id).toBe(user.id);
  });

  it("logs in with the phone number, tolerating different formatting", async () => {
    const { user, password } = await seedUser({ phone: "+15550001111" });
    const result = await authorizeCredentials({ identifier: "1 (555) 000-1111", password });
    expect(result?.id).toBe(user.id);
  });

  it("rejects a wrong password", async () => {
    const { user } = await seedUser();
    const result = await authorizeCredentials({ identifier: user.email, password: "wrong" });
    expect(result).toBeNull();
  });

  it("rejects an unknown identifier", async () => {
    const result = await authorizeCredentials({ identifier: "nobody@institute.test", password: "anything" });
    expect(result).toBeNull();
  });

  it("rejects an account with no password set yet (pending invitation)", async () => {
    const user = await prisma.user.create({
      data: { name: "Pending", email: "pending@institute.test", phone: "+15550002222", role: "TEACHER" },
    });
    const result = await authorizeCredentials({ identifier: user.email, password: "anything" });
    expect(result).toBeNull();
  });
});
