import type { MenuAnalysisResult } from "@/lib/menu/types";

export function createMockMenuAnalysis(
  sessionId: string,
  imageName?: string,
): MenuAnalysisResult {
  const sections = [
    {
      id: "appetizers",
      title: "Appetizers",
      items: [
        {
          id: "charred-octopus",
          name: "Charred Octopus",
          description: "White bean puree, lemon, parsley, and smoked paprika oil.",
          price: "$18",
          confidence: 0.96,
          sectionTitle: "Appetizers",
        },
        {
          id: "hamachi-crudo",
          name: "Hamachi Crudo",
          description: "Yellowtail with citrus, olive oil, and shaved fennel.",
          price: "$17",
          confidence: 0.94,
          sectionTitle: "Appetizers",
        },
      ],
    },
    {
      id: "mains",
      title: "Mains",
      items: [
        {
          id: "duck-confit",
          name: "Duck Confit",
          description: "Roasted fingerlings, chicories, and mustard jus.",
          price: "$29",
          confidence: 0.93,
          sectionTitle: "Mains",
        },
        {
          id: "mushroom-ramen",
          name: "Mushroom Ramen",
          description: "Shoyu broth, noodles, soft egg, scallions, and sesame.",
          price: "$21",
          confidence: 0.95,
          sectionTitle: "Mains",
        },
      ],
    },
  ];

  return {
    sessionId,
    parseStatus: "success",
    sections,
    flatItems: sections.flatMap((section) => section.items),
    glossaryCandidates: [
      {
        id: "confit",
        label: "Confit",
        confidence: 0.91,
        contextText: "Duck Confit",
      },
      {
        id: "aioli",
        label: "Aioli",
        confidence: 0.88,
        contextText: "Garlic aioli",
      },
      {
        id: "crudo",
        label: "Crudo",
        confidence: 0.9,
        contextText: "Hamachi Crudo",
      },
    ],
    warnings: ["Menu text is mocked for this first product slice."],
    imageName,
    createdAt: new Date().toISOString(),
  };
}
