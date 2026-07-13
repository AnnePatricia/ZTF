// src/types/translation.ts
import type { ZtfBook, ZtfUser } from './ztf';

export type TranslationStatus =
  | 'pending'
  | 'in_progress'
  | 'pass_1_reading'
  | 'pass_2_comprehension'
  | 'pass_3_terminology'
  | 'pass_4_first_draft'
  | 'pass_5_revision'
  | 'pass_6_doctrinal'
  | 'pass_7_linguistic'
  | 'submitted'
  | 'validated'
  | 'rejected';

export type TranslationPass = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface TranslationTask {
  id: string;
  book_id: string | null;
  source_task_id: string | null; // correction_task_id (D6)
  translated_content: string | null;
  original_content: string | null; // Contenu anglais de D6
  status: TranslationStatus;
  current_pass: number;
  assigned_to: string | null;
  assigned_at: string | null;
  started_at: string | null;
  validator_1: string | null;
  validator_1_validated_at: string | null;
  validator_1_notes: string | null;
  validator_2: string | null;
  validator_2_validated_at: string | null;
  validator_2_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  word_count: number;
  translation_quality_score: number | null;
  doctrinal_issues: string | null;
  linguistic_notes: string | null;
  manuscript_title: string | null;
  manuscript_theme: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  validated_at: string | null;
  rejected_at: string | null;
  // Relations
  book?: ZtfBook | null;
  source_task?: any;
  assigned_user?: ZtfUser | null;
  validator_1_user?: ZtfUser | null;
  validator_2_user?: ZtfUser | null;
  approved_user?: ZtfUser | null;
}

export interface TranslationPassConfig {
  id: TranslationPass;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const TRANSLATION_PASSES: TranslationPassConfig[] = [
  {
    id: 1,
    name: 'Lecture',
    description: 'Lecture complète du texte anglais pour compréhension globale',
    icon: 'fa-book-open',
    color: 'bg-blue-600',
  },
  {
    id: 2,
    name: 'Compréhension',
    description: 'Analyse approfondie du sens et de la structure doctrinale',
    icon: 'fa-brain',
    color: 'bg-indigo-600',
  },
  {
    id: 3,
    name: 'Terminologie',
    description: 'Établissement du glossaire ZTF bilingue pour ce manuscrit',
    icon: 'fa-language',
    color: 'bg-purple-600',
  },
  {
    id: 4,
    name: 'Première traduction',
    description: 'Traduction complète anglais → français',
    icon: 'fa-pen',
    color: 'bg-pink-600',
  },
  {
    id: 5,
    name: 'Révision',
    description: 'Révision de la traduction pour fluidité et fidélité',
    icon: 'fa-sync',
    color: 'bg-rose-600',
  },
  {
    id: 6,
    name: 'Contrôle doctrinal',
    description: 'Vérification de la fidélité doctrinale ZTF',
    icon: 'fa-cross',
    color: 'bg-amber-600',
  },
  {
    id: 7,
    name: 'Contrôle linguistique',
    description: 'Vérification finale de la qualité linguistique française',
    icon: 'fa-spell-check',
    color: 'bg-emerald-600',
  },
];

export const TRANSLATION_STATUS_CONFIG: Record<TranslationStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  in_progress: { label: 'En cours', color: 'bg-blue-500', icon: 'fa-edit' },
  pass_1_reading: { label: 'Passe 1: Lecture', color: 'bg-blue-600', icon: 'fa-book-open' },
  pass_2_comprehension: { label: 'Passe 2: Compréhension', color: 'bg-indigo-600', icon: 'fa-brain' },
  pass_3_terminology: { label: 'Passe 3: Terminologie', color: 'bg-purple-600', icon: 'fa-language' },
  pass_4_first_draft: { label: 'Passe 4: 1ère traduction', color: 'bg-pink-600', icon: 'fa-pen' },
  pass_5_revision: { label: 'Passe 5: Révision', color: 'bg-rose-600', icon: 'fa-sync' },
  pass_6_doctrinal: { label: 'Passe 6: Doctrinal', color: 'bg-amber-600', icon: 'fa-cross' },
  pass_7_linguistic: { label: 'Passe 7: Linguistique', color: 'bg-emerald-600', icon: 'fa-spell-check' },
  submitted: { label: 'Soumis', color: 'bg-orange-500', icon: 'fa-paper-plane' },
  validated: { label: 'Validé', color: 'bg-green-500', icon: 'fa-check-circle' },
  rejected: { label: 'Rejeté', color: 'bg-red-500', icon: 'fa-times-circle' },
};

// Glossaire ZTF bilingue (termes doctrinaux)
export const ZTF_BILINGUAL_GLOSSARY = [
  { english: 'holiness', french: 'sainteté' },
  { english: 'prayer', french: 'prière' },
  { english: 'consecration', french: 'consécration' },
  { english: 'sanctification', french: 'sanctification' },
  { english: 'righteousness', french: 'justice' },
  { english: 'redemption', french: 'rédemption' },
  { english: 'salvation', french: 'salut' },
  { english: 'grace', french: 'grâce' },
  { english: 'faith', french: 'foi' },
  { english: 'repentance', french: 'repentance' },
  { english: 'baptism', french: 'baptême' },
  { english: 'communion', french: 'communion' },
  { english: 'righteousness', french: 'justice' },
  { english: 'unrighteousness', french: 'injustice' },
  { english: 'fellowship', french: 'communion fraternelle' },
  { english: 'testimony', french: 'témoignage' },
  { english: 'revival', french: 'réveil' },
  { english: 'outpouring', french: 'effusion' },
  { english: 'anointing', french: 'onction' },
  { english: 'deliverance', french: 'délivrance' },
  { english: 'healing', french: 'guérison' },
  { english: 'miracle', french: 'miracle' },
  { english: 'prophecy', french: 'prophétie' },
  { english: 'revelation', french: 'révélation' },
  { english: 'vision', french: 'vision' },
  { english: 'dream', french: 'songe' },
  { english: 'worship', french: 'adoration' },
  { english: 'praise', french: 'louange' },
  { english: 'thanksgiving', french: 'action de grâces' },
  { english: 'intercession', french: 'intercession' },
  { english: 'fasting', french: 'jeûne' },
  { english: 'obedience', french: 'obéissance' },
  { english: 'disobedience', french: 'désobéissance' },
  { english: 'sin', french: 'péché' },
  { english: 'forgiveness', french: 'pardon' },
  { english: 'mercy', french: 'miséricorde' },
  { english: 'judgment', french: 'jugement' },
  { english: 'eternal life', french: 'vie éternelle' },
  { english: 'kingdom of God', french: 'royaume de Dieu' },
  { english: 'gospel', french: 'évangile' },
  { english: 'disciple', french: 'disciple' },
  { english: 'apostle', french: 'apôtre' },
  { english: 'prophet', french: 'prophète' },
  { english: 'teacher', french: 'docteur' },
  { english: 'pastor', french: 'pasteur' },
  { english: 'evangelist', french: 'évangéliste' },
  { english: 'church', french: 'église' },
  { english: 'assembly', french: 'assemblée' },
  { english: 'congregation', french: 'congrégation' },
  { english: 'ministry', french: 'ministère' },
  { english: 'service', french: 'service' },
  { english: 'calling', french: 'appel' },
  { english: 'mission', french: 'mission' },
  { english: 'witness', french: 'témoin' },
  { english: 'martyr', french: 'martyr' },
  { english: 'persecution', french: 'persécution' },
  { english: 'suffering', french: 'souffrance' },
  { english: 'tribulation', french: 'tribulation' },
  { english: 'perseverance', french: 'persévérance' },
  { english: 'endurance', french: 'endurance' },
  { english: 'patience', french: 'patience' },
  { english: 'hope', french: 'espérance' },
  { english: 'love', french: 'amour' },
  { english: 'joy', french: 'joie' },
  { english: 'peace', french: 'paix' },
  { english: 'goodness', french: 'bonté' },
  { english: 'kindness', french: 'douceur' },
  { english: 'gentleness', french: 'douceur' },
  { english: 'self-control', french: 'maîtrise de soi' },
  { english: 'humility', french: 'humilité' },
  { english: 'pride', french: 'orgueil' },
  { english: 'temptation', french: 'tentation' },
  { english: 'trial', french: 'épreuve' },
  { english: 'testing', french: 'mise à l\'épreuve' },
  { english: 'refinement', french: 'affinement' },
  { english: 'purification', french: 'purification' },
  { english: 'cleansing', french: 'purification' },
  { english: 'washing', french: 'lavage' },
  { english: 'blood', french: 'sang' },
  { english: 'cross', french: 'croix' },
  { english: 'resurrection', french: 'résurrection' },
  { english: 'ascension', french: 'ascension' },
  { english: 'second coming', french: 'second avènement' },
  { english: 'rapture', french: 'enlèvement' },
  { english: 'millennium', french: 'millénium' },
  { english: 'new heaven', french: 'nouveaux cieux' },
  { english: 'new earth', french: 'nouvelle terre' },
  { english: 'new Jerusalem', french: 'nouvelle Jérusalem' },
  { english: 'throne', french: 'trône' },
  { english: 'glory', french: 'gloire' },
  { english: 'majesty', french: 'majesté' },
  { english: 'sovereignty', french: 'souveraineté' },
  { english: 'omnipotence', french: 'omnipotence' },
  { english: 'omniscience', french: 'omniscience' },
  { english: 'omnipresence', french: 'omniprésence' },
  { english: 'holiness', french: 'sainteté' },
  { english: 'justice', french: 'justice' },
  { english: 'mercy', french: 'miséricorde' },
  { english: 'truth', french: 'vérité' },
  { english: 'light', french: 'lumière' },
  { english: 'darkness', french: 'ténèbres' },
  { english: 'life', french: 'vie' },
  { english: 'death', french: 'mort' },
  { english: 'spirit', french: 'esprit' },
  { english: 'soul', french: 'âme' },
  { english: 'body', french: 'corps' },
  { english: 'heart', french: 'cœur' },
  { english: 'mind', french: 'intelligence' },
  { english: 'will', french: 'volonté' },
  { english: 'conscience', french: 'conscience' },
  { english: 'flesh', french: 'chair' },
  { english: 'world', french: 'monde' },
  { english: 'heaven', french: 'ciel' },
  { english: 'hell', french: 'enfer' },
  { english: 'paradise', french: 'paradis' },
  { english: 'abyss', french: 'abîme' },
  { english: 'lake of fire', french: 'lac de feu' },
  { english: 'outer darkness', french: 'ténèbres extérieures' },
  { english: 'weeping', french: 'pleurs' },
  { english: 'gnashing of teeth', french: 'grincement de dents' },
  { english: 'eternal punishment', french: 'châtiment éternel' },
  { english: 'eternal reward', french: 'récompense éternelle' },
  { english: 'crown', french: 'couronne' },
  { english: 'inheritance', french: 'héritage' },
  { english: 'promise', french: 'promesse' },
  { english: 'covenant', french: 'alliance' },
  { english: 'testament', french: 'testament' },
  { english: 'scripture', french: 'écriture' },
  { english: 'word of God', french: 'parole de Dieu' },
  { english: 'law', french: 'loi' },
  { english: 'prophets', french: 'prophètes' },
  { english: 'psalms', french: 'psaumes' },
  { english: 'gospel', french: 'évangile' },
  { english: 'epistle', french: 'épître' },
  { english: 'revelation', french: 'apocalypse' },
];

// Correspondance des versions bibliques
export const BIBLE_VERSIONS_MAPPING = [
  { english: 'NIV (New International Version)', french: 'Bible du Semeur' },
  { english: 'KJV (King James Version)', french: 'Louis Segond 1910' },
  { english: 'ESV (English Standard Version)', french: 'Segond 21' },
  { english: 'NASB (New American Standard Bible)', french: 'Nouvelle Edition de Genève' },
  { english: 'NKJV (New King James Version)', french: 'Louis Segond 1910' },
  { english: 'NLT (New Living Translation)', french: 'Parole de Vie' },
  { english: 'AMP (Amplified Bible)', french: 'Bible Annotée' },
  { english: 'MSG (The Message)', french: 'La Bible en français courant' },
];