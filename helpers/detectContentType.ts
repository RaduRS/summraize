export const detectContentType = (
  text: string
): "technical" | "creative" | "neutral" => {
  // Define keywords for technical and creative content
  const technicalKeywords = [
    // Scientific & Research
    "algorithm",
    "synthesis",
    "protocol",
    "data",
    "analysis",
    "hypothesis",
    "methodology",
    "research",
    "experiment",

    // Medical & Healthcare
    "medical",
    "clinical",
    "diagnosis",
    "patient",
    "treatment",
    "symptoms",
    "pharmaceutical",
    "healthcare",
    "pathology",

    // Natural Sciences
    "biology",
    "chemistry",
    "physics",
    "mathematics",
    "molecular",
    "quantum",
    "ecosystem",
    "cellular",

    // Technology & Computing
    "computer science",
    "technology",
    "software",
    "hardware",
    "programming",
    "database",
    "network",
    "interface",
    "implementation",
    "configuration",
    "optimization",

    // Engineering
    "engineering",
    "system",
    "process",
    "mechanism",
    "infrastructure",
    "architecture",
    "framework",

    // Business & Analytics
    "metrics",
    "analytics",
    "optimization",
    "efficiency",
    "workflow",
    "methodology",
    "implementation",
    "ROI",

    // Documentation
    "documentation",
    "specification",
    "requirements",
    "technical",
    "manual",
    "guide",
    "instructions",
  ];

  const creativeKeywords = [
    // Narrative Elements
    "story",
    "plot",
    "character",
    "narrative",
    "scene",
    "chapter",
    "protagonist",
    "antagonist",
    "dialogue",

    // Creative Writing
    "imagine",
    "creative",
    "fiction",
    "novel",
    "poetry",
    "literature",
    "prose",
    "verse",
    "metaphor",
    "symbolism",

    // Emotional & Descriptive
    "emotion",
    "feeling",
    "passion",
    "dream",
    "desire",
    "beautiful",
    "mysterious",
    "dramatic",
    "exciting",

    // Genre-Specific
    "adventure",
    "magic",
    "fantasy",
    "romance",
    "mystery",
    "thriller",
    "horror",
    "sci-fi",
    "historical",

    // Artistic
    "artistic",
    "creative",
    "imaginative",
    "expressive",
    "poetic",
    "lyrical",
    "dramatic",
    "theatrical",

    // Storytelling
    "tale",
    "journey",
    "quest",
    "saga",
    "epic",
    "legend",
    "myth",
    "folklore",
    "fable",

    // Description & Style
    "description",
    "atmosphere",
    "mood",
    "tone",
    "style",
    "voice",
    "perspective",
    "theme",
  ];

  // Count occurrences of technical and creative keywords
  const technicalCount = technicalKeywords.filter((word) =>
    text.toLowerCase().includes(word)
  ).length;
  const creativeCount = creativeKeywords.filter((word) =>
    text.toLowerCase().includes(word)
  ).length;

  // Determine content type based on keyword counts
  if (technicalCount > creativeCount) {
    return "technical";
  } else if (creativeCount > technicalCount) {
    return "creative";
  } else {
    return "neutral";
  }
};
