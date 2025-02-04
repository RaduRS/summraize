interface CodeBlockProps {
  code: string;
  language: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className="my-8">
      <div className="bg-gray-800 rounded-t-lg px-4 py-2 text-xs text-gray-400">
        {language}
      </div>
      <pre className="bg-gray-900 rounded-b-lg p-4 overflow-x-auto">
        <code className="text-sm text-gray-200 font-mono">{code}</code>
      </pre>
    </div>
  );
}
