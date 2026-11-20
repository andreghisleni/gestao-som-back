-- CreateTable
CREATE TABLE "budget_public_views" (
    "id" TEXT NOT NULL,
    "visitor_key" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "user_agent" VARCHAR(200),
    "views" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "budget_id" TEXT NOT NULL,

    CONSTRAINT "budget_public_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_public_views_budget_id_last_seen_at_idx" ON "budget_public_views"("budget_id", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "budget_public_views_budget_id_visitor_key_key" ON "budget_public_views"("budget_id", "visitor_key");

-- AddForeignKey
ALTER TABLE "budget_public_views" ADD CONSTRAINT "budget_public_views_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
