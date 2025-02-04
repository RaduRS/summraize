interface CaseStudyProps {
  title: string;
  challenge: string;
  solution: string;
  results: string[];
}

export default function CaseStudy({
  title,
  challenge,
  solution,
  results,
}: CaseStudyProps) {
  return (
    <div className="my-12 bg-gray-50 rounded-xl p-8 border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">{title}</h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Challenge
          </h4>
          <p className="text-gray-700">{challenge}</p>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Solution</h4>
          <p className="text-gray-700">{solution}</p>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Key Results
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {results.map((result, index) => (
              <li key={index} className="text-gray-700">
                {result}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
