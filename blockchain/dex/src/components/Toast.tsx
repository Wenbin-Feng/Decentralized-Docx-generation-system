import { useEffect } from "react";

export interface ToastData {
  type: "success" | "error" | "info";
  title: string;
  message: string;
  txHash?: string;
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

const ICONS = {
  success: (
    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

const BORDERS = {
  success: "border-green-500/30",
  error: "border-red-500/30",
  info: "border-blue-500/30",
};

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast || toast.type === "info") return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div
        className={`bg-gray-900 border ${BORDERS[toast.type]} rounded-2xl p-4 shadow-2xl max-w-sm flex gap-3 items-start`}
      >
        <div className="mt-0.5">{ICONS[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{toast.title}</p>
          <p className="text-xs text-gray-400 mt-1 break-all">{toast.message}</p>
          {toast.txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${toast.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-pink-400 hover:text-pink-300 mt-1 inline-block"
            >
              Etherscan 查看 &rarr;
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-lg leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
