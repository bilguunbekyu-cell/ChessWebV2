import { Sparkles, Loader2 } from "lucide-react";

interface ExplanationContentProps {
  title: string;
  description: string;
  details: string;
  aiExplanation: string | null;
  aiLoading: boolean;
  aiError: string | null;
  showAiBadge: boolean;
}

export function ExplanationContent({
  title,
  description,
  details,
  aiExplanation,
  aiLoading,
  aiError,
  showAiBadge,
}: ExplanationContentProps) {
  return (
    <>
      {}
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        {title}
        {showAiBadge && (
          <span className="inline-flex items-center gap-1 text-xs font-normal text-purple-500">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        )}
      </h4>

      {}
      {aiLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Getting AI explanation...</span>
        </div>
      ) : aiExplanation ? (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">
          {aiExplanation}
        </p>
      ) : (
        <>
          {}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {description}
          </p>

          {}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {details}
          </p>
        </>
      )}

      {}
      {aiError && (
        <p className="text-xs text-red-500 dark:text-red-400 mb-2">{aiError}</p>
      )}
    </>
  );
}
