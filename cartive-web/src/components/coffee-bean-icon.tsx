export default function CoffeeBeanIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`coffee-bean-icon ${className}`.trim()}
      viewBox="0 0 32 32"
      fill="none"
    >
      <path d="M23.8 4.8C17.9 1.7 9 6.1 5.3 14.4c-3.1 7 .1 13.1 5.5 13.1 7.3 0 16.3-9.2 16.3-16.3 0-2.8-1.1-5.1-3.3-6.4Z" />
      <path d="M21.5 6.3c-1.1 4.7-3.2 8.7-6.1 12.1-2.2 2.6-4.9 4.8-8.1 6.7" />
    </svg>
  );
}
