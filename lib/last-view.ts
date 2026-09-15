const KEY = "gs-last-view";

export function rememberView(view: string) {
    try {
        window.localStorage.setItem(KEY, view);
    } catch {
    }
}

export function lastView(fallback = "command"): string {
    try {
        return window.localStorage.getItem(KEY) || fallback;
    } catch {
        return fallback;
    }
}
