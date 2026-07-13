// Types globaux pour l'application

export interface User {
  id: number;
  name: string;
  role: string;
  documentsAssigned: number;
  avatar: string;
  lastAccess: string;
}

export interface Role {
  name: string;
  description: string;
  permissions: string;
  users: number;
}

export interface Document {
  id: number;
  title: string;
  type: string;
  source: string;
  status: string;
  progress: number;
  assignedTo: string;
  updatedAt: string;
  tags: string[];
}

export interface WorkflowStage {
  key: string;
  label: string;
  color: string;
}

export interface WorkflowItem {
  id: number;
  title: string;
  assigned?: string;
  source?: string;
  date: string;
}

export interface Stat {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export interface Activity {
  date: string;
  user: string;
  action: string;
  target: string;
}