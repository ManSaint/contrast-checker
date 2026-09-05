"use client";

import { useId, useRef, useState } from "react";
import { contrastRatio, evaluate, type Verdicts } from "@/lib/contrast";
import { parseColor, type RGB, rgbToHex } from "@/lib/parseColor";

export const DEFAULT_FOREGROUND = "#1a1a1a";
export const DEFAULT_BACKGROUND = "#ffffff";

// Fallback RGB values used only if the defaults above ever fail to parse
// (e.g. a future typo). Correctness of the defaults is enforced by
// app/ContrastChecker.defaults.test.ts, not by throwing at runtime.
const FALLBACK_FOREGROUND_RGB: RGB = { r: 26, g: 26, b: 26 };
const FALLBACK_BACKGROUND_RGB: RGB = { r: 255, g: 255, b: 255 };

const INVALID_COLOUR_MESSAGE =
  "Not a valid colour. Try a hex code (#ffffff), rgb(), or hsl() value.";

function rgbToCss({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}

type VerdictRow = {
  testId: string;
  name: string;
  threshold: string;
  key: keyof Verdicts;
};

const VERDICT_ROWS: readonly VerdictRow[] = [
  {
    testId: "verdict-aa-normal",
    name: "AA — Normal text",
    threshold: "requires ≥ 4.5:1",
    key: "aaNormal",
  },
  {
    testId: "verdict-aaa-normal",
    name: "AAA — Normal text",
    threshold: "requires ≥ 7:1",
    key: "aaaNormal",
  },
  {
    testId: "verdict-aa-large",
    name: "AA — Large text",
    threshold: "requires ≥ 3:1",
    key: "aaLarge",
  },
  {
    testId: "verdict-aaa-large",
    name: "AAA — Large text",
    threshold: "requires ≥ 4.5:1",
    key: "aaaLarge",
  },
];

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8.5L6.5 12L13 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ErrorIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 5.2V8.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

type ColourFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  pickerColour: RGB;
  errorId: string;
  isInvalid: boolean;
};

function ColourField({
  id,
  label,
  value,
  onChange,
  pickerColour,
  errorId,
  isInvalid,
}: ColourFieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-semibold text-[#9aa1ad] tracking-[0.01em]"
      >
        {label}
      </label>
      <div className="flex items-stretch gap-2.5">
        <input
          type="color"
          aria-label={`Colour picker for ${label}`}
          value={rgbToHex(pickerColour)}
          onChange={(event) => onChange(event.target.value)}
          data-testid={`picker-${id}`}
          className="flex-none w-11 h-11 rounded-lg border border-[#5b6478] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
        />
        <input
          type="text"
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          aria-invalid={isInvalid ? "true" : undefined}
          aria-describedby={isInvalid ? errorId : undefined}
          data-testid={`input-${id}`}
          className={`flex-1 min-w-0 h-11 rounded-lg border bg-[#1c2028] px-3.5 font-mono text-[15px] text-[#e8eaed] placeholder:text-[#6b7280] hover:border-[#4b5362] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4] ${
            isInvalid ? "border-[#f87171]" : "border-[#5b6478]"
          }`}
        />
      </div>
      {isInvalid ? (
        <span
          id={errorId}
          className="flex items-center gap-1.5 text-[13px] leading-snug text-[#fca5a5]"
        >
          <ErrorIcon />
          {INVALID_COLOUR_MESSAGE}
        </span>
      ) : null}
    </div>
  );
}

export function ContrastChecker(): React.JSX.Element {
  const [foregroundInput, setForegroundInput] = useState(DEFAULT_FOREGROUND);
  const [backgroundInput, setBackgroundInput] = useState(DEFAULT_BACKGROUND);
  const lastValidRef = useRef<{ foreground: RGB; background: RGB }>({
    foreground: parseColor(DEFAULT_FOREGROUND) ?? FALLBACK_FOREGROUND_RGB,
    background: parseColor(DEFAULT_BACKGROUND) ?? FALLBACK_BACKGROUND_RGB,
  });

  const foregroundErrorId = useId();
  const backgroundErrorId = useId();

  const parsedForeground = parseColor(foregroundInput);
  const parsedBackground = parseColor(backgroundInput);

  if (parsedForeground && parsedBackground) {
    lastValidRef.current = {
      foreground: parsedForeground,
      background: parsedBackground,
    };
  }

  const { foreground, background } = lastValidRef.current;
  const ratio = contrastRatio(foreground, background);
  const verdicts = evaluate(ratio);
  const foregroundCss = rgbToCss(foreground);
  const backgroundCss = rgbToCss(background);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-6 py-12 sm:py-16">
      <header className="flex flex-col gap-2 border-b border-[#2a2f3a] pb-6">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#5eead4]">
          Contrast Checker
        </span>
        <h1 className="m-0 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#e8eaed] text-balance">
          Check text and background colours against WCAG 2.2
        </h1>
        <p className="m-0 max-w-[60ch] text-[15px] leading-normal text-[#9aa1ad]">
          Enter a text colour and a background colour as hex, rgb(), or hsl().
          Results update as you type — no need to submit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 items-start md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-7">
          <form data-testid="contrast-form">
            <div className="flex flex-col gap-4.5">
              <ColourField
                id="fg-color"
                label="Text (foreground)"
                value={foregroundInput}
                onChange={setForegroundInput}
                pickerColour={
                  parsedForeground ?? lastValidRef.current.foreground
                }
                errorId={foregroundErrorId}
                isInvalid={!parsedForeground}
              />
              <ColourField
                id="bg-color"
                label="Background"
                value={backgroundInput}
                onChange={setBackgroundInput}
                pickerColour={
                  parsedBackground ?? lastValidRef.current.background
                }
                errorId={backgroundErrorId}
                isInvalid={!parsedBackground}
              />
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-[#2a2f3a]">
            <div className="border-b border-[#2a2f3a] bg-[#171a20] px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#9aa1ad]">
              Live preview
              {!(parsedForeground && parsedBackground) ? (
                <span className="ml-1.5 normal-case font-normal">
                  — showing last valid colours
                </span>
              ) : null}
            </div>
            <div
              className="flex flex-col gap-4 px-6 py-7"
              style={{ backgroundColor: backgroundCss }}
              data-testid="preview-surface"
            >
              <p
                className="m-0 text-base font-normal leading-relaxed"
                style={{ color: foregroundCss }}
              >
                Normal text sample, 16px regular — the quick brown fox.
              </p>
              <p
                className="m-0 text-2xl font-bold leading-snug"
                style={{ color: foregroundCss }}
              >
                Large text sample, 24px bold
              </p>
            </div>
          </div>
        </div>

        <output aria-live="polite" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#2a2f3a] bg-[#171a20] px-7 pt-7 pb-6">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#9aa1ad]">
              Contrast ratio
            </span>
            <div
              className="font-mono text-[56px] font-bold leading-none tracking-[-0.02em] text-[#e8eaed]"
              data-testid="ratio"
            >
              {ratio.toFixed(1)}
              <span className="ml-1 text-2xl font-medium text-[#9aa1ad]">
                :1
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#2a2f3a] bg-[#171a20]">
            {VERDICT_ROWS.map((row, index) => {
              const passed = verdicts[row.key];
              return (
                <div
                  key={row.testId}
                  className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                    index < VERDICT_ROWS.length - 1
                      ? "border-b border-[#2a2f3a]"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-[#e8eaed]">
                      {row.name}
                    </span>
                    <span className="font-mono text-[12.5px] text-[#9aa1ad]">
                      {row.threshold}
                    </span>
                  </div>
                  <span
                    data-testid={row.testId}
                    className={`inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-bold tracking-[0.01em] ${
                      passed
                        ? "border-[#4ade8059] bg-[#4ade801f] text-[#4ade80]"
                        : "border-[#f8717159] bg-[#f871711f] text-[#f87171]"
                    }`}
                  >
                    {passed ? <CheckIcon /> : <CrossIcon />}
                    {passed ? "Pass" : "Fail"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[12.5px] leading-relaxed text-[#9aa1ad]">
            Large text = 18.66px bold or larger, or 24px or larger at any
            weight.
          </p>
        </output>
      </div>
    </div>
  );
}
