// ============================================================
// Nimantro — Section Content, Style & Motion Inspector
// apps/web/components/editor/SectionInspector.tsx
// ============================================================

"use client";

import * as React from "react";
import { ANIMATION_PRESET_CATALOG } from "@nimantro/animations";
import { useEditorStore, type EditorMode } from "@nimantro/editor";
import { STORY_TYPE_CATALOG } from "@nimantro/invitation-engine";
import type {
  AnimationPreset,
  InvitationSection,
  Language,
  LocalisedString,
  StoryType,
} from "@nimantro/types";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@nimantro/ui";
import { PhotoUploader } from "./PhotoUploader";
import { useLocale } from "@/hooks/useLocale";

const LONG_TEXT_KEYS = new Set([
  "message",
  "narrative",
  "description",
  "closing",
  "address",
  "quote",
  "chapter1Detail",
  "chapter2Detail",
  "chapter3Detail",
]);
const PLAIN_STRING_KEYS = new Set(["targetDate", "mapsUrl", "phone", "artworkUrl"]);
const HIDDEN_CONTENT_KEYS = new Set(["storyType", "photoUrl"]);

function isLocalisedObject(val: unknown): val is LocalisedString {
  return Boolean(val && typeof val === "object" && !Array.isArray(val));
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function SectionInspector({
  section,
  invitationLanguage,
  eventId,
}: {
  section: InvitationSection;
  invitationLanguage: Language;
  eventId: string;
}) {
  const {
    mode,
    setMode,
    updateSectionContent,
    updateSectionStyle,
    updateSectionAnimation,
    pushHistory,
  } = useEditorStore();
  const { t, locale } = useLocale();

  const contentEntries = Object.entries(section.content);
  const showBn = invitationLanguage === "bn" || invitationLanguage === "both";
  const showEn = invitationLanguage === "en" || invitationLanguage === "both";

  function handleLocalisedChange(
    key: string,
    lang: "bn" | "en",
    nextVal: string,
    currentVal: unknown
  ) {
    const base: LocalisedString = isLocalisedObject(currentVal)
      ? { ...currentVal }
      : { bn: typeof currentVal === "string" ? currentVal : "", en: "" };
    base[lang] = nextVal;
    updateSectionContent(section.id, { [key]: base });
  }

  const activeTab = mode === "preview" ? "content" : mode;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setMode(v as EditorMode)}
      className="flex flex-col h-full"
    >
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="content">{t("editor.content")}</TabsTrigger>
        <TabsTrigger value="style">{t("editor.style")}</TabsTrigger>
        <TabsTrigger value="animation">{t("editor.motion")}</TabsTrigger>
      </TabsList>

      {/* ─── Content Tab ─────────────────────────────────────── */}
      <TabsContent value="content" className="space-y-4 overflow-y-auto pr-1">
        {section.type === "story" && (
          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/40 p-3">
            <Label htmlFor="story-type-select" className="text-xs font-medium">
              {locale === "bn" ? "গল্পের ধরন" : "Story style"}
            </Label>
            <Select
              value={
                typeof section.content.storyType === "string"
                  ? section.content.storyType
                  : "couple-journey"
              }
              onValueChange={(nextType) => {
                const option = STORY_TYPE_CATALOG.find((item) => item.id === nextType);
                if (!option) return;
                const nextPatch: Record<string, string | LocalisedString> = {
                  storyType: nextType as StoryType,
                };
                for (const [k, defVal] of Object.entries(option.defaultContent)) {
                  if (k === "storyType") continue;
                  if (section.content[k] === undefined) {
                    nextPatch[k] = defVal;
                  }
                }
                updateSectionContent(section.id, nextPatch);
                pushHistory("Change story style");
              }}
            >
              <SelectTrigger id="story-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORY_TYPE_CATALOG.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {locale === "bn" ? item.label.bn : item.label.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {(() => {
                const current = STORY_TYPE_CATALOG.find(
                  (item) =>
                    item.id ===
                    (typeof section.content.storyType === "string"
                      ? section.content.storyType
                      : "couple-journey")
                );
                if (!current) return "";
                return locale === "bn" ? current.description.bn : current.description.en;
              })()}
            </p>
          </div>
        )}

        {contentEntries.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("editor.noEditableFields")}
          </p>
        )}

        {section.type === "hero" && (
          <PhotoUploader
            eventId={eventId}
            label="Couple / host photo (replaces the artwork)"
            max={1}
            value={typeof section.content.photoUrl === "string" && section.content.photoUrl ? [section.content.photoUrl] : []}
            onChange={(urls) => {
              updateSectionContent(section.id, { photoUrl: urls[0] ?? "" });
              pushHistory("Change hero photo");
            }}
          />
        )}
        {section.type === "gallery" && (
          <PhotoUploader
            eventId={eventId}
            label="Gallery photos"
            max={12}
            value={Array.isArray(section.content.images) ? (section.content.images as string[]) : []}
            onChange={(urls) => {
              updateSectionContent(section.id, { images: urls } as Partial<InvitationSection["content"]>);
              pushHistory("Change gallery photos");
            }}
          />
        )}

        {contentEntries.map(([key, value]) => {
          if (Array.isArray(value) || HIDDEN_CONTENT_KEYS.has(key)) return null;

          if (key === "targetDate") {
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`sec-${key}`}>Target Date &amp; Time</Label>
                <Input
                  id={`sec-${key}`}
                  type="datetime-local"
                  value={typeof value === "string" ? value.slice(0, 16) : ""}
                  onChange={(e) =>
                    updateSectionContent(section.id, { [key]: e.target.value })
                  }
                  onBlur={() => pushHistory("Update countdown date")}
                />
              </div>
            );
          }

          if (PLAIN_STRING_KEYS.has(key) || (typeof value === "string" && !isLocalisedObject(value))) {
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`sec-${key}`}>{formatFieldLabel(key)}</Label>
                <Input
                  id={`sec-${key}`}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) =>
                    updateSectionContent(section.id, { [key]: e.target.value })
                  }
                  onBlur={() => pushHistory(`Update ${key}`)}
                />
              </div>
            );
          }

          const loc = isLocalisedObject(value) ? value : { bn: "", en: "" };
          const useTextarea = LONG_TEXT_KEYS.has(key);

          return (
            <div
              key={key}
              className="space-y-2.5 rounded-xl border border-border bg-background/50 p-3"
            >
              <p className="text-xs font-semibold text-foreground">
                {formatFieldLabel(key)}
              </p>

              {showBn && (
                <div className="space-y-1">
                  <Label htmlFor={`sec-${key}-bn`} className="text-[11px] text-muted-foreground">
                    বাংলা (Bengali)
                  </Label>
                  {useTextarea ? (
                    <Textarea
                      id={`sec-${key}-bn`}
                      rows={3}
                      lang="bn"
                      value={loc.bn ?? ""}
                      onChange={(e) =>
                        handleLocalisedChange(key, "bn", e.target.value, value)
                      }
                      onBlur={() => pushHistory(`Edit ${key} (bn)`)}
                    />
                  ) : (
                    <Input
                      id={`sec-${key}-bn`}
                      lang="bn"
                      value={loc.bn ?? ""}
                      onChange={(e) =>
                        handleLocalisedChange(key, "bn", e.target.value, value)
                      }
                      onBlur={() => pushHistory(`Edit ${key} (bn)`)}
                    />
                  )}
                </div>
              )}

              {showEn && (
                <div className="space-y-1">
                  <Label htmlFor={`sec-${key}-en`} className="text-[11px] text-muted-foreground">
                    English
                  </Label>
                  {useTextarea ? (
                    <Textarea
                      id={`sec-${key}-en`}
                      rows={3}
                      value={loc.en ?? ""}
                      onChange={(e) =>
                        handleLocalisedChange(key, "en", e.target.value, value)
                      }
                      onBlur={() => pushHistory(`Edit ${key} (en)`)}
                    />
                  ) : (
                    <Input
                      id={`sec-${key}-en`}
                      value={loc.en ?? ""}
                      onChange={(e) =>
                        handleLocalisedChange(key, "en", e.target.value, value)
                      }
                      onBlur={() => pushHistory(`Edit ${key} (en)`)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </TabsContent>

      {/* ─── Style Tab ───────────────────────────────────────── */}
      <TabsContent value="style" className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("editor.textAlignment")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["left", "center", "right"] as const).map((align) => (
              <Button
                key={align}
                type="button"
                size="sm"
                variant={
                  (section.style.alignment ?? "center") === align ? "default" : "outline"
                }
                onClick={() => {
                  updateSectionStyle(section.id, { alignment: align });
                  pushHistory("Change alignment");
                }}
              >
                {t(`editor.${align}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sec-bg">{t("editor.sectionBackground")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="sec-bg"
              type="color"
              className="w-12 p-1 h-10"
              value={section.style.backgroundColor ?? "#FFF9F1"}
              onChange={(e) =>
                updateSectionStyle(section.id, { backgroundColor: e.target.value })
              }
            />
            <Input
              value={section.style.backgroundColor ?? ""}
              placeholder="Theme default"
              onChange={(e) =>
                updateSectionStyle(section.id, {
                  backgroundColor: e.target.value || undefined,
                })
              }
            />
            {section.style.backgroundColor && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  updateSectionStyle(section.id, { backgroundColor: undefined })
                }
              >
                {t("editor.reset")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sec-pt">{t("editor.topPadding")}</Label>
            <Input
              id="sec-pt"
              type="number"
              min={0}
              max={160}
              value={section.style.paddingTop ?? 0}
              onChange={(e) =>
                updateSectionStyle(section.id, {
                  paddingTop: Number(e.target.value) || undefined,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec-pb">{t("editor.bottomPadding")}</Label>
            <Input
              id="sec-pb"
              type="number"
              min={0}
              max={160}
              value={section.style.paddingBottom ?? 0}
              onChange={(e) =>
                updateSectionStyle(section.id, {
                  paddingBottom: Number(e.target.value) || undefined,
                })
              }
            />
          </div>
        </div>
      </TabsContent>

      {/* ─── Motion Tab ──────────────────────────────────────── */}
      <TabsContent value="animation" className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("editor.animationPreset")}</Label>
          <Select
            value={section.animation.preset}
            onValueChange={(v) => {
              updateSectionAnimation(section.id, { preset: v as AnimationPreset });
              pushHistory("Change animation preset");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATION_PRESET_CATALOG.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {locale === "bn" ? preset.label.bn : preset.label.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="anim-dur">{t("editor.duration")}</Label>
            <Input
              id="anim-dur"
              type="number"
              min={100}
              max={3000}
              step={50}
              value={section.animation.duration ?? 650}
              onChange={(e) =>
                updateSectionAnimation(section.id, {
                  duration: Number(e.target.value) || 650,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="anim-delay">{t("editor.delay")}</Label>
            <Input
              id="anim-delay"
              type="number"
              min={0}
              max={2000}
              step={50}
              value={section.animation.delay ?? 0}
              onChange={(e) =>
                updateSectionAnimation(section.id, {
                  delay: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">{t("editor.disableAnimation")}</p>
            <p className="text-xs text-muted-foreground">
              {t("editor.disableAnimDesc")}
            </p>
          </div>
          <Switch
            checked={Boolean(section.animation.disabled)}
            onCheckedChange={(checked) =>
              updateSectionAnimation(section.id, { disabled: checked })
            }
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
