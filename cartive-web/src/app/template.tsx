import { Suspense, type ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="page-transition">{children}</div>}>
      <PageTransition>{children}</PageTransition>
    </Suspense>
  );
}
