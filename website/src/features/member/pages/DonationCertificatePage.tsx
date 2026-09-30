import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import DonationCertificate, {
    type DonationCertificateData,
} from '@/features/member/certificates/DonationCertificate';

/**
 * The donation certificate, on screen and on paper.
 *
 * The screen chrome — the back link and the print button — is `print:hidden`,
 * so what comes out of the printer is the sheet and nothing else. Same
 * arrangement as `CertificatePage`, which is the membership certificate.
 *
 * ------------------------------------------------------------- the data
 *
 * Held here as a literal for now, and it is the association's own example
 * document typed out rather than an invented one, so the layout is being
 * judged against the real thing. The next step is the payment record: this
 * page reads `DonationCertificateData`, so wiring it to the server is a
 * fetch and a mapper, with nothing in the certificate itself to change.
 */
const EXAMPLE: DonationCertificateData = {
    certificateNo: 'ACTIV-80G-2025-05-001',
    issuedOn: '02-05-2025',
    financialCycle: '2025-2026',
    donorName: 'Sundareshwaran V P',
    donorPan: 'LDIPS4229P',
    payments: [
        { date: '02-05-2025', amount: 10000, mode: 'NEFT' },
    ],
};

export default function DonationCertificatePage() {
    const navigate = useNavigate();

    return (
<<<<<<< HEAD
        <div className="min-h-screen overflow-x-auto bg-[#f3f6fb] px-4 py-6 sm:py-10 print:overflow-visible print:bg-white print:p-0">
            <div className="mx-auto mb-4 sm:mb-6 flex max-w-[210mm] items-center justify-between gap-3
=======
        <div className="min-h-screen bg-[#f3f6fb] px-4 py-10 print:bg-white print:p-0">
            <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between
>>>>>>> 8020f5d (Initial commit for website frontend)
                            print:hidden">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-700
                               hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" /> Go back
                </button>

                <button
                    type="button"
                    onClick={() => window.print()}
<<<<<<< HEAD
                    className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 sm:px-5 py-2.5
=======
                    className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5
>>>>>>> 8020f5d (Initial commit for website frontend)
                               font-bold text-white transition-colors hover:bg-brand-800"
                >
                    <Printer className="h-4 w-4" /> Print or save as PDF
                </button>
            </div>

<<<<<<< HEAD
            {/* A4 portrait (794px) zoomed down to fit a phone; print keeps the real size. */}
            <div className="max-md:[zoom:0.75] max-sm:[zoom:0.4] print:[zoom:1]">
                <DonationCertificate data={EXAMPLE} />
            </div>
=======
            <DonationCertificate data={EXAMPLE} />
>>>>>>> 8020f5d (Initial commit for website frontend)
        </div>
    );
}
