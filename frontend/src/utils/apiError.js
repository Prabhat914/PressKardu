export function getApiErrorMessage(error, fallbackMessage) {
  const serverMessage = error?.response?.data?.message;
  const responseText =
    typeof error?.response?.data === "string" ? error.response.data : "";

  if (serverMessage) {
    return serverMessage;
  }

  if (error?.code === "ERR_NETWORK") {
    const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
    return isProduction
      ? "Backend se connection nahi ho pa raha. Thodi der baad try karo, aur agar issue rahe to backend deploy ya CORS configuration check karo."
      : "Backend server se connection nahi ho raha. Windows PowerShell me `npm` block ho sakta hai, isliye root folder se `./backend.cmd` ya `run-dev.cmd` chalao. MongoDB bhi running hona chahiye.";
  }

  if (
    error?.response?.status === 500 &&
    (
      responseText.includes("ECONNREFUSED") ||
      responseText.includes("proxy error") ||
      responseText.includes("Error occurred while trying to proxy") ||
      responseText.includes("AggregateError")
    )
  ) {
    const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
    return isProduction
      ? "Backend se connection nahi ho pa raha. Thodi der baad try karo, aur agar issue rahe to backend deploy ya CORS configuration check karo."
      : "Backend server se connection nahi ho raha. Windows PowerShell me `npm` block ho sakta hai, isliye root folder se `./backend.cmd` ya `run-dev.cmd` chalao. MongoDB bhi running hona chahiye.";
  }

  if (error?.response?.status === 404) {
    return "Requested API route nahi mili. Backend server configuration check karo.";
  }

  if (error?.response?.status >= 500) {
    return "Backend me server error aa raha hai. Backend terminal logs check karo.";
  }

  return fallbackMessage;
}
