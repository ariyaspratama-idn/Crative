export function getMaximumAvailableQuantity(
  quantityProduced: number,
  allocatedQuantity: number,
) {
  return Math.max(0, quantityProduced - allocatedQuantity);
}
