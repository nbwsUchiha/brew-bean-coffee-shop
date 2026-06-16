import PageMeta from "../components/PageMeta";

export default function AboutPage() {
  return (
    <section className="content-page prose">
      <PageMeta
        title="About"
        description="Learn about Brew & Bean Coffee — neighborhood roastery and café."
        path="/about"
      />
      <header className="section-head">
        <p className="eyebrow">Our story</p>
        <h1>About Brew &amp; Bean</h1>
      </header>
      <div className="card checkout-card">
        <p>
          Brew &amp; Bean started as a small neighborhood counter serving thoughtfully sourced espresso and
          slow-steeped cold brew. Today we roast in small batches and welcome regulars who order ahead online
          for quick pickup.
        </p>
        <p>
          Every drink is made to order from beans we source directly from farms we trust. Whether you&apos;re
          grabbing a house latte before work or trying our ceremonial matcha, we aim to make your morning
          ritual effortless.
        </p>
        <p>
          <strong>Hours:</strong> Daily 7am – 7pm<br />
          <strong>Location:</strong> Your neighborhood — pickup at the counter
        </p>
      </div>
    </section>
  );
}
