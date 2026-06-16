import { FormEvent, useState } from "react";
import PageMeta from "../components/PageMeta";
import { api } from "../lib/apiClient";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.submitContact({ name, email, subject: subject || undefined, message });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content-page">
      <PageMeta
        title="Contact"
        description="Contact Brew & Bean Coffee — questions, catering, and feedback."
        path="/contact"
      />
      <header className="section-head">
        <p className="eyebrow">Get in touch</p>
        <h1>Contact us</h1>
        <p className="lede">We typically reply within one business day.</p>
      </header>

      {sent ? (
        <div className="card checkout-card success-note" role="status">
          Thanks, {name}! Your message has been received.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card checkout-card">
          <label className="field">
            <span>Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="field">
            <span>Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </section>
  );
}
