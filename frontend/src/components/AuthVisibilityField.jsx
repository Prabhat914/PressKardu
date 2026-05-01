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
            {isVisible ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </label>
  );
}

export default AuthVisibilityField;
