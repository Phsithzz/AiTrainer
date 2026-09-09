import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
// 🟢 เพิ่มฟังก์ชันนี้ไว้ด้านบนสุด (ใต้บรรทัด API_URL)
const getSafeErrorMessage = (err, defaultMsg = "เกิดข้อผิดพลาด") => {
    const detail = err.response?.data?.detail;
    return typeof detail === 'string' ? detail : defaultMsg;
};
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
// 🟢 1. ยืนยัน OTP ตอนสมัคร
    const verifyOtp = async (email, otp) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
            return res.data.message;
        } catch (err) {
            setError(getSafeErrorMessage(err, "รหัส OTP ไม่ถูกต้อง"));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const requestEmailChange = async (oldPassword, newEmail) => {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        try {
            const res = await axios.post(`${API_URL}/auth/request-email-change`,
                { old_password: oldPassword, new_email: newEmail },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return res.data.message;
        } catch (err) {
            setError(getSafeErrorMessage(err, "ไม่สามารถขอเปลี่ยน Email ได้"));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const verifyEmailChange = async (otp) => {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        try {
            const res = await axios.post(`${API_URL}/auth/verify-email-change`,
                { otp },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return res.data.message;
        } catch (err) {
            setError(getSafeErrorMessage(err, "OTP ไม่ถูกต้อง หรือหมดอายุแล้ว"));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const resendOtp = async (email) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/resend-otp`, { email });
            return res.data.message;
        } catch (err) {
            setError(getSafeErrorMessage(err, "ไม่สามารถส่ง OTP ใหม่ได้"));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

const forgotUsername = async (email) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/forgot-username`, { email });
            return res.data.message;
        } catch (err) {
            setError(getSafeErrorMessage(err, "ข้อมูลอีเมลไม่ถูกต้อง (Error 422)"));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

// 🟢 ตัวอย่างแก้ใน forgotPassword
    const forgotPassword = async (username) => {
        setIsLoading(true);
        setError(null);
        try {
            // ถ้า Backend คุณบังคับให้ส่งทั้ง username และ email ต้องส่งไปทั้งคู่นะครับ
            // const res = await axios.post(`${API_URL}/auth/forgot-password`, { username, email });
            const res = await axios.post(`${API_URL}/auth/forgot-password`, { username });
            return res.data; 
        } catch (err) {
            // 🟢 จุดที่ต้องแก้คือตรงนี้! (ดักจับก้อน Object 422)
            const detail = err.response?.data?.detail;
            const errorMessage = typeof detail === 'string' 
                ? detail 
                : "ข้อมูลที่กรอกไม่ถูกต้อง หรือไม่ครบถ้วน (Error 422)";
            
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };
const getProfile = async () => {
        setIsLoading(true);
        const token = getToken();
        try {
            const res = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data; // { username: "...", email: "..." }
        } catch (err) {
            console.error("Failed to load profile", err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // 🟢 อัปเดตข้อมูล Profile
    const updateProfile = async (profileData) => {
        setIsLoading(true);
        setError(null);
        const token = getToken();
        try {
            const res = await axios.put(`${API_URL}/auth/profile`, profileData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // ถ้ามีการเปลี่ยนชื่อ ให้เซฟลง LocalStorage ใหม่ด้วย
            if (profileData.username) {
                localStorage.setItem("username", profileData.username);
            }
            return res.data.message;
        } catch (err) {
            setError(getSafeErrorMessage(err,"เกิดข้อผิดพลาดในการอัปเดตข้อมูล"));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // 🟢 3. รีเซ็ตรหัสผ่านใหม่
// 🟢 แก้ไข: รับและส่งค่า username แทน email
    const resetPassword = async (username, otp, newPassword) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/reset-password`, { 
                username: username, // ส่ง username ไปให้ backend
                otp, 
                new_password: newPassword 
            });
            return res.data.message;
        } catch (err) {
            setError(getSafeErrorMessage(err, "รีเซ็ตรหัสผ่านไม่สำเร็จ"));
            return false;
        } finally {
            setIsLoading(false);
        }
    };
// 🟢 แก้ไข: เอา async ออก
    const logout = () => {
        const token = localStorage.getItem("token");
        if (token) {
            // 🟢 เอา await ออก เพื่อไม่ให้บล็อกการเปลี่ยนหน้าเว็บ
            axios.post(`${API_URL}/auth/logout`, {}, {
                headers: { "Authorization": `Bearer ${token}` }
            }).catch(err => {
                console.error("Logout error:", err.response?.data || err.message);
            });
        }
        
        // ลบข้อมูลทันที ไม่ต้องรอ API
        localStorage.removeItem("token");
        localStorage.removeItem("username");
    };

    const getToken = () => localStorage.getItem("token");

  return {
        login, register, logout, getToken,
        verifyOtp, resendOtp, forgotPassword, resetPassword,
        requestEmailChange, verifyEmailChange,
        isLoading, error, getProfile, updateProfile, forgotUsername
    };
}