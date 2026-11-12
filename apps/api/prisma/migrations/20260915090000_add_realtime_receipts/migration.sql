-- Real-time messaging: delivery / read receipts and presence timestamps.

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
