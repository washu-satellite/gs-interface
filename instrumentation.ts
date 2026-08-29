const POLL_MS = 15 * 60 * 1000;

export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const { computeAndStorePassesForAllProjects } = await import("@/lib/pass-prediction");

    const run = () => {
        computeAndStorePassesForAllProjects().catch((e) => console.error("pass prediction cycle failed", e));
    };

    run();
    setInterval(run, POLL_MS);
}
