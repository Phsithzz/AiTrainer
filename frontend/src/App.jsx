import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SelectPage from "./pages/SelectPage";
import TrainPage from "./pages/TrainPage";
import HistoryPage from "./pages/HistoryPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { useHistory } from "./hooks/useHistory";
import DashboardPage from "./pages/DashoardPage";

export default function App() {
  const { history, fetchHistory, saveWorkout, isLoading } = useHistory();
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token") // อ่านจาก localStorage ตอน init
  );
  const handleFinish = (result, exercise) => {
    if (!result) return;
    // useHistory จัดการเองว่า login อยู่ไหม ถ้าไม่ login ก็ไม่เซฟ
    saveWorkout({ ...result, exercise });
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white font-mono overflow-x-hidden">
        <Routes>
          <Route path="/"                element={<SelectPage />} />
         <Route
            path="/train/:exercise"
            element={
              <TrainPage
                onFinish={handleFinish}
                isLoggedIn={isLoggedIn} // ✅ ส่งลงไป
              />
            }
          />
          <Route path="/history"         element={<HistoryPage fetchHistory={fetchHistory} history={history} isLoading={isLoading} />} />
         <Route path="/login" element={<LoginPage onLogin={() => setIsLoggedIn(true)} />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="*"               element={<NotFoundPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}