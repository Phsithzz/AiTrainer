import { useState, useCallback } from 'react';
import axios from 'axios';

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
            // ดัก Error ของ Axios ได้ง่ายขึ้นมาก
            if (error.response) {
                // เซิร์ฟเวอร์ตอบกลับมาเป็น Error (เช่น 422, 500)
                console.error(`เซิร์ฟเวอร์ปฏิเสธข้อมูล (Status: ${error.response.status}):`, error.response.data);
            } else if (error.request) {
                // ส่งคำขอไปแล้ว แต่เซิร์ฟเวอร์ไม่ตอบกลับ (เน็ตหลุด / เซิร์ฟล่ม)
                console.error("เซิร์ฟเวอร์ไม่ตอบสนอง:", error.request);
            } else {
                // เกิดข้อผิดพลาดในโค้ดฝั่ง React เอง
                console.error("เกิดข้อผิดพลาด:", error.message);
            }
        }
    };

    return { history, fetchHistory, saveWorkout, isLoading };
}