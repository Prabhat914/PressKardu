import { useId, useState } from "react";

function AuthVisibilityField({
  label,
  hiddenType = "password",
  visibleType = "text",
  className = "auth-field__input",
  allowToggle = true,
  id,
  ...inputProps
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="auth-field">
      <span className="auth-field__label">{label}</span>
      <div className={`auth-field__control${allowToggle ? "" : " auth-field__control--plain"}`}>
        <input
          {...inputProps}
          id={fieldId}
          className={`${className}${allowToggle ? " auth-field__input--with-toggle" : ""}`}
          type={allowToggle && isVisible ? visibleType : hiddenType}
        />
        {allowToggle && (
          <button
            className="auth-field__toggle"
            type="button"
            aria-label={`${isVisible ? "Hide" : "Show"} ${label}`}
            aria-pressed={isVisible}
            onClick={() => setIsVisible((current) => !current)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12 18.25 18.75 12 18.75 2.25 12 2.25 12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              {isVisible && (
                <path
                  d="M4 20 20 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        )}
      </div>
    </label>
  );
}

export default AuthVisibilityField;
