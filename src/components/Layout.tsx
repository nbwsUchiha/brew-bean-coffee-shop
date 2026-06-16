import { Link, Outlet, useLocation } from "react-router-dom";
import CartLink from "./CartLink";

const nav = [
  { to: "/", label: "Home" },
  { to: "/catalog", label: "Menu" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/account", label: "Account" },
];

const footerLinks = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
  { to: "/shipping", label: "Pickup & Delivery" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/refunds", label: "Refunds" },
];

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="page-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/">
          <img className="brand-logo" src="/logo.svg" alt="Brew & Bean logo" />
          <span>
            Brew &amp; Bean
            <small>Artisan Coffee</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          {nav.map(({ to, label }) => (
            <Link key={to} to={to} className={pathname === to ? "active" : undefined}>
              {label}
            </Link>
          ))}
          <CartLink />
        </nav>
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <strong>Brew &amp; Bean Coffee</strong>
          <p>Open daily · 7am – 7pm · Pickup in ~15 minutes</p>
          <nav className="footer-nav" aria-label="Footer">
            {footerLinks.map(({ to, label }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="footer-note">Freshly roasted · Locally loved</p>
      </footer>
    </div>
  );
}
