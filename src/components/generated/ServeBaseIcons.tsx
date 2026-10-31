import type { ReactNode } from "react";
export type IconName =
  | "arrow"
  | "users"
  | "database"
  | "heart"
  | "calendar"
  | "download"
  | "check"
  | "book"
  | "layers"
  | "globe"
  | "link"
  | "building"
  | "chevron"
  | "menu"
  | "close"
  | "code"
  | "search"
  | "sun"
  | "moon"
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "shield";
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    moon: <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18M9.9 5.2A12 12 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.2 6.2A19 19 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.8-1.8M10 10a3 3 0 0 0 4 4" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" />
      </>
    ),
    heart: <path d="m12 20-8-8C-2 5 7 0 12 7c5-7 14-2 8 5z" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 11h18M8 15h3M8 18h6" />
      </>
    ),
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    check: <path d="m5 12 4 4L19 6" />,
    book: (
      <path d="M12 6v15M3 3c4 0 6 0 9 3 3-3 5-3 9-3v15c-4 0-6 0-9 3-3-3-5-3-9-3z" />
    ),
    layers: <path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    link: (
      <path
        d="m9 15 6-6M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"
        transform="translate(1 0) scale(.9)"
      />
    ),
    building: (
      <path d="M3 21h18M5 21V8h7v13M12 21V3h7v18M8 11v1m0 3v1m7-10v1m0 3v1m0 3v1" />
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
