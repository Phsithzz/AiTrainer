import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (identifier, password) => {
        setIsLoading(true);
        setError(null);
        try {
            // โยน Object เข้าไปได้เลย ไม่ต้อง stringify
            const res = await axios.post(`${API_URL}/auth/login`, { identifier, password });
            
            // 🟢 เก็บ Token ลงเครื่อง (Axios ดึงข้อมูลจาก res.data)
            localStorage.setItem("token", res.data.access_token);
            localStorage.setItem("username", res.data.username || identifier);
            return true; 
        } catch (err) {
            // ดึงข้อความ Error จาก FastAPI (ถ้ามี detail ส่งมา)
            const errorMessage = err.response?.data?.detail || "Login failed";
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username, email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            await axios.post(`${API_URL}/auth/register`, { username, email, password });
            return true;
        } catch (err) {
            const errorMessage = err.response?.data?.detail || "Register failed";
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                // คำสั่ง POST ที่ไม่มี Body (ใส่ {} ว่างๆ ไว้) แต่มี Header
                await axios.post(`${API_URL}/auth/logout`, {}, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Logout error:", err.response?.data || err.message);
            }
        }
        localStorage.removeItem("token");

        localStorage.removeItem("username");
    };

    const getToken = () => localStorage.getItem("token");

    return { login, register, logout, getToken, isLoading, error };
}