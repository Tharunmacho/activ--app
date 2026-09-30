/**
 * Stack routes owned by the business area. Add this area's NEW screens here only —
 * `RootStackParamList` (types/index.ts) merges every area's file.
 */
export type BusinessRoutes = {
  /** Another member's company as the network sees it, with trust add/remove. */
  CompanyPublic: { companyId: string };
  /** Edit one product: details, image, publish, stock, delete (website /business/edit-product/:id). */
  EditProduct: { productId: string };
  /** The member's trust list (website /business/trust-list). */
  TrustList: undefined;
  /** Stock for the active company: levels, adjust, low stock, movement log (website /business/stock). */
  StockCentre: { productId?: string } | undefined;
};
