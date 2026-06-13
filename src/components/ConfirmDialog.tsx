"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";

export type DialogVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      ring: "border-rose-500/20 bg-rose-500/5",
      iconBg: "bg-rose-500/10",
      confirmBtn: "bg-rose-500 hover:bg-rose-600 text-white",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      ring: "border-amber-500/20 bg-amber-500/5",
      iconBg: "bg-amber-500/10",
      confirmBtn: "bg-amber-500 hover:bg-amber-600 text-black",
    },
    info: {
      icon: <Info className="w-5 h-5 text-sky-400" />,
      ring: "border-sky-500/20 bg-sky-500/5",
      iconBg: "bg-sky-500/10",
      confirmBtn: "bg-sky-500 hover:bg-sky-600 text-white",
    },
  }[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.65)" }}
          onClick={onCancel}
        >
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm double-bezel-outer bg-zinc-950/98 backdrop-blur-xl shadow-2xl"
          >
            <div className="double-bezel-inner p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${variantStyles.iconBg} flex items-center justify-center shrink-0`}>
                    {variantStyles.icon}
                  </div>
                  <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
                </div>
                <button
                  onClick={onCancel}
                  className="text-zinc-600 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message */}
              <div className={`p-3.5 rounded-xl border ${variantStyles.ring}`}>
                <p className="text-xs text-zinc-300 leading-relaxed">{message}</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 text-xs font-semibold transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-[1.4] py-2.5 rounded-xl text-xs font-bold transition-colors btn-haptic ${variantStyles.confirmBtn}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Lightweight hook to imperatively open a ConfirmDialog */
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    variant: DialogVariant;
    resolve: ((val: boolean) => void) | null;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    variant: "danger",
    resolve: null,
  });

  const confirm = React.useCallback(
    (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: DialogVariant }) =>
      new Promise<boolean>((resolve) => {
        setState({
          open: true,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? "Confirm",
          cancelLabel: opts.cancelLabel ?? "Cancel",
          variant: opts.variant ?? "danger",
          resolve,
        });
      }),
    []
  );

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state]);

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state]);

  const DialogNode = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, DialogNode };
}
