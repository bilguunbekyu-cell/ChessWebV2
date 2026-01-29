import { CSSProperties } from "react";

export interface OptionSquares {
  [key: string]: {
    background: string;
    borderRadius: string;
  };
}

export interface RightClickedSquares {
  [key: string]:
    | {
        backgroundColor: string;
      }
    | undefined;
}

export interface PreMove {
  from: string;
  to: string;
  promotion?: "b" | "n" | "r" | "q";
}

export interface PreMoveSquares {
  [square: string]: CSSProperties;
}

export const convertCSSPropertiesToStringObject = (
  cssProperties: CSSProperties,
): Record<string, string> => {
  const stringObject: Record<string, string> = {};
  for (const key in cssProperties) {
    if (typeof cssProperties[key as keyof CSSProperties] === "string") {
      stringObject[key] = cssProperties[key as keyof CSSProperties] as string;
    }
  }
  return stringObject;
};
