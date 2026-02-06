// ═══════════════════════════════════════════
//   COURSE DATA TYPES
// ═══════════════════════════════════════════

export type PartStatus = 'locked' | 'not_started' | 'in_progress' | 'mastered';

export interface Part {
  id: string;
  title: string;
  content: string;
  mastery_criteria: string;
  status: PartStatus;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  parts: Part[];
}

export interface Course {
  title: string;
  subject: string;
  phases: Phase[];
}
