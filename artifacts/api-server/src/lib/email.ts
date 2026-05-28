import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

interface SendEmailOptions {
  smtp: SmtpConfig;
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const nodemailer = _require("nodemailer") as any;

  const transporter = nodemailer.createTransport({
    host: opts.smtp.host,
    port: opts.smtp.port,
    secure: opts.smtp.secure,
    auth: {
      user: opts.smtp.user,
      pass: opts.smtp.password,
    },
  });

  const from = opts.smtp.fromName
    ? `"${opts.smtp.fromName}" <${opts.smtp.fromEmail || opts.smtp.user}>`
    : opts.smtp.fromEmail || opts.smtp.user;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
}

export async function testSmtpConnection(smtp: SmtpConfig): Promise<void> {
  const nodemailer = _require("nodemailer") as any;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
  });
  await transporter.verify();
}
