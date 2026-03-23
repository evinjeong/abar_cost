/**
 * Calculate final purchase cost including loss rate and overheads
 */
export const calculateFinalCost = ({
    unitPrice = 0,
    shippingCost = 0,
    shippingPresetId = '',
    packagingCost = 0,
    lossRate = 0,
    otherCosts = 0,
    bundleQty = 1, // 합포장 기준 수량
    t1Qty = 0, t1Cost = 0,
    t2Qty = 0, t2Cost = 0,
    t3Qty = 0, t3Cost = 0,
}, rules = [], totalQty = 1) => {
    let actualShippingCost = Number(shippingCost);
    let ruleBundleQty = 1;

    // 단계별 배송비가 1건이라도 설정되어 있는지 확인
    const hasTiers = t1Qty > 0 || t2Qty > 0 || t3Qty > 0;
    let totalShippingCostForTiers = 0;
    let totalBoxes = 1;

    if (hasTiers) {
        // 유효한 단계들을 필터링 후 오름차순 정렬
        const tiers = [
            { max: Number(t1Qty), cost: Number(t1Cost) },
            { max: Number(t2Qty), cost: Number(t2Cost) },
            { max: Number(t3Qty), cost: Number(t3Cost) }
        ].filter(t => t.max > 0).sort((a, b) => a.max - b.max);

        if (tiers.length > 0) {
            const maxBoxSize = tiers[tiers.length - 1].max;
            const fullBoxes = Math.floor(totalQty / maxBoxSize);
            const remainder = totalQty % maxBoxSize;

            totalBoxes = remainder > 0 ? fullBoxes + 1 : fullBoxes;
            const fullBoxCost = tiers[tiers.length - 1].cost;

            let remainderCost = 0;
            if (remainder > 0) {
                // 남은 수량이 어느 단계에 속하는지 찾기
                const matchingTier = tiers.find(t => remainder <= t.max);
                remainderCost = matchingTier ? matchingTier.cost : fullBoxCost;
            }

            totalShippingCostForTiers = (fullBoxes * fullBoxCost) + remainderCost;
        } else {
            // fallback (should not happen if hasTiers is true)
            totalShippingCostForTiers = actualShippingCost;
        }
    } else {
        // Dynamic Shipping Rule Calculation (기존 로직)
        if (shippingPresetId && rules.length > 0) {
            const rule = rules.find(r => r.id === shippingPresetId);
            if (rule) {
                if (rule.type === 'quantity') {
                    const match = rule.label.match(/(\d+)개/);
                    ruleBundleQty = match ? parseInt(match[1]) : 1;
                    actualShippingCost = rule.cost;
                } else {
                    actualShippingCost = rule.cost;
                }
            }
        }

        const effectiveBundleQty = ruleBundleQty > 1 ? ruleBundleQty : (Number(bundleQty) || 1);
        totalBoxes = Math.ceil(totalQty / effectiveBundleQty);
        totalShippingCostForTiers = actualShippingCost * totalBoxes;
    }

    const totalUnitPrice = Number(unitPrice) * totalQty;
    const totalOtherCosts = Number(otherCosts) * totalQty;
    const totalFixedCosts = totalShippingCostForTiers + (Number(packagingCost) * totalBoxes);

    const baseTotalCost = totalUnitPrice + totalOtherCosts + totalFixedCosts;
    const baseUnitCost = baseTotalCost / totalQty;

    const factor = 1 - (Number(lossRate) / 100);

    if (factor <= 0) return baseUnitCost;

    const finalCost = baseUnitCost / factor;
    return Math.round(finalCost);
};

export const calculatePrices = (finalCost, supplyMargin, sellMargin, taxType = 'taxable') => {
    const sMarginFactor = 1 - (Number(supplyMargin) / 100);
    const mMarginFactor = 1 - (Number(sellMargin) / 100);

    // 1. 공급가 (공급받는 업체의 매입가) = 원가 / (1 - 공급마진율)
    const supplyPrice = sMarginFactor > 0 ? Math.round(finalCost / sMarginFactor / 10) * 10 : finalCost;

    // 2. 판매가 (소비자 판매가) = 공급가 / (1 - 판매마진율) 
    // ※ 판매가 마진율은 공급가 대비 마진을 의미함
    const sellingPrice = mMarginFactor > 0 ? Math.round(supplyPrice / mMarginFactor / 10) * 10 : supplyPrice;

    return {
        supplyPrice,
        sellingPrice
    };
};

/**
 * Format currency to KRW string
 */
export const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0';
    return Number(val).toLocaleString('ko-KR');
};
