export default function Dashboard({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x={4} y={4} width={6} height={6} rx={1} />
      <rect x={14} y={4} width={6} height={6} rx={1} />
      <rect x={4} y={14} width={6} height={6} rx={1} />
      <rect x={14} y={14} width={6} height={6} rx={1} />
    </svg>
  )
}
