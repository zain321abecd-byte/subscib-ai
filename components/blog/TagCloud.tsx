import Link from "next/link";

export default function TagCloud({ tags, basePath = "/blog" }: { tags: string[]; basePath?: string }) {
  return (
    <div className="pro-tag-cloud">
      {tags.map((tag) => (
        <Link key={tag} href={`${basePath}?tag=${encodeURIComponent(tag)}`}>
          {tag}
        </Link>
      ))}
    </div>
  );
}
