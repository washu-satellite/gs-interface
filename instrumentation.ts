const PASS_POLL_MS = 15 * 60 * 1000;
const TLE_POLL_MS = 60 * 60 * 1000;

export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const { ensureAuthSchema } = await import("@/lib/db");
    await ensureAuthSchema().catch((e) => console.error("auth schema setup failed", e));

    const { computeAndStorePassesForAllProjects } = await import("@/lib/pass-prediction");
    const { refreshTleForAllProjects } = await import("@/lib/tle-refresh");

    const runPasses = () => {
        computeAndStorePassesForAllProjects().catch((e) => console.error("pass prediction cycle failed", e));
    };
    const runTleRefresh = () => {
        refreshTleForAllProjects().catch((e) => console.error("TLE refresh cycle failed", e));
    };

    runPasses();
    runTleRefresh();
    setInterval(runPasses, PASS_POLL_MS);
    setInterval(runTleRefresh, TLE_POLL_MS);
}
