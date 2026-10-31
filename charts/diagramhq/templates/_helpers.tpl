{{/*
Expand the name of the chart.
*/}}
{{- define "diagramhq.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "diagramhq.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "diagramhq.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "diagramhq.labels" -}}
helm.sh/chart: {{ include "diagramhq.chart" . }}
{{ include "diagramhq.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "diagramhq.selectorLabels" -}}
app.kubernetes.io/name: {{ include "diagramhq.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Web component labels
*/}}
{{- define "diagramhq.web.labels" -}}
{{ include "diagramhq.labels" . }}
app.kubernetes.io/component: web
{{- end }}

{{- define "diagramhq.web.selectorLabels" -}}
{{ include "diagramhq.selectorLabels" . }}
app.kubernetes.io/component: web
{{- end }}

{{- define "diagramhq.web.fullname" -}}
{{ printf "%s-web" (include "diagramhq.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
API component labels
*/}}
{{- define "diagramhq.api.labels" -}}
{{ include "diagramhq.labels" . }}
app.kubernetes.io/component: api
{{- end }}

{{- define "diagramhq.api.selectorLabels" -}}
{{ include "diagramhq.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{- define "diagramhq.api.fullname" -}}
{{ printf "%s-api" (include "diagramhq.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
PostgreSQL labels & name
*/}}
{{- define "diagramhq.database.fullname" -}}
{{- if .Values.postgresql.fullnameOverride }}
{{- .Values.postgresql.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-postgresql" (include "diagramhq.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "diagramhq.database.labels" -}}
{{ include "diagramhq.labels" . }}
app.kubernetes.io/component: postgresql
{{- end }}

{{- define "diagramhq.database.selectorLabels" -}}
{{ include "diagramhq.selectorLabels" . }}
app.kubernetes.io/component: postgresql
{{- end }}

{{/*
Redis labels & name
*/}}
{{- define "diagramhq.redis.fullname" -}}
{{- if .Values.redis.fullnameOverride }}
{{- .Values.redis.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-redis" (include "diagramhq.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "diagramhq.redis.labels" -}}
{{ include "diagramhq.labels" . }}
app.kubernetes.io/component: redis
{{- end }}

{{- define "diagramhq.redis.selectorLabels" -}}
{{ include "diagramhq.selectorLabels" . }}
app.kubernetes.io/component: redis
{{- end }}

{{/*
MinIO labels & name
*/}}
{{- define "diagramhq.minio.fullname" -}}
{{- if .Values.minio.fullnameOverride }}
{{- .Values.minio.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-minio" (include "diagramhq.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "diagramhq.minio.labels" -}}
{{ include "diagramhq.labels" . }}
app.kubernetes.io/component: minio
{{- end }}

{{- define "diagramhq.minio.selectorLabels" -}}
{{ include "diagramhq.selectorLabels" . }}
app.kubernetes.io/component: minio
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "diagramhq.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "diagramhq.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image helpers
Resolves registry prefix:
1. web.image.registry (if set)
2. global.image.registry or Values.image.registry (if set)
3. none
*/}}
{{- define "diagramhq.web.image" -}}
{{- $registry := .Values.web.image.registry | default .Values.image.registry | default .Values.global.image.registry -}}
{{- $repository := .Values.web.image.repository -}}
{{- $tag := .Values.web.image.tag | default .Values.image.tag | default .Values.global.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" (trimSuffix "/" $registry) $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{- define "diagramhq.api.image" -}}
{{- $registry := .Values.api.image.registry | default .Values.image.registry | default .Values.global.image.registry -}}
{{- $repository := .Values.api.image.repository -}}
{{- $tag := .Values.api.image.tag | default .Values.image.tag | default .Values.global.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" (trimSuffix "/" $registry) $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Database Host
*/}}
{{- define "diagramhq.database.host" -}}
{{- if .Values.database.host -}}
{{- .Values.database.host -}}
{{- else if .Values.postgresql.enabled -}}
{{- include "diagramhq.database.fullname" . -}}
{{- else -}}
{{- "localhost" -}}
{{- end -}}
{{- end }}

{{/*
Database Port
*/}}
{{- define "diagramhq.database.port" -}}
{{- if .Values.database.port -}}
{{- .Values.database.port -}}
{{- else if .Values.postgresql.enabled -}}
{{- 5432 -}}
{{- else -}}
{{- 5432 -}}
{{- end -}}
{{- end }}

{{/*
Database Name
*/}}
{{- define "diagramhq.database.name" -}}
{{- if .Values.database.name -}}
{{- .Values.database.name -}}
{{- else if .Values.postgresql.auth.database -}}
{{- .Values.postgresql.auth.database -}}
{{- else -}}
{{- "diagramhq" -}}
{{- end -}}
{{- end }}

{{/*
Database Username
*/}}
{{- define "diagramhq.database.user" -}}
{{- if .Values.database.user -}}
{{- .Values.database.user -}}
{{- else if .Values.postgresql.auth.username -}}
{{- .Values.postgresql.auth.username -}}
{{- else -}}
{{- "diagramhq" -}}
{{- end -}}
{{- end }}

{{/*
Database Password
*/}}
{{- define "diagramhq.database.password" -}}
{{- if .Values.database.password -}}
{{- .Values.database.password -}}
{{- else if .Values.postgresql.auth.password -}}
{{- .Values.postgresql.auth.password -}}
{{- else -}}
{{- "diagramhq" -}}
{{- end -}}
{{- end }}

{{/*
Redis Host & Port
*/}}
{{- define "diagramhq.redis.host" -}}
{{- if .Values.redis.host -}}
{{- .Values.redis.host -}}
{{- else if .Values.redis.enabled -}}
{{- include "diagramhq.redis.fullname" . -}}
{{- else -}}
{{- "localhost" -}}
{{- end -}}
{{- end }}

{{- define "diagramhq.redis.port" -}}
{{- default 6379 .Values.redis.port -}}
{{- end }}

{{- define "diagramhq.redis.url" -}}
{{- if .Values.redis.url -}}
{{- .Values.redis.url -}}
{{- else if .Values.redis.auth.enabled -}}
{{- printf "redis://:%s@%s:%v" .Values.redis.auth.password (include "diagramhq.redis.host" .) (include "diagramhq.redis.port" .) -}}
{{- else -}}
{{- printf "redis://%s:%v" (include "diagramhq.redis.host" .) (include "diagramhq.redis.port" .) -}}
{{- end -}}
{{- end }}

{{/*
MinIO / Object Storage Endpoint
*/}}
{{- define "diagramhq.storage.endpoint" -}}
{{- if .Values.storage.endpoint -}}
{{- .Values.storage.endpoint -}}
{{- else if .Values.minio.enabled -}}
{{- printf "http://%s:9000" (include "diagramhq.minio.fullname" .) -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end }}
