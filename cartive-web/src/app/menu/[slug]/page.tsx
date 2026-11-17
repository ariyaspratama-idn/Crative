import { Suspense } from "react";
import ProductDetail from "@/components/product-detail";

export default function ProductPage({
  params,
}: PageProps<"/menu/[slug]">) {
  return (
    <Suspense
      fallback={
        <main className="site-shell">
          <section className="product-page section-wrap" aria-live="polite">
            <p className="admin-empty">Memuat informasi produk…</p>
          </section>
        </main>
      }
    >
      <ProductPageContent params={params} />
    </Suspense>
  );
}

async function ProductPageContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
