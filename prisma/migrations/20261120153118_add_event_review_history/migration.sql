-- CreateTable
CREATE TABLE "budget_event_revisions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "accepted_name" TEXT,
    "accepted_value" DECIMAL(10,2),
    "accepted_at" TIMESTAMP(3),
    "accepted_ip" TEXT,
    "accepted_user_agent" TEXT,
    "reason" TEXT,
    "requested_by" TEXT,
    "requested_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "budget_id" TEXT NOT NULL,

    CONSTRAINT "budget_event_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_event_revisions_budget_id_idx" ON "budget_event_revisions"("budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_event_revisions_budget_id_version_key" ON "budget_event_revisions"("budget_id", "version");

-- AddForeignKey
ALTER TABLE "budget_event_revisions" ADD CONSTRAINT "budget_event_revisions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
