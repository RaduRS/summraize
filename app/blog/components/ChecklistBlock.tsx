interface ChecklistBlockProps {
  items: { text: string; checked: boolean }[];
}

export default function ChecklistBlock({ items }: ChecklistBlockProps) {
  return (
    <div className="my-8 bg-gray-50 rounded-lg p-6">
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-5 h-5 rounded border ${
                item.checked ? "bg-blue-500 border-blue-500" : "border-gray-300"
              }`}
            >
              {item.checked && (
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span
              className={`text-gray-700 ${item.checked ? "line-through text-gray-500" : ""}`}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
