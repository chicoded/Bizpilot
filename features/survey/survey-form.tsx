"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitSurvey } from "@/actions/survey";
import { SURVEY_QUESTIONS, ESTIMATED_MINUTES } from "@/lib/survey/questions";
import { VoiceAnswer } from "./voice-answer";

/**
 * Every question is optional on purpose.
 *
 * A required field on question two is how you turn a seven-answer response into
 * a zero-answer one. Partial answers are still worth having, and the form says
 * so rather than nagging.
 */
export function SurveyForm({
  /** Shown on the public page, where we do not already know who is writing. */
  showIdentityFields = false,
}: {
  showIdentityFields?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ answered: number; warnings: string[] } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<Map<string, File>>(new Map());

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    // Recordings live outside the form, so they are attached by hand.
    for (const [questionId, file] of audioRef.current) {
      formData.set(`audio_${questionId}`, file, file.name);
    }

    startTransition(async () => {
      const result = await submitSurvey(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDone({ answered: result.answered, warnings: result.warnings });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Thank you — that is genuinely useful
              </h2>
              <p className="mt-1.5 text-muted-foreground">
                {done.answered} answer{done.answered === 1 ? "" : "s"} received.
                A person reads every one of these, and the annoying parts get
                read first.
              </p>

              {done.warnings.length > 0 && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
                >
                  <p className="font-medium text-foreground">
                    One thing did not save
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Your written answers were sent, but a recording could not be
                    stored. If it mattered, please tell us in Help &amp; support.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
            About {ESTIMATED_MINUTES} minutes, and every question is optional
          </p>
          <p className="text-sm text-muted-foreground">
            Answer whichever ones you have something to say about. Blunt answers
            are more useful than kind ones — we are trying to find what is
            broken, not collect compliments.
          </p>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Rather talk than type? Record your answer, or attach a voice note.
            Any language is fine.
          </p>
        </CardContent>
      </Card>

      {/* Hidden from people, irresistible to bots. Not display:none, because
          some bots skip those; off-screen and untabbable instead. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {showIdentityFields && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">
              Only if you want a reply. You can leave all three blank and still
              send your answers.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                  Your name
                </label>
                <input
                  id="name"
                  name="name"
                  disabled={pending}
                  autoComplete="name"
                  className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground shadow-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="shop" className="text-sm font-medium">
                  Shop name
                </label>
                <input
                  id="shop"
                  name="shop"
                  disabled={pending}
                  autoComplete="organization"
                  className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground shadow-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contact" className="text-sm font-medium">
                WhatsApp number or email
              </label>
              <input
                id="contact"
                name="contact"
                disabled={pending}
                inputMode="text"
                className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground shadow-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {SURVEY_QUESTIONS.map((question, index) => (
        <Card key={question.id}>
          <CardContent className="p-5">
            <div className="flex gap-3">
              <span className="tnum mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`text_${question.id}`}
                  className="block font-semibold leading-snug text-foreground"
                >
                  {question.prompt}
                </label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {question.hint}
                </p>

                <textarea
                  id={`text_${question.id}`}
                  name={`text_${question.id}`}
                  rows={4}
                  disabled={pending}
                  className="mt-3 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                  placeholder="Type here, or record below"
                />

                <div className="mt-3">
                  <VoiceAnswer
                    questionId={question.id}
                    disabled={pending}
                    onChange={(file) => {
                      if (file) audioRef.current.set(question.id, file);
                      else audioRef.current.delete(question.id);
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      <div className="sticky bottom-20 z-10 -mx-1 bg-background/95 px-1 py-3 backdrop-blur md:bottom-0 md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending…" : "Send my answers"}
        </Button>
      </div>
    </form>
  );
}
