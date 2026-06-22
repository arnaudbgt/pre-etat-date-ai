# Direction UI/UX — Pre Etat Date

## 1. Objet du document

Ce document définit la direction esthétique et les principes d'expérience utilisateur de Pre Etat Date avant la conception des écrans métier.

L'interface doit inspirer trois sentiments immédiats :

1. **Sérieux** — les informations traitées ont une portée immobilière et administrative ;
2. **Clarté** — l'utilisateur comprend ce qui est détecté, ce qui manque et ce qu'il doit vérifier ;
3. **Maîtrise** — le service assiste l'utilisateur sans masquer les incertitudes ni prétendre remplacer un professionnel du droit.

Le produit doit paraître moderne sans ressembler à une démonstration technologique. L'intelligence du service se manifeste par la qualité de l'organisation, la transparence des sources et la précision des statuts, jamais par des effets visuels « IA ».

---

## 2. Positionnement visuel

### 2.1 Territoire recherché

Le territoire visuel se situe à l'intersection de :

- la rigueur d'un service juridique ;
- la stabilité d'un acteur immobilier ;
- la simplicité d'un produit SaaS moderne ;
- la lisibilité d'un document administratif bien conçu.

Le produit ne doit être ni froid comme un logiciel comptable ancien, ni ludique comme une application grand public. Il doit évoquer un **cabinet numérique accessible** : précis, calme, méthodique et humain.

### 2.2 Principes directeurs

- beaucoup d'espace blanc ;
- une grille régulière et des alignements nets ;
- des surfaces sobres, rarement colorées ;
- une hiérarchie typographique forte ;
- une seule action principale évidente par écran ;
- des explications courtes au plus près des données ;
- des preuves visibles : sources, pièces reconnues, champs à vérifier ;
- une couleur utilisée pour transmettre un sens, jamais pour décorer ;
- des animations discrètes, fonctionnelles et facultatives.

### 2.3 Impression générale

L'interface doit sembler :

- fiable avant d'être séduisante ;
- élégante avant d'être expressive ;
- spécialisée avant d'être technologique ;
- accueillante sans devenir familière ;
- dense uniquement lorsque la donnée le justifie.

---

## 3. Ton de marque

### 3.1 Personnalité

La marque est :

- compétente ;
- posée ;
- transparente ;
- pédagogique ;
- respectueuse de la responsabilité de l'utilisateur.

Elle n'est pas :

- spectaculaire ;
- anxiogène ;
- technophile ;
- péremptoire ;
- excessivement juridique.

### 3.2 Règles rédactionnelles

- employer un français simple et précis ;
- utiliser « vous » avec une tonalité professionnelle ;
- privilégier les phrases courtes et la voix active ;
- nommer clairement les documents et les champs ;
- expliquer une conséquence avant de proposer une action ;
- distinguer les faits, les estimations et les informations à vérifier ;
- indiquer pourquoi une donnée est douteuse ou manquante ;
- éviter le jargon lorsque son emploi n'est pas indispensable.

### 3.3 Formulations recommandées

- « 8 documents ont été reconnus. »
- « Cette information apparaît dans deux documents concordants. »
- « Ce montant doit être vérifié avant de continuer. »
- « Le relevé copropriétaire semble manquer. »
- « Vérifiez les informations avant de générer le document final. »
- « Vos PDF sources seront supprimés automatiquement. »

### 3.4 Formulations à éviter

- « Notre IA sait tout de votre copropriété. »
- « Résultat 100 % fiable. »
- « Document juridiquement garanti. »
- « Remplacez définitivement votre syndic ou votre notaire. »
- « Analyse magique en un clic. »
- « Aucun risque d'erreur. »

La marque peut parler d'« analyse spécialisée », de « contrôle de cohérence » et de « score de confiance ». Elle ne doit pas promettre une conformité juridique absolue.

---

## 4. Palette de couleurs recommandée

### 4.1 Palette principale

La palette associe un bleu encre institutionnel à des neutres chauds. Elle doit rappeler les métiers de l'immobilier et du droit sans reprendre le bleu bancaire saturé.

| Rôle | Couleur recommandée | Usage |
| --- | --- | --- |
| Encre principale | `#172033` | Titres, texte fort, bouton principal |
| Bleu institutionnel | `#294766` | Liens, focus, éléments actifs |
| Bleu clair | `#EAF1F7` | Fonds informatifs, sélection légère |
| Ivoire | `#FAF9F6` | Fond général alternatif |
| Blanc | `#FFFFFF` | Cartes, surfaces principales |
| Pierre 50 | `#F5F4F1` | Fonds secondaires |
| Pierre 200 | `#E3E1DC` | Bordures |
| Gris texte | `#5E6470` | Texte secondaire |
| Gris discret | `#8B9099` | Métadonnées, placeholders |

### 4.2 Couleurs sémantiques

| Sens | Couleur forte | Fond léger | Usage |
| --- | --- | --- | --- |
| Confirmé | `#26735B` | `#E8F4EF` | Donnée cohérente et suffisamment fiable |
| Douteux | `#9A6700` | `#FFF4D6` | Donnée à vérifier |
| Manquant | `#667085` | `#F1F2F4` | Information non trouvée |
| Incohérent | `#B0443C` | `#FBEAE8` | Sources contradictoires |
| Informatif | `#35658E` | `#EAF1F7` | Aide, étape en cours, source |

### 4.3 Règles d'utilisation

- conserver une majorité de neutres sur chaque écran ;
- réserver les couleurs sémantiques aux statuts et messages associés ;
- ne jamais utiliser la couleur seule pour transmettre un état ;
- accompagner chaque état d'un libellé et, si utile, d'une icône ;
- vérifier un contraste minimum WCAG AA pour les textes et contrôles ;
- éviter les aplats saturés de grande taille ;
- ne pas multiplier les nuances proches sans fonction distincte.

Le vert ne signifie pas « juridiquement exact » : il signifie uniquement que les données disponibles sont concordantes selon les règles du produit.

---

## 5. Typographies

### 5.1 Famille principale

Utiliser une sans-serif neutre et très lisible :

1. **Geist Sans**, recommandée pour son dessin contemporain et sa bonne densité ;
2. **Inter**, alternative robuste et largement disponible ;
3. pile système en dernier recours.

Une seule famille principale suffit pour l'application. La cohérence et la vitesse de lecture sont prioritaires sur la personnalité typographique.

### 5.2 Typographie éditoriale optionnelle

Une serif discrète peut être réservée à de rares éléments éditoriaux de la landing page — citation, manifeste ou grand titre — à condition de ne pas apparaître dans le tunnel métier. Une police comme Source Serif 4 convient. Son usage n'est pas obligatoire.

### 5.3 Échelle recommandée

| Niveau | Taille indicative | Graisse | Usage |
| --- | ---: | ---: | --- |
| Titre landing | 48–64 px | 600 | Proposition de valeur |
| Titre de page | 32–40 px | 600 | Étape principale |
| Titre de section | 24–28 px | 600 | Blocs majeurs |
| Titre de carte | 16–18 px | 600 | Cartes et panneaux |
| Corps | 16 px | 400 | Lecture courante |
| Corps compact | 14 px | 400 | Tableaux et métadonnées |
| Libellé | 13–14 px | 500 | Champs et badges |
| Légende | 12 px | 400 | Sources et détails secondaires |

### 5.4 Règles typographiques

- longueur de ligne idéale : 55 à 75 caractères ;
- interligne généreux pour les contenus pédagogiques ;
- chiffres tabulaires dans les montants et tableaux ;
- capitales réservées aux acronymes réglementaires ;
- ne pas écrire les boutons ou titres entièrement en capitales ;
- éviter les graisses très fines ;
- conserver les accents dans les capitales et les libellés.

---

## 6. Boutons

### 6.1 Bouton principal

- fond bleu encre ;
- texte blanc ;
- contraste élevé ;
- hauteur minimale de 44 px ;
- rayon modéré, entre 8 et 10 px ;
- ombre absente ou presque imperceptible ;
- libellé décrivant précisément l'action.

Exemples : « Ajouter mes documents », « Lancer l'analyse », « Vérifier les informations », « Générer le PDF ».

### 6.2 Bouton secondaire

- fond blanc ;
- bordure pierre ;
- texte bleu encre ;
- utilisé pour une action alternative non destructive.

Exemples : « Ajouter un autre document », « Revenir aux documents », « Voir la source ».

### 6.3 Bouton tertiaire

- sans fond ;
- texte institutionnel ;
- soulignement ou fond très léger au survol ;
- réservé aux actions de faible importance.

### 6.4 Action destructive

- rouge sobre ;
- libellé explicite ;
- confirmation uniquement si la conséquence n'est pas immédiatement réversible.

Exemple : « Supprimer ce document » plutôt que « Supprimer ».

### 6.5 États

Tous les boutons doivent prévoir : repos, survol, focus visible, actif, chargement et désactivé.

Pendant un chargement :

- conserver la largeur du bouton ;
- afficher un indicateur discret ;
- remplacer le libellé par une action en cours, par exemple « Envoi… » ;
- empêcher les doubles soumissions ;
- ne pas utiliser un bouton désactivé comme seul moyen d'expliquer une condition manquante.

---

## 7. Cartes et surfaces

### 7.1 Style général

Les cartes organisent l'information, mais ne doivent pas fragmenter chaque ligne en panneau autonome.

- fond blanc ;
- bordure fine pierre ;
- rayon de 12 à 16 px ;
- ombre très légère uniquement pour séparer une surface flottante ;
- espacement interne de 20 à 24 px ;
- titre, résumé et action clairement alignés.

### 7.2 Types de cartes

**Carte document**

- nom du fichier ;
- type reconnu ;
- taille et date ;
- état de l'upload ;
- action secondaire éventuelle.

**Carte indicateur**

- valeur principale ;
- libellé explicite ;
- courte explication ;
- aucun graphique décoratif.

**Carte champ**

- libellé du champ ;
- valeur ;
- statut ;
- source ;
- action « Vérifier » ou « Modifier » si nécessaire.

**Carte d'alerte**

- fond sémantique très léger ;
- titre factuel ;
- explication et action ;
- jamais d'alerte rouge pour une simple information manquante.

### 7.3 Densité

Les écrans de résultat peuvent utiliser des lignes ou tableaux compacts plutôt qu'une succession de grandes cartes. La forme dépend de la quantité d'information : carte pour résumer, ligne pour comparer, panneau pour expliquer.

---

## 8. Badges et scores de confiance

### 8.1 Rôle

Le badge indique un état qualitatif. Le score numérique apporte une précision complémentaire. Les deux ne doivent pas être confondus.

### 8.2 Apparence

- forme compacte en pilule ou rectangle arrondi ;
- fond sémantique léger ;
- texte sombre de la même famille de couleur ;
- petite icône optionnelle ;
- jamais de dégradé, halo ou animation pulsante.

### 8.3 Niveaux de confiance recommandés

| Niveau | Score indicatif | Libellé affiché |
| --- | ---: | --- |
| Élevée | 85–100 % | Confiance élevée |
| Moyenne | 70–84 % | À contrôler |
| Faible | 0–69 % | Vérification requise |

Le seuil numérique est une convention produit à valider sur un corpus réel. Il ne doit pas être présenté comme une probabilité juridique.

### 8.4 Présentation du score global

Afficher séparément :

- **Complétude** — proportion des champs attendus qui sont renseignés ;
- **Confiance** — qualité estimée des informations détectées ;
- **À vérifier** — nombre de champs douteux ou incohérents.

Éviter les jauges circulaires spectaculaires. Préférer une valeur lisible, une barre horizontale discrète et une phrase d'interprétation.

---

## 9. États des champs

Chaque état doit associer un libellé, une couleur, une icône, une explication et une action adaptée.

### 9.1 Confirmé

- libellé : **Confirmé** ;
- couleur : vert sobre ;
- icône : coche dans un cercle ;
- sens : valeur trouvée avec une confiance suffisante et sans contradiction détectée ;
- message possible : « Confirmé dans 2 documents » ;
- action : consulter les sources, sans sollicitation urgente.

Ne jamais écrire « Certifié » ou « Garanti ».

### 9.2 Douteux

- libellé : **Douteux** ou **À vérifier** ;
- couleur : ambre ;
- icône : point d'interrogation ou triangle modéré ;
- sens : valeur détectée, mais qualité ou concordance insuffisante ;
- message possible : « Lecture incertaine dans l'appel de fonds » ;
- action principale : vérifier ou corriger.

Le mot « douteux » peut être utilisé dans les tableaux internes. Dans les instructions adressées à l'utilisateur, « À vérifier » est souvent plus constructif.

### 9.3 Manquant

- libellé : **Manquant** ;
- couleur : gris neutre ;
- icône : tiret, cercle vide ou document absent ;
- sens : aucune valeur exploitable trouvée ;
- message possible : « Information non trouvée dans les documents transmis » ;
- action : ajouter une pièce recommandée ou renseigner la valeur si cela est autorisé.

Un champ manquant n'est pas nécessairement une erreur de l'utilisateur.

### 9.4 Incohérent

- libellé : **Incohérent** ;
- couleur : rouge brique ;
- icône : deux flèches opposées ou symbole d'alerte ;
- sens : plusieurs sources fournissent des valeurs incompatibles ;
- message possible : « Deux montants différents ont été trouvés » ;
- action principale : comparer les sources et choisir ou corriger la valeur.

Réserver le rouge à une contradiction réelle, un échec ou une action destructive. Il ne doit pas colorer tout l'écran.

### 9.5 Hiérarchie des actions

Ordre recommandé de traitement :

1. incohérent ;
2. douteux ;
3. manquant lorsque le champ est obligatoire ;
4. confirmé.

Les filtres doivent permettre d'afficher rapidement « Tout », « À vérifier », « Manquant » et « Confirmé ».

---

## 10. Landing page

### 10.1 Intention

La landing page doit rassurer avant de convertir. Elle présente une solution spécialisée, non un gadget technologique.

### 10.2 Hero

- titre direct : « Votre pré-état daté en quelques minutes » ;
- sous-titre : analyse spécialisée des documents de copropriété ;
- CTA principal visible : « Préparer mon dossier » ;
- preuve de confidentialité proche du CTA : documents supprimés après traitement ;
- visuel produit sobre : aperçu d'un rapport, liste de champs ou documents reconnus ;
- aucun robot, cerveau lumineux, particules ou illustration futuriste.

### 10.3 Ordre recommandé des sections

1. proposition de valeur ;
2. fonctionnement en trois ou quatre étapes ;
3. bénéfices : analyse, cohérence, pièces manquantes, sources ;
4. aperçu du résultat ;
5. comparaison avec la demande au syndic et un outil généraliste ;
6. confidentialité et suppression ;
7. tarif clair ;
8. FAQ ;
9. guides et contenus SEO ;
10. CTA final.

### 10.4 Style

- fond principalement clair ;
- alternance modérée entre blanc et ivoire ;
- grandes marges verticales ;
- captures produit réalistes plutôt qu'illustrations abstraites ;
- chiffres clés peu nombreux et accompagnés d'un contexte ;
- icônes linéaires homogènes ;
- témoignages uniquement s'ils sont authentiques et attribuables.

### 10.5 Preuves de confiance

Mettre en avant :

- aucun compte nécessaire ;
- suppression automatique des documents sources ;
- champs douteux signalés ;
- validation utilisateur obligatoire ;
- sources visibles ;
- téléchargement limité dans le temps.

Ne pas utiliser de faux logos de presse, faux avis, compteurs artificiels ou sceaux juridiques inventés.

---

## 11. Tunnel upload → analyse → résultat → paiement

### 11.1 Principes communs

- largeur de contenu plus contenue que la landing page ;
- progression visible et stable ;
- une action principale par étape ;
- sauvegarde de l'état local lorsque c'est possible ;
- messages d'erreur au niveau de l'élément concerné ;
- récapitulatif avant toute action irréversible ou payante ;
- vocabulaire constant d'une étape à l'autre.

Progression recommandée :

1. Documents ;
2. Analyse ;
3. Vérification ;
4. Paiement ;
5. Téléchargement.

Les étapes futures restent visibles mais non cliquables tant qu'elles ne sont pas accessibles.

### 11.2 Upload

- zone de dépôt large, calme et clairement délimitée ;
- formats, taille et nombre maximum visibles avant l'action ;
- sélection multiple et glisser-déposer ;
- liste des fichiers sous la zone ;
- statut individuel : attente, envoi, envoyé, échec ;
- possibilité de retirer ou recommencer un fichier ;
- rappel de confidentialité permanent mais discret ;
- absence de promesse d'analyse avant la fin réelle des uploads.

Le drag & drop doit être une amélioration, pas l'unique méthode. Un bouton de sélection reste toujours disponible.

### 11.3 Analyse

- animation sobre ou progression par étapes réelles ;
- messages factuels : « Reconnaissance des documents », « Vérification des informations » ;
- ne pas afficher de faux pourcentage si aucune mesure fiable n'existe ;
- permettre de quitter la page uniquement si le traitement peut continuer ;
- expliquer ce qui se passe sans exposer de jargon technique ;
- afficher clairement un échec récupérable et l'action suivante.

### 11.4 Résultat et vérification

- résumé en tête : complétude, confiance, documents reconnus, champs à vérifier ;
- navigation par sections du pré-état daté ;
- filtre prioritaire « À vérifier » ;
- source accessible depuis chaque valeur ;
- valeurs modifiables clairement distinguées des valeurs en lecture seule ;
- historique visuel minimal après une correction : « Modifié par vous » ;
- aperçu filigrané identifiable comme non validé ;
- validation obligatoire avec une case dont le texte complet reste visible.

La page doit aider l'utilisateur à terminer une vérification, pas seulement présenter un score.

### 11.5 Paiement

- récapitulatif simple du produit acheté ;
- prix total clairement affiché ;
- rappel du contenu livré et de la durée de disponibilité ;
- redirection Stripe annoncée sans rupture visuelle inutile ;
- aucun compte à créer ;
- lien vers les conditions et informations légales ;
- pas de compte à rebours, réduction fictive ou vente additionnelle agressive.

### 11.6 Téléchargement

- confirmation nette de la génération ;
- bouton principal « Télécharger le pré-état daté » ;
- date et heure d'expiration du lien ;
- rappel de conserver le fichier final ;
- moyen clair de signaler un problème ;
- ne pas présenter la page comme un espace client durable.

### 11.7 Mobile

- CTA principal accessible sans masquer le contenu ;
- cartes transformées en listes verticales ;
- tableaux de résultat adaptés en lignes empilées ;
- sources ouvertes dans un panneau plein écran ;
- zones tactiles d'au moins 44 px ;
- aucun élément essentiel dépendant du survol.

---

## 12. Style du PDF final

### 12.1 Positionnement

Le PDF doit ressembler à un document administratif contemporain, pas à une capture de l'application. Il doit rester lisible imprimé en noir et blanc.

### 12.2 Structure recommandée

1. page de garde ;
2. identification du dossier et de la copropriété ;
3. synthèse de complétude ;
4. informations financières ;
5. travaux, diagnostics et procédures ;
6. informations manquantes ou réserves ;
7. sources documentaires ;
8. date de génération et validation utilisateur.

### 12.3 Direction graphique

- format A4 ;
- marges généreuses ;
- en-tête et pied de page constants ;
- bleu encre pour les titres et filets ;
- fonds colorés très légers ;
- tableaux simples avec alignement des montants à droite ;
- pagination et identifiant du dossier ;
- pas d'aplats sombres consommant beaucoup d'encre ;
- icônes rares et toujours accompagnées d'un texte.

### 12.4 Statuts dans le PDF

Les statuts conservent leurs libellés, mais utilisent aussi une forme ou un symbole pour rester compréhensibles en niveaux de gris :

- confirmé : coche ;
- douteux : point d'interrogation ;
- manquant : tiret ou cercle vide ;
- incohérent : symbole d'alerte.

Les champs non confirmés doivent rester clairement visibles. Le PDF ne doit jamais donner l'impression qu'une donnée absente a été validée implicitement.

### 12.5 Prévisualisation

La version gratuite porte un filigrane diagonal ou répété :

- « PRÉVISUALISATION » ;
- « NON VALIDÉE ».

Le filigrane doit empêcher l'usage comme document final tout en laissant le contenu suffisamment lisible pour permettre la vérification.

### 12.6 Mentions

Le PDF indique sobrement :

- la date de génération ;
- la date de validation utilisateur ;
- la nature des documents sources ;
- les réserves et informations manquantes ;
- la portée du service, sans promesse juridique excessive.

---

## 13. Inspirations

Les références suivantes doivent être comprises comme des principes, non comme des modèles à copier.

### Notion

À retenir :

- lisibilité éditoriale ;
- hiérarchie sobre ;
- densité maîtrisée ;
- actions contextuelles discrètes.

À ne pas reprendre : une interface trop neutre ou des menus cachés qui réduiraient la compréhension du parcours.

### Stripe

À retenir :

- pédagogie progressive ;
- qualité des formulaires ;
- confiance dans les moments transactionnels ;
- microcopies précises ;
- illustrations produit plutôt que décoratives.

À ne pas reprendre : les dégradés très présents ou les effets marketing les plus expressifs.

### Linear

À retenir :

- rigueur des espacements ;
- rapidité perçue ;
- états d'interface précis ;
- cohérence du système de composants.

À ne pas reprendre : une ambiance sombre, technique ou trop dense pour un particulier.

### Vercel

À retenir :

- minimalisme ;
- contraste ;
- typographie nette ;
- documentation lisible ;
- actions principales évidentes.

À ne pas reprendre : un noir et blanc trop radical ou un langage réservé aux développeurs.

### Services immobiliers sobres

À retenir :

- sentiment de stabilité ;
- photographies architecturales authentiques si elles sont nécessaires ;
- vocabulaire immobilier précis ;
- proximité sans familiarité ;
- repères administratifs explicites.

À ne pas reprendre : les codes d'agence immobilière trop commerciaux, les photos génériques de remise de clés et les dorures « premium ».

---

## 14. Choses à éviter

### Design « IA gadget »

- robots, cerveaux ou puces électroniques ;
- étoiles magiques autour des boutons ;
- halos violets ou bleus électriques ;
- animations de particules ;
- textes générés caractère par caractère ;
- mention répétée de l'intelligence artificielle ;
- mascotte conversationnelle non nécessaire.

### Couleurs et effets

- palette arc-en-ciel ;
- violet néon, cyan électrique ou vert fluorescent ;
- dégradés omniprésents ;
- glassmorphism réduisant le contraste ;
- ombres lourdes ;
- rayons excessivement arrondis ;
- animations de rebond ;
- confettis après paiement.

### UX

- masquer les informations douteuses ;
- transformer un score de confiance en garantie ;
- bloquer sans expliquer l'action requise ;
- demander la création d'un compte dans le MVP ;
- multiplier les modales ;
- afficher de faux pourcentages de progression ;
- faire dépendre une information de la couleur seule ;
- afficher une erreur technique brute ;
- ajouter une action principale concurrente sur chaque carte.

### Promesses juridiques

- « conforme dans tous les cas » ;
- « validé juridiquement » sans validation professionnelle réelle ;
- « remplace le notaire » ;
- « aucune responsabilité pour l'utilisateur » ;
- toute formulation laissant penser que la vérification utilisateur est facultative.

---

## 15. Accessibilité et qualité

Les choix esthétiques ne doivent jamais dégrader l'accès au service.

- conformité WCAG AA comme objectif minimal ;
- navigation complète au clavier ;
- focus visible et cohérent ;
- labels persistants pour tous les champs ;
- messages d'erreur reliés aux champs concernés ;
- structure de titres logique ;
- textes alternatifs utiles ;
- respect de la préférence de réduction des animations ;
- zoom à 200 % sans perte d'information ;
- lecture possible sans couleur ;
- formats de dates et montants adaptés au français.

---

## 16. Checklist de validation d'un écran

Avant de valider un écran métier, vérifier :

1. L'action principale est-elle identifiable en moins de trois secondes ?
2. L'utilisateur comprend-il où il se trouve dans le parcours ?
3. Les informations confirmées et celles à vérifier sont-elles distinctes sans dépendre uniquement de la couleur ?
4. Les sources et raisons d'une incertitude sont-elles accessibles ?
5. Le texte évite-t-il toute promesse juridique absolue ?
6. La confidentialité et la durée de conservation sont-elles expliquées au bon moment ?
7. Les erreurs indiquent-elles une action de résolution ?
8. Le parcours fonctionne-t-il au clavier et sur mobile ?
9. Les composants respectent-ils les mêmes espacements, rayons et libellés que le reste du produit ?
10. Un élément décoratif peut-il être retiré sans perte de sens ? Si oui, sa présence doit être justifiée.

## 17. Résumé de la direction

Pre Etat Date doit ressembler à un **service immobilier et administratif contemporain** : fond clair, bleu encre, neutres chauds, typographie nette, données structurées et statuts explicites.

La modernité vient de la fluidité du parcours et de la transparence de l'analyse. La confiance vient de la sobriété, des sources visibles, des limites clairement énoncées et du contrôle laissé à l'utilisateur.
