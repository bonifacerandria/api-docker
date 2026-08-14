# Secrets Alertmanager

Ce dossier doit contenir un fichier `smtp_password` (texte brut, juste le
mot de passe, rien d'autre) - créé manuellement sur chaque environnement,
JAMAIS commité dans Git.

```bash
echo -n "le_vrai_mot_de_passe_smtp" > deploy/monitoring/alertmanager/secrets/smtp_password
chmod 600 deploy/monitoring/alertmanager/secrets/smtp_password
```
