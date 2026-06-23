import { toast as sonnerToast, Toaster } from "sonner";

export function useToast() {
  const toast = {
    success: (message: string, options?: { description?: string }) =>
      sonnerToast.success(message, options),
    error: (message: string, options?: { description?: string }) =>
      sonnerToast.error(message, options),
    warning: (message: string, options?: { description?: string }) =>
      sonnerToast.warning(message, options),
    info: (message: string, options?: { description?: string }) =>
      sonnerToast.info(message, options),
    promise: <T,>(
      promise: Promise<T>,
      messages: { loading: string; success: string; error: string }
    ) => sonnerToast.promise(promise, messages),
  };

  return { toast, Toaster };
}

export { Toaster } from "sonner";