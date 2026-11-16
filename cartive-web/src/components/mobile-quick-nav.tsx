import Link from "next/link";

type MobileQuickNavProps = {
  active?: "beranda" | "menu" | "kartu" | "pesanan" | "profil";
};

const links = [
  { id: "beranda", href: "/", icon: "⌂", label: "Beranda" },
  { id: "menu", href: "/menu", icon: "◈", label: "Menu" },
  { id: "kartu", href: "/kartu", icon: "✳", label: "Kartu" },
  { id: "pesanan", href: "/pesanan", icon: "↗", label: "Pesanan" },
  { id: "profil", href: "/profil", icon: "○", label: "Profil" },
] as const;

export default function MobileQuickNav({ active }: MobileQuickNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Navigasi cepat">
      {links.map((link) => (
        <Link
          aria-current={active === link.id ? "page" : undefined}
          className={link.id === "kartu" ? "mobile-nav-main" : undefined}
          href={link.href}
          key={link.id}
        >
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
