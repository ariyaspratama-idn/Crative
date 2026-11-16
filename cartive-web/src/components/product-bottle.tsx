export default function ProductBottle({ tone }: { tone: string }) {
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
          <span className="label-line">{isSela ? "SELA" : "REKA"}</span>
          <span className="label-volume">COFFEE · 250 ML</span>
        </span>
      </span>
    </div>
  );
}
