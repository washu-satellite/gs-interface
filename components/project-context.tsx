"use client";

import { AdcsConfig, Notification, Project } from "@/lib/projects";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

type ProjectContextValue = {
    projects: Project[];
    activeId: string | null;
    activeProject: Project | null;
    notifications: Notification[];
    loading: boolean;
    setActiveId: (id: string) => void;
    saveActiveConfig: (config: AdcsConfig) => Promise<void>;
    markNotificationRead: (id: number) => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
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

    const activeProject = projects.find((p) => p.id === activeId) ?? null;

    return (
        <ProjectContext.Provider
            value={{ projects, activeId, activeProject, notifications, loading, setActiveId, saveActiveConfig, markNotificationRead }}
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
