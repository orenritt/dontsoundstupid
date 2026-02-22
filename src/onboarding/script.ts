import type { OnboardingStep } from "./steps.js";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "user-linkedin",
    title: "About You",
    prompt: "What's your LinkedIn profile URL?",
    inputType: "url",
  },
  {
    id: "impress-list",
    title: "Who Do You Want to Impress?",
    prompt:
      "Who are the people whose opinion matters most to you professionally? " +
      "Your boss, board members, investors, key clients, mentors — anyone you " +
      "don't want to sound stupid in front of. Share their LinkedIn URLs.",
    followUpPrompts: [
      "Anyone else? You can always add more later.",
    ],
    inputType: "url-list",
  },
  {
    id: "conversation",
    title: "What Are You Working On?",
    prompt:
      "Now I need to understand what you're actually doing day-to-day. " +
      "This is the stuff LinkedIn doesn't capture.",
    followUpPrompts: [
      "What are you actually working on right now? What are your current projects or initiatives?",
      "What are the biggest challenges or concerns in your work right now?",
      "What terms, topics, or trends do you need to stay sharp on?",
      "What would embarrass you to not know about in your next meeting?",
      "What does 'not sounding stupid' mean for you? Pick the ones that matter most: " +
        "following industry trends, catching new jargon, tracking new companies/products, " +
        "learning best practices, following research/papers, monitoring regulatory changes, " +
        "competitive intelligence, knowing what your network is talking about — " +
        "or tell me something else entirely.",
    ],
    inputType: "conversation",
  },
  {
    id: "peer-review",
    title: "Organizations Like Yours",
    prompt:
      "Based on everything you've told me, I found some organizations that " +
      "seem similar to yours. For each one, tell me: is this relevant? " +
      "You can also add a comment — like 'they're bigger but same market' or " +
      "'they focus on enterprise, we're consumer'. This helps me understand your world better.",
    inputType: "peer-confirmation",
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
    id: "delivery-preferences",
    title: "Where Should I Send Your Briefing?",
    prompt:
      "Last thing — where do you want your daily briefing? " +
      "I can send it via email, Slack, SMS, or WhatsApp.",
    followUpPrompts: [
      "What time works best? (e.g., 7:00 AM before your first meeting)",
      "How detailed do you want it? Concise (3-5 bullets), standard (summary with context), or detailed (full briefing with links and sources)?",
    ],
    inputType: "delivery-selection",
  },
  {
    id: "complete",
    title: "You're All Set",
    prompt:
      "Your profile is built. I now know who you are, who you want to " +
      "impress, what you're working on, and who your peers are. " +
      "Your first daily briefing is on its way.",
    inputType: "conversation",
  },
];
