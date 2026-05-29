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

function buildTransportConfig(smtp: SmtpConfig) {
  const port = Number(smtp.port) || 587;
  // secure=true pour SSL (port 465), STARTTLS sinon (587/25)
  const secure = smtp.secure || port === 465;
  return {
    host: smtp.host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    tls: { rejectUnauthorized: false },
  };
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const nodemailer = _require("nodemailer") as any;
  const transporter = nodemailer.createTransport(buildTransportConfig(opts.smtp));

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
  const transporter = nodemailer.createTransport(buildTransportConfig(smtp));
  await transporter.verify();
}
