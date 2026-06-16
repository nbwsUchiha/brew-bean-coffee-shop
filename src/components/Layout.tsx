import { Link, Outlet, useLocation } from "react-router-dom";

const nav = [
  { to: "/", label: "Home" },
  { to: "/catalog", label: "Menu" },
  { to: "/login", label: "Account" },
];

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="page-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <img className="brand-logo" src="/logo.svg" alt="" />
          <span>
            Brew &amp; Bean
            <small>Artisan Coffee</small>
          </span>
        </Link>
        <nav className="site-nav">
          {nav.map(({ to, label }) => (
            <Link key={to} to={to} className={pathname === to ? "active" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <strong>Brew &amp; Bean Coffee</strong>
          <p>Open daily · 7am – 7pm · Pickup in 15 minutes</p>
        </div>
        <p className="footer-note">Freshly roasted · Locally loved</p>
      </footer>
    </div>
  );
}
