import { useState, useCallback, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TOGGLE
   ═══════════════════════════════════════════════════════ */
interface ToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  color?: string; // tailwind bg class like "bg-teal-500"
  disabled?: boolean;
  ariaLabel?: string;
}

export function Toggle({
  enabled,
  onChange,
  color = "bg-teal-500",
  disabled = false,
  ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-40 disabled:cursor-not-allowed ${
        enabled ? color : "bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   SEGMENTED CONTROL
   ═══════════════════════════════════════════════════════ */
interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-800 p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
            value === opt.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SETTINGS CARD
   ═══════════════════════════════════════════════════════ */
interface SettingsCardProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  accent?: string; // gradient from color
}

export function SettingsCard({
  icon,
  title,
  subtitle,
  children,
  className = "",
  accent,
}: SettingsCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm transition-colors duration-300 ${className}`}
    >
      {/* Subtle glow accent */}
      {accent && (
        <div
          className={`absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none ${accent}`}
        />
      )}
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800/60">
          {icon && <span className="shrink-0">{icon}</span>}
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {/* Body */}
        <div className="px-6 py-4 space-y-1">{children}</div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SETTING ROW
   ═══════════════════════════════════════════════════════ */
interface SettingRowProps {
  label: string;
  helper?: string;
  children: ReactNode;
  last?: boolean;
}

export function SettingRow({ label, helper, children, last }: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 ${
        !last ? "border-b border-gray-100 dark:border-gray-800/50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {label}
        </div>
        {helper && (
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">
            {helper}
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SELECT DROPDOWN
   ═══════════════════════════════════════════════════════ */
interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  className = "",
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all cursor-pointer ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ═══════════════════════════════════════════════════════
   SLIDER
   ═══════════════════════════════════════════════════════ */
interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  label?: string;
}

export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
}: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-teal-500 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
      />
      {label && (
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[2.5rem] text-right">
          {label}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COLOR SWATCH PICKER
   ═══════════════════════════════════════════════════════ */
interface ColorSwatchPickerProps {
  options: { value: string; bg: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

export function ColorSwatchPicker({
  options,
  value,
  onChange,
}: ColorSwatchPickerProps) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={`w-7 h-7 rounded-full ${opt.bg} transition-all duration-150 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ${
            value === opt.value
              ? "ring-2 ring-teal-400 scale-110"
              : "hover:scale-105 opacity-70 hover:opacity-100"
          }`}
        >
          {value === opt.value && (
            <Check className="w-3.5 h-3.5 mx-auto text-white drop-shadow" />
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BOARD THEME SWATCHES
   ═══════════════════════════════════════════════════════ */
interface BoardThemePickerProps {
  options: { value: string; light: string; dark: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

export function BoardThemePicker({
  options,
  value,
  onChange,
}: BoardThemePickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-150 ${
            value === opt.value
              ? "border-teal-500 scale-110 shadow-md"
              : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          <div className="flex h-full">
            <div className={`w-1/2 ${opt.light}`} />
            <div className={`w-1/2 ${opt.dark}`} />
          </div>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════ */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className={`${maxWidth} w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   TOAST NOTIFICATION
   ═══════════════════════════════════════════════════════ */
interface ToastProps {
  message: string;
  type?: "success" | "error";
  visible: boolean;
  onClose: () => void;
}

export function Toast({
  message,
  type = "success",
  visible,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          className="fixed top-6 right-6 z-[9999]"
        >
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-xl ${
              type === "success"
                ? "bg-teal-500/90 border-teal-400/30 text-white"
                : "bg-red-500/90 border-red-400/30 text-white"
            }`}
          >
            {type === "success" ? (
              <Check className="w-4 h-4" />
            ) : (
              <X className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   useToast hook
   ═══════════════════════════════════════════════════════ */
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const show = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type, visible: true });
    },
    [],
  );

  const hide = useCallback(() => {
    setToast((p) => ({ ...p, visible: false }));
  }, []);

  return { toast, show, hide };
}
