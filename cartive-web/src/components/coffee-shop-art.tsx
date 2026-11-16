import CoffeeBeanIcon from "@/components/coffee-bean-icon";

export default function CoffeeShopArt() {
  return (
    <div className="coffee-shop-art" aria-hidden="true">
      <div className="coffee-art-sun" />
      <CoffeeBeanIcon className="coffee-art-bean coffee-art-bean-one" />
      <CoffeeBeanIcon className="coffee-art-bean coffee-art-bean-two" />
      <CoffeeBeanIcon className="coffee-art-bean coffee-art-bean-three" />
      <svg className="coffee-art-cup" viewBox="0 0 300 270" fill="none">
        <defs>
          <linearGradient id="cup-glaze" x1="62" y1="106" x2="221" y2="190" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d7a977" />
            <stop offset=".48" stopColor="#f4e3c9" />
            <stop offset="1" stopColor="#c79562" />
          </linearGradient>
        </defs>
        <path className="coffee-art-steam" d="M111 64c-14-17 11-24 0-42m42 42c-14-17 11-24 0-42m42 42c-14-17 11-24 0-42" />
        <ellipse className="coffee-art-shadow" cx="153" cy="228" rx="105" ry="17" />
        <path className="coffee-art-handle" d="M215 121h17c23 0 39 15 39 37s-16 38-39 38h-23" />
        <path className="coffee-art-cup-body" d="M62 91h165l-14 112c-2 17-17 30-34 30h-68c-17 0-32-13-34-30L62 91Z" />
        <path className="coffee-art-coffee" d="M70 99h149l-3 27H73l-3-27Z" />
        <path className="coffee-art-rim" d="M58 91c0-7 6-12 13-12h149c7 0 13 5 13 12s-6 12-13 12H71c-7 0-13-5-13-12Z" />
        <path className="coffee-art-cup-shine" d="m83 141 8 61c1 10 8 17 18 18" />
        <path className="coffee-art-logo" d="M135 157c9-13 25-16 35-7 10 9 8 26-4 38-10 10-25 11-33 3-8-8-7-23 2-34Z" />
        <path className="coffee-art-logo-line" d="M162 153c-1 10-5 19-12 26-4 4-9 8-15 10" />
        <path className="coffee-art-saucer" d="M40 224c21 17 56 26 113 26s92-9 113-26" />
      </svg>
      <div className="coffee-art-stamp">
        <span>SMALL BATCH</span>
        <strong>GOOD<br />ENERGY</strong>
        <span>BREWED WITH CARE</span>
      </div>
      <span className="coffee-art-caption">REKA & SELA · 250 ML</span>
    </div>
  );
}
