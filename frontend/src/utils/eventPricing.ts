/** Server-resolved price for this viewer; otherwise use the public registration fee. */
export const feeFor = (event: any) => Number(event?.yourPrice ?? event?.registrationFee ?? 0);
