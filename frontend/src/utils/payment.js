function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Payment SDK could not be loaded."));
    document.body.appendChild(script);
  });
}

export async function startHostedPayment({ session, customer, onSuccess }) {
  if (!session) {
    throw new Error("Payment session is missing.");
  }

  if (session.provider !== "razorpay") {
    throw new Error("Hosted payment is not configured for this provider.");
  }

  await loadScript("https://checkout.razorpay.com/v1/checkout.js");

  if (!window.Razorpay) {
    throw new Error("Razorpay SDK is unavailable.");
  }

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: session.keyId,
      amount: session.amount,
      currency: session.currency,
      name: "PressKardu",
      description: session.description || "Press service order payment",
      order_id: session.gatewayOrderId,
      prefill: {
        name: customer?.name || "",
        email: customer?.email || "",
        contact: customer?.phone || ""
      },
      notes: {
        orderId: session.internalOrderId || ""
      },
      handler: async (response) => {
        try {
          await onSuccess(response);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment popup was closed before completion."))
      },
      theme: {
        color: "#b45309"
      }
    });

    razorpay.open();
  });
}
