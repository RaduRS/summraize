import Link from "next/link";

interface Article {
  title: string;
  slug: string;
  excerpt: string;
  cover_image?: string;
}

interface RelatedArticlesProps {
  articles: Article[];
}

export default function RelatedArticles({ articles }: RelatedArticlesProps) {
  return (
    <div className="my-16">
      <h3 className="text-2xl font-bold text-gray-900 mb-8">
        Related Articles
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group block"
          >
            <article className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {article.cover_image && (
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                  width={400}
                  height={200}
                />
              )}
              <div className="p-6">
                <h4 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h4>
                <p className="mt-2 text-gray-600 line-clamp-2">
                  {article.excerpt}
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
