import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { api } from "../lib/apiClient";
import { formatMoney, type Order } from "../lib/types";
import { useAuth } from "../contexts/AuthContext";

function AccountContent() {
  const { userEmail, profile, signOut, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
  });

  useEffect(() => {
    api.getOrders().then(setOrders).catch((e) => setError(e.message));
    api.linkGuestOrders().catch(() => {
      // Silently ignore when email is not verified yet or no guest orders exist.
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || "",
        phone: profile.phone || "",
        addressLine1: profile.address_line1 || "",
        city: profile.city || "",
        state: profile.state || "",
        postalCode: profile.postal_code || "",
      });
    }
  }, [profile]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.updateProfile(form);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="checkout-page account-page">
      <PageMeta title="Account" description="Manage your Brew & Bean profile and orders." path="/account" />
      <header className="section-head">
        <p className="eyebrow">Welcome back</p>
        <h1>Your account</h1>
        <p className="lede">Signed in as {userEmail}</p>
      </header>

      {profile?.role === "admin" && (
        <Link className="btn ghost" to="/admin">
          Admin dashboard
        </Link>
      )}

      <form onSubmit={saveProfile} className="card checkout-card">
        <h2>Profile</h2>
        <label className="field">
          <span>Full name</span>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" />
        </label>
        <label className="field">
          <span>Address</span>
          <input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>City</span>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label className="field">
            <span>State</span>
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </label>
          <label className="field">
            <span>Postal code</span>
            <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          </label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <section className="card checkout-card">
        <h2>Order history</h2>
        {orders.length === 0 ? (
          <p className="empty-state">No orders yet. <Link to="/catalog">Browse the menu</Link></p>
        ) : (
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`}>
                  <strong>{o.order_number || o.id.slice(0, 8)}</strong> — {formatMoney(o.total_cents || o.amount_cents)} —{" "}
                  <span className="status-tag">{o.order_status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="btn ghost" type="button" onClick={() => signOut()}>
        Sign out
      </button>
    </section>
  );
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountContent />
    </ProtectedRoute>
  );
}
