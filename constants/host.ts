export const NOT_CONFIGURED_STRING = "<PLEASE CONFIGURE>";

export const DEFAULT_HOST_PARAMETERS: typeof process.env = {
    LOCALHOST_PREFIX: "127.0.0",
    LOCALHOST_EXT: "1",
    DB_ENDPOINT: NOT_CONFIGURED_STRING,
    DB_NAME: NOT_CONFIGURED_STRING,
    DB_PASSWORD: NOT_CONFIGURED_STRING,
    DB_USERNAME: NOT_CONFIGURED_STRING,
    PORT: "8081",
    LOGGING_DETAIL: "2",
    NODE_ENV: 'development'
};

export const DEFAULT_TCP_PORT = 7070;

export const DEFAULT_HTTP_PORT = 3000;

// Base HTTP origin of the gs-routing backend. Image frames published on the
// `airis:image` channel are referenced by root-relative paths (e.g.
// `/images/<burst_id>/<seq>.bin`) that the backend serves, so the frontend must
// resolve them against the backend origin rather than its own.
export const GS_ROUTING_HTTP_HOST =
    process.env.NEXT_PUBLIC_GS_ROUTING_HOST ?? "http://localhost:8000";

export function resolveImageUrl(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    return `${GS_ROUTING_HTTP_HOST}${path.startsWith("/") ? "" : "/"}${path}`;
}