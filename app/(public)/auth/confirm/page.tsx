import Link from "next/link";
import VerifyClient from "./VerifyClient";
import { getContactLinks } from "@/lib/contact-links";

export const metadata = {
  title: "Email confirmed — SubscribAI",
  description: "Your SubscribAI account is ready. Sign in to continue.",
  robots: { index: false, follow: false },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, { whatsappUrl }] = await Promise.all([searchParams, getContactLinks()]);
  const token = (params.token || "").trim();
  const email = (params.email || "").trim();
  const next = params.next || "/account";
  const error = params.error_description || params.error;

  // Surface an upstream error (rare; only when the email link arrives malformed).
  if (error) {
    return (
      <section className="auth-section">
        <div className="auth-card">
          <div className="confirm-hero confirm-hero-error">
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <h1>Couldn&rsquo;t verify your email</h1>
          <p className="auth-tagline">{decodeURIComponent(error as string)}</p>
          <Link href="/login" className="btn btn-primary btn-large auth-submit">
            Try signing in <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      </section>
    );
  }

  // No token in the URL → user landed here directly; just show a generic page.
  if (!token) {
    return (
      <section className="auth-section">
        <div className="auth-card">
          <div className="confirm-hero">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h1>Your account is ready</h1>
          <p className="auth-tagline">
            Your email is verified and your SubscribAI account is active. Sign in to continue.
          </p>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary btn-large auth-submit">
            Sign in <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      </section>
    );
  }

  // Token present → hand off to the client component which calls /auth/verify.
  return <VerifyClient token={token} email={email} next={next} whatsappUrl={whatsappUrl} />;
}
