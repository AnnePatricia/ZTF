// src/config/departments.ts
import type { ZtfDepartment } from '../types/ztf';

export interface DepartmentConfig {
  id: ZtfDepartment;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  nextDepartment: ZtfDepartment | 'PUBLISHED' | null;
  previousDepartment: ZtfDepartment | 'D0' | null;
  roles: string[];
  status: string;
  // ✅ Classes Tailwind complètes
  gradientFrom: string;
  gradientTo: string;
  bgLight: string;
  bgDark: string;
  textDark: string;
  textLight: string;
  badgeBg: string;
  badgeText: string;
}

export const DEPARTMENTS: Record<ZtfDepartment, DepartmentConfig> = {
  D0: {
    id: 'D0',
    name: 'Registre Central D0',
    shortName: 'D0',
    icon: 'fa-database',
    color: 'purple',
    description: 'Base de données transversale — Ingestion et validation des fichiers bruts',
    nextDepartment: 'D1',
    previousDepartment: null,
    roles: ['admin', 'chef_d0'],
    status: 'DRAFT',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-indigo-600',
    bgLight: 'bg-purple-100',
    bgDark: 'dark:bg-purple-900/30',
    textDark: 'text-purple-700 dark:text-purple-300',
    textLight: 'text-purple-300',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800'
  },
  
  D1: {
    id: 'D1',
    name: 'Module D1 — Analyse et préparation',
    shortName: 'D1',
    icon: 'fa-search',
    color: 'indigo',
    description: 'Vérification de la qualité des fichiers avant transcription',
    nextDepartment: 'D2',
    previousDepartment: 'D0',
    roles: ['admin', 'chef_d1', 'analyste'],  // ✅ AJOUTÉ
    status: 'IN_ANALYSIS',  // ✅ AJOUTÉ
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-purple-600',
    bgLight: 'bg-indigo-100',
    bgDark: 'dark:bg-indigo-900/30',
    textDark: 'text-indigo-700 dark:text-indigo-300',
    textLight: 'text-indigo-300',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800'
  },
  
  D2: {
    id: 'D2',
    name: 'Module D2 — Transcription Validée',
    shortName: 'D2',
    icon: 'fa-keyboard',
    color: 'blue',
    description: 'Production de transcriptions fidèles au style ZTF',
    nextDepartment: 'D3',
    previousDepartment: 'D1',
    roles: ['admin', 'chef_d2', 'transcripteur'],
    status: 'IN_TRANSCRIPTION',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-cyan-600',
    bgLight: 'bg-blue-100',
    bgDark: 'dark:bg-blue-900/30',
    textDark: 'text-blue-700 dark:text-blue-300',
    textLight: 'text-blue-300',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800'
  },
  
  D3: {
    id: 'D3',
    name: 'Nettoyage Éditorial',
    shortName: 'D3',
    icon: 'fa-broom',
    color: 'cyan',
    description: 'Correction et nettoyage du texte transcrit',
    nextDepartment: 'D4',
    previousDepartment: 'D2',
    roles: ['admin', 'chef_d3', 'nettoyeur'],
    status: 'IN_CLEANING',
    gradientFrom: 'from-cyan-600',
    gradientTo: 'to-cyan-800',
    bgLight: 'bg-cyan-100',
    bgDark: 'dark:bg-cyan-900/30',
    textDark: 'text-cyan-700 dark:text-cyan-300',
    textLight: 'text-cyan-300',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800'
  },
  
  D4: {
    id: 'D4',
    name: 'Éditorialisation',
    shortName: 'D4',
    icon: 'fa-book',
    color: 'indigo',
    description: 'Mise en forme et structuration du contenu',
    nextDepartment: 'D5',
    previousDepartment: 'D3',
    roles: ['admin', 'chef_d4', 'editeur'],
    status: 'IN_EDITORIALIZATION',
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-indigo-800',
    bgLight: 'bg-indigo-100',
    bgDark: 'dark:bg-indigo-900/30',
    textDark: 'text-indigo-700 dark:text-indigo-300',
    textLight: 'text-indigo-300',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800'
  },
  
  D5: {
    id: 'D5',
    name: 'Correction Stylistique',
    shortName: 'D5',
    icon: 'fa-pen-fancy',
    color: 'pink',
    description: 'Amélioration du style et de la syntaxe',
    nextDepartment: 'D6',
    previousDepartment: 'D4',
    roles: ['admin', 'chef_d5', 'correcteur_style'],
    status: 'IN_STYLE_REVIEW',
    gradientFrom: 'from-pink-600',
    gradientTo: 'to-pink-800',
    bgLight: 'bg-pink-100',
    bgDark: 'dark:bg-pink-900/30',
    textDark: 'text-pink-700 dark:text-pink-300',
    textLight: 'text-pink-300',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800'
  },
  
  D6: {
    id: 'D6',
    name: 'Super Correction',
    shortName: 'D6',
    icon: 'fa-shield-alt',
    color: 'red',
    description: 'Validation théologique et doctrinale',
    nextDepartment: 'D7',
    previousDepartment: 'D5',
    roles: ['admin', 'chef_d6', 'super_correcteur'],
    status: 'IN_SUPER_CORRECTION',
    gradientFrom: 'from-red-600',
    gradientTo: 'to-red-800',
    bgLight: 'bg-red-100',
    bgDark: 'dark:bg-red-900/30',
    textDark: 'text-red-700 dark:text-red-300',
    textLight: 'text-red-300',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800'
  },
  
  D7: {
    id: 'D7',
    name: 'Traduction',
    shortName: 'D7',
    icon: 'fa-language',
    color: 'orange',
    description: 'Traduction EN ↔ FR',
    nextDepartment: 'D8',
    previousDepartment: 'D6',
    roles: ['admin', 'chef_d7', 'traducteur'],
    status: 'IN_TRANSLATION',
    gradientFrom: 'from-orange-600',
    gradientTo: 'to-orange-800',
    bgLight: 'bg-orange-100',
    bgDark: 'dark:bg-orange-900/30',
    textDark: 'text-orange-700 dark:text-orange-300',
    textLight: 'text-orange-300',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800'
  },
  
  D8: {
    id: 'D8',
    name: 'Bon à Tirer (BAT)',
    shortName: 'D8',
    icon: 'fa-check-circle',
    color: 'green',
    description: 'Validation finale avant publication',
    nextDepartment: 'PUBLISHED',
    previousDepartment: 'D7',
    roles: ['admin', 'chef_d8', 'directeur_publication'],
    status: 'IN_BAT',
    gradientFrom: 'from-green-600',
    gradientTo: 'to-green-800',
    bgLight: 'bg-green-100',
    bgDark: 'dark:bg-green-900/30',
    textDark: 'text-green-700 dark:text-green-300',
    textLight: 'text-green-300',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-800'
  }
};

export const DEPARTMENT_ORDER: ZtfDepartment[] = [
  'D0',
  'D1',  // ✅ D1 inclus dans l'ordre
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'D7',
  'D8'
];