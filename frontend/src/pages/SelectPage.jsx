import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GrNext } from "react-icons/gr";
import plank_mode from "../assets/images/plank_mode.png";
import squat_mode from "../assets/images/squat_mode.jpg";
import push_up_mode from "../assets/images/pushmode.png";
import { useAuth } from "../hooks/useAuth"; // เพิ่ม
const EXERCISES = [
  {
    id: "squat",
    label: "SQUAT",
    thai: "สควอท",
    icon: squat_mode,
    desc: "ฝึกกล้ามเนื้อขาและสะโพก",
    available: true,
    accent: "#00ff88",
    mode: "นับ rep",
  },
  {
    id: "pushup",
    label: "PUSH UP",
    thai: "วิดพื้น",
    icon: push_up_mode,
    desc: "ฝึกกล้ามเนื้อหน้าอกและแขน",
    available: true,
    accent: "#ff6b35",
    mode: "นับ rep",
  },
  {
    id: "plank",
    label: "PLANK",
    thai: "แพลงก์",
    icon: plank_mode,
    desc: "เสริมความแข็งแรงของแกนกลางลำตัว",
    available: true,
    accent: "#a855f7",
    mode: "จับเวลา",
  },
];

export default function SelectPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const { logout } = useAuth(); // เพิ่ม

  const token = localStorage.getItem("token");

  const [showLogoutModal, setShowLogoutModal] = useState(false); // เพิ่ม
const username = localStorage.getItem("username") || "GUEST";
  // 🟢 ฟังก์ชันดักจับการคลิก
  const handleLogout = async () => {
      setShowLogoutModal(false);
    await logout(); // เรียก API blacklist token
    window.location.href = '/login';
    // navigate("/"); // redirect ไป login
  };
  const handleSelect = (ex) => {
    if (!ex.available) {
      alert("โหมดนี้กำลังอยู่ในการพัฒนา (Coming Soon!)");
      return;
    }
    navigate(`/train/${ex.id}`);
  };
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="border border-white/20 bg-black p-8 w-80 flex flex-col items-center text-center"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          >
            <h1 className="text-[10px] tracking-[0.5em] text-white/30 uppercase mb-4">
              Confirm
            </h1>
            <div className="flex  gap-2">
              <h1 className="text-3xl font-black tracking-widest text-white mb-1">
                LOG
              </h1>
              <h1
                className="text-3xl font-black tracking-widest mb-6"
                style={{
                  WebkitTextStroke: "1.5px rgba(255,255,255,0.4)",
                  color: "transparent",
                }}
              >
                OUT?
              </h1>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="cursor-pointer
                flex-1 py-3 text-xs font-black tracking-[0.2em] uppercase text-white/50 border border-white/20 hover:border-white/50 hover:text-white transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleLogout}
                className="
                cursor-pointer
                flex-1 py-3 text-xs font-black tracking-[0.2em] uppercase bg-white text-black hover:bg-black hover:text-white border border-white transition-all"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b-2 border-white ">
        <Link to="/" className="flex items-center gap-3">
          <button
            className="
         
          w-8 h-8 rounded-sm bg-white flex items-center justify-center border-black
          hover:bg-black hover:border-white hover:text-white text-black font-semibold
          transition duration-300 ease-in cursor-pointer"
          >
            AI
          </button>
          <span className="text-sm tracking-[0.3em] text-white/60 uppercase">
            Form Trainer
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/history")}
            className="text-xs tracking-widest text-white/60 cursor-pointer 
            hover:text-white 
            transition-colors 
            border border-white 
            hover:border-white/30 px-4 py-2 rounded
            shadow-[2px_2px_0px_white]
            "
          >
            HISTORY
          </button>

              <button
            onClick={() => navigate("/dashboard")}
            className="text-xs tracking-widest text-white/60 cursor-pointer 
            hover:text-white 
            transition-colors 
            border border-white 
            hover:border-white/30 px-4 py-2 rounded
            shadow-[2px_2px_0px_white]
            "
          >
            DashBoard
          </button>
          {token ? (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="text-xs tracking-widest text-white/60 cursor-pointer 
            hover:text-white 
            transition-colors 
            border border-white 
            hover:border-white/30 px-4 py-2 rounded
            shadow-[2px_2px_0px_white]"
            >
              LOGOUT
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-xs tracking-widest text-white/60 cursor-pointer 
            hover:text-white 
            transition-colors 
            border border-white 
            hover:border-white/30 px-4 py-2 rounded
            shadow-[2px_2px_0px_white]"
            >
              LOGIN
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block text-[10px] tracking-widest text-white/50 uppercase">
            {username.split('@')[0]} {/* ถ้าเป็นอีเมล จะตัดเอาแค่ชื่อหน้า @ มาโชว์ */}
          </span>
          <div className="w-8 h-8 rounded-full cursor-pointer
          hover:border-white/30 px-4 py-2  shadow-[2px_2px_0px_white]
          bg-white/5 border border-white flex items-center justify-center text-white  text-xs uppercase">
            {username.substring(0, 1)} {/* เอาตัวอักษรตัวแรกมาทำเป็นโลโก้ */}
          </div>
        </div>
      </header>

      {/* hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-2 text-white/50 text-xs tracking-[0.5em] uppercase">
          AI-Powered
        </div>
        <h1 className="text-center mb-4">
          <span className="block text-6xl md:text-8xl font-black tracking-[0.15em] text-white ">
            WORKOUT
          </span>
          <span
            className="block text-6xl md:text-8xl font-black tracking-[0.2em] "
            style={{ WebkitTextStroke: "2px #ffffff60", color: "transparent" }}
          >
            TRAINER
          </span>
        </h1>
        <p className="text-white/50 text-sm tracking-widest mb-16 text-center">
          เลือกท่าออกกำลังกาย — AI วิเคราะห์ฟอร์มแบบ real-time
        </p>

        {/* 🟢 แก้ Grid ให้รองรับ 4 การ์ดได้สวยงามขึ้น */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-7xl">
          {EXERCISES.map((ex) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              onSelect={() => handleSelect(ex)}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-8 py-4 border-t-2 border-white text-[10px] text-white/15 tracking-widest">
        <span className="text-white font-semibold tracking-[0.2em]">
          MEDIAPIPE
        </span>
        <span className="w-1 h-1 rounded-full bg-white/60" />
        <span className="text-white font-semibold tracking-[0.2em]">
          SKLEARN
        </span>
        <span className="w-1 h-1 rounded-full bg-white/60" />
        <span className="text-white font-semibold tracking-[0.2em]">
          FASTAPI WEBSOCKET
        </span>
      </div>
    </div>
  );
}

function ExerciseCard({ ex, onSelect }) {
  // 🟢 เช็คว่าเปิดให้เล่นไหม เพื่อเปลี่ยนสี CSS
  const isAvailable = ex.available;

  return (
    <div
      onClick={onSelect}
      className={`group relative border rounded-xl p-6 transition-all duration-300 overflow-hidden 
        ${
          isAvailable
            ? "border-white/10 hover:border-white/30 cursor-pointer bg-white/5 hover:bg-white/10"
            : "border-white bg-black/40 cursor-not-allowed opacity-60 " // ทำให้การ์ด PVP ดูหม่นลง
        }`}
    >
      {/* glow (แสดงผลเฉพาะโหมดที่เปิดให้เล่น) */}
      {isAvailable && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${ex.accent}15 0%, transparent 70%)`,
          }}
        />
      )}

      {/* corner */}
      <div
        className={`absolute top-0 right-0 w-16 h-16 transition-opacity ${isAvailable ? "opacity-10 group-hover:opacity-40" : "opacity-5"}`}
        style={{
          background: `linear-gradient(225deg, ${ex.accent} 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10">
        <img
          src={ex.icon}
          alt={ex.label}
          className={`w-20 h-20 object-contain mb-4 ${!isAvailable && "grayscale"}`}
        />

        <div className="flex items-start justify-between mb-1">
          <div>
            <div
              className="text-2xl font-black tracking-tight transition-colors"
              style={{
                fontFamily: "'Arial Black', sans-serif",
                color: isAvailable ? ex.accent : "#888",
              }}
            >
              {ex.label}
            </div>
            <div className="text-white/40 text-xs">{ex.thai}</div>
          </div>
        </div>

        <div className="mt-2 flex gap-2 items-center">
          <span
            className="text-[9px] tracking-widest px-2 py-1 rounded"
            style={{
              color: isAvailable ? ex.accent : "#888",
              border: `1px solid ${isAvailable ? ex.accent + "30" : "#444"}`,
              backgroundColor: isAvailable ? ex.accent + "10" : "#222",
            }}
          >
            {ex.mode}
          </span>
          {!isAvailable && (
            <span className="text-[9px] font-black tracking-widest text-black bg-[#FAE251] px-2 py-1 rounded">
              SOON
            </span>
          )}
        </div>

        <p className="text-white/30 text-xs mt-3 mb-6 leading-relaxed min-h-10">
          {ex.desc}
        </p>

        <div className="flex items-center justify-between">
          <span
            className="flex items-center gap-2 text-[10px] font-black tracking-widest px-3 py-1.5 rounded border transition-colors"
            style={{
              borderColor: isAvailable ? `${ex.accent}40` : "#444",
              color: isAvailable ? ex.accent : "#666",
              backgroundColor: isAvailable ? "transparent" : "#111",
            }}
          >
            {isAvailable ? "START" : "LOCKED"} <GrNext />
          </span>
        </div>
      </div>
    </div>
  );
}
