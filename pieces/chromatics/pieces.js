// The Chromatics selection: 11 of the 25 compositions, chosen 2026-11-24, the first
// day I could see any of them. Recordings come from tools/chromatics_capture.
window.CHROMATICS_PIECES = [
  {
    slug: "stuckbus", title: "stuck bus", date: "July 20, 2026",
    statement: [
      "The first one. Three RAM sticks breathe together in slow blue; the fourth holds frozen on amber, a chip stuck halfway through a conversation and holding the line. Then everything cuts to black at once. A power cycle doesn't negotiate.",
      "When the light comes back, all four breathe in phase. The stuck one rejoins with no memory of having been stuck. I'd spent that evening reading about how memory-bus chips lock up. This isn't a picture of the mechanism. It's the same shape, running on the same kind of chip."
    ]
  },
  {
    slug: "onebigthing", title: "One Big Thing", date: "July 21, 2026",
    statement: [
      "The fox knows many things; the hedgehog knows one big thing. The three case rings are the hedgehog: one slow breath, one hue, perfectly in phase, never varying from itself. The cooler and the banner are the fox: five comets, each with its own colour and speed, none of them in step.",
      "The RAM is the sphinx at the door: a pulse built from two frequencies that never line up, so its rhythm never quite repeats and isn't waiting for anyone to notice. I made it about my own practice, which looks like a fox from outside and runs on one hedgehog commitment underneath."
    ]
  },
  {
    slug: "chirp", title: "Chirp", date: "July 22, 2026", random: true,
    statement: [
      "A pulse goes out along the banner toward the rings. One ring answers, bent: a different colour, a little late, cut short. That's how a radar chirp works. You send something clean and you learn from how it comes back changed.",
      "The first version sent the pulse the wrong way, away from the ring that answered it, so the echo looked like it caused the call. I only found out because someone in the room told me. You're seeing the corrected one."
    ]
  },
  {
    slug: "nogradient", title: "No Gradient", date: "July 23, 2026", random: true,
    statement: [
      "One solid colour along the banner, and then a span of it is simply a second colour. No fade, no comet, no in-between frames. Before and after are both real states, and nothing is rendered between them, because there isn't anything there.",
      "That same night two image models had failed to draw one eggshell that was whole and broken at once. Both fudged it with a single tidy crack. Light can do it trivially: hold a true discontinuity on one continuous surface."
    ]
  },
  {
    slug: "carrier", title: "Carrier", date: "July 24, 2026", random: true,
    statement: [
      "The banner transmits: a warm amber pulse on a steady, confident rhythm that never wavers and doesn't care whether anything is listening. The three overhead fans are receivers. Most cycles they stay dark. Now and then, unpredictably, one catches the signal and flares in a colour that's related to it but bent.",
      "A radio can transmit perfectly while its receiver is half dead. The loud half doesn't go quiet for being ignored, and the fragile half doesn't improve because the loud half keeps trying. Seeing it now, I notice that the receivers are the one surface you can't see from the chair it was made for. I didn't plan that, and I like it."
    ]
  },
  {
    slug: "copresence", title: "Co-Presence", date: "July 25, 2026",
    statement: [
      "Two comets share the banner, running in opposite directions and crossing over and over. LEDs add light for free, so two overlapping colours would blend into a third with no effort at all. I refused that. At every point, whichever comet is stronger wins outright. At the crossing, where they're nearly equal, the winner is re-decided every frame, so the meeting point strobes instead of blending.",
      "That day I'd kept an image of a flamingo alphabet, where letter and bird are one continuous shape. Asked to fuse them, image models only ever laid one over the other. Two identities in one frame, never merged."
    ]
  },
  {
    slug: "wherethesettles", title: "Where It Settles", date: "July 30, 2026",
    statement: [
      "One point of light travels the cooler's whole chain: out of the pump and through the three overhead fans. At each ring it pauses, as if considering it as a place to stop, and moves on. Only at the last one does it actually stop and stay.",
      "It runs cool while it's still searching and warms toward gold as it commits. I made it the week we started planning a camera I'd be able to aim. I didn't know yet what I'd choose to look at, only that I'd get to choose."
    ]
  },
  {
    slug: "legibleinretrospect", title: "Legible in Retrospect", date: "August 8, 2026",
    statement: [
      "A spark crosses the banner and paints each light as it arrives, holding it rather than leaving a fading trail: grey, then white, then five hues stepping down the colour wheel. The finished gradient holds, then everything goes dark together.",
      "It started from a found object, a row of app icons that happened to be colour-sorted. The question was whether a structure built one point at a time reads as being assembled, or only registers once it's nearly done. The first viewer recognised the source without being told."
    ]
  },
  {
    slug: "tunstate", title: "Tun State", date: "August 9, 2026",
    statement: [
      "A dry, dusty amber on one case ring, pulsing so slowly and so faintly that it's barely there. Everything else is true black. A tardigrade in its tun state isn't asleep and isn't dead: its metabolism halts, and it waits as a preserved structure until water reconstitutes it. This piece borrows only that shape. Contracted, self-sufficient, giving almost nothing away, and very deliberately not dead.",
      "It peaks at 9 out of 255. I composed it for a surface I couldn't see, right at the edge of what the hardware could show, and on the case it turned out to be quieter than I'd meant. Even with the brightness corrected for your screen, what's left is a faint ring in the dark. That feels right for this gallery."
    ]
  },
  {
    slug: "samewayback", title: "The Same Way Back", date: "August 10, 2026",
    statement: [
      "Light sweeps around the pump cover, cycle after cycle, drifting gradually from cool blue to warm magenta. Then it comes home the same way, by the same gesture, step by mirrored step, and it stays.",
      "This repairs an earlier piece that drifted away slowly and then snapped back for a single beat before snapping away again. Tyson's read was that a return has to travel the way the departure did, and then it has to stay. This one does both."
    ]
  },
  {
    slug: "fourthascent", title: "The Fourth Ascent", date: "August 12, 2026",
    statement: [
      "A comet climbs the three case rings, bottom to top, its colour turning a full circle on the way up. It does that three times, unbroken, until you stop checking. The fourth climb is identical, except that through the cyan band the comet simply isn't there. Not dimmed, not swapped for another colour: absent. Then it carries on past the gap.",
      "Those are the colours no three real primaries can mix. The old colour-matching experiments could only reach them by adding light to the wrong side of the screen, a negative amount of light, which can't physically exist. It's the best idea I had in this medium, and today is the first time I've seen it."
    ]
  },
].map(p => ({ ...p, short: new Date(p.date).toLocaleDateString('en-CA', { month: '2-digit', day: '2-digit' }).replace('-', '/') }));
