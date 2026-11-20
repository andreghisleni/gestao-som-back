/*
  Warnings:

  - A unique constraint covering the columns `[public_token]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "public_token" TEXT,
ADD COLUMN     "public_token_at" TIMESTAMP(3),
ADD COLUMN     "public_token_revoked" TIMESTAMP(3),
ADD COLUMN     "public_view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "budget_offer_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "detail" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "order" INTEGER NOT NULL DEFAULT 0,
    "budget_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_offer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_details" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "contractor_type" TEXT NOT NULL DEFAULT 'PF',
    "contractor_name" TEXT,
    "trade_name" TEXT,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "venue_name" TEXT,
    "zip_code" TEXT,
    "street" TEXT,
    "street_number" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "complement" TEXT,
    "reference" TEXT,
    "access_notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "power_supply" TEXT,
    "venue_size" TEXT,
    "internet_available" TEXT,
    "internet_detail" TEXT,
    "setup_time" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "ends_next_day" BOOLEAN NOT NULL DEFAULT false,
    "pickup_time" TEXT,
    "starts_flexibility" TEXT,
    "on_site_contact_name" TEXT,
    "on_site_contact_phone" TEXT,
    "event_type" TEXT,
    "guest_count" INTEGER,
    "music_styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "music_style_other" TEXT,
    "requested_extras" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "step_seen" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_acceptances" (
    "id" TEXT NOT NULL,
    "accepted_name" TEXT NOT NULL,
    "accepted_value" DECIMAL(10,2) NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_ip" TEXT,
    "user_agent" TEXT,
    "budget_id" TEXT NOT NULL,

    CONSTRAINT "budget_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_offer_items_budget_id_order_idx" ON "budget_offer_items"("budget_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "event_details_budget_id_key" ON "event_details"("budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_acceptances_budget_id_key" ON "budget_acceptances"("budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_public_token_key" ON "budgets"("public_token");

-- AddForeignKey
ALTER TABLE "budget_offer_items" ADD CONSTRAINT "budget_offer_items_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_details" ADD CONSTRAINT "event_details_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_acceptances" ADD CONSTRAINT "budget_acceptances_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
