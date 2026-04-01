function LoadingCards({ count = 3, compact = false }) {
  return (
    <div className={`loading-cards${compact ? " loading-cards--compact" : ""}`}>
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="loading-card" aria-hidden="true">
          <div className="loading-card__line loading-card__line--sm" />
          <div className="loading-card__line loading-card__line--lg" />
          <div className="loading-card__line loading-card__line--md" />
          <div className="loading-card__grid">
            <span />
            <span />
            <span />
            <span />
          </div>
        </article>
      ))}
    </div>
  );
}

export default LoadingCards;
