import { useId, useState } from "react";

function AuthVisibilityField({
  label,
  hiddenType = "password",
  visibleType = "text",
  className = "auth-field__input",
  id,
  ...inputProps
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="auth-field">
      <span className="auth-field__label">{label}</span>
      <div className="auth-field__control">
        <input
          {...inputProps}
          id={fieldId}
          className={className}
          type={isVisible ? visibleType : hiddenType}
        />
        <button
          className="auth-field__toggle"
          type="button"
          aria-label={`${isVisible ? "Hide" : "Show"} ${label}`}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

export default AuthVisibilityField;
