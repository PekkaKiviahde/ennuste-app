const loginUserSelect = document.getElementById("login-user");
const loginPinInput = document.getElementById("login-pin");
const loginPinToggle = document.getElementById("login-pin-toggle");
const loginSubmit = document.getElementById("login-submit");
const loginStatus = document.getElementById("login-status");

function setStatus(message, isError = false) {
  if (!loginStatus) {
    return;
  }
  loginStatus.textContent = message;
  loginStatus.style.color = isError ? "#b00020" : "#1f6f8b";
  loginStatus.classList.toggle("is-error", isError);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "Virhe");
  }
  return payload;
}

async function loadUsers() {
  if (!loginUserSelect) {
    return;
  }
  const response = await fetchJson("/api/users");
  loginUserSelect.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Valitse käyttäjä";
  loginUserSelect.appendChild(empty);
  response.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.username;
    option.textContent = user.display_name
      ? `${user.display_name} (${user.username})`
      : user.username;
    loginUserSelect.appendChild(option);
  });
}

async function handleLogin() {
  if (!loginUserSelect || !loginPinInput) {
    return;
  }
  const username = loginUserSelect.value;
  const pin = loginPinInput.value.trim();
  if (!username) {
    setStatus("Valitse käyttäjä.", true);
    return;
  }
  if (!pin) {
    setStatus("Syötä PIN.", true);
    return;
  }
  setStatus("Kirjaudutaan...");
  try {
    const response = await fetchJson("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, pin }),
    });
    if (response.token) {
      localStorage.setItem("authToken", response.token);
      localStorage.setItem("authUsername", username);
    }
    loginPinInput.value = "";
    window.location.href = "/";
  } catch (err) {
    setStatus(err.message, true);
  }
}

function handleLoggedOutParam() {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  const hasLoggedOut = params.has("loggedOut");
  const forceLogin = params.has("forceLogin");
  if (!hasLoggedOut && !forceLogin) {
    return false;
  }
  if (hasLoggedOut) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUsername");
    document.cookie = "authToken=; Path=/; Max-Age=0; SameSite=Lax";
    setStatus("Kirjautuminen on päättynyt.", false);
  }
  params.delete("loggedOut");
  params.delete("forceLogin");
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
  return true;
}

async function checkExistingToken() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    return;
  }
  try {
    await fetchJson("/api/me", {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    window.location.href = "/";
  } catch (_) {
    localStorage.removeItem("authToken");
  }
}

const loggedOutHandled = handleLoggedOutParam();
if (!loggedOutHandled) {
  checkExistingToken().catch(() => {});
}
loadUsers().catch((err) => setStatus(err.message, true));

if (loginSubmit) {
  loginSubmit.addEventListener("click", handleLogin);
}

if (loginPinInput) {
  loginPinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  });
}

if (loginPinToggle && loginPinInput) {
  loginPinToggle.addEventListener("change", (event) => {
    loginPinInput.type = event.target.checked ? "text" : "password";
  });
}

if (loginUserSelect) {
  loginUserSelect.addEventListener("change", () => setStatus(""));
}

if (loginPinInput) {
  loginPinInput.addEventListener("input", () => setStatus(""));
}
