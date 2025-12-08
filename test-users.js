// test-users.js
const fetch = require("node-fetch"); // npm i node-fetch@2
const HOST = "http://192.168.100.50:4000";
const EMAIL = "marsad@gmail.com";
const PASSWORD = "Marsad@123";

(async () => {
  try {
    // login
    const r1 = await fetch(`${HOST}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const login = await r1.json();
    const token = login.token;
    if (!token) return console.error("Login failed:", login);

    // fetch users
    const r2 = await fetch(`${HOST}/api/auth/users?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await r2.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
