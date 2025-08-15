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