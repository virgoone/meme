import type React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export function XIcon(props: IconProps = {}) {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M6 18L12 12M12 12L18 6M12 12L6 6M12 12L18 18'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

export function XSquareIcon(props: IconProps = {}) {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M9.00004 15L12 12M12 12L15 8.99998M12 12L9.00004 8.99998M12 12L15 15M12 20.9999C9.20435 20.9999 7.80653 20.9999 6.7039 20.5432C5.23373 19.9342 4.06569 18.7661 3.45672 17.296C3 16.1934 3 14.7955 3 11.9999C3 9.20423 3 7.8064 3.45672 6.70378C4.06569 5.23361 5.23373 4.06556 6.7039 3.4566C7.80653 2.99988 9.20435 2.99988 12 2.99988C14.7956 2.99988 16.1935 2.99988 17.2961 3.4566C18.7663 4.06556 19.9343 5.23361 20.5433 6.70378C21 7.8064 21 9.20423 21 11.9999C21 14.7955 21 16.1934 20.5433 17.296C19.9343 18.7661 18.7663 19.9342 17.2961 20.5432C16.1935 20.9999 14.7956 20.9999 12 20.9999Z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

export function NewCommentIcon(props: IconProps = {}) {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M9 12H12M12 12H15M12 12V9M12 12V15M21 12C21 16.9706 16.9706 21 12 21C11.5683 21 11.1437 20.9696 10.7283 20.9108C9.52459 20.7406 8.92273 20.6555 8.76429 20.6433C8.5069 20.6234 8.59919 20.6266 8.34105 20.6286C8.18217 20.6298 8.00106 20.6428 7.6393 20.6686L5.48597 20.8224C4.62856 20.8837 4.19982 20.9143 3.87922 20.7623C3.59778 20.6289 3.37113 20.4022 3.2377 20.1208C3.0857 19.8002 3.11632 19.3715 3.17757 18.514L3.33138 16.3607C3.35723 15.9988 3.37015 15.8179 3.37139 15.6589C3.37339 15.4008 3.37659 15.4931 3.35674 15.2357C3.34452 15.0773 3.2594 14.4754 3.08915 13.2717C3.03039 12.8563 3 12.4317 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

export function EyeOpenIcon(props: IconProps = {}) {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M21 12C21 14 17.5 19 12 19C6.5 19 3 14 3 12C3 10 6.5 5 12 5C17.5 5 21 10 21 12Z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

export function EyeCloseIcon(props: IconProps = {}) {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M21 3L17.2929 6.70712M3 21L6.70713 17.2929M17.2929 6.70712C15.8674 5.71248 14.0762 5 12 5C6.5 5 3 10 3 12C3 13.245 4.35633 15.6526 6.70713 17.2929M17.2929 6.70712L14.1213 9.87868M14.1213 9.87868C13.5784 9.33579 12.8284 9 12 9C10.3431 9 9 10.3431 9 12C9 12.8284 9.33579 13.5784 9.87868 14.1213M14.1213 9.87868L9.87868 14.1213M9.87868 14.1213L6.70713 17.2929M10 18.7735C10.6322 18.919 11.2999 19 12 19C17.5 19 21 14 21 12C21 11.2821 20.5491 10.1778 19.7166 9.05684M13 14.8293C13.8524 14.528 14.528 13.8524 14.8293 13'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
