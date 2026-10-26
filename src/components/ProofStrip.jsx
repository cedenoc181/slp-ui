import '../styles/home-page-styling/proof-strip.css';

function ProofStrip() {
  return (
    <section className="proof-strip">
      <div className="container proof-strip-row">
        <div className="proof-strip-item">
          <span className="proof-strip-num">30</span>
          <span className="proof-strip-label">Teams Tracked</span>
        </div>
        <div className="proof-strip-item">
          <span className="proof-strip-num">Daily</span>
          <span className="proof-strip-label">Model Updates</span>
        </div>
        <div className="proof-strip-item">
          <span className="proof-strip-num mono">100%</span>
          <span className="proof-strip-label">Graded in Trust Ledger</span>
        </div>
        <div className="proof-strip-item">
          <span className="proof-strip-num">50+</span>
          <span className="proof-strip-label">Player Metrics</span>
        </div>
      </div>
    </section>
  );
}

export default ProofStrip;
