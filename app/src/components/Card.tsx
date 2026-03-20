import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-2xl shadow-sm p-5 ${className}`}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
