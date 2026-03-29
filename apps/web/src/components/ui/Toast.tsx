import hotToast, { Toaster, type Toast as HotToastType } from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  t: HotToastType;
  message: string;
}

function SuccessToast({ t, message }: ToastProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${
        t.visible ? 'animate-slide-in-right' : 'animate-slide-out-right'
      } pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-white/[0.06] bg-[#1a1a26] px-4 py-3 shadow-lg`}
    >
      <CheckCircle className="h-5 w-5 shrink-0 text-[#22c55e]" />
      <p className="text-sm font-medium text-[#f0f0f5]">{message}</p>
    </div>
  );
}

function ErrorToast({ t, message }: ToastProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${
        t.visible ? 'animate-slide-in-right' : 'animate-slide-out-right'
      } pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-white/[0.06] bg-[#1a1a26] px-4 py-3 shadow-lg`}
    >
      <XCircle className="h-5 w-5 shrink-0 text-[#f87171]" />
      <p className="text-sm font-medium text-[#f0f0f5]">{message}</p>
    </div>
  );
}

export const toast = {
  success: (msg: string) =>
    hotToast.custom((t) => <SuccessToast t={t} message={msg} />, { duration: 4000 }),
  error: (msg: string) =>
    hotToast.custom((t) => <ErrorToast t={t} message={msg} />, { duration: 5000 }),
};

export { Toaster };
