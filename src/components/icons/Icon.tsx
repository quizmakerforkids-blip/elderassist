import pathsCore from './pathsCore';
import pathsExtra from './pathsExtra';

const PATHS = { ...pathsCore, ...pathsExtra } as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="brand-mark"
    >
      <rect width="40" height="40" rx="10" fill="#3fc1ae" opacity="0.16" />
      <path
        d="M7 21h6l2.5-6 4 11 2.8-7.5h10.7"
        stroke="#3fc1ae"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
