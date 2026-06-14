import Link from "next/link";

export default function BlogHero({
  title,
  subtitle,
  current,
  category,
}: {
  title: string;
  subtitle?: string;
  current: string;
  category?: string;
}) {
  return (
    <header className="pro-blog-hero">
      <div className="v2-container">
        <nav className="pro-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i className="fa-solid fa-chevron-right"></i>
          <Link href="/blog">Blog</Link>
          {category && (
            <>
              <i className="fa-solid fa-chevron-right"></i>
              <span>{category}</span>
            </>
          )}
          {(category || current !== "Blog") && (
            <>
              <i className="fa-solid fa-chevron-right"></i>
              <span>{current}</span>
            </>
          )}
        </nav>
        <p className="v2-eyebrow">SubscribAI Blog</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
}
