const nodemailer = require('nodemailer');

let testAccount = null;
let transporter = null;

async function initTransporter() {
  if (transporter) return transporter;
  try {
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log(`📧 Ethereal Email test account initialized: ${testAccount.user}`);
    return transporter;
  } catch (error) {
    console.error('Failed to initialize Ethereal Email test account', error);
    return null;
  }
}

async function sendEmail(options) {
  const tp = await initTransporter();
  if (!tp) return;

  try {
    const info = await tp.sendMail({
      from: '"ShopAida" <noreply@shopaida.com>',
      ...options
    });
    console.log('📧 Message sent: %s', info.messageId);
    console.log('📧 Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

const sendOrderConfirmation = async (userEmail, order) => {
  const itemsHtml = order.items.map(item => `<li>${item.quantity}x ${item.name} - $${item.price}</li>`).join('');
  const totalAmount = order.totalAmount;

  await sendEmail({
    to: userEmail,
    subject: `Order Confirmation - #${order._id || order.id}`,
    html: `
      <h1>Thank you for your order!</h1>
      <p>Your order <strong>#${order._id || order.id}</strong> has been successfully placed.</p>
      <h3>Order Details:</h3>
      <ul>${itemsHtml}</ul>
      <p><strong>Total Amount:</strong> $${totalAmount}</p>
      <p>We will notify you once your order is shipped.</p>
    `
  });
};

const sendOrderDeclined = async (userEmail, orderId, reason = 'Payment declined') => {
  await sendEmail({
    to: userEmail,
    subject: `Order Declined - #${orderId}`,
    html: `
      <h1>Order Declined</h1>
      <p>We are sorry, but your order <strong>#${orderId}</strong> could not be processed.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please try again or contact support for assistance.</p>
    `
  });
};

const sendPasswordResetEmail = async (userEmail, resetToken, resetUrl) => {
  console.log(`🔑 PASSWORD RESET TOKEN for ${userEmail}: ${resetToken}`);
  console.log(`🔗 RESET URL: ${resetUrl}`);

  await sendEmail({
    to: userEmail,
    subject: 'Password Reset Request - ShopAida',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset for your ShopAida account.</p>
      <p>Click the link below or copy and paste it into your browser to reset your password (link expires in 1 hour):</p>
      <p><a href="${resetUrl}" style="padding:10px 18px;background:#114b8c;color:#fff;text-decoration:none;border-radius:6px;display:inline-block;">Reset Password</a></p>
      <p>Or use this token directly: <code>${resetToken}</code></p>
      <p>If you did not request this, please ignore this email.</p>
    `
  });
};

module.exports = {
  sendOrderConfirmation,
  sendOrderDeclined,
  sendPasswordResetEmail
};
