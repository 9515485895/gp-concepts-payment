require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors({ origin: true, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

const PORT = process.env.PORT || 10000;
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg";
const CASHFREE_API_VERSION = "2025-01-01";

const PLANS = {
  monthly: { name: "Monthly Plan", amount: 1499 },
  six_months: { name: "6 Months Plan", amount: 3999 },
  annual: { name: "Annual Plan", amount: 7999 }
};

app.get("/", (req, res) => res.json({ success: true, service: "GP CONCEPTS Cashfree Payment Server" }));

app.post("/api/create-order", async (req, res) => {
  try {
    const { planId, customerId, customerName, customerPhone, customerEmail } = req.body;
    if (!PLANS[planId]) return res.status(400).json({ success: false, message: "Invalid subscription plan." });
    const plan = PLANS[planId];
    const orderId = "gp_" + planId + "_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");
    const payload = {
      order_id: orderId,
      order_amount: plan.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: customerId || "gp_user_" + crypto.randomBytes(6).toString("hex"),
        customer_name: customerName || "GP CONCEPTS User",
        customer_phone: customerPhone || "9999999999",
        customer_email: customerEmail || "customer@example.com"
      },
      order_meta: { return_url: `${process.env.PUBLIC_BASE_URL}/payment-success?order_id={order_id}` },
      order_note: `GP CONCEPTS - ${plan.name}`
    };
    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-version": CASHFREE_API_VERSION,
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ success: false, message: data.message || "Cashfree order creation failed.", error: data });
    res.json({ success: true, orderId: data.order_id, paymentSessionId: data.payment_session_id, planId, amount: plan.amount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to create payment." });
  }
});

app.get("/payment-success", (req, res) => res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>GP CONCEPTS Payment</title></head><body style="font-family:Arial;text-align:center;padding:60px"><h1>GP CONCEPTS</h1><p>Payment completed or is being processed.</p><p>You can return to the GP CONCEPTS app.</p></body></html>`));

app.listen(PORT, "0.0.0.0", () => console.log(`GP CONCEPTS payment server running on port ${PORT}`));
