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
