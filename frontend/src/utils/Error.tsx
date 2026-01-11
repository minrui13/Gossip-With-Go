import axios from "axios";
import { toast } from "react-toastify";
import { ErrorHandleOptions } from "../types/UtilsType";

export default function handleError(
  error: any,
  options?: ErrorHandleOptions
) {
  setTimeout(() => {
    if (axios.isAxiosError(error)) {
      toast(error.response?.data?.error, {
        autoClose: 3000,
        type: "error",
      });
      options?.onAxiosError?.(error.response?.data?.error)
    } else {
      toast("An unexpected error occurred", {
        autoClose: 3000,
        type: "error",
      });
      options?.onOtherError?.("An unexpected error occurred")
    }
    
  }, 800);
}
