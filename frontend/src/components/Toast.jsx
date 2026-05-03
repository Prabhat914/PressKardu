function Toast({ message, tone = "info", inline = false }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`app-toast app-toast--${tone}${inline ? " app-toast--inline" : ""}`}
      role="status"
      aria-live="polite"
    >
      <strong>{tone === "success" ? "Success" : tone === "warning" ? "Error" : "Update"}</strong>
      <span>{message}</span>
    </div>
  );
}

export default Toast;
