// ─────────────────────────────────────────────────────────────
// server.js — Backend payment server for the store.
// Creates Razorpay orders (server-side) and verifies payment
// signatures. This is REQUIRED for Razorpay to work in live/test
// mode — the frontend cannot create orders without the secret key.
// ─────────────────────────────────────────────────────────────

import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TYAM6GyacLBRrL';
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || 'qAB5XlUf0AoZ2OjJXoZv4nvJ';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, keyId: RAZORPAY_KEY_ID });
});

// Create a Razorpay order (server-side — safe with secret key)
// Expected body: { amount: 1234 } (amount in rupees, we convert to paise)
app.post('/api/create-order', async (req, res) => {
  console.log('[create-order] received amount =', req.body.amount);
  try {
    const amountInRupees = Number(req.body.amount);
    if (!amountInRupees || amountInRupees <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amountInRupees * 100), // paise
      currency: 'INR',
      receipt: 'rcpt_' + Date.now(),
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    console.log('[create-order] success, order =', order.id, ', amount =', order.amount);
    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'Failed to create order', detail: err.message });
  }
});

// Verify payment signature (server-side)
// Expected body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
app.post('/api/verify-payment', (req, res) => {
  console.log('[verify-payment] received:', JSON.stringify(req.body));
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const expected = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    console.log('[verify-payment] expected =', expected);
    console.log('[verify-payment] received =', razorpay_signature);
    console.log('[verify-payment] match =', expected === razorpay_signature);

    if (expected === razorpay_signature) {
      res.json({ valid: true });
    } else {
      res.status(400).json({ valid: false, error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('verify-payment error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Refund a Razorpay payment (server-side, uses secret key)
// Expected body: { orderId, paymentRef, amount }
// Razorpay refund credits the money back to the customer's original payment source.
app.post('/api/refund', async (req, res) => {
  console.log('[refund] received:', JSON.stringify(req.body));
  try {
    const { orderId, paymentRef, amount } = req.body;
    if (!orderId || !paymentRef || !amount) {
      return res.status(400).json({ error: 'Missing orderId, paymentRef, or amount' });
    }

    const amountInRupees = Number(amount);
    if (!amountInRupees || amountInRupees <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Only refund real Razorpay payments (ref looks like pay_xxxxxx)
    if (!paymentRef || !String(paymentRef).startsWith('pay_')) {
      return res.json({
        refunded: false,
        reason: 'no_online_payment',
        message: 'No Razorpay payment to refund. This order was COD or a demo payment - no money was charged.',
      });
    }

    const refund = await razorpay.payments.refund(paymentRef, {
      amount: Math.round(amountInRupees * 100), // paise
      receipt: 'refund_' + orderId,
      notes: { orderId },
    });

    console.log('[refund] success, refund =', refund.id, 'status =', refund.status);
    res.json({
      refunded: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      message: 'Refund initiated. The money will be credited back to your account in 5-7 working days.',
    });
  } catch (err) {
    console.error('refund error:', err);
    const message =
      err?.details?.description ||
      err?.response?.description ||
      err?.message ||
      'Refund failed';
    res.status(500).json({
      refunded: false,
      reason: 'refund_failed',
      message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
  console.log(`Using Razorpay key: ${RAZORPAY_KEY_ID}`);
});