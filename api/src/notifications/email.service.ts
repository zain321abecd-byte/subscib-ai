import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error("SMTP email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendEmail({ to, subject, text, html }: SendEmailInput) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) throw new Error("SMTP_FROM or SMTP_USER must be configured before sending email.");
    return this.getTransporter().sendMail({ from, to, subject, text, html });
  }
}
