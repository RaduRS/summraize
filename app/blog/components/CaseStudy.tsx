interface CaseStudyProps {
  title: string;
  challenge: string;
  solution: string;
  results: string[];
}

interface CaseStudiesProps {
  studies: CaseStudyProps[];
}

function CaseStudy({ title, challenge, solution, results }: CaseStudyProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 h-full">
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

export default function CaseStudies({ studies }: CaseStudiesProps) {
  // If there's only one study, render it normally
  if (studies.length === 1) {
    return (
      <div className="my-12">
        <CaseStudy {...studies[0]} />
      </div>
    );
  }

  // If there are two studies, render them side by side on desktop
  return (
    <div className="my-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {studies.map((study, index) => (
          <CaseStudy key={index} {...study} />
        ))}
      </div>
    </div>
  );
}
