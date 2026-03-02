Revu du cahier des charges :

docs\LOGIQUE_REMISE_CIR\cahier-des-charges\00-sommaire.md :

Tu as oublié quelque petite chose sur la hierarchie des remise:

Prix marché CLIENT (Prix net référence)> Prix marché GROUPEMENT (Prix net référence)> Prix promo (Prix net référence tout client)(Prioritaire SI favorable au client) > Remise/marge client > Remise/marge groupement > Coef mini > Prix tarif

Le ROI ou le responsable d'agence peuvent s'auto valider !

docs\LOGIQUE_REMISE_CIR\cahier-des-charges\01-contexte-enjeux.md :

Le problème c'est pas l'AS400 (bien que nous utilisons encore une interface des année 90, il a évoluer et nous devrions passer sur une interface entèrement web pour avoir une UI /UX bien meilleur et adapter a 100% sur notre métier mais c'est une autre histoire.), non le problème c'est que actuellement on a déjà une interface web pour la gestion des conditions commercials mais il est très compliqué de l'exploiter et personne ne l'utilise.

On doit également pouvoir gérer les prix marché en rentrant remise ou prix net et également pouvoir du coup intégrer des dérogations ou offre de prix fournisseurs (car nous avons eu des prix aidé de certain fournisseur) pour ce client ou ce groupement spécifique ! Et ça peut être des prix aidé a la référence en prix net, en remise, des prix aidé par famille fabricant plusieurs cas possible. ce point la nous n'en avons pas discuté mais c'est très important.

Le segment tarifaire est plus qu'un croisement entre marque x catégorie fabricant. C'est un croisement entre marque x catégorie fabricant x mega famille x famille x sous famille !

Egalement nous bénéficions par certain fournisseur de BFA, donc on utilise et on vend les produits que l'on a au centre logistique et avec une marge négative, et chaque mois ou a la fin de l'année on déclare nos vente et le fabricant nous fais un "avoir commercial" et comment gérer ça ? comment gérer ceci dans l'outils ? Réfléxion a avoir également.

docs\LOGIQUE_REMISE_CIR\cahier-des-charges\02-modele-produit.md :

Peut-être des ajustement a faire suite a mon retour ci dessus sur la hierarchie complète des conditions tarifaires.

Pareil le fichier tarif par fabricant est presque toujours différents on a des 100ène de fichier différent voir des milliers c'est assez complexe a gérer pour rester a jour sur les prix en continu, sans parler des prix négocier comme on a parler (mais après les prix négocier par exemple un fabricant fais une offre de prix sur x référence ou sur x catégorie tarifaire pour un client précis c'est les agences qui gèrent.)
Des fois nous avons un fichier avec juste prix tarif, et un autre fichier avec les remises par catégorie produit, des fois juste un fichier avec les prix net, des fois un fichier avec prix tarif et remise ....
ce module doit vraiment être poussé a la réflexion et avoir un suivi historisé et strict avec historique des prix, date etc... a réfléchir et brainstormer.

docs\LOGIQUE_REMISE_CIR\cahier-des-charges\03-moteur-calcul.md :

sur le niveau de hierarchie je ne sais pas ou mettre la marque. Car soit je la laisse la oui en 3 ou aussi après les hierarchie interne cir tu en penses quoi ? ou peut être pouvoir changer la hierarchie par choix ? je ne sais pas on doit en discuter.

Pour le prix promo c'est pas forcement par segment, ça peut être un prix net par référence aussi.
pareil remise mini, coef mini peuvent être sur tout, mais en vrai presque a 100% sur les hirarchie cir mega > famille > sous famille comme filet de sécurité.

Le coef mini x bfa fournisseur on doit en discuter comment on gère ça car c'est assez complexe.

docs\LOGIQUE_REMISE_CIR\cahier-des-charges\04-modele-relationnel.md :

Peut être a modifier en fonction de nos réfléxions plus haut. Et aussi j'aimerai que tu sépare bien dans les fichiers, les fichiers cahier des charges de réfléxion pur, logique métier et de technique/modèle architecture pour l'intégration informatique tu vois ? car ce ne sera pas les mêmes interlocuteur du tout.

docs\LOGIQUE_REMISE_CIR\cahier-des-charges\06-ecrans-conditions.md :

Alors la par exemple un super admin, directeur agence peuvent aussi sélectionner l'agence qu'il souhaite alors que les roi / tcs peuvent seulement voir leur agences. On dois pouvoir chercher par client, département, commercial qui suit le client, ville, groupement etc... tu vois ajouter des filtres EN plus de la barre super recherche.

la consommation on dois pouvoir choisir année en cours, année N-1 ou sélectionner n'importe quelle année ou plage d'année. 
filtrer pour les segments ou autre qui ont été déjà généré du chiffre etc....
Aussi avoir un aperçu des dernière marge ou ont a vendu sur x segment etc... tu vois ? ou via IA par exemple si une référence a déjà été vendu 10 fois sur 3 ans, a des prix et marge différente etc... que l'ia puisse proposer une remise qui pourrais être appliquer et figer.

On dois aussi pouvoir copier des conditions ! par exemple copier les conditions d'un client A vers B ou d'un groupement A vers B ou d'un client vers un groupement

et a voir on aura peut être a modifier tout ça avec tout ce qu'on a parler en haut et de nos futurs échanges / brainstorming.

Aussi alors on en a pas parler mais on doit pouvoir mettre une date de fin sur les conditions, une date de validité ! avec possibilité de prolonger, de mettre a jours ou de supprimer. Car les offres de prix fournisseurs/ dérogation ont également des dates de fin.

Bien évidement quand on met une remise/marge sur un segment ou n'importe quoi on doit savoir visuellement quelle est la marge actuel ou remise actuel peut importe la hierarchie et si donc on va faire une meilleur remise ou non etc... tu vois ? C'est logique mais dans notre système actuel ce n'est pas comme ça.

validation par ROI ou responsable/directeur d'agence le roi et responsable/directeur d'agence peuvent rentrer des conditions sans validation de qui que se soit.

Pour les données poc on oublie on va faire de la vrai datas quand on l'implementera dans CIR_Cockpit.

Ok pas mal de réfléxion a avoir on va brainstormer tout ça et réfléchir. Si tu as des idées.