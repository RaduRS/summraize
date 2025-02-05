interface QuoteProps {
  text: string;
  author?: string;
  role?: string;
}

export default function Quote({ text, author, role }: QuoteProps) {
  return (
    <blockquote className="bg-gray-50 border border-gray-100 rounded-xl p-6 my-8">
      <p className="text-xl italic text-gray-800 mb-4">{text}</p>
      {author && (
        <footer className="text-sm text-gray-500 mt-4 flex flex-row gap-1 items-center">
          <strong className="font-medium">- {author},</strong>
          {role && <span className="block text-sm">{role}</span>}
        </footer>
      )}
    </blockquote>
  );
}
