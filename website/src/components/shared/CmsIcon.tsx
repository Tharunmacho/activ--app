import {
    Users, User, Handshake, HeartHandshake, Building2, Briefcase,
    TrendingUp, Award, Target, Lightbulb, Star, Heart, Rocket,
    Factory, Leaf, GraduationCap, Ship,
<<<<<<< HEAD
    Shield, ShieldCheck, Scale, Landmark,
=======
    Shield, ShieldCheck, Scale,
>>>>>>> 8020f5d (Initial commit for website frontend)
    Globe, MapPin, Calendar, CalendarDays, Clock,
    Image as ImageIcon, Images, MonitorPlay, Play, Tent, BookOpen, HardHat,
    Grid3x3, PartyPopper, Mic,
    Phone, Mail, MessageSquare, Send, FileText,
<<<<<<< HEAD
    Info, Camera, Tag, Users2, Quote,
=======
>>>>>>> 8020f5d (Initial commit for website frontend)
    ArrowRight, ExternalLink, Home,
    Facebook, Instagram, Linkedin, Twitter, Youtube,
    type LucideIcon,
} from 'lucide-react';

/**
 * Draw an icon the CMS named.
 *
 * A fixed table rather than a dynamic lookup on the lucide namespace: an editor
 * can only choose from a list the server validates against, and a name outside
 * it must degrade to something visible rather than to nothing. A blank space
 * where an icon belongs reads as a broken page and gives no clue what went
 * wrong.
 *
 * The kebab-case names are the storage format, shared with `ICON_NAMES` in
 * `backend/src/modules/cms/cms.models.js`.
 */
const ICONS: Record<string, LucideIcon> = {
    // people and organisations
    users: Users, user: User, handshake: Handshake, 'heart-handshake': HeartHandshake,
    building: Building2, briefcase: Briefcase,
    // growth and outcomes
    'trending-up': TrendingUp, award: Award, target: Target,
    lightbulb: Lightbulb, star: Star, heart: Heart, rocket: Rocket,
    // industry and environment
    factory: Factory, leaf: Leaf, 'graduation-cap': GraduationCap, ship: Ship,
    // trust
<<<<<<< HEAD
    shield: Shield, 'shield-check': ShieldCheck, scale: Scale, landmark: Landmark,
=======
    shield: Shield, 'shield-check': ShieldCheck, scale: Scale,
>>>>>>> 8020f5d (Initial commit for website frontend)
    // place and time
    globe: Globe, 'map-pin': MapPin, calendar: Calendar,
    'calendar-days': CalendarDays, clock: Clock,
    // events and media
    image: ImageIcon, images: Images, 'monitor-play': MonitorPlay, play: Play,
    tent: Tent, 'book-open': BookOpen, 'hard-hat': HardHat, grid: Grid3x3,
    'party-popper': PartyPopper, mic: Mic,
    // contact
    phone: Phone, mail: Mail, 'message-square': MessageSquare, send: Send, 'file-text': FileText,
<<<<<<< HEAD
    /* A photograph's own fields pick from this list too, and these are the
       ones those labels actually want — "Photographer", "Chief Guest",
       "Category". `info` is their default: a real mark rather than the empty
       circle a missing icon used to leave. */
    info: Info, camera: Camera, tag: Tag, 'users-2': Users2, quote: Quote,
=======
>>>>>>> 8020f5d (Initial commit for website frontend)
    // navigation
    'arrow-right': ArrowRight, 'external-link': ExternalLink, home: Home,
    // social
    facebook: Facebook, instagram: Instagram, linkedin: Linkedin,
    twitter: Twitter, youtube: Youtube,
};

interface Props {
    name?: string | null;
    size?: number;
    className?: string;
    /** Drawn when the name is unknown or missing. */
    fallback?: keyof typeof ICONS;
}

export function CmsIcon({ name, size = 20, className = '', fallback = 'star' }: Props) {
    const Icon = ICONS[String(name || '').trim()] || ICONS[fallback] || Star;
    return <Icon size={size} className={className} />;
}

/** True when the renderer knows this name — used by the CMS picker. */
export const hasIcon = (name?: string | null) => !!ICONS[String(name || '').trim()];

export default CmsIcon;
