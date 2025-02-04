import Link from "next/link";

interface ArticleHeaderProps {
  title: string;
  subtitle?: string;
}

export default function ArticleHeader({ title, subtitle }: ArticleHeaderProps) {
  // Function to check if the title contains a URL
  const extractUrl = (text: string): string | null => {
    // Match both with and without protocol
    const urlRegex = /(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?/;
    const match = text.match(urlRegex);
    if (match) {
      // Ensure the URL has a protocol
      const url = match[0];
      return url.startsWith("http") ? url : `https://${url}`;
    }
    return null;
  };

  const url = extractUrl(title);
  // Remove the URL from the display title if it's the entire title
  const displayTitle =
    url && title.toLowerCase() === url.toLowerCase()
      ? title.replace(/^https?:\/\//, "")
      : title;

  return (
    <div className="mb-2 mt-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        {url ? (
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-600 transition-colors underline"
          >
            {displayTitle}
          </Link>
        ) : (
          displayTitle
        )}
      </h2>
      {subtitle && <p className="text-xl text-gray-600">{subtitle}</p>}
    </div>
  );
}
