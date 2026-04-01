const baseUrl = process.env.PRESSKARDU_API_BASE_URL || "http://127.0.0.1:5000/api";
const uniqueId = Date.now();
const email = `smoke-${uniqueId}@example.com`;
const password = "123456";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${text}`);
  }

  return data;
}

async function main() {
  const health = await request("/health");
  console.log("health:", health);

  const signup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Test User",
      email,
      password,
      role: "user"
    })
  });
  console.log("signup ok:", signup.user.email);

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password
    })
  });
  console.log("login ok:", login.user.email);

  const orders = await request("/orders/my", {
    headers: {
      Authorization: `Bearer ${login.token}`
    }
  });
  console.log("orders fetched:", Array.isArray(orders) ? orders.length : 0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
