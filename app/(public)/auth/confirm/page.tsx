import Link from "next/link";

export const metadata = {
  title: "Email confirmed",
  robots: { index: false, follow: false },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const next = params.next || "/account";
  const error = params.error_description || params.error;

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

  return (
    <section className="auth-section">
      <div className="auth-card">
        <div className="confirm-hero">
          <i className="fa-solid fa-circle-check"></i>
        </div>
        <h1>You&rsquo;re all set</h1>
        <p className="auth-tagline">
          Your email is verified. You can sign in any time and start placing orders.
        </p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary btn-large auth-submit">
          Sign in <i className="fa-solid fa-arrow-right"></i>
        </Link>
      </div>
    </section>
  );
}
