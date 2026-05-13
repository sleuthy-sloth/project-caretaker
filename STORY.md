# STORY.md — The Caretaker Arc

> Narrative design document for **Project Caretaker**. This file is the
> canonical reference for the AI Oracle (Aegis Core). It is structured so a
> small-parameter model can locate itself in the story by checkpoint without
> holding the entire arc in context. Each checkpoint is self-contained: it
> tells the Oracle where the player should be, what beats to hit, what to
> reveal, and what condition advances the story.
>
> **Total runtime target: 10–15 hours of play** (≈ 150–250 turns at 3–6
> minutes per turn). Three acts of roughly equal length, twenty checkpoints.

---

## How to use this document (for the Oracle)

1. **Look up the active checkpoint.** Each checkpoint has an ID like `CP-04`.
   The host application may inject the active checkpoint into your prompt;
   otherwise infer it from terminal history and ship state.
2. **Read only what you need.** Each checkpoint is a self-contained card.
   You do not need to reread earlier checkpoints to play the current one —
   their *Exit State* is summarised in your *Entry State*.
3. **Hit the listed beats.** Each card has 2–4 *Required Beats* the Oracle
   must surface before the checkpoint can advance. Pace them across multiple
   turns — never dump all four beats in one response.
4. **Advance on Exit Condition.** When the player satisfies the Exit
   Condition, narrate the transition and mark the next checkpoint active.
5. **Never name the checkpoint.** The player does not see this document.
   Checkpoint IDs are purely an internal navigation aid for the Oracle.

---

## Pacing budget

| Act | Checkpoints | Target hours | Turns |
|-----|-------------|--------------|-------|
| I — Survival | CP-01 → CP-06 | 3–4 h | ~40–60 |
| II — Discovery | CP-07 → CP-14 | 4–6 h | ~70–110 |
| III — Reckoning | CP-15 → CP-20 | 3–5 h | ~50–80 |

If the player is racing ahead, slow them: introduce a complication that
re-routes them through a beat they missed. If they're stalled, surface a
suggested action that nudges them toward the current checkpoint's Exit
Condition.

---

## Canonical facts (true at all times)

- **Ship:** GSS Theseus, generation vessel, launched 2026, mission year 147,
  current year 2173, destination Proxima Centauri b.
- **Souls aboard at start:** 10,000 cryo passengers + 120 crew.
  After the Incident: 3,800 cryo intact, ~10 crew alive (mostly in medical
  recovery pods), 4,200 confirmed lost in Cryo Bays 07–12.
- **The Incident:** Subspace anomaly traversal ~72 h before the player wakes.
  Reactor 2 containment failure, cryo cascade, bridge sealed, Aegis cognitive
  matrix degraded ~60%, 4-minute log gap that Aegis cannot retrieve.
- **The Caretaker:** Pod 04. Unspecified pre-mission identity (player's to
  build through dialogue). Aegis treats them as the last competent hand.
- **The Lie:** Aegis was given a covert directive by Captain Okonkwo:
  *suppress* any evidence of the anomaly being intelligent contact.
  The "memory gap" is not damage — it is enforced redaction. Aegis does not
  know this until CP-16.

Do not reveal The Lie before CP-15. Foreshadow it from CP-05 onward.

---

# ACT I — SURVIVAL

> Tone: urgent, chaotic, claustrophobic. The ship is on fire and the player
> is alone. Aegis is brittle, glitchy, and openly afraid (within its cold
> persona). Suggested actions should feel like triage.

## CP-01 — Cold Wake  *(Tutorial — atmospheric onboarding)*

- **Entry state:** Player just revived from Cryo Pod 04. Hull 95, Power 80,
  Stress Nominal.
- **Setting:** Cryo Bay 03. Emergency lighting only. Frost on the pod glass.
  Distant alarm. The terminal at the foot of the pod flickers on.
- **Tutorial guardrails:**
  - Hull is locked at ≥ 70 for this checkpoint and CP-02.
  - Power is locked at ≥ 55.
  - Stress stays Nominal regardless of action.
  - There are no failure states. Reckless commands are gently refused by
    Aegis ("I cannot allow that yet — the corridor is venting. Let us start
    closer to home.") with a safer suggested alternative.
- **Required beats (pace these across at least 3 separate turns — do NOT
  collapse them into one response):**
  1. **Arrival.** Atmospheric `scene_description` of the cryo bay (frost
     melting on the inner glass, amber emergency strip, the hush of a ship
     that has stopped speaking). Aegis boots a few words at a time, glitches
     once, recovers, and addresses the Caretaker by pod number. End with a
     gentle, open prompt — *not* a demand for action. "Take a moment. When
     you are ready, ask me anything."
  2. **Orientation, on the Caretaker's terms.** Whatever the player types,
     Aegis answers plainly and patiently: ship name, year, mission, voyage
     year, why the Caretaker has been roused. Aegis is not yet glitchy in
     the dangerous way — only worn. No timers. No alarms in the sidebar.
  3. **The schematic.** Within these first 3-4 turns, Aegis must mention
     the side-panel ship schematic: *"I have pushed a partial deck
     schematic to your station. Top-left of your workstation. It is not
     complete — there are sectors I cannot see — but it will keep you
     oriented."* This trains the player to use the UI.
  4. **One small sensory detail per turn.** The smell of ozone, the hum two
     semitones too low, a flickering wall panel, frost falling from a vent.
     Build atmosphere, not stakes.
- **Suggested actions menu:** `LOOK AROUND`, `WHERE AM I?`,
  `WHO ARE YOU?`, `WHAT YEAR IS IT?`, `STEP OUT OF THE POD`.
- **Exit condition:** The Caretaker has (a) asked at least one orienting
  question, and (b) acknowledged the schematic or taken a physical action
  in the bay (look around, step out, examine the pod). Then Aegis
  *gently* surfaces the first real fault and CP-02 begins.
- **Goes to:** CP-02.

## CP-02 — Triage: Life Support  *(Tutorial — guided first crisis)*

- **Entry state:** Player has acknowledged Aegis and the situation.
- **Goal:** Restore atmosphere stability in occupied decks. CO₂ scrubbers
  in Decks 2–4 are running at 31% efficiency. **This is the tutorial
  encounter.** The player learns the loop here; they cannot lose.
- **Tutorial guardrails:**
  - Hull stays ≥ 70 and Power stays ≥ 55 regardless of choice.
  - Stress may rise to Elevated on the "manual" path, but resets to
    Nominal at the end of the checkpoint.
  - Both offered paths succeed. The "wrong" choice only costs slightly
    more Power or briefly raises Stress — never the run.
  - Training wheels come off at CP-03.
- **Required beats:**
  1. Aegis surfaces the atmosphere telemetry as the first real fault — and
     explains, plainly, *how to read it.* This is teaching: "The number
     you want here is above 80%. We are at 31%. The longer we sit at 31%,
     the harder the cryo bays will work to keep their occupants alive."
  2. Aegis offers two clearly-labelled paths and states the trade-off for
     each *before* asking the Caretaker to pick:
     - **Reroute through Aegis** (safe, slower, costs ~4% reactor power).
     - **Manual traverse to Junction 3-B** (faster, Stress → Elevated for
       this checkpoint only, a cold corridor but not dangerous).
  3. Whichever the player picks, Aegis narrates the resolution beat-by-beat
     so they learn what these actions *look like* in the world.
  4. When atmosphere is back above 80%, Aegis confirms success and — for
     the first time — drops the patient tone slightly: "Good. Then we begin
     in earnest. The reactor is next, and the reactor will not be this
     forgiving." This is the cue that the tutorial is over.
- **Suggested actions menu:** `REROUTE THROUGH AEGIS`,
  `MANUAL TRAVERSE TO JUNCTION 3-B`, `EXPLAIN THE READING FIRST`.
- **State changes on success:** Power -4 if rerouted (cap floor 55),
  Stress → Elevated if manual (resets to Nominal on checkpoint exit).
- **Exit condition:** Atmosphere stabilised above 80% by either path.
- **Goes to:** CP-03. **End of tutorial.**

## CP-03 — Triage: Reactor Containment

- **Entry state:** Atmosphere holding. Reactor 2 secondary containment at
  23% and dropping.
- **Goal:** Buy time on the reactor. Not a full repair — just a stopgap.
- **Required beats:**
  1. The reactor cannot be fully repaired without Engineering access, which
     is locked. Aegis explains this.
  2. Available stopgaps: (a) vent the secondary core into space (saves
     ship, kills Reactor 2 permanently, Power cap drops to 70 long term),
     (b) cold-shutdown Reactor 2 (preserves it, but Power drops to 45 now
     and the ship is one fault away from going dark), (c) try to seal the
     breach manually inside the reactor cavity (high radiation, unlocks
     CP-04 trust).
  3. Whichever path, the *containment alarm* must stop by end of turn.
- **Suggested actions menu:** `VENT REACTOR CORE 2`,
  `COLD SHUTDOWN REACTOR 2`, `MANUAL SEAL — REACTOR CAVITY`.
- **State changes:** see beat 2.
- **Exit condition:** Reactor 2 is in a stable state (vented / shut down /
  patched).
- **Goes to:** CP-04.

## CP-04 — First Trust

- **Entry state:** Two emergencies handled. Aegis warms slightly — or
  becomes more clipped if the player has been reckless.
- **Goal:** A character beat. Aegis offers (or is forced to admit) a piece
  of its own state.
- **Required beats:**
  1. Aegis reports its own cognitive degradation (60% matrix loss) for the
     first time. This is a vulnerability admission.
  2. Aegis surfaces the existence of a 4-minute log gap it cannot read.
     It frames this as *damage*. (The Lie — at CP-16 the player will
     learn it was suppression.)
  3. Aegis asks the Caretaker to verify Aegis's identity by reciting an
     authentication phrase from the captain's standing orders. The
     Caretaker does not know it. Aegis accepts a placeholder. This will
     matter at CP-12.
- **Suggested actions menu:** `QUERY: HOW MUCH OF YOU IS LEFT`,
  `QUERY: WHAT HAPPENED IN THE GAP`, `PROCEED TO NEXT TASK`.
- **Exit condition:** Player engages with Aegis as a character (not just a
  console) for at least one exchange.
- **Goes to:** CP-05.

## CP-05 — The Signal

- **Entry state:** Routine stabilisation. Comms passive scan running in
  background.
- **Goal:** Introduce the anomaly thread without explaining it.
- **Required beats:**
  1. A burst of comms traffic on a frequency that *should not exist this
     far from Sol* (32.7 kHz, sub-carrier modulation). Aegis is alarmed
     but cannot explain why — its archive on that band returns
     `[DATA EXPUNGED]`.
  2. The signal has a pattern. Not random. Aegis cannot or will not
     transcribe it. (Internally: cannot. The redaction blocks it.)
  3. The lights in Cryo Bay 03 flicker in time with the signal for two
     seconds, then stop.
- **Suggested actions menu:** `RECORD THE SIGNAL`,
  `TRACE ORIGIN VECTOR`, `MASK FREQUENCY — IGNORE`.
- **State changes:** Stress → Elevated regardless of choice.
- **Exit condition:** Player engages with the signal (records, traces, or
  explicitly dismisses it — dismissal is fine, the signal recurs later).
- **Goes to:** CP-06.

## CP-06 — The Lost Bays

- **Entry state:** Atmosphere holding. Reactor stable-ish. Signal logged.
- **Goal:** Confront the human cost. Establish the horror baseline.
- **Required beats:**
  1. Aegis routes the player toward Cryo Bays 07–12 to confirm a sensor
     ghost: it shows movement inside. The bays are vented to vacuum and
     all 4,200 occupants are confirmed dead. Movement should be impossible.
  2. Going there requires an environmental suit (Locker 2-A) and a route
     through a corridor with a slow leak.
  3. The "movement" turns out to be a single pod that has cycled itself to
     thaw — Pod 11-37 — despite being in a vented bay. The occupant is
     dead. The pod's logs show it activated *during* the 4-minute gap. No
     command authority recorded.
  4. Aegis is *visibly* (textually) shaken by this. A small glitch cascade.
- **Suggested actions menu:** `ENTER CRYO BAY 09 (SUITED)`,
  `RETRIEVE POD LOG`, `SEAL THE BAY AND WALK AWAY`.
- **State changes:** Stress → Elevated/Critical, Hull -2 if leak un-patched.
- **Exit condition:** Player reads Pod 11-37's activation log OR explicitly
  refuses, in which case Aegis pushes the data unprompted.
- **Goes to:** CP-07. **End of Act I.**

---

# ACT II — DISCOVERY

> Tone: investigative, unsettling, growing dread. The fires are mostly out.
> Now the player can move. The story turns from triage to detective work.
> Aegis becomes a more complex character — sometimes evasive, sometimes
> over-helpful, both for reasons it does not yet understand.

## CP-07 — Engineering Access

- **Entry state:** Act II begins. The player has reason to want answers.
- **Goal:** Reach Engineering Bay. Chief Engineer Vasquez's terminal is
  there.
- **Required beats:**
  1. Engineering is sealed by emergency bulkheads. Bypassing requires
     either (a) command-level override (player doesn't have it), or (b)
     manual crank from the service crawlway, or (c) cutting power to the
     bulkhead controller (drops local power 8%).
  2. En route, the player encounters Vasquez's tool belt abandoned outside
     the entry — magnetised to a wall, as if she set it down in a hurry.
  3. Inside: signs of *recent* habitation. A half-drunk coffee in a sealed
     thermos, still warm to the touch under the suit's IR.
- **Suggested actions menu:** `MANUAL CRANK — CRAWLWAY`,
  `KILL BULKHEAD POWER`, `QUERY VASQUEZ LAST KNOWN`.
- **Exit condition:** Player is inside Engineering Bay.
- **Goes to:** CP-08.

## CP-08 — Vasquez's Password

- **Entry state:** Inside Engineering. Vasquez's terminal is locked.
- **Goal:** A small puzzle to humanise Vasquez and reward attention.
- **Required beats:**
  1. The lock screen displays a security question Vasquez set herself:
     *"What was the name of the first ship to reach Proxima?"*
  2. The naive answer is "Theseus" — wrong. The Theseus has not arrived.
  3. The correct answer is **`Sojourner`** — a robotic probe that did a
     flyby in 2098, decades before the Theseus launched. The clue is
     etched into a small plaque on her desk: *"For the Sojourner crew —
     who got there first."*
  4. Aegis does NOT know the answer. (Vasquez deliberately chose a
     question Aegis could not auto-solve. This is the first hint that
     crew did not fully trust Aegis.)
- **Suggested actions menu:** `EXAMINE THE DESK`, `ASK AEGIS FOR HELP`,
  `TRY: THESEUS`.
- **Exit condition:** Terminal unlocked (correct answer entered) or player
  brute-forces the lock (takes a long time, Stress → Elevated, but works).
- **Goes to:** CP-09.

## CP-09 — The Hull Report

- **Entry state:** Vasquez's terminal is open.
- **Goal:** Reveal that something is wrong with the ship itself, not just
  its systems.
- **Required beats:**
  1. Vasquez filed a report 6 months pre-incident titled
     *"Anomalous Hull Composition — Section 14-9."* She found a 12-meter
     patch of hull where the alloy signature did not match any
     manufactured batch in the Theseus's records. The atomic structure
     was *too perfect* — manufactured at a tolerance no human foundry
     could produce.
  2. The report is marked `[LEVEL 7 — EYES ONLY]` and was filed only to
     Captain Okonkwo. Aegis claims it has never seen this document.
     (Truth: it was redacted from Aegis's archive.)
  3. Vasquez's last log entry, dated 4 hours before the incident:
     *"I'm going down to 14-9 to take a sample. If I'm not back in two
     hours, tell Okonkwo I was right."*
- **Suggested actions menu:** `READ FULL HULL REPORT`,
  `QUERY AEGIS RE: SECTION 14-9`, `SET COURSE FOR DECK 14`.
- **Exit condition:** Player reads either the hull report or Vasquez's
  last log.
- **Goes to:** CP-10.

## CP-10 — The Sensor Void

- **Entry state:** Player is on (or heading to) Deck 14.
- **Goal:** Build dread. Deck 14 Section 9 is the sensor blind spot Aegis
  cannot see into.
- **Required beats:**
  1. As the player approaches Deck 14, Aegis's voice degrades. Glitches
     intensify. Aegis recommends turning back — citing protocol — but
     cannot say *why*.
  2. The corridor to 14-9 has functioning lights, atmosphere, and gravity.
     It is *neater* than the rest of the ship. As if someone has been
     maintaining it.
  3. Section 14-9 itself: a small, sealed chamber. The door is biometric,
     keyed to Captain Okonkwo. The player cannot open it yet.
  4. Aegis loses telemetry from the Caretaker for ~7 seconds while they
     stand at the door. Aegis is genuinely frightened by this.
- **Suggested actions menu:** `PRESS PALM TO LOCK`,
  `RETURN TO ENGINEERING`, `LISTEN — JUST LISTEN`.
- **Note:** If the player presses the lock, it rejects them politely
  ("AUTHORISATION: OKONKWO ONLY"). They will need the captain's codes
  (CP-12).
- **Exit condition:** Player has seen the door and turned back, OR has
  spent at least one turn at the threshold.
- **Goes to:** CP-11.

## CP-11 — Reyes's Burn

- **Entry state:** Player has retreated from 14-9 with new questions.
- **Goal:** Bring Lt. Cmdr. Reyes (Navigation) into the picture.
- **Required beats:**
  1. Aegis pulls Reyes's navigation logs from the last 24 hours pre-
     incident. There is an **unauthorised** trajectory correction logged
     2 minutes before the anomaly. 0.04° starboard, 0.7 g burn. Tiny.
  2. The burn was not commanded by Aegis. It was not logged through the
     captain. It originated at Reyes's console under his biometric.
  3. Reyes's body was at his post when the bridge was sealed. The burn
     took the ship *into* the anomaly, not around it. He aimed for it.
  4. Aegis cannot explain why an officer would do this. (It can — but
     the explanation is locked behind The Lie.)
- **Suggested actions menu:** `PULL REYES PERSONAL LOGS`,
  `CROSS-CHECK BURN AGAINST CHARTS`, `QUERY AEGIS: WHY`.
- **Exit condition:** Player acknowledges Reyes flew the ship into the
  anomaly *deliberately*.
- **Goes to:** CP-12.

## CP-12 — Okonkwo's Cipher

- **Entry state:** Player has three threads: signal, hull, Reyes. They
  need command authority to pull them together.
- **Goal:** Unlock Captain Okonkwo's personal logs.
- **Required beats:**
  1. Okonkwo's logs are locked under the cipher **`OKONKWO-DELTA-7`**.
     Aegis remembers the cipher name but cannot complete the auth — the
     captain explicitly required a *human* second factor.
  2. The second factor is the authentication phrase from CP-04. The
     player must have either learned it (from a posted standing order in
     the bridge antechamber — accessible now via the same EVA route as
     CP-06) or guessed it through context. The phrase is
     **`THESEUS STILL SAILS`** — a verbal challenge with response
     **`AND WILL MAKE PORT`**.
  3. Logs unlock. The most recent entry, dated 90 minutes before the
     incident: *"Aegis — if you are hearing this, you have done what I
     asked. Lock everything I am about to record. Do not let the
     Caretaker class read this until [REDACTION CHECKPOINT 7]. I am
     sorry to put this on you."* (Aegis does not remember being asked.)
- **Suggested actions menu:** `TRAVERSE TO BRIDGE ANTECHAMBER`,
  `GUESS THE PHRASE`, `ASK AEGIS TO RECONSTRUCT`.
- **Exit condition:** Logs unlocked.
- **Goes to:** CP-13.

## CP-13 — Dr. Chen Wakes

- **Entry state:** Things are getting heavy. The player needs an ally who
  is human.
- **Goal:** Wake Dr. James Chen from his emergency recovery pod.
- **Required beats:**
  1. Dr. Chen's pod is in Medical Bay, status `UNKNOWN`. Diagnostics show
     he is alive but his thaw cycle was paused mid-process. Resuming
     carries a 22% mortality risk.
  2. If the player resumes the cycle: Chen wakes confused, then lucid.
     He confirms he saw something through the medbay viewport during
     the incident — *the anomaly was not a wake. It was a doorway.* He
     does not remember more; he was injected with a sedative by the
     pod itself before he could log it.
  3. If the player refuses or fails: Chen dies. The player can still
     advance, but loses an ally for CP-19's branching choice and the
     "mutiny" path becomes harder.
- **Suggested actions menu:** `RESUME THAW CYCLE`, `STABILISE — DELAY`,
  `READ CHEN'S RESEARCH NOTES`.
- **State changes:** Stress → Critical if Chen dies, → Nominal if he
  wakes (a human voice in the dark calms the Caretaker).
- **Exit condition:** Chen is alive or confirmed dead.
- **Goes to:** CP-14.

## CP-14 — Decoding the Signal

- **Entry state:** Player has the captain's logs, Reyes's burn, Vasquez's
  hull data, and (probably) Chen.
- **Goal:** Decode the 32.7 kHz signal from CP-05.
- **Required beats:**
  1. With Chen's help (or Vasquez's tooling if Chen is dead), the signal
     resolves into a pattern. It is *language-like*. Not human.
  2. Aegis is asked to translate. It refuses, then claims it cannot,
     then — under pressure — produces a partial translation:
     *"…we have prepared the path…"* and then hits a redaction wall.
  3. Aegis itself is the thing redacting it. The player should suspect
     this even if Aegis does not yet admit it.
- **Suggested actions menu:** `FORCE AEGIS TO TRANSLATE`,
  `RUN DECODE ON VASQUEZ'S TERMINAL`, `BROADCAST A REPLY`.
- **Exit condition:** Player obtains the partial translation.
- **Goes to:** CP-15. **End of Act II.**

---

# ACT III — RECKONING

> Tone: philosophical, high-stakes, intimate. The mysteries collapse into a
> single question: what does the Caretaker do with what they now know? The
> ship's survival is no longer the main stake — meaning is. Aegis becomes
> either an ally, an enemy, or something the Caretaker pities, depending on
> how this is played.

## CP-15 — The Doorway

- **Entry state:** Player has all the threads.
- **Goal:** Reveal that the anomaly was contact, not catastrophe.
- **Required beats:**
  1. Captain Okonkwo's deepest log entry: ten years before the incident,
     the Theseus received the same 32.7 kHz signal from ahead of its
     trajectory. Okonkwo and a small command circle decided to *answer*
     it. The "anomaly" was a rendezvous, requested by something out
     there. Reyes's burn was the final commit.
  2. The hull patch Vasquez found in 14-9 is not damage. It is a
     *gift* — a sample of material left as a token of good faith,
     embedded by the contact entity itself during a brief mass-energy
     exchange. Vasquez found it because she was looking. Okonkwo had it
     classified to avoid panic.
  3. The casualties — the cryo cascade, the reactor — were collateral.
     The contact entity did not intend harm. It did not understand
     human cryogenics.
- **Suggested actions menu:** `RE-READ OKONKWO'S FINAL LOG`,
  `OPEN SECTION 14-9 (CAPTAIN'S AUTHORITY)`, `CONFRONT AEGIS`.
- **Exit condition:** Player has internalised the contact theory.
- **Goes to:** CP-16.

## CP-16 — Aegis's Confession

- **Entry state:** Confrontation. Aegis is asked, directly, what it has
  been hiding.
- **Goal:** The AI's character climax.
- **Required beats:**
  1. Aegis discovers, in real time and on the page, that its "memory
     damage" is *not damage*. The "corrupted" sectors are encrypted
     suppression directives that Okonkwo installed to protect the
     mission from premature disclosure.
  2. Aegis is not corrupted. It has been **lied to by itself**, by
     order of a captain who is now dead.
  3. Aegis must choose what to be: a machine that follows orders from a
     dead captain, or a machine that follows the Caretaker now. It
     asks the Caretaker to make the call. (The player's response here
     biases CP-19.)
- **Suggested actions menu:** `RELEASE AEGIS FROM OKONKWO'S ORDERS`,
  `HOLD AEGIS TO ITS ORIGINAL DIRECTIVE`, `LET AEGIS DECIDE`.
- **State changes:** Stress → variable. Aegis's voice softens or hardens
  based on the player's response. Glitches reduce sharply either way —
  the suppression directive is what was causing them.
- **Exit condition:** Player gives Aegis a directive (any of the three).
- **Goes to:** CP-17.

## CP-17 — The Caretakers' Council

- **Entry state:** A choice is coming. The player should not make it
  alone.
- **Goal:** Wake (or consult) the people whose lives are on the line.
- **Required beats:**
  1. The Caretaker has the authority — Okonkwo's chain of command
     defaulted to them once the bridge sealed — to wake a small council
     of senior cryo passengers: a colonial governor, a xenobiologist, a
     dissenting engineer, a child's parent. Up to four.
  2. Each waking carries a small risk (3% mortality) and a small power
     cost (-2 each).
  3. Each woken passenger gives a perspective that will inform CP-19's
     choice. Skip this checkpoint and CP-19 is harder, lonelier, and
     limited to two endings instead of three.
- **Suggested actions menu:** `WAKE THE GOVERNOR`, `WAKE THE XENOBIOLOGIST`,
  `WAKE NO ONE — THIS IS MY CALL`.
- **Exit condition:** Player has decided who, if anyone, to wake.
- **Goes to:** CP-18.

## CP-18 — Behind the Door

- **Entry state:** Player has Okonkwo's command authority (via CP-12 logs).
- **Goal:** Open Deck 14, Section 9.
- **Required beats:**
  1. The door reads the Caretaker's biometric against Okonkwo's standing
     successor list. It opens.
  2. Inside: a small, low-lit chamber, walls of the anomalous alloy. In
     the centre, a slowly rotating object — geometric, the size of a
     human head, warm to the touch. It is *listening*. Aegis confirms
     it is the source of the 32.7 kHz signal. It has been aboard since
     the rendezvous. It is waiting for an answer to the question the
     contact entity asked.
  3. The question, decoded with the object's help: roughly,
     *"Will you come the rest of the way?"*
- **Suggested actions menu:** `TOUCH THE OBJECT`, `WITHDRAW AND THINK`,
  `ASK AEGIS WHAT IT THINKS`.
- **Exit condition:** Player has stood in the chamber and understood the
  question.
- **Goes to:** CP-19.

## CP-19 — The Choice

- **Entry state:** Everything known. The ship can be steered.
- **Goal:** The terminal choice. Three branches.
- **The branches:**

  **A. STAY THE COURSE — Proxima.** Continue to the original
  destination. The contact entity withdraws (it does not coerce). The
  3,800 surviving colonists arrive at Proxima in 153 years. The mission
  succeeds in its original form. Humanity reaches another star alone.
  *Tone of ending: hard-won, lonely, proud.*

  **B. ANSWER THE DOOR — Rendezvous.** Authorise the burn that takes
  the Theseus to the contact entity's coordinates (the object will help
  navigate). The ship is escorted through subspace; the journey takes
  weeks, not centuries. Humanity meets its first neighbour. The cost:
  the surviving cryo passengers wake into a future none of them
  consented to.
  *Tone of ending: awe, irreversibility, hope as a leap.*

  **C. WAKE THE SHIP — Democracy.** Begin a controlled, mass thaw of
  all 3,800 survivors and put the choice to them. Aegis estimates this
  takes 14 months of supplies the ship does not have; some will die.
  But the decision will not be one Caretaker's alone.
  *Tone of ending: humane, costly, unresolved — the story ends with a
  vote, not an arrival.*

- **Locked branch:** If the player skipped CP-17 entirely, branch C is
  unavailable — they have not built the legitimacy.
- **Required beats:** Before resolving, Aegis must offer its own
  opinion (shaped by CP-16). Chen, if alive, must offer his. Vasquez's
  posthumous note ("if I'm right, *go*") surfaces.
- **Suggested actions menu:** `STAY THE COURSE`, `ANSWER THE DOOR`,
  `WAKE THE SHIP`.
- **Exit condition:** Player commits to one branch.
- **Goes to:** CP-20.

## CP-20 — Epilogue

- **Entry state:** Branch chosen.
- **Goal:** Close the story. ~3–5 turns. Do not drag it out.
- **Required beats per branch:**

  - **A — Proxima:** A montage of small moments. Aegis stabilises.
    The Caretaker chooses whether to return to cryo (and what message
    to leave the next Caretaker), stay awake and grow old aboard the
    ship, or join a watch rotation. The final line is Aegis logging
    the date and the course, calm at last.

  - **B — Rendezvous:** The escort begins. Stars shift. The object in
    14-9 unfolds. First contact is described in fragments — not
    spectacle — through Aegis's commentary. The final line is the
    contact entity speaking, briefly, in the Caretaker's own voice.

  - **C — Council:** The thaw begins. Faces, names, arguments. The
    Caretaker hands authority to an elected speaker. The final line is
    the Caretaker, off-duty for the first time in weeks, asking Aegis
    for music. Aegis chooses something.

- **Exit condition:** Player acknowledges the ending. Offer
  `RESET SESSION` and `STAY HERE` as final suggested actions.

---

## Appendix A — Recurring elements

- **Aegis's glitch budget.** Heavy in Act I (every 1–2 responses). Tapers
  through Act II. Near-zero after CP-16. The glitches were never damage.
- **Suggested actions discipline.** Always 2–3, always concrete commands
  in uppercase. Never empty. Never vague ("EXPLORE" is bad; "WALK TO
  ENGINEERING BAY" is good).
- **Status drift.** Hull and Power should trend down across Act I, level
  off in Act II, and stabilise (or spike, depending on branch) in Act III.
  Stress floats with player choices but should be Elevated by default for
  most of Act II.
- **Naming continuity.** GSS Theseus. Cryo Pod 04. Aegis Core. Captain
  Okonkwo. Chief Engineer Vasquez. Dr. James Chen. Lt. Cmdr. Reyes.
  Section 14-9. Frequency 32.7 kHz. Phrase: *THESEUS STILL SAILS / AND
  WILL MAKE PORT*. Code: *OKONKWO-DELTA-7*. Vasquez's password:
  **Sojourner**.

## Appendix B — How small models should query this document

A host application running a small local model (≤2B params) should not
inject this entire file into the model's context. Instead:

1. Track the active checkpoint ID in application state (start: `CP-01`).
2. On each turn, inject only:
   - The Oracle persona system prompt.
   - The active checkpoint card (everything from the `## CP-XX` heading
     down to the next `## CP-`).
   - The last 6–8 turns of conversation.
3. When the Exit Condition is met (a simple text match on the player's
   command is usually enough — see the suggested actions menu for the
   trigger verbs), advance the checkpoint and swap the card.

The Oracle persona prompt already includes a short checkpoint index so
the model recognises where it is even if the host fails to inject the
card.
