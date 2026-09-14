-- DropForeignKey
ALTER TABLE "registration_capacity_holds" DROP CONSTRAINT "registration_capacity_holds_order_scope_fkey";

-- DropForeignKey
ALTER TABLE "registration_order_members" DROP CONSTRAINT "registration_order_members_order_scope_fkey";

-- DropForeignKey
ALTER TABLE "registration_orders" DROP CONSTRAINT "registration_orders_package_scope_fkey";

-- DropForeignKey
ALTER TABLE "registration_tickets" DROP CONSTRAINT "registration_tickets_member_scope_fkey";

-- DropForeignKey
ALTER TABLE "ticket_packages" DROP CONSTRAINT "ticket_packages_subevent_event_fkey";

-- DropIndex
DROP INDEX "registration_form_sections_form_status_order_idx";

-- DropIndex
DROP INDEX "registration_forms_logicalKey_version_idx";
