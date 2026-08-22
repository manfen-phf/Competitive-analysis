export type OrderCalculationInput = {
  goodsTotal: number;
  packagingFee?: number | null;
  merchantActivity?: number | null;
  originalDeliveryFee: number;
  deliveryFeeReduction?: number | null;
  technicalServiceFee?: number | null;
  deliveryServiceFee?: number | null;
};

export type OrderDerivedValues = {
  dishPrice: number;
  paidDeliveryFee: number;
  userPaidAmount: number;
  merchantRate: number;
};

const amountOrZero = (amount: number | null | undefined) => amount ?? 0;

export function calculateOrderDerivedValues(input: OrderCalculationInput): OrderDerivedValues {
  const packagingFee = amountOrZero(input.packagingFee);
  const merchantActivity = amountOrZero(input.merchantActivity);
  const deliveryFeeReduction = amountOrZero(input.deliveryFeeReduction);
  const technicalServiceFee = amountOrZero(input.technicalServiceFee);
  const deliveryServiceFee = amountOrZero(input.deliveryServiceFee);
  const dishPrice = input.goodsTotal - packagingFee;

  return {
    dishPrice,
    paidDeliveryFee: Math.max(input.originalDeliveryFee - deliveryFeeReduction, 0),
    userPaidAmount: dishPrice + input.originalDeliveryFee - merchantActivity,
    merchantRate: input.goodsTotal === 0
      ? 0
      : (technicalServiceFee + deliveryServiceFee) / input.goodsTotal,
  };
}
