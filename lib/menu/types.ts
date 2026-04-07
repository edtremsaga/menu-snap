export type ParseStatus = "success" | "partial" | "failed";
export type ExplanationType = "dish" | "term";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price?: string;
  confidence: number;
  sectionTitle?: string;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface GlossaryTerm {
  id: string;
  label: string;
  confidence: number;
  contextText?: string;
}

export interface MenuAnalysisResult {
  sessionId: string;
  parseStatus: ParseStatus;
  sections: MenuSection[];
  flatItems: MenuItem[];
  glossaryCandidates: GlossaryTerm[];
  warnings: string[];
  imageName?: string;
  createdAt: string;
}

export interface ExplanationRequest {
  label: string;
  type: ExplanationType;
  contextText?: string;
  sectionTitle?: string;
}

export interface ExplanationResult {
  label: string;
  type: ExplanationType;
  explanation: string;
  secondaryNote?: string;
}

export interface StoredMenuSession {
  imagePreviewDataUrl: string;
  analysis: MenuAnalysisResult;
}
