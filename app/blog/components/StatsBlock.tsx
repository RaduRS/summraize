interface Statistic {
  value: string;
  label: string;
}

interface StatsBlockProps {
  title: string;
  statistics: Statistic[];
}

export default function StatsBlock({ title, statistics }: StatsBlockProps) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 my-8">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="grid grid-cols-2 gap-4">
        {statistics.map((stat, i) => (
          <div key={i}>
            <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
