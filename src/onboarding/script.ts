import type { OnboardingStep } from "./steps";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "user-linkedin",
    title: "Who Are You?",
    prompt: "Paste your LinkedIn profile URL.",
    inputType: "url",
  },
  {
    id: "conversation",
    title: "What Do You Really Do?",
    prompt:
      "No titles and BS. No generalities. Tell me what you actually do all day, " +
      "what you're working on, what you're an expert in, what you wish you knew " +
      "more about, and what you're trying to accomplish. The world of content " +
      "you live in. Talk as much or as little as you want.",
    followUpPrompts: [
      "You can type or hit the microphone — we recommend voice, people tend to share more. " +
        "Links to projects, docs, or anything else are welcome too.",
    ],
    inputType: "free-text-voice",
  },
  {
    id: "impress-list",
    title: "Who Do We Need to Impress?",
    prompt:
      "Who are the people whose opinion matters most to you professionally? " +
      "Your boss, board members, investors, key clients, mentors — anyone you " +
      "don't want to sound stupid in front of. Add their LinkedIn profiles.",
    followUpPrompts: [
      "Anyone else? You can always add more later.",
    ],
    inputType: "url-list",
  },
  {
    id: "rapid-fire",
    title: "Quick Clarifications",
    prompt:
      "Based on what you told me, here are the topics and areas I picked up on. " +
      "For each one, tell me: do you already know tons about this, do you need " +
      "to know more, or is it not really relevant to you?",
    followUpPrompts: [
      "Swipe right or tap 'Know tons' if you're an expert. " +
        "Tap 'Need more' if you want to learn. " +
        "Swipe left or tap 'Not relevant' to skip it entirely.",
    ],
    inputType: "rapid-fire-classify",
  },
  {
    id: "peer-review",
    title: "Organizations Like Yours",
    prompt:
      "Based on everything you've told me, I found some organizations that " +
      "seem similar to yours. For each one, tell me: is this relevant? " +
      "You can also add a comment — like 'they're bigger but same market' or " +
      "'they focus on enterprise, we're consumer'.",
    inputType: "peer-confirmation",
  },
  {
    id: "delivery-preferences",
    title: "Where Should I Send Your Briefing?",
    prompt:
      "Where do you want your daily briefing? " +
      "I can send it via email, Slack, SMS, or WhatsApp.",
    followUpPrompts: [
      "What time works best? (e.g., 7:00 AM before your first meeting)",
      "How detailed do you want it? Concise (3-5 bullets), standard (summary with context), or detailed (full briefing with links and sources)?",
    ],
    inputType: "delivery-selection",
  },
  {
    id: "calendar-connect",
    title: "Connect Your Calendar?",
    prompt:
      "Want me to tailor your briefings to your upcoming meetings? " +
      "I can look up who you're meeting, what they care about, and " +
      "what you should know before you walk in. Connect your Google " +
      "Calendar or Outlook to enable this. You can skip this step.",
    inputType: "skip-or-connect",
  },
  {
    id: "complete",
    title: "You're All Set",
    prompt:
      "Your profile is built. I now know who you are, what you do, " +
      "who you want to impress, and what matters to you. " +
      "Your first daily briefing is on its way.",
    inputType: "free-text-voice",
  },
];
