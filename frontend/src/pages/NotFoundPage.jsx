//photos
import notfound from "../assets/images/notfound.gif"
//icons
import { GoArrowLeft } from "react-icons/go";
//router
import { useNavigate } from "react-router-dom";
//usestate
import { useState } from "react";
//spinner
import { BarLoader } from "react-spinners";
const NotFoundPage = () => {
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loadingSpin = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setLoading(false);
    navigate("/");
  };

  return (
    <>
      <div className="bg-white flex justify-center items-center gap-4  ">
        <div className="">
          <img src={notfound} alt="404 Not Found " className="w-150 h-100 " />
        </div>
        <div className="flex flex-col gap-y-4">
          <div className="">
            <h1 className="text-6xl font-semibold">Oops!</h1>
            <h3 className="text-4xl font-semibold">
              We couldn't find the page <br />
              you were looking for
            </h3>
          </div>

          <button
            onClick={loadingSpin}
            disabled={loading}
            to="/"
            className="bg-black w-fit flex justify-center gap-2 items-center h-10 p-4 rounded-full group transition ease-in duration-400 hover:bg-white hover:border"
          >
            {loading ? (
              <BarLoader color="white" />
            ) : (
              <>
                <GoArrowLeft className="text-white text-2xl group-hover:text-black" />
                <button
                  type="button"
                  className="text-white text-lg font-semibold group-hover:text-black"
                >
                  Go Home
                </button>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
