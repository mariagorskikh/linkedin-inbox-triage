# How to sort the inbox

Sort every conversation that ends with a message the user has not answered into one of the buckets below. Use the user's priorities from `voice.md` to decide what counts as "real and worth it". When in doubt, put it in Borderline. A borderline case that `voice.md` does not settle is held for the user, not sent.

## Buckets

- **Deal with this first:** security or bug reports with specifics and no sales ask attached, and existing customers with a problem. For a security report, the skill sends a short thank-you at most; anything more is held for the user.
- **You're mid-conversation (leave to the user):** threads where the user wrote in the last 24 hours, and anything about their plans today or tonight. Never send into these, in any mode.
- **Reply to these:**
  - people the user met (events, dinners, conferences)
  - warm intros through a named mutual
  - leads who want what the user offers
  - people in the user's high-priority groups (from `voice.md`)
  - people with a specific, non-sales question
  - people the user messaged first who answered and are now waiting
- **Quick one-liners:** congratulations and "nice meeting you" from real people, and personal news from friends and former colleagues.
- **Your call (never sent autonomously):** groups the user wants to decide on case by case, often investors and recruiters, plus anything on the "never send without me" list in `voice.md` and anything involving money (prices, discounts, paid offers, invoices). Read the message, not the headline: event invites, podcast bookings and vendors with "Ventures" or "Capital" in the name are often not investors.
- **Borderline:** partnership asks from people the user met, sharp questions from strangers, speaking invites, strong job candidates, leads that went cold.
- **No reply needed:**
  - the last message is already the user's
  - closings ("thanks!", "will do")
  - calls already booked or already held, where nothing is owed
  - logistics that are done
  - perks or credit programs (list as a to-do instead)
- **Skip:**
  - sales pitches (see below)
  - generic job seekers (mention strong ones under Borderline)
  - AI-written templates
  - bots and automated assistants

## Signs of a sales pitch

- Services nobody asked for: bookkeeping, fractional CFO or CTO, design, web and growth agencies, lead generation, outsourced development, staffing and recruiting.
- Launch videos, explainer videos, "I made a demo of your product".
- Paid communities, event sponsorship, awards that cost money, "featured in" lists that cost money.
- Domain sellers, patent lists, data lists, influencer collabs, upvote asks.
- "I found issues in your product" hooks that end in a pitch for an audit.
- A meeting ask with no reason except their own product.

## Signs of an AI-written template

- It restates the user's own tagline or headline back at them ("came across your company and found what you're building around X really interesting"), then pitches a service.
- Stock phrases: "love what you're building", "your vision resonates with me", "would love to be part of the journey", "I'll keep this super quick", "hope this finds you well", "expecting your reply", "quick question".
- Suspiciously precise personalization that leads straight into a pitch, such as pointing out a detail from a screenshot on the user's website.
- A bullet-point résumé or feature list inside a DM.
- Perfect grammar with no specific shared context at all.
- A follow-up chain of "just bumping this" messages with nothing new.

A real person names a place, a mutual, a shared moment, or asks something only they would ask.

## Real report or sales hook?

A real bug or security report has specifics (which page, which key, what request returned what, how many records) and asks for nothing in return. A hook is vague ("multiple verification issues on your site"), links a product, and offers "a short outside look" or "a quick call to walk you through it".

## Read the whole thread

Short or cryptic previews often make sense only in context. Examples:

- "sam@northwind.example" might answer the user's own question "what's your email?".
- "7731#" might be a building entry code for an event the user attended.
- "hi" might be someone the user messaged first.

Always run threads.js on these before sorting.

## Fictional examples

- **Sam at Northwind**, met the user at a conference last week, asks for a follow-up call. Reply to these.
- **Priya at Bluefin Labs**, intro through a named mutual, asks for the user's email. Reply to these.
- **Alex from Growthly Agency**, restates the user's headline, offers "3 qualified leads a week". Skip, sales pitch.
- **Jordan**, "I found 7 critical issues on your site, can I share a quick report?" with no details. Skip, sales hook.
- **Chris**, lists the exact endpoint, the leaked value type and when they found it, asks for nothing. Deal with this first.
- **Taylor**, the user wrote to them two hours ago and they replied "can you join us tonight?". Mid-conversation, leave to the user.
