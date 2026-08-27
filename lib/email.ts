import { sendEmail } from "./resend";

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
) => {
  const subject = "Password Reset Request";
  const message = `You requested a password reset. Use the following link to reset your password: <a href="${process.env.APP_URL}/reset-password?token=${resetToken}" target="_blank">Reset Password</a>`;
  return sendEmail(email, subject, message);
};
