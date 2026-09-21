export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  createdAt: string;
}

export interface NewProjectInput {
  name: string;
  color: string;
  icon?: string | null;
}
