import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendEmail = async (
  email: string,
  subject: string,
  message: string
) => {
  const { data, error } = await resend.emails.send({
    from: "Workspace <onboarding@resend.dev>",
    to: [email],
    subject: subject,
    html: `<p>${message}</p>`,
  });
  if (error) {
    throw error;
  }
  return { success: true, data };
};
