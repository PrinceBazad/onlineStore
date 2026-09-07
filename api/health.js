const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TYAM6GyacLBRrL';

export default async function handler(req, res) {
  res.json({ ok: true, keyId: RAZORPAY_KEY_ID });
}
