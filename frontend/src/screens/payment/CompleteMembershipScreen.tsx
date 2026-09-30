/**
 * The legacy `CompleteMembership` route (ApplicationStatus navigates here).
 *
 * It used to carry a hard-coded plan table (₹2,000 / 5,000 / 10,000 /
 * 20,000). Prices are the Super Admin's and are read from the server, so this
 * route now renders the server-priced plans screen itself.
 */
export { default } from './MembershipPlansScreen';
