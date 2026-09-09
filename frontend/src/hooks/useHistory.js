import { useState, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useHistory() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // ฟังก์ชันดึงประวัติ
    const fetchHistory = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setIsLoading(true);
        try {
            // Axios ไม่ต้องใช้ await res.json() มันแปลงให้เลย
            const res = await axios.get(`${API_URL}/exercise/workouts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ฟังก์ชันเซฟตอนเล่นเสร็จ
    const saveWorkout = async (exerciseData) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        console.log("ข้อมูลที่ส่งไป:", exerciseData); // ไม่ต้อง stringify แล้ว
        
        try {
            // Axios ส่ง Object เข้าไปได้เลย ไม่ต้องกำหนด Content-Type
            const res = await axios.post(`${API_URL}/exercise/workouts`, exerciseData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("บันทึกข้อมูลสำเร็จ!", res.data);
            
            // เรียก fetchHistory() เพื่ออัปเดตประวัติทันที
            // fetchHistory(); 

        } catch (error) {
            console.error("Save workout error:", error.response?.data || error.message);
            Swal.fire({
                icon: 'error', title: 'SAVE FAILED',
                text: 'ไม่สามารถบันทึกผลการฝึกซ้อมได้ กรุณาลองใหม่อีกครั้ง',
                background: '#18181b', color: '#a1a1aa', confirmButtonColor: '#ef4444',
                customClass: { popup: 'border border-red-500/30 rounded-3xl', title: 'text-red-500 font-black tracking-widest', confirmButton: 'text-white font-bold tracking-widest rounded-full px-8 py-3 mt-2' }
            });
        }
    };

    return { history, fetchHistory, saveWorkout, isLoading };
}