import { PropsWithChildren, useEffect, useRef } from "react";
import i18n from "./index";

type SupportedLanguage = "en" | "mn";

const TRANSLATABLE_ATTRIBUTES = ["title", "placeholder", "aria-label"] as const;
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);

type TrackedTextNode = Text & { __originalText?: string };
type TrackedElement = HTMLElement & { __originalAttrs?: Partial<Record<(typeof TRANSLATABLE_ATTRIBUTES)[number], string>> };

const preserveWhitespace = (original: string, translatedCore: string): string => {
  const leading = original.match(/^\s*/) ?? [""];
  const trailing = original.match(/\s*$/) ?? [""];
  return `${leading[0]}${translatedCore}${trailing[0]}`;
};

const translateCoreText = (text: string, language: SupportedLanguage): string => {
  if (language !== "mn") return text;

  const exact = i18n.t(text, { defaultValue: text });
  if (exact && exact !== text) {
    return exact;
  }

  const patternRules: Array<[RegExp, (...parts: string[]) => string]> = [
    [/^Lvl\s+(\d+)$/i, (level) => `Түв ${level}`],
    [/^Mate in\s+(\d+)$/i, (moves) => `${moves} нүүдэлд мат`],
    [/^Starting in\s+(\d+)h$/i, (hours) => `${hours}ц дараа эхэлнэ`],
    [/^(\d+)\s+hours remaining$/i, (hours) => `${hours} цаг үлдсэн`],
    [/^(\d+)\s+day$/i, (days) => `${days} өдөр`],
    [/^(\d+)\s+days$/i, (days) => `${days} өдөр`],
    [/^(\d+)\s+min$/i, (minutes) => `${minutes} мин`],
    [/^White Won \(1-0\)$/i, () => "Цагаан хожсон (1-0)"],
    [/^Black Won \(0-1\)$/i, () => "Хар хожсон (0-1)"],
    [/^Draw \(1\/2-1\/2\)$/i, () => "Тэнцээ (1/2-1/2)"],
    [/^Your account has been banned\. Reason:\s*(.+)$/i, (reason) => `Таны бүртгэл хориглогдсон. Шалтгаан: ${reason}`],
  ];

  for (const [pattern, transformer] of patternRules) {
    const match = text.match(pattern);
    if (!match) continue;
    return transformer(...match.slice(1));
  }

  return text;
};

const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

const processTextNode = (node: TrackedTextNode, language: SupportedLanguage): void => {
  const parentTagName = node.parentElement?.tagName;
  if (parentTagName && SKIPPED_TAGS.has(parentTagName)) {
    return;
  }

  if (node.__originalText === undefined) {
    node.__originalText = node.nodeValue ?? "";
  }

  const original = node.__originalText;
  const core = normalizeText(original);
  if (!core) {
    if (node.nodeValue !== original) {
      node.nodeValue = original;
    }
    return;
  }

  const translatedCore = translateCoreText(core, language);
  const nextValue = preserveWhitespace(original, translatedCore);
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
};

const processAttributes = (element: TrackedElement, language: SupportedLanguage): void => {
  if (SKIPPED_TAGS.has(element.tagName)) return;

  if (!element.__originalAttrs) {
    element.__originalAttrs = {};
  }

  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attr);
    if (current === null) continue;

    if (!element.__originalAttrs[attr]) {
      element.__originalAttrs[attr] = current;
    }

    const original = element.__originalAttrs[attr] ?? current;
    const core = normalizeText(original);
    if (!core) continue;

    const translatedCore = translateCoreText(core, language);
    const nextValue = preserveWhitespace(original, translatedCore);
    if (current !== nextValue) {
      element.setAttribute(attr, nextValue);
    }
  }
};

const processNode = (node: Node, language: SupportedLanguage): void => {
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node as TrackedTextNode, language);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as TrackedElement;
  processAttributes(element, language);

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    processTextNode(textNode as TrackedTextNode, language);
    textNode = walker.nextNode();
  }

  const allElements = element.querySelectorAll<TrackedElement>("*");
  allElements.forEach((child) => processAttributes(child, language));
};

export function AutoTranslate({
  language,
  children,
}: PropsWithChildren<{ language: SupportedLanguage }>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    processNode(root, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          processNode(mutation.target, language);
          continue;
        }

        if (mutation.type === "attributes") {
          processNode(mutation.target, language);
          continue;
        }

        for (const addedNode of mutation.addedNodes) {
          processNode(addedNode, language);
        }
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [language]);

  return (
    <div ref={rootRef} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
