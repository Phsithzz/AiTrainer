import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useHistory() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // ฟังก์ชันดึงประวัติ
    const fetchHistory = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return; // ถ้าไม่ล็อกอิน ไม่ต้องดึง

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/workouts`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ฟังก์ชันเซฟตอนเล่นเสร็จ
    const saveWorkout = async (exerciseData) => {
        const token = localStorage.getItem("token");
        if (!token) return; // ถ้าเป็น Guest ไม่ต้องเซฟลง DB

        try {
            await fetch(`${API_URL}/workouts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(exerciseData)
            });
        } catch (error) {
            console.error("Failed to save workout", error);
        }
    };

    return { history, fetchHistory, saveWorkout, isLoading };
}