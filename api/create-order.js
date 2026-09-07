import Razorpay from 'razorpay';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TYAM6GyacLBRrL';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'qAB5XlUf0AoZ2OjJXoZv4nvJ';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}
