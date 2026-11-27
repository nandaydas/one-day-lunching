import { describe, expect, it } from "vitest";
import { safeValidateTemplate } from "./index";
import bengaliWedding from "../../../templates/wedding/bengali-traditional-wedding.json";
import royalReception from "../../../templates/wedding/royal-bengali-reception.json";
import floralEngagement from "../../../templates/engagement/ring-ceremony-floral.json";
import modernBirthday from "../../../templates/birthday/shubho-jonmodin-modern.json";
import grihaPravesh from "../../../templates/housewarming/griha-pravesh-warm.json";
import annaprashan from "../../../templates/religious/annaprashan-blessings.json";

describe("template-schema", () => {
  it("validates all bundled Nimantro templates", () => {
    const templates = [
      bengaliWedding,
      royalReception,
      floralEngagement,
      modernBirthday,
      grihaPravesh,
      annaprashan,
    ];

    for (const template of templates) {
      const result = safeValidateTemplate(template);
      expect(result.success, `Template ${template.id} failed validation`).toBe(true);
    }
  });

  it("rejects templates with invalid hex colours", () => {
    const invalid = {
      ...bengaliWedding,
      theme: { ...bengaliWedding.theme, primary: "burgundy" },
    };
    const result = safeValidateTemplate(invalid);
    expect(result.success).toBe(false);
  });
});
