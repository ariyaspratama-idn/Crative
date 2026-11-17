import Image from "next/image";

export default function ProductBottle({
  tone,
  line,
}: {
  tone: string;
  line?: string;
}) {
  const isSela = tone === "caramel" || tone === "cream" || tone === "honey";

  return (
    <div className={`bottle-scene bottle-scene-${tone}`} aria-hidden="true">
      <span className="bottle-shadow" />
      <span className="bottle-cap" />
      <span className="bottle-neck" />
      <span className="bottle-shape">
        <span className="bottle-highlight" />
        <span className="bottle-label">
          <span className="label-brand">cartive</span>
          <span className="label-line">{line ?? (isSela ? "SELA" : "REKA")}</span>
          <span className="label-volume">COFFEE · 250 ML</span>
        </span>
      </span>
    </div>
  );
}

export function ProductArtwork({
  tone,
  imageUrl,
  name,
  line,
}: {
  tone: string;
  imageUrl: string | null;
  name: string;
  line: string;
}) {
  if (!imageUrl) return <ProductBottle tone={tone} line={line} />;
  return (
    <span className="product-photo-scene">
      <Image
        className="product-photo"
        src={imageUrl}
        alt={name}
        fill
        sizes="(max-width: 700px) 65vw, 320px"
        unoptimized
      />
    </span>
  );
}
