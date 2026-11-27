// ============================================================
// Nimantro — Invitation Theme Customiser Panel
// apps/web/components/editor/ThemeEditorPanel.tsx
// ============================================================

"use client";

import * as React from "react";
import { useEditorStore } from "@nimantro/editor";
import {
  SUPPORTED_BENGALI_FONTS,
  SUPPORTED_LATIN_FONTS,
} from "@nimantro/invitation-engine";
import type { Language } from "@nimantro/types";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nimantro/ui";
import { useLocale } from "@/hooks/useLocale";

const ALL_FONTS = [...SUPPORTED_BENGALI_FONTS, ...SUPPORTED_LATIN_FONTS];

export function ThemeEditorPanel() {
  const { design, updateTheme, updateLanguage, pushHistory } = useEditorStore();
  const { t } = useLocale();
  if (!design) return null;

  const { theme } = design;

  const colourFields: { key: keyof typeof theme; label: string }[] = [
    { key: "primary", label: t("editor.primaryAccent") },
    { key: "secondary", label: t("editor.secondaryAccent") },
    { key: "background", label: t("editor.pageBackground") },
    { key: "surface", label: t("editor.cardSurface") },
    { key: "text", label: t("editor.bodyText") },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">{t("editor.invitationLanguage")}</Label>
        <Select
          value={design.language}
          onValueChange={(v) => {
            updateLanguage(v as Language);
            pushHistory("Change invitation language");
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">{t("newEvent.langBoth")}</SelectItem>
            <SelectItem value="bn">{t("newEvent.langBn")}</SelectItem>
            <SelectItem value="en">{t("newEvent.langEn")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        {colourFields.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                className="w-10 h-9 p-1 cursor-pointer"
                value={(theme[key] as string) ?? "#8B2635"}
                onChange={(e) => updateTheme({ [key]: e.target.value })}
                onBlur={() => pushHistory(`Update theme ${key}`)}
              />
              <Input
                className="h-9 font-mono text-xs"
                value={(theme[key] as string) ?? ""}
                onChange={(e) => updateTheme({ [key]: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <div className="space-y-1">
          <Label className="text-xs">{t("editor.headingFont")}</Label>
          <Select
            value={theme.headingFont}
            onValueChange={(v) => {
              updateTheme({ headingFont: v });
              pushHistory("Change heading font");
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_FONTS.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("editor.bodyFont")}</Label>
          <Select
            value={theme.bodyFont}
            onValueChange={(v) => {
              updateTheme({ bodyFont: v });
              pushHistory("Change body font");
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_FONTS.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
