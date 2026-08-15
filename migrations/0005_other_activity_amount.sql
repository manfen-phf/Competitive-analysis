-- Break down merchant-funded non-red-packet, non-delivery promotions (for example B家店铺满减).
ALTER TABLE "ConfirmedOrderV1" ADD COLUMN "otherActivityAmount" REAL;
