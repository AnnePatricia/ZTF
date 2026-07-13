# 🖊️ Interface — Correcteur Collaboratif Atomique
### bcm-gest-react · Relecture 2 · Architecture Blocs · v2.0

---

## Direction esthétique — "Editorial Studio"

Interface sobre, professionnelle, dense mais aérée. Inspirée des éditeurs
collaboratifs de haut niveau (Notion, Linear, iA Writer) croisés avec un
outil de révision légal/éditorial. Le texte prime sur tout le reste.

| Rôle | Valeur | Usage |
|------|--------|-------|
| Fond global | `#F8F7F4` | Blanc cassé papier |
| Zone d'édition | `#FFFFFF` | Blocs de texte |
| Sidebar | `#1C1C1E` | Anthracite profond |
| Accent | `#1D4ED8` | Bleu encre — actions principales |
| Draft | `#FFFFFF` | Bloc intact |
| Proposed | `#FEF9C3` | Fond ambre — en attente |
| Merged | `#F0FDF4` | Fond vert — validé |
| Rejected | `#FEF2F2` | Fond rouge clair — rejeté |
| Live | `#EFF6FF` | Fond bleu clair — édition en cours |
| Curseur A | `#2563EB` | Bleu — utilisateur courant |
| Curseur B | `#D97706` | Ambre — collaborateur |
| Curseur C | `#7C3AED` | Violet — troisième collaborateur |
| Typo titre | `Fraunces` | Serif élégant, journalistique |
| Typo UI | `DM Sans` | Corps et interface |
| Typo mono | `JetBrains Mono` | IDs de blocs, métadonnées |

---

## Vue d'ensemble — Layout général

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  TOPBAR                                                                              │
│  [≡] bcm-gest  ›  Livres  ›  La Forêt des Signes  ›  Chapitre 3 · Relecture 2      │
│  [🔵 AM] [🟠 KF] [🟣 DR]     ● Sync live (3 connectés)     [⬇ Exporter ▾]          │
├──────────────────┬───────────────────────────────────────────┬───────────────────────┤
│                  │                                           │                       │
│   SOMMAIRE       │         ÉDITEUR DE BLOCS                  │   FLUX & PROPOSITIONS │
│   DYNAMIQUE      │         (vue atomique)                    │   (panneau droit)     │
│                  │                                           │                       │
│   Pastilles de   │  Chaque paragraphe = 1 bloc indépendant   │  Propositions pending │
│   statut par     │  Statut visible sur chaque bloc           │  Activité temps réel  │
│   bloc           │  Curseurs colorés des collaborateurs      │  Statut offline       │
│                  │                                           │                       │
└──────────────────┴───────────────────────────────────────────┴───────────────────────┘
```

---

## 1. Topbar

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                      │
│  [≡]  bcm-gest-react    ›  Livres  ›  La Forêt des Signes  ›  Chapitre 3            │
│                                                                                      │
│  Stade : [Relecture 2 ▾]    ● Connecté · 3 collaborateurs actifs                    │
│                                                                                      │
│  [🔵 AM]  [🟠 KF]  [🟣 DR]                    [⟳ Sync il y a 1s]                  │
│  Aminata   Kouam    Doriane                                                          │
│  §p03      §p05     §p07    ← position live de chaque collaborateur                 │
│                                                                                      │
│                                                    [🕐 Historique]  [⬇ Exporter ▾]  │
│                                                                     ├ EPUB           │
│                                                                     ├ PDF            │
│                                                                     └ DOCX           │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Détails topbar :**
- Fil d'Ariane cliquable pour remonter dans la hiérarchie
- Badge de stade cliquable : permet de passer au stade suivant (Correction finale)
- Avatars colorés avec position live dans le document au survol
- Point cyan pulsant = WebSocket Supabase Realtime actif
- Indicateur sync : `⟳ En cours…` / `✓ Sync il y a 1s` / `⚠ 3 ops en attente`

---

## 2. Panneau gauche — Sommaire dynamique

```
┌──────────────────────────┐
│  📖 SOMMAIRE             │
│  ──────────────────────  │
│                          │
│  Progression globale     │
│  [████████░░░░]  67%    │
│  43 / 64 blocs validés   │
│                          │
│  ⬜ 0   🟠 3   ✅ 43     │
│  Draft  Prop  Merged     │
│                          │
│  ──────────────────────  │
│                          │
│  ▼ PARTIE I              │
│  │                       │
│  ├─ Chapitre 1    ✅     │  ← 100% merged
│  │  12 blocs · 0 prop.   │
│  │                       │
│  ├─ Chapitre 2    🟠     │  ← propositions en attente
│  │  8 blocs · 2 prop.    │
│  │                       │
│  ▶─ Chapitre 3    🟠     │  ← actif, en cours
│  │  ├─ §h01   ✅         │  ← titre mergé
│  │  ├─ §p01   ✅         │  ← paragraphe mergé
│  │  ├─ §p02   🟠         │  ← proposition en attente
│  │  ├─ §p03   🔵         │  ← édition live Aminata
│  │  ├─ §p04   ⬜         │  ← draft, non touché
│  │  ├─ §img01 ✅         │  ← image validée
│  │  ├─ §p05   💬         │  ← commentaire ouvert
│  │  └─ §p06   ⬜         │
│  │                       │
│  ├─ Chapitre 4    ⬜     │
│  └─ Chapitre 5    ⬜     │
│                          │
│  ▼ PARTIE II             │
│  ├─ Chapitre 6    ⬜     │
│  └─ Chapitre 7    ⬜     │
│                          │
│  ──────────────────────  │
│  LÉGENDE                 │
│  ✅  Merged (validé)     │
│  🟠  Proposed (attente)  │
│  🔵  Live (en édition)   │
│  💬  Commentaire ouvert  │
│  ⬜  Draft (intact)      │
└──────────────────────────┘
```

**Comportement :**
- Clic sur un bloc dans le sommaire → scroll vers ce bloc dans l'éditeur
- Pastilles mises à jour en temps réel via Supabase Realtime
- Compteur `2 prop.` cliquable → filtre le panneau droit sur ce chapitre
- Bloc actif surligné avec un trait gauche bleu

---

## 3. Panneau central — Éditeur de blocs atomiques

### 3.1 Barre d'outils contextuelle

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  [B] [I] [U] [S]  │  [H1][H2][H3]  │  [¶]["][—]  │  [🔗][📷]              │
│                                                                              │
│  Mode : [✏ Édition libre]  [📝 Proposition]  [👁 Lecture seule]             │
│                                                              Zoom : [100%▾]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Trois modes :**
- **Édition libre** — modification directe (rédacteur en chef, chef de projet)
- **Proposition** — chaque modification crée une `block_proposal` en attente d'approbation (relecteurs, correcteurs)
- **Lecture seule** — consultation uniquement, commentaires autorisés

---

### 3.2 Rendu des blocs selon leur statut

---

#### Bloc MERGED (✅ validé)

```
┌─ blk_c3_h01 ──────────────────────────────────────── ✅ MERGED ──┐
│                                                                   │
│  H3   Chapitre 3 — La Lumière entre les Arbres                   │
│                                                                   │
│  Mergé par Aminata K. · Aujourd'hui 10:15       [💬 0]  [···]   │
└───────────────────────────────────────────────────────────────────┘
```

---

#### Bloc DRAFT (⬜ non touché)

```
┌─ blk_c3_p04 ──────────────────────────────────────── ⬜ DRAFT ───┐
│                                                                   │
│  Elle n'avait pas dormi depuis deux jours. Ses pensées            │
│  tournaient en boucle, repassant inlassablement sur le            │
│  même fragment de mémoire : cette voix dans l'obscurité.          │
│                                                                   │
│  1 247 caractères · Dernière modif : import initial  [💬 0][···] │
└───────────────────────────────────────────────────────────────────┘
```

---

#### Bloc PROPOSED (🟠 proposition en attente)

```
┌─ blk_c3_p02 ─────────────────────────────── 🟠 PROPOSED ── [?] ─┐
│                                                                   │
│  ╔═══════════════════════════════════════════════════════════╗   │
│  ║  AVANT — Draft original                                  ║   │
│  ║  ─────────────────────────────────────────────────────   ║   │
│  ║  « Il y a quelque chose ici, murmura-t-elle, quelque     ║   │
│  ║  chose qui ressemble à un souvenir. »                    ║   │
│  ╠═══════════════════════════════════════════════════════════╣   │
│  ║  PROPOSÉ par 🟠 Kouam Fotso · il y a 8 min              ║   │
│  ║  ─────────────────────────────────────────────────────   ║   │
│  ║  « Il y a quelque chose ici, murmura-t-elle, quelque     ║   │
│  ║  chose qui ~~ressemble~~ ressemblait à un souvenir. »    ║   │
│  ║                                                          ║   │
│  ║  💬 Justification :                                      ║   │
│  ║  "L'imparfait est plus cohérent avec le ton narratif     ║   │
│  ║   du reste du chapitre."                                 ║   │
│  ╠═══════════════════════════════════════════════════════════╣   │
│  ║  [✅ Approuver & Merger]  [❌ Rejeter]  [✏ Modifier]     ║   │
│  ╚═══════════════════════════════════════════════════════════╝   │
│                                                    [💬 2] [···]  │
└───────────────────────────────────────────────────────────────────┘
```

---

#### Bloc LIVE (🔵 en cours d'édition par un collaborateur)

```
┌─ blk_c3_p03 ──────────────────────────────────────── 🔵 LIVE ───┐
│                                                                   │
│  La lumière filtrait à travers les feuilles, dessinant            │
│  sur le sol des motifs que personne n'avait [🔵 AM]▌             │
│                                                                   │
│  ┌─────────────────────────────────────────┐                     │
│  │  ✏ Aminata K. est en train d'écrire…   │                     │
│  │  Dernière frappe : il y a 2 secondes    │                     │
│  └─────────────────────────────────────────┘                     │
│                                                    [💬 0] [···]  │
└───────────────────────────────────────────────────────────────────┘
```

---

#### Bloc avec COMMENTAIRE ouvert (💬)

```
┌─ blk_c3_p05 ──────────────────────────────────────── 💬 ────────┐
│                                                                   │
│  Le soleil se couchait sur la cime des arbres, projetant          │
│  des ombres longues sur le chemin que Maëlle empruntait           │
│  chaque soir depuis l'enfance.                                    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ 🟣 Doriane R. · il y a 12 min                            │   │
│  │ ─────────────────────────────────────────────────────    │   │
│  │ Ancre : "des ombres longues sur le chemin"               │   │
│  │                                                          │   │
│  │ Cette image est déjà utilisée au chapitre 1, §p04.      │   │
│  │ Risque de répétition — reformuler ?                      │   │
│  │                                                          │   │
│  │  ↳ 🟠 Kouam F. · il y a 8 min                           │   │
│  │    D'accord, je propose une alternative dans §p02.      │   │
│  │                                                          │   │
│  │ [✏ Répondre]                    [✓ Marquer résolu]       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                    [💬 1] [···]  │
└───────────────────────────────────────────────────────────────────┘
```

---

#### Bloc IMAGE (haute définition)

```
┌─ blk_c3_img01 ────────────────────────────────────── ✅ MERGED ──┐
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  │              [ IMAGE HAUTE DÉFINITION ]                 │     │
│  │              Carte de la Forêt des Signes               │     │
│  │              1920×1080 · 2.4 Mo · fig_003.png           │     │
│  │                                                         │     │
│  │  [🔍 Zoom]  [⬇ Télécharger]  [✏ Remplacer]             │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Légende : Fig. 3 — Carte de la région forestière (source : ...)  │
│                                                    [💬 0] [···]  │
└───────────────────────────────────────────────────────────────────┘
```

---

#### Menu contextuel d'un bloc (clic sur `[···]`)

```
                          ┌─────────────────────────────┐
                          │  ✏  Modifier ce bloc        │
                          │  💬  Ajouter un commentaire  │
                          │  📋  Copier l'ID du bloc     │
                          │  ─────────────────────────  │
                          │  ⬆  Déplacer vers le haut   │
                          │  ⬇  Déplacer vers le bas    │
                          │  ─────────────────────────  │
                          │  🕐  Historique de ce bloc  │
                          │  ↩  Restaurer une version   │
                          │  ─────────────────────────  │
                          │  🗑  Supprimer ce bloc       │
                          └─────────────────────────────┘
```

---

## 4. Panneau droit — Flux d'activité, Propositions, Offline

### 4.1 Onglets

```
┌───────────────────────────────────────────┐
│  [Propositions (3)]  [Activité]  [Offline] │
└───────────────────────────────────────────┘
```

---

### 4.2 Onglet Propositions

```
┌───────────────────────────────────────────────┐
│  🟠 PROPOSITIONS EN ATTENTE  ·  3              │
│  ─────────────────────────────────────────    │
│                                               │
│  Filtre : [Tous ▾]  [Ce chapitre]  [Les miennes]│
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ 🟠 blk_c3_p02                          │  │
│  │ Kouam F.  ·  il y a 8 min              │  │
│  │ ─────────────────────────────────────  │  │
│  │ ressemble → ressemblait                │  │
│  │ "Imparfait plus cohérent"              │  │
│  │                                         │  │
│  │ [✅ Approuver & Merger]  [❌ Rejeter]   │  │
│  │                          [✏ Modifier]   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ 🟠 blk_c3_p05                          │  │
│  │ Doriane R.  ·  il y a 22 min           │  │
│  │ ─────────────────────────────────────  │  │
│  │ "su entendre" → "pu entendre"          │  │
│  │ "Plus naturel à l'oral"                │  │
│  │                                         │  │
│  │ [✅ Approuver & Merger]  [❌ Rejeter]   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ 🟠 blk_ch2_p08  (Chapitre 2)           │  │
│  │ Kouam F.  ·  il y a 1h                 │  │
│  │ ─────────────────────────────────────  │  │
│  │ Ajout d'un paragraphe de transition    │  │
│  │ [Voir le bloc →]                        │  │
│  │                                         │  │
│  │ [✅ Approuver & Merger]  [❌ Rejeter]   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ─────────────────────────────────────────    │
│  [✅ Tout approuver (3)]  [❌ Tout rejeter]   │
└───────────────────────────────────────────────┘
```

---

### 4.3 Onglet Activité (flux temps réel)

```
┌───────────────────────────────────────────────┐
│  ⚡ ACTIVITÉ EN TEMPS RÉEL                    │
│  ─────────────────────────────────────────    │
│                                               │
│  🔵  Aminata  édite §p03           · 2s       │
│  🟠  Kouam    a proposé §p02       · 8m       │
│  🟣  Doriane  a commenté §p05      · 12m      │
│  🟣  Doriane  a proposé §p05       · 22m      │
│  ✅  §ch2_p07 mergé par Aminata    · 1h       │
│  🟠  Kouam    a proposé §ch2_p08   · 1h       │
│  ✅  §ch2_p06 mergé par Aminata    · 2h       │
│  🔵  Aminata  a ouvert le document · 2h       │
│                                               │
│  [Voir tout l'historique →]                   │
└───────────────────────────────────────────────┘
```

---

### 4.4 Onglet Offline — Gestion déconnexion

```
┌───────────────────────────────────────────────┐
│  📡 STATUT CONNEXION                          │
│  ─────────────────────────────────────────    │
│                                               │
│  État nominal :                               │
│  🟢 En ligne · WebSocket actif               │
│  Dernière sync : il y a 1 seconde             │
│                                               │
│  ─────────────────────────────────────────    │
│                                               │
│  Si déconnecté :                              │
│                                               │
│  🔴 Hors ligne                               │
│  ─────────────────────────────────────────    │
│  Vous travaillez en mode local.               │
│  Toutes vos modifications sont                │
│  sauvegardées dans votre navigateur.          │
│                                               │
│  Opérations en attente de sync : 3            │
│  ┌─────────────────────────────────────────┐  │
│  │ ✏ Modif §p03  ·  14:32:11              │  │
│  │ 💬 Commentaire §p05  ·  14:33:45       │  │
│  │ 🟠 Proposition §p06  ·  14:35:02       │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Dès la reconnexion :                         │
│  → Sync automatique via CRDT Y.js             │
│  → Résolution des conflits sans perte         │
│  → Notification de sync réussie               │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 5. Modal — Historique d'un bloc

S'ouvre via `[···] → Historique de ce bloc`.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🕐 Historique du bloc blk_c3_p02                               [✕]         │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  12 opérations enregistrées · De 09:14 à 14:32                              │
│                                                                              │
│  [Rejouer ▶]  [Comparer deux versions]                    Zoom: [100% ▾]   │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  14:32  🟠 Kouam    PROPOSED   ressemble → ressemblait   🟠 EN ATTENTE      │
│  13:45  🔵 Aminata  INSERT     ajout "murmura-t-elle"    ✅ APPLIQUÉ        │
│  12:30  🟣 Doriane  STYLE      italique sur "souvenir"   ✅ APPLIQUÉ        │
│  11:15  🔵 Aminata  INSERT     premier contenu du bloc   ✅ APPLIQUÉ        │
│  09:14  SYSTÈME     IMPORT     import depuis .docx       ✅ APPLIQUÉ        │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Restaurer à :  [09:14 Import ▾]             [↩ Restaurer cette version]   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Modal — Comparaison de deux états d'un bloc

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Comparaison · blk_c3_p02                                           [✕]     │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [État A ▾]  Import initial · 09:14          [État B ▾]  Proposal Kouam     │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ÉTAT A                              │  ÉTAT B                              │
│  ──────────────────────────────────  │  ──────────────────────────────────  │
│                                      │                                      │
│  « Il y a quelque chose ici,         │  « Il y a quelque chose ici,         │
│  murmura-t-elle, quelque chose       │  murmura-t-elle, quelque chose       │
│  qui ░ressemble░ à un souvenir. »   │  qui ▓ressemblait▓ à un souvenir. » │
│       ↑ supprimé                     │       ↑ inséré                       │
│                                      │                                      │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  1 modification détectée                                                     │
│                                                                              │
│                            [Annuler]  [Restaurer état A]  [Approuver état B] │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Clôture de la session — Passage au stade suivant

Quand toutes les propositions sont mergées, le chef de projet peut clore la Relecture 2.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✅ Relecture 2 — Prête à clore                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  64 / 64 blocs au statut MERGED                ████████████████  100%       │
│  0 proposition en attente                                                    │
│  0 commentaire ouvert                                                        │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Résumé de la session                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Durée            3 jours (5 mars → 8 mars 2025)                      │  │
│  │  Collaborateurs   Aminata K. · Kouam F. · Doriane R.                  │  │
│  │  Propositions     24 propositions dont 21 approuvées / 3 rejetées     │  │
│  │  Commentaires     18 commentaires dont 18 résolus                     │  │
│  │  Opérations       247 opérations enregistrées                         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Prochaine étape : Correction finale                                         │
│                                                                              │
│  [Annuler]        [📄 Exporter le rapport]    [🚀 Passer en Correction finale]│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Notifications toast — coin bas-droit

```
                              ┌──────────────────────────────────────┐
                              │ ✅  Bloc mergé · blk_c3_p02          │  ← vert
                              │     "ressemblait" approuvé           │
                              └──────────────────────────────────────┘

                              ┌──────────────────────────────────────┐
                              │ 🟠  Nouvelle proposition · blk_c3_p06│  ← ambre
                              │     Kouam F. · [Voir →]              │
                              └──────────────────────────────────────┘

                              ┌──────────────────────────────────────┐
                              │ 🔴  Hors ligne · Mode local activé   │  ← rouge
                              │     3 opérations en attente          │
                              └──────────────────────────────────────┘

                              ┌──────────────────────────────────────┐
                              │ 🟢  Reconnecté · Sync en cours…      │  ← vert
                              │     3 opérations synchronisées ✓     │
                              └──────────────────────────────────────┘

                              ┌──────────────────────────────────────┐
                              │ ⬇  Export PDF prêt                   │  ← bleu
                              │     [Télécharger]                    │
                              └──────────────────────────────────────┘
```

---

## 9. Permissions par rôle dans la session

| Rôle | Lire | Commenter | Proposer | Merger | Clore session |
|------|------|-----------|----------|--------|---------------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `editor` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `redacteur_chef` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `corrector` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `reviewer` | ✅ | ✅ | ❌ | ❌ | ❌ |

**Ce que ça change dans l'UI selon le rôle :**

- **admin / editor** — Voient les boutons `[✅ Approuver & Merger]`, `[❌ Rejeter]`, `[🚀 Passer en Correction finale]`
- **redacteur_chef** — Voient les boutons `[✅ Approuver & Merger]` et `[❌ Rejeter]` mais pas la clôture de session. Peuvent éditer directement en mode libre.
- **corrector** — Mode Proposition par défaut. Voient `[Proposer cette modification]` à la place de `[Merger]`. Ne peuvent pas éditer directement.
- **reviewer** — Mode Lecture seule. Seul le bouton `[💬 Commenter]` est visible. Barre d'outils désactivée.

---

## 10. Récapitulatif des composants à implémenter

| Composant | Fichier | Priorité |
|-----------|---------|----------|
| Topbar avec avatars et position live | `Topbar.tsx` | 🔴 P0 |
| Sommaire dynamique avec pastilles | `DynamicSummary.tsx` | 🔴 P0 |
| Rendu bloc DRAFT | `BlockDraft.tsx` | 🔴 P0 |
| Rendu bloc PROPOSED (diff avant/après) | `BlockProposed.tsx` | 🔴 P0 |
| Rendu bloc MERGED | `BlockMerged.tsx` | 🔴 P0 |
| Rendu bloc LIVE (curseur distant) | `BlockLive.tsx` | 🔴 P0 |
| Éditeur TipTap par bloc | `BlockEditor.tsx` | 🔴 P0 |
| Panneau propositions | `ProposalsPanel.tsx` | 🟠 P1 |
| Panneau activité temps réel | `ActivityPanel.tsx` | 🟠 P1 |
| Panneau offline + file d'attente | `OfflinePanel.tsx` | 🟠 P1 |
| Commentaire inline ancré | `BlockComment.tsx` | 🟠 P1 |
| Modal historique d'un bloc | `BlockHistoryModal.tsx` | 🟠 P1 |
| Modal comparaison d'états | `BlockDiffModal.tsx` | 🟠 P1 |
| Menu contextuel bloc `[···]` | `BlockMenu.tsx` | 🟠 P1 |
| Modal clôture de session | `SessionCloseModal.tsx` | 🟡 P2 |
| Barre d'outils éditeur | `EditorToolbar.tsx` | 🟡 P2 |
| Toasts notifications | `ToastContainer.tsx` | 🟡 P2 |
| Rendu bloc IMAGE HD | `BlockImage.tsx` | 🟡 P2 |

---

## 11. Ce qui change par rapport à la v1

| Aspect | v1 (ancienne) | v2 (atomique) |
|--------|---------------|---------------|
| Unité de sync | Document entier (50 Mo) | Bloc individuel (~200 octets) |
| Statuts | Aucun | Draft / Proposed / Merged / Rejected |
| Conflit offline | Non géré | CRDT Y.js par bloc + vector clock |
| Historique | Par document | Par bloc + par opération |
| Commentaire | Sur la page | Ancré sur un bloc + position exacte |
| Validation | Tout ou rien | Bloc par bloc (chef de projet) |
| Progression | Invisible | Sommaire avec pastilles temps réel |
| International | Fragile (grosse sync) | Robuste (petites sync ciblées) |

---

*Maquette UI v2.0 — bcm-gest-react · Architecture Atomique · Mars 2025*
