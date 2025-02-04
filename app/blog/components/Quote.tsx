interface QuoteProps {
  text: string;
  author?: string;
  role?: string;
}

export default function Quote({ text, author, role }: QuoteProps) {
  return (
    <blockquote className="my-8 border-l-4 border-blue-500 pl-6 py-4 bg-blue-50 rounded-r-lg">
      <p className="text-xl italic text-gray-800 mb-4">{text}</p>
      {author && (
        <footer className="text-gray-600">
          <strong className="font-medium">{author}</strong>
          {role && <span className="block text-sm">{role}</span>}
        </footer>
      )}
    </blockquote>
  );
}
