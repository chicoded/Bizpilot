/**
 * Customer research questions.
 *
 * Written to surface what is actually going wrong, which means resisting the
 * instinct to ask whether people like the product. A few rules shape all of
 * them:
 *
 * - Ask about the past, not the future. "What did you do last week" gets you a
 *   fact; "would you use this" gets you a compliment.
 * - Ask about their shop, not about Zaplex. The interesting answers are about
 *   problems that exist whether or not this app does.
 * - Never supply the answer in the question. "Is the till too slow?" teaches
 *   them what to say. "Tell me about the last busy hour" does not.
 * - Invite criticism explicitly. People are polite by default, and polite
 *   feedback is worthless.
 *
 * Order matters too: the easy factual question comes first to warm up, the
 * hardest question sits in the middle where people are engaged but not yet
 * tired, and the one whose answer doubles as marketing copy comes last, once
 * they have already talked themselves into being honest.
 */

export type SurveyQuestion = {
  id: string;
  /** What the shop owner reads. Plain words, no jargon. */
  prompt: string;
  /** Shown under the prompt to make the ask concrete. */
  hint: string;
  /** Not shown to them — why this question exists, for whoever reads results. */
  purpose: string;
};

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "before",
    prompt:
      "Before Zaplex, how were you keeping track of what you sold and what was left?",
    hint: "A notebook, a phone calculator, someone's memory — whatever it really was.",
    purpose:
      "Establishes the true alternative. Whatever they name is what the product actually competes with, and it is almost never another app.",
  },
  {
    id: "bad_day",
    prompt: "Think about the last day in the shop that went badly. What happened?",
    hint: "Not about the app — just the day. What went wrong, and what did it cost you?",
    purpose:
      "A specific remembered event rather than a general opinion. Answers here name real operational pain, most of which the roadmap will not have anticipated.",
  },
  {
    id: "workaround",
    // Phrased to presuppose there is something, because there almost always
    // is. "Is there anything…" can be closed with "no" by someone being brisk,
    // and the answer this question wants is a list.
    prompt:
      "What do you still do on paper, on WhatsApp, or on your calculator instead of in Zaplex?",
    hint: "What is it, and why do you do it that way?",
    purpose:
      "Workarounds are the most valuable answers in the survey. Each one is a job the product failed to do, discovered without having to guess.",
  },
  {
    id: "annoying",
    prompt:
      "What is the most annoying part of using Zaplex? Please be blunt — it helps more than praise.",
    hint: "The thing that makes you sigh. Small irritations count.",
    purpose:
      "Explicit permission to criticise. Without the second sentence most people write 'nothing, it is fine' and the question is wasted.",
  },
  {
    id: "nearly_stopped",
    // "Was there a moment…" can be closed with "no" and skipped. Asking for the
    // story instead gets the story; the hint keeps "it never happened" available
    // so the phrasing does not put words in anyone's mouth.
    prompt: "Tell us about a time you nearly stopped using it.",
    hint: "Even if you carried on afterwards. If that never happened, say so — that is worth knowing too.",
    purpose:
      "Churn risk, from people who did not churn. The ones who left cannot be surveyed, so this is the closest available signal.",
  },
  {
    id: "one_change",
    prompt: "If one thing changed tomorrow, what would help your shop the most?",
    hint: "It does not have to be about the app.",
    purpose:
      "Prioritisation in their words. Frequency across responses matters far more than any single answer.",
  },
  {
    id: "explain",
    // Past tense, not hypothetical. "What would you tell them" gets a tidy
    // invented sentence; "what have you told them" gets the truth, and silence
    // is itself an answer — it means the value is not obvious enough to repeat.
    prompt: "What have you told other shop owners about Zaplex — if anything?",
    hint: "Their words, not a sales pitch. 'Nothing yet' is a real answer.",
    purpose:
      "Two jobs. Whether anyone mentions it unprompted is the cleanest read on whether the value is clear, and the phrasing people actually use is better marketing copy than anything written in-house.",
  },
];

/** Rough guide shown to the person filling it in. */
export const ESTIMATED_MINUTES = 6;
