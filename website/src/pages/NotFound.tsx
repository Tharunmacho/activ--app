import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
<<<<<<< HEAD
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-3 sm:mb-4 text-[2.25rem] sm:text-[2.5rem] font-bold">404</h1>
        <p className="mb-4 text-[1.25rem] text-gray-600 break-words">Oops! Page not found</p>
        <a href="/" className="inline-flex min-h-10 items-center text-blue-500 underline hover:text-blue-700">
=======
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
>>>>>>> 8020f5d (Initial commit for website frontend)
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
