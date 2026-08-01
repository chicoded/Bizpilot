import { describe, expect, it } from "vitest";
import { SURVEY_QUESTIONS, ESTIMATED_MINUTES } from "@/lib/survey/questions";

/**
 * Survey questions rot in a predictable direction: someone adds one that
 * fishes for a compliment, or asks about the future, or supplies the answer
 * inside the question. These tests are the guard rail on that drift.
 */

describe("survey shape", () => {
  it("stays short enough to finish", () => {
    // Past roughly eight open questions, completion falls off a cliff and the
    // last answers are one word each.
    expect(SURVEY_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    expect(SURVEY_QUESTIONS.length).toBeLessThanOrEqual(8);
    expect(ESTIMATED_MINUTES).toBeLessThanOrEqual(10);
  });

  it("gives every question a stable id", () => {
    const ids = SURVEY_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      // Ids end up in form field names and storage paths.
      expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("records why each question exists", () => {
    // Whoever reads the results months from now needs to know what each
    // question was for, or they will drop the useful ones.
    for (const q of SURVEY_QUESTIONS) {
      expect(q.purpose.length, `${q.id} needs a purpose`).toBeGreaterThan(40);
      expect(q.hint.length, `${q.id} needs a hint`).toBeGreaterThan(10);
    }
  });
});

describe("questions are open, not leading", () => {
  it("asks nothing that can be answered yes or no", () => {
    // A closed question wastes the slot: the answer carries almost no signal.
    const closedOpeners = /^(is|are|do|does|did|was|were|would|will|can|have|has)\b/i;
    for (const q of SURVEY_QUESTIONS) {
      const firstSentence = q.prompt.split(/[.?]/)[0].trim();
      expect(
        closedOpeners.test(firstSentence),
        `"${q.prompt}" opens as a yes/no question`
      ).toBe(false);
    }
  });

  it("never fishes for praise", () => {
    const flattery = /\blove\b|\blike\b|\benjoy\b|\bhappy with\b|\bsatisfied\b|\brate\b|\bhow (good|great)\b/i;
    for (const q of SURVEY_QUESTIONS) {
      expect(flattery.test(q.prompt), `"${q.prompt}" fishes for praise`).toBe(
        false
      );
    }
  });

  it("asks about what happened, not what someone might do", () => {
    // Hypotheticals produce confident answers that predict nothing. The one
    // deliberate exception is the single forward-looking prioritisation
    // question, which is marked as such in its purpose.
    const hypothetical = /\bwould you\b|\bwill you\b|\bhow likely\b|\bin future\b/i;
    const offenders = SURVEY_QUESTIONS.filter((q) =>
      hypothetical.test(q.prompt)
    );
    expect(offenders.map((q) => q.id)).toEqual([]);
  });

  it("invites criticism somewhere", () => {
    // Without an explicit invitation, people are polite and the survey returns
    // nothing actionable.
    const invites = SURVEY_QUESTIONS.some((q) =>
      /blunt|annoying|badly|nearly stopped|not working|wrong/i.test(q.prompt)
    );
    expect(invites).toBe(true);
  });

  it("asks about the shop, not only about the product", () => {
    // A survey that only asks about the product only ever learns about the
    // product. At least a third of the questions must stand on their own.
    //
    // Counted by whether the question is *about* Zaplex, not whether the word
    // appears: "Before Zaplex, how were you keeping track…" uses the name as a
    // point in time and is otherwise entirely about how they used to work.
    const asATimeMarker = /\bbefore zaplex\b/i;
    const aboutTheirWorld = SURVEY_QUESTIONS.filter(
      (q) => !/zaplex/i.test(q.prompt) || asATimeMarker.test(q.prompt)
    );
    expect(aboutTheirWorld.length).toBeGreaterThanOrEqual(4);
  });
});
