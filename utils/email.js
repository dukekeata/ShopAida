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

module.exports = {
  sendOrderConfirmation,
  sendOrderDeclined
};
