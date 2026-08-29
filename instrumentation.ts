const POLL_MS = 15 * 60 * 1000;

export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const { ensureAuthSchema } = await import("@/lib/db");
    await ensureAuthSchema().catch((e) => console.error("auth schema setup failed", e));

    const { computeAndStorePassesForAllProjects } = await import("@/lib/pass-prediction");

    const run = () => {
        computeAndStorePassesForAllProjects().catch((e) => console.error("pass prediction cycle failed", e));
    };

    run();
    setInterval(run, POLL_MS);
}
