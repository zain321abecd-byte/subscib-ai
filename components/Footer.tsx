import Link from "next/link";
import Image from "next/image";
import PaymentLogo from "./PaymentLogo";
import { getSiteSettings } from "@/lib/site-settings";
import { getRegion } from "@/lib/region";

export default async function Footer() {
  const [s, region] = await Promise.all([getSiteSettings(), getRegion()]);
  const isPK = region === "PK";
  const wa = s.whatsapp_number || "15550132026";
  const email = s.contact_email || "contact@subscribai.com";

  const socials: { key: string; icon: string; label: string }[] = [
    { key: "social_instagram", icon: "fa-brands fa-instagram", label: "Instagram" },
    { key: "social_facebook", icon: "fa-brands fa-facebook", label: "Facebook" },
    { key: "social_tiktok", icon: "fa-brands fa-tiktok", label: "TikTok" },
    { key: "social_youtube", icon: "fa-brands fa-youtube", label: "YouTube" },
  ].filter((sn) => !!s[sn.key]);

  return (
    <footer className="v2-footer">
      <div className="v2-container v2-footer-grid">
        <div className="v2-footer-brand">
          <Link href="/"><Image src="/assets/subscribai-logo.png" alt="SubscribAI" width={140} height={36} /></Link>
          <p>Premium AI subscriptions, automation packs, and digital tools — delivered in minutes.</p>
          <div className="v2-pay-row">
            {isPK && <span className="v2-pay-chip"><PaymentLogo provider="jazzcash" height={22} /></span>}
            {isPK && <span className="v2-pay-chip"><PaymentLogo provider="easypaisa" height={22} /></span>}
            <span className="v2-pay-chip"><PaymentLogo provider="card" height={22} /></span>
          </div>
          {socials.length > 0 && (
            <div className="v2-social-row" style={{ display: "flex", gap: 12, marginTop: 12 }}>
              {socials.map((sn) => (
                <a key={sn.key} href={s[sn.key]} target="_blank" rel="noopener" aria-label={sn.label}>
                  <i className={sn.icon}></i>
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4>Shop</h4>
          <Link href="/shop#ai-subscriptions">AI Subscriptions</Link>
          <Link href="/shop#design-tools">Design &amp; Image AI</Link>
          <Link href="/shop#productivity">Productivity</Link>
          <Link href="/shop#automation">Automation</Link>
          <Link href="/shop#courses">Courses</Link>
          <Link href="/freebies">Freebies</Link>
        </div>

        <div>
          <h4>Company</h4>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/prices">Pricing</Link>
          <Link href="/faq">FAQ</Link>
        </div>

        <div>
          <h4>Help</h4>
          <Link href="/faq">FAQ</Link>
          <Link href="/refund">Refund policy</Link>
          <Link href="/terms">Terms &amp; conditions</Link>
          <Link href="/privacy">Privacy policy</Link>
          <a href={`https://wa.me/${wa}`}><i className="fa-brands fa-whatsapp"></i> WhatsApp</a>
          <a href={`mailto:${email}`}><i className="fa-solid fa-envelope"></i> Email</a>
        </div>
      </div>

      <div className="v2-container v2-footer-bottom">
        <span>&copy; {new Date().getFullYear()} SubscribAI. All rights reserved.</span>
        <span>Made for creators</span>
      </div>
    </footer>
  );
}
