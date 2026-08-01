/**
 * Shared shapes for survey submission.
 *
 * These live outside actions/survey.ts because a "use server" module may only
 * export async functions — a constant or a type exported alongside the action
 * fails the build, even though it typechecks cleanly.
 */

/** Tags the ticket so survey responses can be read separately from problems. */
export const SURVEY_MARKER = "[SURVEY]";

/**
 * Stated explicitly with literal discriminants. Inferred unions widen `success`
 * to boolean across several return sites, which stops callers narrowing on it —
 * the same thing that broke the billing callback page twice.
 */
export type SurveyResult =
  | { success: true; answered: number; warnings: string[] }
  | { success: false; error: string };
