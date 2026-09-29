import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * One small inline icon set (outline, 1.75px stroke, 20/24px grid) instead of an icon library
 * dependency. Every icon is decorative by default (aria-hidden) - callers pass a visible label
 * or wrap in a control that supplies its own accessible name.
 */
function Base({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
  </Base>
);

export const IconBook = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5z" />
    <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </Base>
);

export const IconLayers = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 3 8l9 5 9-5z" />
    <path d="M3 12l9 5 9-5" />
    <path d="M3 16l9 5 9-5" />
  </Base>
);

export const IconBell = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Base>
);

export const IconMail = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 6.5 8 6 8-6" />
  </Base>
);

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </Base>
);

export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c.9-2.8 3-4.5 6-4.5s5.1 1.7 6 4.5" />
    <path d="M15.5 5.5c1.4.3 2.5 1.5 2.5 3s-1.1 2.7-2.5 3" />
    <path d="M17.5 14.6c1.9.6 3.1 2 3.7 4.4" />
  </Base>
);

export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M16 16l4-4-4-4" />
    <path d="M20 12H9" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Base>
);

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 6 6 6-6 6" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 13 4 4L19 7" />
  </Base>
);

export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Base>
);

export const IconSend = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 4.5 20 12 4.5 19.5 7 12z" />
  </Base>
);

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 2 20h20Z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Base>
);

export const IconInbox = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12h4l1.5 3h5L16 12h4" />
    <path d="M4 12 5.5 5.6A2 2 0 0 1 7.5 4h9a2 2 0 0 1 2 1.6L20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
  </Base>
);

export const IconEye = (p: IconProps) => (
  <Base {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </Base>
);

export const IconEyeOff = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.7A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.1 3.9M6.5 7.5C4 9.3 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 3.4-.6" />
    <path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9" />
  </Base>
);

export const IconArrowLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </Base>
);

export const IconClipboard = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <path d="M9 11h6M9 15h6" />
  </Base>
);

export const IconServerOff = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 3l18 18" />
    <rect x="3.5" y="4" width="17" height="7" rx="1.5" />
    <rect x="3.5" y="13" width="17" height="7" rx="1.5" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </Base>
);
