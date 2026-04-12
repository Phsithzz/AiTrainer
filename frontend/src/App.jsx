import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SelectPage from "./pages/SelectPage";
import TrainPage from "./pages/TrainPage";
import HistoryPage from "./pages/HistoryPage";
const App = () => {
  return (
     <BrowserRouter>
      <div className="min-h-screen bg-[#0a0a0f] text-white font-mono overflow-x-hidden">
        <Routes>
          <Route
            path="/"
            element={<SelectPage  />}
          />
          <Route
            path="/train/:exercise"
            element={<TrainPage />}
          />
          <Route
            path="/history"
            element={<HistoryPage  />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App