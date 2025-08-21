import nodemailer from 'nodemailer';

const SMTP_HOST = process.env['SMTP_HOST'] || 'localhost';
const SMTP_PORT = parseInt(process.env['SMTP_PORT'] || '587');
const SMTP_USER = process.env['SMTP_USER'] || '';
const SMTP_PASS = process.env['SMTP_PASS'] || '';
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'noreply@telebotics.com';
const FROM_NAME = process.env['FROM_NAME'] || 'TeleBotics Platform';
const FRONTEND_URL = process.env['FRONTEND_URL'] || 'http://localhost:3000';

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify transporter configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
};

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  token: string,
  firstName?: string
): Promise<void> => {
  const verificationUrl = `${FRONTEND_URL}/auth/verify-email?token=${token}`;
  const name = firstName || 'User';

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Verify Your Email Address - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TeleBotics Platform!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for registering with TeleBotics Platform. To complete your registration and start using our Telegram bot modules, please verify your email address.</p>
            
            <p>Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
            
            <div class="warning">
              <strong>Important:</strong> This verification link will expire in 24 hours. If you didn't create an account with TeleBotics Platform, please ignore this email.
            </div>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>Connect your Telegram bots</li>
              <li>Browse and activate earning modules</li>
              <li>Configure markup settings</li>
              <li>Track your earnings and analytics</li>
            </ul>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to TeleBotics Platform!
      
      Hello ${name}!
      
      Thank you for registering with TeleBotics Platform. To complete your registration and start using our Telegram bot modules, please verify your email address.
      
      Please visit the following link to verify your email:
      ${verificationUrl}
      
      This verification link will expire in 24 hours. If you didn't create an account with TeleBotics Platform, please ignore this email.
      
      Once verified, you'll be able to connect your Telegram bots, browse and activate earning modules, configure markup settings, and track your earnings and analytics.
      
      If you have any questions, feel free to contact our support team.
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  firstName?: string
): Promise<void> => {
  const resetUrl = `${FRONTEND_URL}/auth/reset-password?token=${token}`;
  const name = firstName || 'User';

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Reset Your Password - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .security { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We received a request to reset the password for your TeleBotics Platform account.</p>
            
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
            </div>
            
            <div class="security">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged. Consider changing your password if you suspect unauthorized access to your account.
            </div>
            
            <p>For security reasons, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Logging out from shared devices</li>
            </ul>
            
            <p>If you continue to have problems, please contact our support team.</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hello ${name}!
      
      We received a request to reset the password for your TeleBotics Platform account.
      
      Please visit the following link to reset your password:
      ${resetUrl}
      
      This password reset link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email. Your password will remain unchanged. Consider changing your password if you suspect unauthorized access to your account.
      
      For security reasons, we recommend using a strong, unique password, not sharing your password with anyone, and logging out from shared devices.
      
      If you continue to have problems, please contact our support team.
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send welcome email after email verification
export const sendWelcomeEmail = async (
  email: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Welcome to TeleBotics Platform!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TeleBotics</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .feature { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to TeleBotics!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Congratulations! Your email has been verified and your TeleBotics Platform account is now active.</p>
            
            <p>You're now ready to start monetizing your Telegram bots with our powerful modules.</p>
            
            <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            
            <h3>What you can do now:</h3>
            
            <div class="feature">
              <strong>🤖 Connect Your Bots</strong><br>
              Add your Telegram bots using their tokens and start managing them from one place.
            </div>
            
            <div class="feature">
              <strong>📦 Browse Modules</strong><br>
              Explore our catalog of earning modules and find the perfect ones for your audience.
            </div>
            
            <div class="feature">
              <strong>💰 Set Your Markup</strong><br>
              Configure your profit margins and maximize your earnings from each module.
            </div>
            
            <div class="feature">
              <strong>📊 Track Analytics</strong><br>
              Monitor your performance with detailed statistics and revenue reports.
            </div>
            
            <h3>Need Help Getting Started?</h3>
            <p>Check out our documentation or contact our support team. We're here to help you succeed!</p>
            
            <p>Thank you for choosing TeleBotics Platform. We're excited to see what you'll build!</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to TeleBotics Platform!
      
      Hello ${name}!
      
      Congratulations! Your email has been verified and your TeleBotics Platform account is now active.
      
      You're now ready to start monetizing your Telegram bots with our powerful modules.
      
      Visit your dashboard: ${dashboardUrl}
      
      What you can do now:
      - Connect Your Bots: Add your Telegram bots using their tokens
      - Browse Modules: Explore our catalog of earning modules
      - Set Your Markup: Configure your profit margins
      - Track Analytics: Monitor your performance with detailed statistics
      
      Need help getting started? Check out our documentation or contact our support team.
      
      Thank you for choosing TeleBotics Platform. We're excited to see what you'll build!
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send payment received notification
export const sendPaymentReceivedEmail = async (
  email: string,
  amount: number,
  currency: string,
  description: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/payments`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Payment Received - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .amount { background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; }
          .amount-value { font-size: 24px; font-weight: bold; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payment Received</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Great news! We've successfully received your payment.</p>
            
            <div class="amount">
              <div class="amount-value">${amount} ${currency}</div>
              <p><strong>Description:</strong> ${description}</p>
            </div>
            
            <p>Your payment has been processed and your account has been updated accordingly. You can now access the purchased features or modules.</p>
            
            <a href="${dashboardUrl}" class="button">View Payment History</a>
            
            <p>If you have any questions about this payment, please don't hesitate to contact our support team.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Payment Received - TeleBotics Platform
      
      Hello ${name}!
      
      Great news! We've successfully received your payment.
      
      Amount: ${amount} ${currency}
      Description: ${description}
      
      Your payment has been processed and your account has been updated accordingly. You can now access the purchased features or modules.
      
      View your payment history: ${dashboardUrl}
      
      If you have any questions about this payment, please don't hesitate to contact our support team.
      
      Thank you for your business!
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send payment failed notification
export const sendPaymentFailedEmail = async (
  email: string,
  amount: number,
  currency: string,
  reason: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/payments`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Payment Failed - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .error { background: #fee2e2; border: 1px solid #dc2626; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Payment Failed</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We're sorry to inform you that your recent payment could not be processed.</p>
            
            <div class="error">
              <p><strong>Amount:</strong> ${amount} ${currency}</p>
              <p><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p>Please check your payment method and try again. If you continue to experience issues, please contact our support team for assistance.</p>
            
            <a href="${dashboardUrl}" class="button">Try Again</a>
            
            <p>Common reasons for payment failures:</p>
            <ul>
              <li>Insufficient funds</li>
              <li>Expired or invalid card</li>
              <li>Bank security restrictions</li>
              <li>Incorrect billing information</li>
            </ul>
            
            <p>If you need help, our support team is here to assist you.</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Payment Failed - TeleBotics Platform
      
      Hello ${name}!
      
      We're sorry to inform you that your recent payment could not be processed.
      
      Amount: ${amount} ${currency}
      Reason: ${reason}
      
      Please check your payment method and try again. If you continue to experience issues, please contact our support team for assistance.
      
      Try again: ${dashboardUrl}
      
      Common reasons for payment failures:
      - Insufficient funds
      - Expired or invalid card
      - Bank security restrictions
      - Incorrect billing information
      
      If you need help, our support team is here to assist you.
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send withdrawal requested notification
export const sendWithdrawalRequestedEmail = async (
  email: string,
  amount: number,
  currency: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/withdrawals`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Withdrawal Request Received - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Withdrawal Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .amount { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; }
          .amount-value { font-size: 24px; font-weight: bold; color: #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📤 Withdrawal Request Received</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We've received your withdrawal request and it's now being processed.</p>
            
            <div class="amount">
              <div class="amount-value">${amount} ${currency}</div>
              <p>Withdrawal Amount</p>
            </div>
            
            <p>Your withdrawal request is currently under review. We typically process withdrawals within 1-3 business days.</p>
            
            <p>You'll receive another email notification once your withdrawal has been processed and the funds have been sent to your account.</p>
            
            <a href="${dashboardUrl}" class="button">Track Withdrawal Status</a>
            
            <p>If you have any questions about your withdrawal, please contact our support team.</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Withdrawal Request Received - TeleBotics Platform
      
      Hello ${name}!
      
      We've received your withdrawal request and it's now being processed.
      
      Withdrawal Amount: ${amount} ${currency}
      
      Your withdrawal request is currently under review. We typically process withdrawals within 1-3 business days.
      
      You'll receive another email notification once your withdrawal has been processed and the funds have been sent to your account.
      
      Track your withdrawal status: ${dashboardUrl}
      
      If you have any questions about your withdrawal, please contact our support team.
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send withdrawal completed notification
export const sendWithdrawalCompletedEmail = async (
  email: string,
  amount: number,
  currency: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/withdrawals`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Withdrawal Completed - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Withdrawal Completed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .amount { background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; }
          .amount-value { font-size: 24px; font-weight: bold; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Withdrawal Completed</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Great news! Your withdrawal has been successfully processed and the funds have been sent to your account.</p>
            
            <div class="amount">
              <div class="amount-value">${amount} ${currency}</div>
              <p>Withdrawal Amount</p>
            </div>
            
            <p>The funds should appear in your account within the next few hours, depending on your bank's processing time.</p>
            
            <a href="${dashboardUrl}" class="button">View Withdrawal History</a>
            
            <p>If you don't see the funds in your account within 24 hours, please contact our support team.</p>
            
            <p>Thank you for using TeleBotics Platform!</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Withdrawal Completed - TeleBotics Platform
      
      Hello ${name}!
      
      Great news! Your withdrawal has been successfully processed and the funds have been sent to your account.
      
      Withdrawal Amount: ${amount} ${currency}
      
      The funds should appear in your account within the next few hours, depending on your bank's processing time.
      
      View your withdrawal history: ${dashboardUrl}
      
      If you don't see the funds in your account within 24 hours, please contact our support team.
      
      Thank you for using TeleBotics Platform!
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send withdrawal failed notification
export const sendWithdrawalFailedEmail = async (
  email: string,
  amount: number,
  currency: string,
  reason: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/withdrawals`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Withdrawal Failed - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Withdrawal Failed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .error { background: #fee2e2; border: 1px solid #dc2626; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Withdrawal Failed</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We're sorry to inform you that your withdrawal request could not be processed.</p>
            
            <div class="error">
              <p><strong>Amount:</strong> ${amount} ${currency}</p>
              <p><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p>The requested amount has been returned to your account balance. Please review the reason above and try again with corrected information.</p>
            
            <a href="${dashboardUrl}" class="button">Try Again</a>
            
            <p>If you need assistance with your withdrawal, please contact our support team. We're here to help!</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Withdrawal Failed - TeleBotics Platform
      
      Hello ${name}!
      
      We're sorry to inform you that your withdrawal request could not be processed.
      
      Amount: ${amount} ${currency}
      Reason: ${reason}
      
      The requested amount has been returned to your account balance. Please review the reason above and try again with corrected information.
      
      Try again: ${dashboardUrl}
      
      If you need assistance with your withdrawal, please contact our support team. We're here to help!
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send module activated notification
export const sendModuleActivatedEmail = async (
  email: string,
  moduleName: string,
  botName: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/bots`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Module Activated - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Module Activated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .module-info { background: #f3f4f6; border: 1px solid #d1d5db; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Module Activated</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Great news! A new module has been successfully activated for your bot.</p>
            
            <div class="module-info">
              <p><strong>Module:</strong> ${moduleName}</p>
              <p><strong>Bot:</strong> ${botName}</p>
              <p><strong>Status:</strong> Active</p>
            </div>
            
            <p>Your bot is now ready to start earning with this new module. You can monitor its performance and adjust settings from your dashboard.</p>
            
            <a href="${dashboardUrl}" class="button">Manage Your Bots</a>
            
            <p>Tips for maximizing your earnings:</p>
            <ul>
              <li>Monitor your analytics regularly</li>
              <li>Adjust markup percentages based on performance</li>
              <li>Promote your bot to increase user engagement</li>
            </ul>
            
            <p>If you need help configuring your module, check our documentation or contact support.</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Module Activated - TeleBotics Platform
      
      Hello ${name}!
      
      Great news! A new module has been successfully activated for your bot.
      
      Module: ${moduleName}
      Bot: ${botName}
      Status: Active
      
      Your bot is now ready to start earning with this new module. You can monitor its performance and adjust settings from your dashboard.
      
      Manage your bots: ${dashboardUrl}
      
      Tips for maximizing your earnings:
      - Monitor your analytics regularly
      - Adjust markup percentages based on performance
      - Promote your bot to increase user engagement
      
      If you need help configuring your module, check our documentation or contact support.
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send referral commission notification
export const sendReferralCommissionEmail = async (
  email: string,
  amount: number,
  currency: string,
  referralName: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/referrals`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Referral Commission Earned - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Referral Commission</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .commission { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; }
          .commission-value { font-size: 24px; font-weight: bold; color: #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Referral Commission Earned</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Congratulations! You've earned a referral commission.</p>
            
            <div class="commission">
              <div class="commission-value">${amount} ${currency}</div>
              <p>Commission from ${referralName}</p>
            </div>
            
            <p>This commission has been added to your account balance. Keep sharing your referral link to earn more!</p>
            
            <a href="${dashboardUrl}" class="button">View Referral Stats</a>
            
            <p>Ways to increase your referral earnings:</p>
            <ul>
              <li>Share your referral link on social media</li>
              <li>Tell friends about TeleBotics Platform</li>
              <li>Write about your success with our modules</li>
              <li>Join our community and help others</li>
            </ul>
            
            <p>Thank you for helping grow the TeleBotics community!</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Referral Commission Earned - TeleBotics Platform
      
      Hello ${name}!
      
      Congratulations! You've earned a referral commission.
      
      Commission: ${amount} ${currency}
      From: ${referralName}
      
      This commission has been added to your account balance. Keep sharing your referral link to earn more!
      
      View your referral stats: ${dashboardUrl}
      
      Ways to increase your referral earnings:
      - Share your referral link on social media
      - Tell friends about TeleBotics Platform
      - Write about your success with our modules
      - Join our community and help others
      
      Thank you for helping grow the TeleBotics community!
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${email}
    `
  };

  await transporter.sendMail(mailOptions);
};
// Sen
d support ticket confirmation email
export const sendSupportTicketConfirmation = async (
  ticket: { id: string; subject: string; priority: string; user_id: string },
  userEmail: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/support`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: userEmail,
    subject: 'Support Ticket Created - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Ticket Created</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .ticket-info { background: #e0e7ff; border: 1px solid #4f46e5; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .priority-low { background: #d1fae5; color: #065f46; }
          .priority-normal { background: #dbeafe; color: #1e40af; }
          .priority-high { background: #fed7aa; color: #9a3412; }
          .priority-critical { background: #fecaca; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Support Ticket Created</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for contacting TeleBotics Platform support. We've received your support ticket and our team will respond as soon as possible.</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> ${ticket.id}</p>
              <p><strong>Subject:</strong> ${ticket.subject}</p>
              <p><strong>Priority:</strong> <span class="priority priority-${ticket.priority}">${ticket.priority}</span></p>
              <p><strong>Status:</strong> Open</p>
            </div>
            
            <p>We typically respond to support tickets within:</p>
            <ul>
              <li><strong>Critical:</strong> Within 1 hour</li>
              <li><strong>High:</strong> Within 4 hours</li>
              <li><strong>Normal:</strong> Within 24 hours</li>
              <li><strong>Low:</strong> Within 48 hours</li>
            </ul>
            
            <p>You can track the status of your ticket and view any responses in your dashboard.</p>
            
            <a href="${dashboardUrl}" class="button">View Support Tickets</a>
            
            <p>Please keep this ticket ID for your records: <strong>${ticket.id}</strong></p>
            
            <p>Best regards,<br>The TeleBotics Support Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Support Ticket Created - TeleBotics Platform
      
      Hello ${name}!
      
      Thank you for contacting TeleBotics Platform support. We've received your support ticket and our team will respond as soon as possible.
      
      Ticket Details:
      - Ticket ID: ${ticket.id}
      - Subject: ${ticket.subject}
      - Priority: ${ticket.priority}
      - Status: Open
      
      We typically respond to support tickets within:
      - Critical: Within 1 hour
      - High: Within 4 hours
      - Normal: Within 24 hours
      - Low: Within 48 hours
      
      You can track the status of your ticket and view any responses in your dashboard: ${dashboardUrl}
      
      Please keep this ticket ID for your records: ${ticket.id}
      
      Best regards,
      The TeleBotics Support Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${userEmail}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send support ticket status update email
export const sendSupportTicketStatusUpdate = async (
  ticket: { id: string; subject: string; status: string; user_id: string },
  newStatus: string,
  userEmail: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/support`;

  let statusColor = '#4f46e5';
  let statusMessage = '';
  
  switch (newStatus) {
    case 'in_progress':
      statusColor = '#f59e0b';
      statusMessage = 'Your support ticket is now being processed by our team.';
      break;
    case 'resolved':
      statusColor = '#10b981';
      statusMessage = 'Your support ticket has been resolved. Please check the response in your dashboard.';
      break;
    case 'closed':
      statusColor = '#6b7280';
      statusMessage = 'Your support ticket has been closed. If you need further assistance, please create a new ticket.';
      break;
    default:
      statusMessage = `Your support ticket status has been updated to ${newStatus}.`;
  }

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: userEmail,
    subject: `Support Ticket ${newStatus === 'resolved' ? 'Resolved' : 'Updated'} - TeleBotics Platform`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Ticket Updated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .ticket-info { background: #e0e7ff; border: 1px solid #4f46e5; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; background: ${statusColor}; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Support Ticket Updated</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>${statusMessage}</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> ${ticket.id}</p>
              <p><strong>Subject:</strong> ${ticket.subject}</p>
              <p><strong>New Status:</strong> <span class="status">${newStatus}</span></p>
            </div>
            
            ${newStatus === 'resolved' ? 
              '<p>Please review our response and let us know if you need any additional assistance. If your issue is fully resolved, the ticket will be automatically closed after 48 hours.</p>' :
              '<p>You can view the full details and any responses in your dashboard.</p>'
            }
            
            <a href="${dashboardUrl}" class="button">View Support Tickets</a>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>The TeleBotics Support Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Support Ticket Updated - TeleBotics Platform
      
      Hello ${name}!
      
      ${statusMessage}
      
      Ticket Details:
      - Ticket ID: ${ticket.id}
      - Subject: ${ticket.subject}
      - New Status: ${newStatus}
      
      ${newStatus === 'resolved' ? 
        'Please review our response and let us know if you need any additional assistance. If your issue is fully resolved, the ticket will be automatically closed after 48 hours.' :
        'You can view the full details and any responses in your dashboard.'
      }
      
      View your support tickets: ${dashboardUrl}
      
      If you have any questions, please don't hesitate to contact us.
      
      Best regards,
      The TeleBotics Support Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${userEmail}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Create EmailService class for easier imports
export class EmailService {
  static async sendSupportTicketConfirmation(ticket: any): Promise<void> {
    // This would need to fetch user email from database
    // For now, we'll assume the ticket object has user info
    const userEmail = ticket.user_email || 'user@example.com';
    const firstName = ticket.user_first_name;
    
    return sendSupportTicketConfirmation(ticket, userEmail, firstName);
  }

  static async sendSupportTicketStatusUpdate(ticket: any, status: string): Promise<void> {
    // This would need to fetch user email from database
    // For now, we'll assume the ticket object has user info
    const userEmail = ticket.user_email || 'user@example.com';
    const firstName = ticket.user_first_name;
    
    return sendSupportTicketStatusUpdate(ticket, status, userEmail, firstName);
  }
}

// Send feedback confirmation email
export const sendFeedbackConfirmation = async (
  feedback: { id: string; subject: string; type: string; user_id: string },
  userEmail: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/feedback`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: userEmail,
    subject: 'Feedback Received - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feedback Received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .feedback-info { background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .type { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .type-general { background: #dbeafe; color: #1e40af; }
          .type-bug_report { background: #fecaca; color: #991b1b; }
          .type-feature_request { background: #fed7aa; color: #9a3412; }
          .type-complaint { background: #fde68a; color: #92400e; }
          .type-compliment { background: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Feedback Received</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for taking the time to share your feedback with us. We've received your message and appreciate your input.</p>
            
            <div class="feedback-info">
              <p><strong>Feedback ID:</strong> ${feedback.id}</p>
              <p><strong>Subject:</strong> ${feedback.subject}</p>
              <p><strong>Type:</strong> <span class="type type-${feedback.type}">${feedback.type.replace('_', ' ')}</span></p>
              <p><strong>Status:</strong> Pending Review</p>
            </div>
            
            <p>Our team will review your feedback and respond if necessary. We typically review feedback within 2-3 business days.</p>
            
            <p>You can track the status of your feedback and view any responses in your dashboard.</p>
            
            <a href="${dashboardUrl}" class="button">View My Feedback</a>
            
            <p>Your feedback helps us improve TeleBotics Platform and provide better service to all our users.</p>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Feedback Received - TeleBotics Platform
      
      Hello ${name}!
      
      Thank you for taking the time to share your feedback with us. We've received your message and appreciate your input.
      
      Feedback Details:
      - Feedback ID: ${feedback.id}
      - Subject: ${feedback.subject}
      - Type: ${feedback.type.replace('_', ' ')}
      - Status: Pending Review
      
      Our team will review your feedback and respond if necessary. We typically review feedback within 2-3 business days.
      
      You can track the status of your feedback and view any responses in your dashboard: ${dashboardUrl}
      
      Your feedback helps us improve TeleBotics Platform and provide better service to all our users.
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${userEmail}
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send feedback response email
export const sendFeedbackResponse = async (
  feedback: { id: string; subject: string; type: string; admin_response: string; user_id: string },
  userEmail: string,
  firstName?: string
): Promise<void> => {
  const name = firstName || 'User';
  const dashboardUrl = `${FRONTEND_URL}/dashboard/feedback`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: userEmail,
    subject: 'Response to Your Feedback - TeleBotics Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feedback Response</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .feedback-info { background: #e0e7ff; border: 1px solid #4f46e5; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .response { background: #f0f9ff; border: 1px solid #0ea5e9; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Response to Your Feedback</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We've reviewed your feedback and have a response for you.</p>
            
            <div class="feedback-info">
              <p><strong>Original Feedback:</strong> ${feedback.subject}</p>
              <p><strong>Type:</strong> ${feedback.type.replace('_', ' ')}</p>
            </div>
            
            <div class="response">
              <h3>Our Response:</h3>
              <p>${feedback.admin_response}</p>
            </div>
            
            <p>Thank you for taking the time to share your feedback with us. Your input helps us improve our platform and services.</p>
            
            <p>If you have any additional questions or feedback, please don't hesitate to reach out to us.</p>
            
            <a href="${dashboardUrl}" class="button">View All My Feedback</a>
            
            <p>Best regards,<br>The TeleBotics Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TeleBotics Platform. All rights reserved.</p>
            <p>This email was sent to ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Response to Your Feedback - TeleBotics Platform
      
      Hello ${name}!
      
      We've reviewed your feedback and have a response for you.
      
      Original Feedback: ${feedback.subject}
      Type: ${feedback.type.replace('_', ' ')}
      
      Our Response:
      ${feedback.admin_response}
      
      Thank you for taking the time to share your feedback with us. Your input helps us improve our platform and services.
      
      If you have any additional questions or feedback, please don't hesitate to reach out to us.
      
      View all your feedback: ${dashboardUrl}
      
      Best regards,
      The TeleBotics Team
      
      © 2024 TeleBotics Platform. All rights reserved.
      This email was sent to ${userEmail}
    `
  };

  await transporter.sendMail(mailOptions);
};