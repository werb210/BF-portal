import type { PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";

const ToastProvider = ({ children }: PropsWithChildren) => (
  <>
    {children}
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
  </>
);

export default ToastProvider;
