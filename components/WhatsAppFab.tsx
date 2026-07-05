import Link from "next/link";

export default function WhatsAppFab({ phone }: { phone?: string }) {
  if (!phone) return null;

  return (
    <Link
      href={`https://wa.me/${phone}`}
      className="wa-fab"
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
    >
      <i className="fa-brands fa-whatsapp"></i>
      <span className="wa-fab-tip">Chat on WhatsApp</span>
    </Link>
  );
}
