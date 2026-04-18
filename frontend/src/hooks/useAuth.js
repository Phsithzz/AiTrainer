import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (identifier, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.detail || "Login failed");
            
            // 🟢 เก็บ Token ลงเครื่อง
            localStorage.setItem("token", data.access_token);
            return true; 
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username, email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.detail || "Register failed");
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
    };

    const getToken = () => localStorage.getItem("token");

    return { login, register, logout, getToken, isLoading, error };
}