import { afterAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions, authorizeCredentials } from "@/lib/auth";
import { __resetRateLimiterForTests } from "@/lib/rate-limit";

type SessionCallbackArgs = Parameters<NonNullable<NonNullable<typeof authOptions.callbacks>["session"]>>[0];

beforeEach(async () => {
  await prisma.user.deleteMany();
  __resetRateLimiterForTests();
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
    const result = await authorizeCredentials({ identifier: user.email!, password });
    expect(result?.id).toBe(user.id);
  });

  it("logs in with the phone number, tolerating different formatting", async () => {
    const { user, password } = await seedUser({ phone: "+15550001111" });
    const result = await authorizeCredentials({ identifier: "1 (555) 000-1111", password });
    expect(result?.id).toBe(user.id);
  });

  it("rejects a wrong password", async () => {
    const { user } = await seedUser();
    const result = await authorizeCredentials({ identifier: user.email!, password: "wrong" });
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
    const result = await authorizeCredentials({ identifier: user.email!, password: "anything" });
    expect(result).toBeNull();
  });
});

describe("authorizeCredentials rate limiting (brute-force protection)", () => {
  it("blocks further attempts against one identifier after 5 within the window", async () => {
    const { user, password } = await seedUser();

    for (let i = 0; i < 5; i++) {
      const result = await authorizeCredentials({ identifier: user.email!, password: "wrong" });
      expect(result).toBeNull();
    }

    // The 6th attempt is throttled even with the *correct* password — the
    // limiter runs before credentials are checked.
    await expect(authorizeCredentials({ identifier: user.email!, password })).rejects.toThrow(
      /محاولات تسجيل دخول كثيرة جداً/
    );
  });

  it("throttles by identifier regardless of whether the account is real", async () => {
    for (let i = 0; i < 5; i++) {
      await authorizeCredentials({ identifier: "nobody@institute.test", password: "guess" });
    }
    await expect(
      authorizeCredentials({ identifier: "nobody@institute.test", password: "guess" })
    ).rejects.toThrow(/محاولات تسجيل دخول كثيرة جداً/);
  });

  it("treats differently formatted versions of the same phone as one bucket", async () => {
    await seedUser({ phone: "+15550001111" });

    for (let i = 0; i < 5; i++) {
      await authorizeCredentials({ identifier: "1 (555) 000-1111", password: "wrong" });
    }
    await expect(
      authorizeCredentials({ identifier: "+1-555-000-1111", password: "wrong" })
    ).rejects.toThrow(/محاولات تسجيل دخول كثيرة جداً/);
  });

  it("does not throttle a different identifier", async () => {
    for (let i = 0; i < 5; i++) {
      await authorizeCredentials({ identifier: "first@institute.test", password: "wrong" });
    }
    // A 6th attempt against a *different* identifier is unaffected.
    const result = await authorizeCredentials({ identifier: "second@institute.test", password: "wrong" });
    expect(result).toBeNull(); // rejected for being wrong, not for being rate-limited
  });

  it("clears the count on a successful login", async () => {
    const { user, password } = await seedUser();

    for (let i = 0; i < 4; i++) {
      await authorizeCredentials({ identifier: user.email!, password: "wrong" });
    }
    const success = await authorizeCredentials({ identifier: user.email!, password });
    expect(success?.id).toBe(user.id);

    // The count was reset, so 4 more (wrong) attempts don't trip the limiter.
    for (let i = 0; i < 4; i++) {
      const result = await authorizeCredentials({ identifier: user.email!, password: "wrong" });
      expect(result).toBeNull();
    }
  });
});

describe("authOptions session callback (deleted-user invalidation)", () => {
  it("keeps the session populated when the user still exists", async () => {
    const { user } = await seedUser();
    const args = {
      session: { user: { id: user.id }, expires: "2099-01-01" },
      token: { id: user.id, role: "TEACHER", studentId: null },
    } as unknown as SessionCallbackArgs;

    const result = await authOptions.callbacks!.session!(args);
    expect((result.user as { id?: string } | undefined)?.id).toBe(user.id);
  });

  it("strips the session's user once the account has been deleted", async () => {
    const args = {
      session: { user: { id: "deleted-user-id" }, expires: "2099-01-01" },
      token: { id: "deleted-user-id", role: "STUDENT", studentId: "some-student" },
    } as unknown as SessionCallbackArgs;

    const result = await authOptions.callbacks!.session!(args);
    expect(result.user).toBeUndefined();
  });

  it("reflects a role change made directly in the DB, ignoring the JWT's stale claim", async () => {
    // Nothing in the app UI changes a user's role once created, but an admin
    // could still do it directly (e.g. via `prisma studio`) — the session
    // must not go on trusting a role the token was issued with, or a demoted
    // admin would keep ADMIN access for the rest of the JWT's 30-day life.
    const { user } = await seedUser();
    await prisma.user.update({ where: { id: user.id }, data: { role: "STUDENT" } });

    const args = {
      session: { user: { id: user.id, role: "TEACHER" }, expires: "2099-01-01" },
      token: { id: user.id, role: "TEACHER", studentId: null },
    } as unknown as SessionCallbackArgs;

    const result = await authOptions.callbacks!.session!(args);
    expect((result.user as { role?: string } | undefined)?.role).toBe("STUDENT");
  });
});
