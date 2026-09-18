import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, api } from "../lib/api";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        try {
            const data = await api.get("/auth/me");
            setUser(data.user);
            setProfile(data.profile);
        }
        catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                console.error(err);
            }
            setUser(null);
            setProfile(null);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refresh();
    }, [refresh]);
    const login = useCallback(async (email, password) => {
        const data = await api.post("/auth/login", { email, password });
        setUser(data.user);
        setProfile(data.profile);
        return data.user;
    }, []);
    const logout = useCallback(async () => {
        await api.post("/auth/logout");
        setUser(null);
        setProfile(null);
    }, []);
    const setSession = useCallback((nextUser, nextProfile) => {
        setUser(nextUser);
        setProfile(nextProfile);
    }, []);
    return (<AuthContext.Provider value={{ user, profile, loading, refresh, login, logout, setSession }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
