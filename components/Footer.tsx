import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="v2-footer">
      <div className="v2-container v2-footer-grid">
        <div className="v2-footer-brand">
          <Link href="/"><Image src="/assets/subscribai-logo.png" alt="SubscribAI" width={140} height={36} /></Link>
          <p>Premium AI subscriptions, automation packs, and digital tools — paid in PKR, delivered in minutes.</p>
          <div className="v2-pay-row">
            <span><i className="fa-solid fa-mobile-screen"></i> JazzCash</span>
            <span><i className="fa-solid fa-mobile-screen"></i> Easypaisa</span>
            <span><i className="fa-solid fa-credit-card"></i> Card</span>
          </div>
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
          <a href="https://wa.me/15550132026"><i className="fa-brands fa-whatsapp"></i> WhatsApp</a>
          <a href="mailto:contact@subscribai.com"><i className="fa-solid fa-envelope"></i> Email</a>
        </div>
      </div>

      <div className="v2-container v2-footer-bottom">
        <span>&copy; {new Date().getFullYear()} SubscribAI. All rights reserved.</span>
        <span>Made for creators in Pakistan</span>
      </div>
    </footer>
  );
}
