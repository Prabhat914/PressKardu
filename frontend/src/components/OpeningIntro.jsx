import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function OpeningIntro({
  title = "Doorstep press service, now with a more cinematic welcome.",
  description = "A worker arrives, sets the cloth, starts pressing, and then your next step appears right below.",
  showActions = true,
  compact = false,
  onReveal
}) {
  const [actionsVisible, setActionsVisible] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const introSeen = useMemo(() => window.sessionStorage.getItem("pk_intro_seen") === "true", []);
  const revealDelay = introSeen ? 700 : 3150;

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setActionsVisible(true);
      window.sessionStorage.setItem("pk_intro_seen", "true");
      onReveal?.();
    }, revealDelay);

    return () => window.clearTimeout(timerId);
  }, [onReveal, revealDelay]);

  const handleSkip = () => {
    setIsSkipped(true);
    setActionsVisible(true);
    window.sessionStorage.setItem("pk_intro_seen", "true");
    onReveal?.();
  };

  return (
    <section
      className={`opening-intro${compact ? " opening-intro--compact" : ""}${actionsVisible ? " opening-intro--revealed" : ""}${isSkipped ? " opening-intro--skipped" : ""}`}
      aria-label="PressKardu animated introduction"
    >
      <div className="opening-intro__copy">
        <p className="opening-intro__eyebrow">PressKardu intro</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className={`opening-stage${introSeen ? " opening-stage--fast" : ""}`} aria-hidden="true">
        <div className="opening-stage__glow opening-stage__glow--left" />
        <div className="opening-stage__glow opening-stage__glow--right" />

        <div className="opening-stage__floor" />

        <div className="opening-stage__table">
          <div className="opening-stage__table-top" />
          <div className="opening-stage__table-leg opening-stage__table-leg--left" />
          <div className="opening-stage__table-leg opening-stage__table-leg--right" />
        </div>

        <div className="opening-stage__cloth">
          <span className="opening-stage__cloth-shine" />
          <span className="opening-stage__cloth-fold opening-stage__cloth-fold--one" />
          <span className="opening-stage__cloth-fold opening-stage__cloth-fold--two" />
        </div>

        <div className="opening-stage__iron">
          <div className="opening-stage__iron-handle" />
          <div className="opening-stage__iron-base" />
          <div className="opening-stage__iron-steam">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="opening-stage__person">
          <div className="opening-stage__person-head" />
          <div className="opening-stage__person-body" />
          <div className="opening-stage__person-hand" />
          <div className="opening-stage__person-arm opening-stage__person-arm--front" />
          <div className="opening-stage__person-arm opening-stage__person-arm--back" />
          <div className="opening-stage__person-leg opening-stage__person-leg--front" />
          <div className="opening-stage__person-leg opening-stage__person-leg--back" />
        </div>
      </div>

      <div className="opening-intro__controls">
        {!actionsVisible && (
          <button className="opening-intro__control" type="button" onClick={handleSkip}>
            Skip intro
          </button>
        )}
        {actionsVisible && (
          <button
            className="opening-intro__control opening-intro__control--ghost"
            type="button"
            onClick={() => {
              window.sessionStorage.removeItem("pk_intro_seen");
              window.location.reload();
            }}
          >
            Replay intro
          </button>
        )}
      </div>

      {showActions && (
        <div className={`opening-intro__actions${actionsVisible ? " opening-intro__actions--visible" : ""}`}>
          <Link className="home-shops__link" to="/login">Login</Link>
          <Link className="home-shops__link home-shops__link--secondary" to="/signup">Signup</Link>
        </div>
      )}
    </section>
  );
}

export default OpeningIntro;
