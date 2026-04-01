function Toast({ message, tone = "info" }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`app-toast app-toast--${tone}`} role="status" aria-live="polite">
      <strong>{tone === "success" ? "Success" : tone === "warning" ? "Attention" : "Update"}</strong>
      <span>{message}</span>
    </div>
  );
}

export default Toast;
