# Contribuer à TaskFlow API

## Stratégie de branches : GitHub Flow

On utilise un modèle simple, adapté à un déploiement continu (qu'on mettra en place
aux modules 8-10) :

- **`main`** est toujours stable et déployable. On n'y commit jamais directement.
- Toute nouvelle fonctionnalité ou correction part d'une branche dédiée :
  `feature/nom-court`, `fix/nom-court`, `chore/nom-court`.
- Le travail se fait sur cette branche, puis une **Pull Request** est ouverte vers `main`.
- La PR doit être relue (même par soi-même en solo) avant merge.
- Une fois la CI en place (module 8), aucune PR ne pourra être mergée si les tests échouent.

```bash
git checkout -b feature/ma-fonctionnalite
# ... travail, commits ...
git push -u origin feature/ma-fonctionnalite
gh pr create --fill   # ou via l'interface GitHub
```

## Convention de commits : Conventional Commits

Chaque commit suit le format :

```
<type>(<scope optionnel>): <description au présent, à l'impératif>
```

Types utilisés dans ce projet :

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Changement de code sans impact fonctionnel externe |
| `docs` | Documentation uniquement |
| `chore` | Maintenance, config, dépendances |
| `test` | Ajout ou modification de tests |
| `ci` | Changements liés à l'intégration continue |

Exemples réels de ce projet :  
```
feat(business-logic): ajouter les règles métier (suppression protégée, workflow de statut)
docs: ajouter le README (architecture, endpoints, règles métier)
```

**Pourquoi c'est important** : cette convention permet plus tard de générer un changelog
automatiquement et de déclencher un versionnement sémantique (`semantic-release`) —
une pratique courante dans les pipelines CI/CD d'entreprise.
