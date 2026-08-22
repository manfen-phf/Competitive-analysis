"use client";

import type { CollectionReviewInput } from "@/lib/collection-confirmation";
import type { UploadPlatform } from "@/lib/collections";
import { calculateOrderDerivedValues } from "@/lib/order-calculations";

type OrderReviewFormProps = {
  originalDeliveryFee: number;
  reviews: CollectionReviewInput[];
  fieldErrors?: Partial<Record<UploadPlatform, Partial<Record<"image" | "goodsTotal", string>>>>;
  onChange: (platform: UploadPlatform, field: keyof CollectionReviewInput, value: number | string) => void;
};

const editableFields: Array<{ field: keyof CollectionReviewInput; label: string }> = [
  { field: "goodsTotal", label: "商品总价" }, { field: "packagingFee", label: "打包费" }, { field: "merchantActivity", label: "商家活动款" }, { field: "otherPromotion", label: "其他活动" }, { field: "deliveryFeeReduction", label: "减配送费" }, { field: "platformRedPacket", label: "平台红包抵扣金额" }, { field: "platformRedPacketMerchantShare", label: "平台红包商家承担" }, { field: "merchantSettlementAmount", label: "结算金额" }, { field: "technicalServiceFee", label: "技术服务费" }, { field: "deliveryServiceFee", label: "配送服务费" },
];

const platformLabel: Record<UploadPlatform, string> = { MEITUAN: "美团", B_JIA: "B家" };

export function OrderReviewForm({ originalDeliveryFee, reviews, fieldErrors, onChange }: OrderReviewFormProps) {
  return <section className="collection-review" aria-label="订单识别校对">
    <div className="collection-review-heading"><div><h2>核对识别结果</h2><p>可修正识别字段；配送、实付和费率始终由系统按当前值计算。</p></div><strong>原价配送费 ¥{originalDeliveryFee.toFixed(2)}</strong></div>
    <div className="collection-review-grid">
      {reviews.map((review) => {
        const derived = calculateOrderDerivedValues({ goodsTotal: review.goodsTotal, packagingFee: review.packagingFee, merchantActivity: review.merchantActivity, originalDeliveryFee, deliveryFeeReduction: review.deliveryFeeReduction, technicalServiceFee: review.technicalServiceFee, deliveryServiceFee: review.deliveryServiceFee });
        const errors = fieldErrors?.[review.platform];
        return <fieldset className={`collection-review-platform platform-${review.platform === "MEITUAN" ? "meituan" : "bjia"}`} key={review.platform}>
          <legend>{platformLabel[review.platform]}订单</legend>
          {errors?.image ? <p className="collection-field-error">{errors.image}</p> : null}
          <label className="collection-order-number">订单号（选填）<input value={review.orderNumber ?? ""} onChange={(event) => onChange(review.platform, "orderNumber", event.target.value)} /></label>
          <div className="collection-field-grid">
            {editableFields.map(({ field, label }) => <label key={field}>{label}
              <span className="collection-money-input"><i>¥</i><input type="number" min={field === "merchantSettlementAmount" ? undefined : 0} step="0.01" value={review[field] ?? 0} onChange={(event) => onChange(review.platform, field, Number(event.target.value))} /></span>
              {field === "goodsTotal" && errors?.goodsTotal ? <small className="collection-field-error">{errors.goodsTotal}</small> : null}
            </label>)}
          </div>
          <dl className="collection-derived-values"><div><dt>菜品原价</dt><dd>¥{derived.dishPrice.toFixed(2)}</dd></div><div><dt>实付配送费</dt><dd>¥{derived.paidDeliveryFee.toFixed(2)}</dd></div><div><dt>用户实付</dt><dd>¥{derived.userPaidAmount.toFixed(2)}</dd></div><div><dt>实际费率</dt><dd>{(derived.merchantRate * 100).toFixed(2)}%</dd></div></dl>
        </fieldset>;
      })}
    </div>
  </section>;
}
