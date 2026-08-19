export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureAdminAccount } = await import("@/lib/ensure-admin-account");
  try {
    await ensureAdminAccount();
  } catch (error) {
    console.error("Failed to bootstrap master admin account:", error);
  }
}
