# Building and using the user's voice

Every reply should sound like the user wrote it on their phone. The source of truth is `voice.md` in this skill's folder. If it does not exist yet, build it with the steps below.

## Building voice.md

1. **Get real samples.** Ask the user to paste 5 to 10 LinkedIn replies they actually sent, or offer to read their recent sent replies. To read them: run collect.js, pick 10 to 20 rows where the last message is the user's, and run threads.js on them. That only reads; nothing is opened or marked read.
2. **Pull out the patterns.** For each item below, write down what the samples actually show, not what sounds good:
   - Length: how many sentences, typical character count, longest one.
   - Greeting: "Hi Sam!", "Hey Sam,", name only, or none.
   - Punctuation: exclamation points, "!!", question marks, lowercase or not.
   - Emoji: none, one smiley at most, or more.
   - Sign-off: usually none in a chat thread. Note it if the user signs.
   - Apologies for slow replies: do they use them, and how they word them.
   - Next steps: booking link, email, a single question, or nothing.
   - Words and phrases the user never uses.
3. **Ask the user what the samples cannot show:**
   - Who is high priority (customers, investors, hires, peers, press, students, community).
   - What they are offering or selling, in one or two plain sentences, and what they are not selling.
   - Links they share and when (booking link, email, website, an application page).
   - Standing answers: not hiring, not taking investor calls, can't attend in person, and so on.
   - Anything they never want said.
4. **Write voice.md** from `voice.example.md`, and show it to the user to confirm before you draft from it.

## Drafting rules (defaults, voice.md overrides them)

1. **Short.** One to three sentences. If a reply needs a paragraph, suggest a call or email instead.
2. **One specific detail** from their message: their company, the mutual, the event, their question. That is what keeps it from reading like a template.
3. **At most one next step.**
4. **Apologize if it is late.** If their message is more than about 3 days old, open with a quick apology in the user's own wording. If it sat in the Other folder, it is fine to say so.
5. **No sign-off** unless the user signs in their samples.
6. **One paragraph, no line breaks.** Enter may send early.
7. **Never use** em dashes or en dashes, bullet lists, or corporate filler ("circle back", "synergies", "leverage", "excited to explore", "hope this finds you well").
8. **Promise only what is true.** Safe commitments: "would love to chat", "we're looking into it", "happy to share what we've seen". Never invent meetings, prices, discounts, introductions or dates.
9. **Say conflicts out loud.** If the person is a competitor or the user cannot help, say so kindly instead of dodging.
10. **Match their pace.** If they are busy, do not push. If they proposed a time, accept or counter with one slot.

## Learning from edits

When the user edits a draft, the edited version is better data than any rule. After the run, offer to add the final text to the "Approved replies" section of `voice.md`, with one line describing the situation. If they cut something ("that's weird, drop it"), add it to their "never say" list.

## Fictional examples of the shape

- Met at an event, asks for a call: "Hi Sam! Great meeting you at the summit too. Would love to chat, here's my calendar: <booking link>"
- Intro through a mutual, asks for email: "Hi Priya, so sorry for the slow reply, and thank you (and Dana)! Best email is <email>, would love the intro."
- Congratulations: "Thank you Morgan!! Really appreciate it, hope things at Bluefin are going great!"
- Not hiring: "Hi Jamie! We're a small team and not hiring for that role yet, but I'll keep you in mind as we grow."
- Bug report with specifics: "Hi Chris, thank you so much for flagging this! We're looking into it now. Really appreciate you reporting it."
