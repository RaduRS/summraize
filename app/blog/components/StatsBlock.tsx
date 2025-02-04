interface StatsBlockProps {
  value: string;
  label: string;
}

export default function StatsBlock({ value, label }: StatsBlockProps) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg my-8">
      <div className="text-3xl font-bold text-blue-600">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
} 