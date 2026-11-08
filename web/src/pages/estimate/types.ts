// Shape returned by POST /api/estimate (api/estimate.js). Hours only: prices are computed here.
export interface Story { title: string; hoursLow: number; hoursHigh: number }
export interface Feature { name: string; kind: 'functional' | 'nonfunctional'; stories: Story[] }
export interface Milestone { name: string; featureIndexes: number[]; weeks: number }
export interface Estimate {
  summary: string;
  projectType: string;
  features: Feature[];
  milestones: Milestone[];
  assumptions: string[];
  openQuestions: string[];
  risks: string[];
  outOfScope: string[];
}
