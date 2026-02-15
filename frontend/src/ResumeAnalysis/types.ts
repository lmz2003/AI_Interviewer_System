export interface Resume {
  id: string;
  title: string;
  content: string;
  fileType: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
  isProcessed: boolean;
  status: string;
  parsedData?: ParsedResumeData;
  overallScore?: number;
}

export interface ParsedResumeData {
  personalInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    location?: string;
    portfolio?: string;
  };
  professionalSummary?: string;
  workExperience?: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    field: string;
    graduationDate: string;
  }>;
  skills?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
  [key: string]: any;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  overallScore: number;
  completenessScore: number;
  keywordScore: number;
  formatScore: number;
  experienceScore: number;
  skillsScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: Record<string, any>;
  keywordAnalysis: Record<string, number>;
  structureAnalysis: Record<string, any>;
  contentAnalysis: Record<string, any>;
  personalInfoSuggestions?: Record<string, any>;
  experienceSuggestions?: Record<string, any>[];
  skillsSuggestions?: Record<string, any>;
  formatIssues?: Record<string, any>[];
  createdAt: string;
}

export interface APIResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface UploadResumeRequest {
  title: string;
  content?: string;
  file?: File;
}
