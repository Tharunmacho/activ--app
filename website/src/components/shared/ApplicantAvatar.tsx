import { useState } from 'react';
import { resolveMediaUrl } from '@/config/api.config';

/**
 * A member's face on an ADMIN screen — the photo they uploaded, else initials.
 *
 * The approval cards, the dashboard's recent applications and the members list
 * all drew initials only, so a member who had uploaded a photo still appeared
 * as "T." to every admin reviewing them. The server now sends `profilePhoto`
 * on every applicant (`admin.service.buildApplicant`); this draws it, resolved
 * against the API host (a bare `/uploads/…` on the website host is a 404), and
 * falls back to initials if the image cannot load — never a broken-image icon.
 */
const initialsOf = (name?: string | null) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function ApplicantAvatar({
    name, photo, className = 'h-10 w-10', textClassName = 'text-base', tone = 'bg-blue-600 text-white',
}: {
    name?: string | null;
    photo?: string | null;
    /** Size (and any ring) of the circle. */
    className?: string;
    textClassName?: string;
    /** Colours of the initials fallback. */
    tone?: string;
}) {
    const [broken, setBroken] = useState(false);
    const src = photo && !broken ? resolveMediaUrl(photo) : '';
    return (
        <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold ${tone} ${className}`}>
            {src ? (
                <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
            ) : (
                <span className={textClassName}>{initialsOf(name)}</span>
            )}
        </span>
    );
}
