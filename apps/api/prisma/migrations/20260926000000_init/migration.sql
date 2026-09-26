-- CreateEnum
CREATE TYPE "VersionKind" AS ENUM ('main', 'branch', 'fork', 'future');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('draft', 'open', 'approved', 'merged');

-- CreateEnum
CREATE TYPE "ObjectKind" AS ENUM ('system', 'application', 'store', 'component', 'actor', 'group');

-- CreateEnum
CREATE TYPE "ConnectionKind" AS ENUM ('sync', 'async', 'data', 'dependency', 'deploys_to');

-- CreateEnum
CREATE TYPE "ViewKind" AS ENUM ('context', 'container', 'component', 'security', 'data', 'ownership', 'technology', 'custom');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "architectures" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "architectures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "parent_version_id" TEXT,
    "name" TEXT NOT NULL,
    "kind" "VersionKind" NOT NULL DEFAULT 'main',
    "status" "VersionStatus" NOT NULL DEFAULT 'draft',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_objects" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "kind" "ObjectKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "position" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_connections" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "source_object_id" TEXT NOT NULL,
    "target_object_id" TEXT NOT NULL,
    "kind" "ConnectionKind" NOT NULL DEFAULT 'sync',
    "label" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_tags" (
    "object_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "object_tags_pkey" PRIMARY KEY ("object_id","tag_id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_technologies" (
    "object_id" TEXT NOT NULL,
    "technology_id" TEXT NOT NULL,

    CONSTRAINT "object_technologies_pkey" PRIMARY KEY ("object_id","technology_id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "views" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ViewKind" NOT NULL DEFAULT 'context',
    "filter" JSONB,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_objects" (
    "view_id" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "position" JSONB,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "style" JSONB,

    CONSTRAINT "view_objects_pkey" PRIMARY KEY ("view_id","object_id")
);

-- CreateTable
CREATE TABLE "flows" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_steps" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "step_index" INTEGER NOT NULL,
    "connection_id" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "flow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "context" TEXT,
    "decision" TEXT,
    "consequences" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_objects" (
    "decision_id" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,

    CONSTRAINT "decision_objects_pkey" PRIMARY KEY ("decision_id","object_id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phases" (
    "id" TEXT NOT NULL,
    "architecture_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version_id" TEXT,

    CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_org_id_slug_key" ON "workspaces"("org_id", "slug");

-- CreateIndex
CREATE INDEX "model_objects_architecture_id_version_id_idx" ON "model_objects"("architecture_id", "version_id");

-- CreateIndex
CREATE INDEX "model_connections_architecture_id_version_id_idx" ON "model_connections"("architecture_id", "version_id");

-- CreateIndex
CREATE INDEX "model_connections_source_object_id_idx" ON "model_connections"("source_object_id");

-- CreateIndex
CREATE INDEX "model_connections_target_object_id_idx" ON "model_connections"("target_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_architecture_id_name_key" ON "tags"("architecture_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_name_key" ON "technologies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flow_steps_flow_id_step_index_key" ON "flow_steps"("flow_id", "step_index");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_architecture_id_number_key" ON "decisions"("architecture_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "environments_architecture_id_name_key" ON "environments"("architecture_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "phases_architecture_id_name_key" ON "phases"("architecture_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "members_org_id_user_id_key" ON "members"("org_id", "user_id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "architectures" ADD CONSTRAINT "architectures_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_parent_version_id_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_objects" ADD CONSTRAINT "model_objects_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_objects" ADD CONSTRAINT "model_objects_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_objects" ADD CONSTRAINT "model_objects_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "model_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_connections" ADD CONSTRAINT "model_connections_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_connections" ADD CONSTRAINT "model_connections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_connections" ADD CONSTRAINT "model_connections_source_object_id_fkey" FOREIGN KEY ("source_object_id") REFERENCES "model_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_connections" ADD CONSTRAINT "model_connections_target_object_id_fkey" FOREIGN KEY ("target_object_id") REFERENCES "model_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_tags" ADD CONSTRAINT "object_tags_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "model_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_tags" ADD CONSTRAINT "object_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_technologies" ADD CONSTRAINT "object_technologies_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "model_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_technologies" ADD CONSTRAINT "object_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "model_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_objects" ADD CONSTRAINT "view_objects_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_objects" ADD CONSTRAINT "view_objects_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "model_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "model_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_objects" ADD CONSTRAINT "decision_objects_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_objects" ADD CONSTRAINT "decision_objects_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "model_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phases" ADD CONSTRAINT "phases_architecture_id_fkey" FOREIGN KEY ("architecture_id") REFERENCES "architectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phases" ADD CONSTRAINT "phases_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

