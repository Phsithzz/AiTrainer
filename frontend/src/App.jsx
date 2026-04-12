import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SelectPage from "./pages/SelectPage";
import TrainPage from "./pages/TrainPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  const [sessions, setSessions] = useState([]);

  const addSession = (result, exercise) => {
    if (result) {
      setSessions((prev) => [
        { ...result, exercise, date: new Date() },
        ...prev,
      ]);
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0a0f] text-white font-mono overflow-x-hidden">
        <Routes>
          <Route
            path="/"
            element={<SelectPage sessions={sessions} />}
          />
          <Route
            path="/train/:exercise"
            element={<TrainPage onFinish={addSession} />}
          />
          <Route
            path="/history"
            element={<HistoryPage sessions={sessions} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}