"use client";

import React, { useState } from "react";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { CopyableId } from "@/components/ui/copyable-id";
import { toast } from "sonner";
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  Loader2,
  CheckCircle2,
  Send,
} from "lucide-react";

const INQUIRY_TOPICS = [
  "Past Paper Request",
  "Passes & MoMo Billing",
  "Lecture Slide Upload",
  "Account & Verification",
  "Faculty / Lecturer Inquiry",
] as const;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "Past Paper Request",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorText(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        toast.success("Message received by Student Helpdesk.");
        setFormData({ name: "", email: "", subject: "Past Paper Request", message: "" });
      } else {
        const errJson = await response.json().catch(() => null);
        const msg = errJson?.error || "Could not send message. Please try again.";
        setErrorText(msg);
        toast.error(msg);
      }
    } catch {
      setErrorText("Network connection interrupted. Please check your internet and try again.");
      toast.error("Network error while sending message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FD] dark:bg-[#040416] transition-colors flex flex-col">
      <MarketingNavbar />

      <main className="flex-1 py-16 md:py-24 px-6 sm:px-8 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Direct Helpdesk Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] border-l-2 border-[#D89A06] pl-3">
                Student &amp; Faculty Helpdesk
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#00004E] dark:text-white">
                How can we help with your coursework?
              </h1>
              <p className="text-sm md:text-base text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                Reach out to request missing past exam papers, resolve Mobile Money top-ups, or ask questions about course slide uploads.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] divide-y divide-border/60 shadow-2xs">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Support Email</div>
                    <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      unistudy.ai@gmail.com
                    </div>
                  </div>
                </div>
                <CopyableId
                  value="unistudy.ai@gmail.com"
                  displayValue="Copy"
                  toastMessage="Support email copied"
                />
              </div>

              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Direct Desk Line</div>
                    <div className="text-xs sm:text-sm font-semibold text-foreground font-mono tabular-nums">
                      +233 59 272 2997
                    </div>
                  </div>
                </div>
                <CopyableId
                  value="+233592722997"
                  displayValue="Copy"
                  toastMessage="Phone number copied"
                />
              </div>

              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[#D89A06]" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Campus Location</div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground">
                    East Legon / Madina, Accra, Ghana
                  </div>
                </div>
              </div>

              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#D89A06]" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Typical Response Time</div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground">
                    Under 4 hours on academic weekdays
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Accessible Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-[#0A0A28] border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs">
              {submitted ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h2 className="text-xl font-bold text-[#00004E] dark:text-white">
                      Inquiry Received
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Our student support desk has logged your message and will reply to your email address shortly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-foreground">
                      Topic Category
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {INQUIRY_TOPICS.map((topic) => {
                        const selected = formData.subject === topic;
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setFormData({ ...formData, subject: topic })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              selected
                                ? "bg-[#00004E] text-white border-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] dark:border-[#D89A06] font-semibold"
                                : "bg-muted/30 text-muted-foreground border-border/80 hover:text-foreground"
                            }`}
                          >
                            {topic}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="contact-name" className="block text-xs font-semibold text-foreground">
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        placeholder="e.g. Ama Serwaa"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-10 bg-background border border-border/80 rounded-xl px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D89A06]/50 focus:border-[#D89A06] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="contact-email" className="block text-xs font-semibold text-foreground">
                        University or Personal Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        placeholder="name@upsamail.edu.gh"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-10 bg-background border border-border/80 rounded-xl px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D89A06]/50 focus:border-[#D89A06] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-subject" className="block text-xs font-semibold text-foreground">
                      Subject Line
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder="Course code, payment reference, or question summary"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full h-10 bg-background border border-border/80 rounded-xl px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D89A06]/50 focus:border-[#D89A06] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-message" className="block text-xs font-semibold text-foreground">
                      Details
                    </label>
                    <textarea
                      id="contact-message"
                      placeholder="Include the course code (e.g. BCPC 208) or transaction reference if applicable..."
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-background border border-border/80 rounded-xl p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D89A06]/50 focus:border-[#D89A06] transition-all resize-y"
                    />
                  </div>

                  {errorText && (
                    <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive font-medium">
                      {errorText}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#00004E] hover:bg-[#000038] border border-[#D89A06]/60 dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] transition-colors shadow-xs disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending to Helpdesk...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
