// ============================================================
// Nimantro — Framework-Agnostic Invitation Engine
// (Zero Next.js / DOM dependencies — safe for SSR, Editor, Worker)
// packages/invitation-engine/src/index.ts
// ============================================================

import type { TemplateDefinition } from "@nimantro/template-schema";
import type {
  InvitationDesignDocument,
  InvitationSection,
  InvitationTheme,
  Language,
  LocalisedString,
  SectionType,
  StoryType,
} from "@nimantro/types";

export interface StoryTypeOption {
  id: StoryType;
  label: { bn: string; en: string };
  description: { bn: string; en: string };
  defaultContent: Record<string, string | LocalisedString>;
}

export const STORY_TYPE_CATALOG: StoryTypeOption[] = [
  {
    id: "couple-journey",
    label: { bn: "যুগল যাত্রা", en: "Couple Journey" },
    description: {
      bn: "তিনটি অধ্যায়ের সময়রেখায় জুটির গল্প",
      en: "Three milestone chapters tracing the couple's path together",
    },
    defaultContent: {
      storyType: "couple-journey",
      heading: { bn: "আমাদের যাত্রা", en: "Our Journey Together" },
      narrative: {
        bn: "সহজ বন্ধুত্ব থেকে শুরু হয়ে দুই পরিবারের ভালোবাসায় আজকের শুভ পরিণয়।",
        en: "From quiet conversations over monsoon tea to a promise celebrated with both families.",
      },
      chapter1Tag: { bn: "প্রথম অধ্যায়", en: "2022 · First Chapter" },
      chapter1Title: { bn: "কফি হাউসের সেই বিকেল", en: "An Afternoon on College Street" },
      chapter1Detail: {
        bn: "বৃষ্টিভেজা সন্ধ্যায় বই আর চায়ের আড্ডায় আমাদের প্রথম আলাপ।",
        en: "A chance conversation between bookstalls turned hours into minutes.",
      },
      chapter2Tag: { bn: "দ্বিতীয় অধ্যায়", en: "2024 · Promise" },
      chapter2Title: { bn: "শান্তিনিকেতনে পথচলা", en: "Golden Hour in Shantiniketan" },
      chapter2Detail: {
        bn: "লাল মাটির পথে হাঁটতে হাঁটতে সারাজীবন একসাথে চলার অঙ্গীকার।",
        en: "Walking beneath sal trees when we decided to build a life side by side.",
      },
      chapter3Tag: { bn: "তৃতীয় অধ্যায়", en: "2026 · Forever" },
      chapter3Title: { bn: "শুভ পরিণয়ের আমন্ত্রণ", en: "Celebration With Family" },
      chapter3Detail: {
        bn: "গুরুজন ও বন্ধুদের আশীর্বাদে আমাদের নতুন সংসারের সূচনা।",
        en: "Gathering every cherished elder and friend to bless our next chapter.",
      },
    },
  },
  {
    id: "milestone-chapters",
    label: { bn: "স্মরণীয় অধ্যায়", en: "Milestone Chapters" },
    description: {
      bn: "জন্মদিন, অন্নপ্রাশন বা বার্ষিকীর ধাপে ধাপে গল্প",
      en: "Numbered life chapters for birthdays, Annaprashan, and anniversaries",
    },
    defaultContent: {
      storyType: "milestone-chapters",
      heading: { bn: "আনন্দের অধ্যায়সমূহ", en: "Moments Along the Way" },
      narrative: {
        bn: "প্রতিটি ছোট হাসি আর মাইলফলক আমাদের আজকের এই উৎসবে নিয়ে এসেছে।",
        en: "Every little giggle, curiosity, and family tradition brought us to today's milestone.",
      },
      chapter1Tag: { bn: "অধ্যায় ০১", en: "Chapter 01" },
      chapter1Title: { bn: "প্রথম আগমন", en: "Early Morning Wonder" },
      chapter1Detail: {
        bn: "পরিবারে নতুন প্রাণের আলো ছড়িয়ে দেওয়ার প্রথম দিন।",
        en: "Bright eyes, tiny hands, and a house filled with quiet celebration.",
      },
      chapter2Tag: { bn: "অধ্যায় ০২", en: "Chapter 02" },
      chapter2Title: { bn: "বেড়ে ওঠার গল্প", en: "Curiosity & Play" },
      chapter2Detail: {
        bn: "সুর, ছবি আঁকা আর দাদু-ঠাকুমার গল্পে ভরা প্রতিদিন।",
        en: "Favorite storybooks, courtyard games, and Sunday afternoon songs.",
      },
      chapter3Tag: { bn: "অধ্যায় ০৩", en: "Chapter 03" },
      chapter3Title: { bn: "আজকের উৎসব", en: "Today's Celebration" },
      chapter3Detail: {
        bn: "সবার ভালোবাসা ও শুভেচ্ছায় দিনটি স্মরণীয় হয়ে থাকুক।",
        en: "Cutting the cake and sharing joy with everyone we hold dear.",
      },
    },
  },
  {
    id: "ritual-heritage",
    label: { bn: "সংস্কৃতি ও আচার", en: "Cultural Ritual Guide" },
    description: {
      bn: "বাঙালি অনুষ্ঠানের ঐতিহ্যবাহী আচারগুলোর সহজ পরিচিতি",
      en: "Illustrated guide explaining traditional Bengali rituals for every guest",
    },
    defaultContent: {
      storyType: "ritual-heritage",
      heading: { bn: "অনুষ্ঠানের ঐতিহ্য ও আচার", en: "Traditions & Sacred Rituals" },
      narrative: {
        bn: "আমাদের প্রতিটি প্রথা আশীর্বাদ, মঙ্গল ও পারিবারিক বন্ধনের প্রতীক।",
        en: "Each custom weaves elder blessings, music, and family bonds into the celebration.",
      },
      chapter1Tag: { bn: "প্রথা ০১", en: "Morning" },
      chapter1Title: { bn: "গায়ে হলুদ ও মঙ্গল কলস", en: "Gaye Holud & Mangal Kalash" },
      chapter1Detail: {
        bn: "পবিত্র হলুদ, আম্রপল্লব ও শঙ্খধ্বনিতে শুভ সূচনা।",
        en: "Turmeric paste, brass kalash with mango leaves, and conch-shell music herald auspicious joy.",
      },
      chapter2Tag: { bn: "প্রথা ০২", en: "Evening" },
      chapter2Title: { bn: "শুভদৃষ্টি ও মালাবদল", en: "Shubho Drishti & Mala Bodol" },
      chapter2Detail: {
        bn: "পানপাতায় মুখ ঢেকে প্রথম দৃষ্টি বিনিময় ও রজনীগন্ধার মালাবদল।",
        en: "Lowering the betel leaves to meet eyes beneath fresh jasmine garlands.",
      },
      chapter3Tag: { bn: "প্রথা ০৩", en: "Blessings" },
      chapter3Title: { bn: "বরণ ও প্রীতিভোজ", en: "Boron & Feast Together" },
      chapter3Detail: {
        bn: "প্রদীপ জ্বালিয়ে বরণ এবং সবার সাথে মিষ্টিমুখ ও আহার।",
        en: "Terracotta oil lamps welcome everyone into a shared celebratory feast.",
      },
    },
  },
  {
    id: "family-chronicle",
    label: { bn: "পারিবারিক উপাখ্যান", en: "Family Chronicle" },
    description: {
      bn: "পরিবারের শিকড়, গৃহপ্রবেশ বা মিলনমেলার গল্প",
      en: "Heritage tribute highlighting hosts, elders, and shared family warmth",
    },
    defaultContent: {
      storyType: "family-chronicle",
      heading: { bn: "আমাদের পারিবারিক কথা", en: "From Our Family Home" },
      narrative: {
        bn: "প্রজন্মের পর প্রজন্ম ধরে বয়ে চলা ভালোবাসা, আতিথেয়তা ও মিলনের গল্প।",
        en: "Built on decades of elder blessings, open doors, and warm Sunday gatherings.",
      },
      quote: {
        bn: "নতুন ঠিকানার প্রতিটি কোণ ভরে উঠুক প্রিয়জনদের হাসি ও আশীর্বাদে।",
        en: "May every corner of this gathering carry the warmth of friends and elders who shaped our lives.",
      },
      attribution: { bn: "সবিনয়ে পরিবারবর্গ", en: "With gratitude from the host family" },
    },
  },
  {
    id: "tribute-quote",
    label: { bn: "হৃদয়ের কথা ও উদ্ধৃতি", en: "Letter & Tribute Quote" },
    description: {
      bn: "সংক্ষিপ্ত কাব্যিক উদ্ধৃতি ও আমন্ত্রণপত্রের মূল বার্তা",
      en: "Editorial letter-style pull-quote card with attribution and personal note",
    },
    defaultContent: {
      storyType: "tribute-quote",
      heading: { bn: "একটি বিশেষ বার্তা", en: "A Note From the Heart" },
      quote: {
        bn: "ভালোবাসার উৎসব তখনই পূর্ণ হয়, যখন প্রিয় মানুষেরা একসাথে হাসেন।",
        en: "Joy multiplies the moment it is shared around one table with the people you love.",
      },
      attribution: { bn: "আন্তরিক শুভেচ্ছান্তে", en: "Warmest regards" },
      narrative: {
        bn: "এই দিনটিতে আপনার উপস্থিতিই আমাদের কাছে সবচেয়ে বড় উপহার।",
        en: "Having you travel to be with us in person is the greatest gift of all.",
      },
    },
  },
];

export interface SectionCatalogItem {
  type: SectionType;
  label: { bn: string; en: string };
  description: string;
  createDefaultSection: (order: number) => InvitationSection;
}

const FONT_STACKS: Record<string, string> = {
  "Noto Serif Bengali":
    "var(--font-noto-serif-bengali), 'Noto Serif Bengali', var(--font-playfair), 'Playfair Display', Georgia, serif",
  "Noto Sans Bengali":
    "var(--font-noto-sans-bengali), 'Noto Sans Bengali', var(--font-lato), 'Lato', system-ui, sans-serif",
  "Hind Siliguri":
    "var(--font-hind-siliguri), 'Hind Siliguri', var(--font-lato), 'Lato', system-ui, sans-serif",
  "Anek Bangla":
    "var(--font-anek-bangla), 'Anek Bangla', var(--font-playfair), 'Playfair Display', system-ui, sans-serif",
  "Playfair Display": "var(--font-playfair), 'Playfair Display', Georgia, serif",
  Lato: "var(--font-lato), 'Lato', system-ui, sans-serif",
  Galada: "'Galada', 'Noto Serif Bengali', Georgia, cursive",
  "Tiro Bangla": "'Tiro Bangla', 'Noto Serif Bengali', Georgia, serif",
  "Cormorant Garamond": "'Cormorant Garamond', 'Noto Serif Bengali', Georgia, serif",
};

export const SUPPORTED_BENGALI_FONTS = [
  "Noto Serif Bengali",
  "Noto Sans Bengali",
  "Hind Siliguri",
  "Anek Bangla",
  "Galada",
  "Tiro Bangla",
] as const;

export const SUPPORTED_LATIN_FONTS = [
  "Playfair Display",
  "Lato",
  "Cormorant Garamond",
] as const;

export function getFontStack(fontName: string): string {
  return FONT_STACKS[fontName] ?? FONT_STACKS["Hind Siliguri"];
}

/**
 * Convert a validated TemplateDefinition into an editable InvitationDesignDocument.
 */
export function templateToDesignDocument(
  template: TemplateDefinition,
  overrides?: {
    language?: Language;
    coverImageUrl?: string;
    theme?: Partial<InvitationTheme>;
    contentOverrides?: Record<string, Record<string, string | LocalisedString>>;
  }
): InvitationDesignDocument {
  const language: Language =
    overrides?.language ??
    (template.languages.includes("bn") && template.languages.includes("en")
      ? "both"
      : template.languages[0] ?? "bn");

  const theme: InvitationTheme = {
    primary: template.theme.primary,
    secondary: template.theme.secondary,
    background: template.theme.background,
    surface: template.theme.surface ?? "#FFFFFF",
    text: template.theme.text ?? "#242124",
    muted: template.theme.muted ?? "#77716D",
    border: template.theme.border ?? "#EAE1D8",
    headingFont: template.theme.headingFont,
    bodyFont: template.theme.bodyFont,
    ...(template.theme.accentFont ? { accentFont: template.theme.accentFont } : {}),
    ...overrides?.theme,
  };

  const sections: InvitationSection[] = template.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((sec, index) => {
      const overrideContent = overrides?.contentOverrides?.[sec.id] ?? {};
      const style: InvitationSection["style"] = {
        alignment: sec.style?.alignment ?? "center",
        ...(sec.style?.backgroundColor ? { backgroundColor: sec.style.backgroundColor } : {}),
        ...(sec.style?.textColor ? { textColor: sec.style.textColor } : {}),
        ...(sec.style?.backgroundImage ? { backgroundImage: sec.style.backgroundImage } : {}),
        ...(sec.style?.paddingTop !== undefined ? { paddingTop: sec.style.paddingTop } : {}),
        ...(sec.style?.paddingBottom !== undefined
          ? { paddingBottom: sec.style.paddingBottom }
          : {}),
      };

      return {
        id: sec.id,
        type: sec.type,
        enabled: sec.enabled,
        order: index,
        content: {
          ...(sec.defaultContent ?? {}),
          ...overrideContent,
        },
        style,
        animation: {
          preset: sec.animation?.preset ?? "fade-up",
          delay: sec.animation?.delay ?? 0,
          duration: sec.animation?.duration ?? 650,
        },
      };
    });

  return {
    templateId: template.id,
    templateVersion: template.version,
    language,
    theme,
    sections,
    ...(overrides?.coverImageUrl ? { coverImageUrl: overrides.coverImageUrl } : {}),
  };
}

/**
 * Return enabled sections sorted monotonically by order.
 */
export function getOrderedEnabledSections(
  design: InvitationDesignDocument
): InvitationSection[] {
  return design.sections
    .filter((s) => s.enabled)
    .slice()
    .sort((a, b) => a.order - b.order);
}

/**
 * Resolve text value inside a section for the active display language.
 */
export function resolveSectionText(
  value: unknown,
  activeLocale: "bn" | "en"
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const loc = value as LocalisedString;
    if (activeLocale === "bn") {
      return loc.bn?.trim() || loc.en?.trim() || "";
    }
    return loc.en?.trim() || loc.bn?.trim() || "";
  }
  return "";
}

/**
 * Build CSS custom properties for rendering any InvitationTheme cleanly.
 */
export function buildThemeCssVariables(
  theme: InvitationTheme
): Record<string, string> {
  return {
    "--inv-primary": theme.primary,
    "--inv-secondary": theme.secondary,
    "--inv-background": theme.background,
    "--inv-surface": theme.surface,
    "--inv-text": theme.text,
    "--inv-muted": theme.muted,
    "--inv-border": theme.border,
    "--inv-heading-font": getFontStack(theme.headingFont),
    "--inv-body-font": getFontStack(theme.bodyFont),
    "--inv-accent-font": theme.accentFont
      ? getFontStack(theme.accentFont)
      : getFontStack(theme.headingFont),
  };
}

/**
 * Catalog of all 11 supported section types for the Editor "Add Section" drawer.
 */
export const SECTION_CATALOG: SectionCatalogItem[] = [
  {
    type: "hero",
    label: { bn: "শিরোনাম (হিরো)", en: "Hero Banner" },
    description: "Celebration title, host/couple names and date highlight",
    createDefaultSection: (order) => ({
      id: `hero-${Date.now()}`,
      type: "hero",
      enabled: true,
      order,
      content: {
        title: { bn: "শুভ অনুষ্ঠান", en: "Celebration Invitation" },
        subtitle: { bn: "আপনাদের সাদর আমন্ত্রণ", en: "With warm joy, we invite you" },
        primaryNames: { bn: "অনিন্দিতা ও সৌম্য", en: "Anindita & Soumya" },
      },
      style: { alignment: "center" },
      animation: { preset: "fade-up", duration: 750 },
    }),
  },
  {
    type: "welcome",
    label: { bn: "স্বাগতম বার্তা", en: "Welcome Note" },
    description: "Warm invitation letter to guests and elders",
    createDefaultSection: (order) => ({
      id: `welcome-${Date.now()}`,
      type: "welcome",
      enabled: true,
      order,
      content: {
        heading: { bn: "সাদর আমন্ত্রণ", en: "A Warm Welcome" },
        message: {
          bn: "আপনার সপরিবার উপস্থিতি ও আশীর্বাদ আমাদের আনন্দকে পরিপূর্ণ করবে।",
          en: "Your presence and blessings with your family will make our celebration complete.",
        },
      },
      style: { alignment: "center" },
      animation: { preset: "fade-up", delay: 100 },
    }),
  },
  {
    type: "family",
    label: { bn: "পরিবার পরিচিতি", en: "Family Hosts" },
    description: "Host families and elders inviting the guests",
    createDefaultSection: (order) => ({
      id: `family-${Date.now()}`,
      type: "family",
      enabled: true,
      order,
      content: {
        heading: { bn: "নিমন্ত্রণকর্তা", en: "Hosted With Love By" },
        brideFamily: { bn: "শ্রী অরুণ ও শ্রীমতী মীরা মুখার্জী পরিবার", en: "Mukherjee Family" },
        groomFamily: { bn: "শ্রী সুব্রত ও শ্রীমতী অঞ্জলি সরকার পরিবার", en: "Sarkar Family" },
      },
      style: { alignment: "center" },
      animation: { preset: "fade-up", delay: 150 },
    }),
  },
  {
    type: "story",
    label: { bn: "গল্প ও অধ্যায়", en: "Story & Chapters" },
    description: "Choose from couple journey, milestone chapters, ritual guide, family chronicle, or quote",
    createDefaultSection: (order) => ({
      id: `story-${Date.now()}`,
      type: "story",
      enabled: true,
      order,
      content: {
        ...STORY_TYPE_CATALOG[0].defaultContent,
      },
      style: { alignment: "center" },
      animation: { preset: "scroll-reveal" },
    }),
  },
  {
    type: "countdown",
    label: { bn: "কাউন্টডাউন", en: "Countdown" },
    description: "Live timer counting down to the celebration date",
    createDefaultSection: (order) => ({
      id: `countdown-${Date.now()}`,
      type: "countdown",
      enabled: true,
      order,
      content: {
        label: { bn: "শুভ দিনের বাকি", en: "Counting down to the celebration" },
        targetDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 16),
      },
      style: { alignment: "center" },
      animation: { preset: "countdown-transition" },
    }),
  },
  {
    type: "schedule",
    label: { bn: "অনুষ্ঠান সূচি", en: "Event Schedule" },
    description: "Ceremonies and timings (Haldi, Sangeet, Wedding, Reception)",
    createDefaultSection: (order) => ({
      id: `schedule-${Date.now()}`,
      type: "schedule",
      enabled: true,
      order,
      content: {
        heading: { bn: "অনুষ্ঠান সূচি", en: "Ceremony Schedule" },
        item1Title: { bn: "শুভ বিবাহ", en: "Wedding Ceremony" },
        item1Time: { bn: "সন্ধ্যা ৭:০০ ঘটিকা", en: "7:00 PM onwards" },
        item2Title: { bn: "প্রীতিভোজ", en: "Reception Dinner" },
        item2Time: { bn: "রাত ৮:৩০ ঘটিকা", en: "8:30 PM onwards" },
      },
      style: { alignment: "center" },
      animation: { preset: "fade-up" },
    }),
  },
  {
    type: "venue",
    label: { bn: "অনুষ্ঠানের স্থান", en: "Venue & Map" },
    description: "Address, landmark, and directions link",
    createDefaultSection: (order) => ({
      id: `venue-${Date.now()}`,
      type: "venue",
      enabled: true,
      order,
      content: {
        heading: { bn: "অনুষ্ঠানের স্থান", en: "Venue" },
        venueName: { bn: "উৎসব ভবন, সল্টলেক", en: "Utsav Bhavan, Salt Lake" },
        address: {
          bn: "সেক্টর ১, বিধাননগর, কলকাতা ৭০০০৬৪",
          en: "Sector I, Bidhannagar, Kolkata 700064",
        },
        mapsUrl: "https://maps.google.com/?q=Salt+Lake+Kolkata",
      },
      style: { alignment: "center" },
      animation: { preset: "fade-up" },
    }),
  },
  {
    type: "gallery",
    label: { bn: "ফটো গ্যালারি", en: "Photo Gallery" },
    description: "Curated celebration moments",
    createDefaultSection: (order) => ({
      id: `gallery-${Date.now()}`,
      type: "gallery",
      enabled: true,
      order,
      content: {
        heading: { bn: "স্মৃতির পাতা", en: "Moments Together" },
        caption: { bn: "আমাদের কিছু প্রিয় মুহূর্ত", en: "A few cherished moments" },
      },
      style: { alignment: "center" },
      animation: { preset: "gallery-transition" },
    }),
  },
  {
    type: "rsvp",
    label: { bn: "উপস্থিতি নিশ্চিতকরণ (RSVP)", en: "RSVP Block" },
    description: "Interactive guest response prompt",
    createDefaultSection: (order) => ({
      id: `rsvp-${Date.now()}`,
      type: "rsvp",
      enabled: true,
      order,
      content: {
        heading: { bn: "আপনার উপস্থিতি জানান", en: "Confirm Your Attendance" },
        description: {
          bn: "অনুগ্রহ করে আপনার পরিবারসহ উপস্থিতি নিশ্চিত করুন।",
          en: "Kindly let us know if you and your family can join us.",
        },
      },
      style: { alignment: "center" },
      animation: { preset: "fade-up" },
    }),
  },
  {
    type: "contact",
    label: { bn: "যোগাযোগ", en: "Host Contact" },
    description: "Phone numbers for directions or assistance",
    createDefaultSection: (order) => ({
      id: `contact-${Date.now()}`,
      type: "contact",
      enabled: true,
      order,
      content: {
        heading: { bn: "যোগাযোগ", en: "For Enquiries" },
        contactName: { bn: "সুব্রত সরকার", en: "Subrata Sarkar" },
        phone: "+91 98300 00000",
      },
      style: { alignment: "center" },
      animation: { preset: "fade-in" },
    }),
  },
  {
    type: "footer",
    label: { bn: "সমাপ্তি বার্তা", en: "Closing Footer" },
    description: "Warm closing wish and attribution",
    createDefaultSection: (order) => ({
      id: `footer-${Date.now()}`,
      type: "footer",
      enabled: true,
      order,
      content: {
        closing: {
          bn: "আপনাদের স্নেহ ও আশীর্বাদ কাম্য।",
          en: "With warmth and gratitude, we await your arrival.",
        },
      },
      style: { alignment: "center" },
      animation: { preset: "fade-in" },
    }),
  },
];
