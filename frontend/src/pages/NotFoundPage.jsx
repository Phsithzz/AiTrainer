import notfound from "../assets/images/notfound.gif";
import { GoArrowLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center gap-8 px-6"
      style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}>
      <img src={notfound} alt="404 Not Found" className="w-64 h-auto hidden md:block" />
      <div className="flex flex-col gap-6 text-center md:text-left">
        <div>
          <div className="text-[10px] tracking-[0.4em] text-red-500 font-bold uppercase mb-3">404 — PAGE NOT FOUND</div>
          <h1 className="text-6xl font-black tracking-widest text-white mb-2">OOPS!</h1>
          <h3 className="text-2xl font-bold text-zinc-400 leading-relaxed">
            We couldn't find the page<br />you were looking for.
          </h3>
        </div>
        <button
          onClick={() => navigate("/")}
          className="cursor-pointer w-fit mx-auto md:mx-0 flex items-center gap-3 px-8 py-3 bg-white text-black font-black text-sm tracking-widest rounded-full hover:bg-zinc-200 transition-all duration-300"
        >
          <GoArrowLeft className="text-xl" />
          GO HOME
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
