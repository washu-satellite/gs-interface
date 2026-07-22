"use client";

import { AdcsConfig, Notification, Project } from "@/lib/projects";
import { DashboardView, ViewItem } from "@/lib/blocks";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

type ProjectContextValue = {
    projects: Project[];
    activeId: string | null;
    activeProject: Project | null;
    notifications: Notification[];
    views: DashboardView[];
    loading: boolean;
    setActiveId: (id: string) => void;
    saveActiveConfig: (config: AdcsConfig) => Promise<void>;
    markNotificationRead: (id: number) => Promise<void>;
    pushNotification: (input: { level?: Notification["level"]; title: string; message?: string | null }) => Promise<Notification | null>;
    clearNotifications: () => Promise<void>;
    createView: (name: string, blocks: ViewItem[]) => Promise<DashboardView | null>;
    deleteView: (id: number) => Promise<void>;
    reorderViews: (orderedIds: number[]) => Promise<void>;
    renameView: (id: number, name: string) => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [views, setViews] = useState<DashboardView[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        fetch("/api/projects")
            .then((r) => r.json())
            .then((data: Project[]) => {
                if (!alive) return;
                setProjects(data);
                setActiveId((prev) => prev ?? data[0]?.id ?? null);
                setLoading(false);
            })
            .catch(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!activeId) {
            setNotifications([]);
            return;
        }
        let alive = true;
        fetch(`/api/projects/${activeId}/notifications`)
            .then((r) => r.json())
            .then((data: Notification[]) => alive && setNotifications(data))
            .catch(() => alive && setNotifications([]));
        return () => {
            alive = false;
        };
    }, [activeId]);

    const saveActiveConfig = useCallback(
        async (config: AdcsConfig) => {
            if (!activeId) return;
            const res = await fetch(`/api/projects/${activeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config }),
            });
            const updated: Project = await res.json();
            setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
        },
        [activeId]
    );

    const markNotificationRead = useCallback(async (id: number) => {
        setNotifications((ns) => ns.filter((n) => n.id !== id));
        await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    }, []);

    const pushNotification = useCallback(
        async (input: { level?: Notification["level"]; title: string; message?: string | null }) => {
            if (!activeId) return null;
            const res = await fetch(`/api/projects/${activeId}/notifications`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ level: input.level ?? "info", title: input.title, message: input.message ?? null }),
            });
            if (!res.ok) return null;
            const created: Notification = await res.json();
            setNotifications((ns) => [created, ...ns]);
            return created;
        },
        [activeId]
    );

    const clearNotifications = useCallback(async () => {
        if (!activeId) return;
        setNotifications([]);
        await fetch(`/api/projects/${activeId}/notifications`, { method: "DELETE" });
    }, [activeId]);

    useEffect(() => {
        if (!activeId) {
            setViews([]);
            return;
        }
        let alive = true;
        fetch(`/api/projects/${activeId}/views`)
            .then((r) => r.json())
            .then((data: DashboardView[]) => alive && setViews(data))
            .catch(() => alive && setViews([]));
        return () => {
            alive = false;
        };
    }, [activeId]);

    const createView = useCallback(
        async (name: string, blocks: ViewItem[]) => {
            if (!activeId) return null;
            const res = await fetch(`/api/projects/${activeId}/views`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, blocks }),
            });
            const created: DashboardView = await res.json();
            setViews((vs) => [...vs, created]);
            return created;
        },
        [activeId]
    );

    const deleteView = useCallback(async (id: number) => {
        setViews((vs) => vs.filter((v) => v.id !== id));
        await fetch(`/api/views/${id}`, { method: "DELETE" });
    }, []);

    const reorderViews = useCallback(
        async (orderedIds: number[]) => {
            if (!activeId) return;
            setViews((vs) =>
                orderedIds
                    .map((id, i) => {
                        const v = vs.find((x) => x.id === id);
                        return v ? { ...v, ord: i } : null;
                    })
                    .filter((v): v is DashboardView => v !== null)
            );
            await fetch(`/api/projects/${activeId}/views`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: orderedIds }),
            });
        },
        [activeId]
    );

    const renameView = useCallback(async (id: number, name: string) => {
        setViews((vs) => vs.map((v) => (v.id === id ? { ...v, name } : v)));
        await fetch(`/api/views/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
    }, []);

    const activeProject = projects.find((p) => p.id === activeId) ?? null;

    return (
        <ProjectContext.Provider
            value={{ projects, activeId, activeProject, notifications, views, loading, setActiveId, saveActiveConfig, markNotificationRead, pushNotification, clearNotifications, createView, deleteView, reorderViews, renameView }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const ctx = useContext(ProjectContext);
    if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
    return ctx;
}
