import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useGoBack() {
  const navigate = useNavigate();

  return useCallback(() => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);
}

export default useGoBack;
