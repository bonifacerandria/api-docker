{{/* deploy/helm/taskflow/templates/_helpers.tpl
     Fonctions réutilisables (labels, noms) - évite de répéter la même
     logique dans chaque fichier de templates/. Convention Helm standard. */}}

{{- define "taskflow.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "taskflow.fullname" -}}
{{- .Release.Name -}}
{{- end -}}

{{- define "taskflow.labels" -}}
app.kubernetes.io/name: {{ include "taskflow.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "taskflow.selectorLabels.api" -}}
app.kubernetes.io/name: {{ include "taskflow.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: api
{{- end -}}

{{- define "taskflow.selectorLabels.postgres" -}}
app.kubernetes.io/name: {{ include "taskflow.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: postgres
{{- end -}}

{{/* Nom du Secret à utiliser : celui fourni (existingSecret) si présent,
     sinon celui que ce Chart crée lui-même (voir secret.yaml). Centralisé
     ici pour ne jamais avoir cette logique en double ailleurs. */}}
{{- define "taskflow.secretName" -}}
{{- if .Values.secrets.existingSecret -}}
{{ .Values.secrets.existingSecret }}
{{- else -}}
{{ include "taskflow.fullname" . }}-secrets
{{- end -}}
{{- end -}}
