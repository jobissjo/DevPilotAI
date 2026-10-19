import type { CSSProperties } from "react";

const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  repo: "M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M3 17h16 M8 7h6 M8 10h4",
  spark: "m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z",
  plus: "M12 5v14 M5 12h14",
  arrow: "M5 12h14 m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  search: "M21 21l-5-5 M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15",
  github:
    "M9 19c-4 1-4-2-6-2 M9 22v-4c-4-1-6-3-6-7 0-2 1-3 2-4 0-1 0-3 1-4 2 0 3 1 4 1a13 13 0 0 1 4 0c1 0 2-1 4-1 1 1 1 3 1 4 1 1 2 2 2 4 0 4-2 6-6 7v4",
  branch: "M6 6v12 M6 12c8 0 12-2 12-6 M3 3h6v6H3z M3 15h6v6H3z M15 3h6v6h-6z",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18",
  close: "m6 6 12 12 M6 18 18 6",
  logout: "M9 3H4v18h5 M9 12h12 m-5-5 5 5-5 5",
  external: "M14 3h7v7 M21 3l-12 12 M10 3H3v18h18v-7",
  edit: "m15 4 5 5 M4 15 16 3l5 5L9 20l-6 1Z",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  refresh: "M20 7a9 9 0 1 0 1 9 M20 2v6h-6",
  alert: "m12 3 10 18H2Z M12 9v5 M12 17v1",
  code: "m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18",
  shield: "m12 3 9 4v5c0 5-9 9-9 9s-9-4-9-9V7Z m-5 9 3 3 6-6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  mail: "M3 5h18v14H3z m0 0 9 8 9-8",
  file: "M14 2H5v20h14V7Z M14 2v6h5 M8 13h8 M8 17h6",
} satisfies Record<string, string>;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
