# The hall announcement voice

What the hall speaker says, which voice says it, and why nothing private can
reach it. For the officers' side of it — cables, the speaker setting, the
test — see `FOR-OFFICIALS.md` §3.

## The decision

**The hall hears recordings, made ahead of time with a neural voice, played
from files that ship with ASSN Ballot.** Nothing is synthesised on polling
day and nothing needs the internet. If those recordings are missing, the
terminal's own Windows voice makes the same phrases, once, into files, and
plays those instead — so the fallback is offline too.

This works because the hall only ever hears 21 fixed sentences (1,128
characters in all, listed in `src/renderer/voice-policy.js`). A voice that
only has to say 21 things can say them once, be listened to by a person, and
then be the same on every terminal for every election.

## The options, compared

| | Sound | Offline on the day | Licence / cost | Fit |
| --- | --- | --- | --- | --- |
| **Piper**, pre-rendered *(chosen)* | Neural; clear and natural at a distance | Yes — only files ship | Engine is open source; each voice has its own licence, read from its model card by the render script | Best balance of clarity, cost and independence |
| Kokoro-82M, pre-rendered | Neural; among the most natural open voices | Yes — only files ship | Apache-2.0 weights | A strong alternative; needs Python to render |
| Azure AI Speech / Google Cloud TTS / Amazon Polly, pre-rendered | Neural; excellent | Yes, if pre-rendered | Needs an account and a key; 1,128 characters sits well inside their free tiers | Good, but adds an account to look after for one afternoon's work |
| ElevenLabs, pre-rendered | Very natural | Yes, if pre-rendered | Subscription; the free plan has use restrictions | Over-qualified, and the terms need reading |
| Any cloud voice, **live** | As above | **No** | Per-use | Ruled out: a hall's internet is the thing most likely to fail |
| Windows voices (David, Zira) *(fallback)* | Plain and synthetic, but clear | Yes | Part of Windows | The fallback: always present, no setup |
| eSpeak NG | Robotic | Yes | GPL-3.0, free | Intelligible close up, poor across a hall |

Why Piper over a cloud voice: the quality difference across a hall speaker
is small, Piper needs no account or key, and the recordings it makes belong
to the association outright (subject to the voice's licence, which the
script checks). Kokoro is the next thing to try if a voice with more warmth
is wanted; `scripts/render-voice.mjs` is the only file that would change.

Windows 11's newer "natural" voices are not offered to other programs, only
to Narrator, so they cannot be used here.

## Making the recordings

```
npm run voice:render                                    # en_GB-cori-high
npm run voice:render -- --voice en_GB-alan-medium       # another voice
```

It downloads Piper (about 22 MB, from github.com/rhasspy/piper) and the voice
(60–110 MB, from huggingface.co/rhasspy/piper-voices) into `.voice-tools/`,
which git ignores; reads the voice's model card and stops if the licence is
not one it recognises as allowing the recordings to be shipped; and writes
one `.wav` per phrase, plus a `voice.json` saying what it is and under what
licence, into `assets/voices/<voice>/`. Listen to every one before
committing them.

Piper's engine is only used on the machine making the recordings. It is not
inside ASSN Ballot, so its licence does not travel with it.

## What officers control

All in the officer controls, behind the terminal's key, so a voter cannot
change any of it:

- announcements on or off, the hall speaker, and the volume;
- the voice, and the fallback voice;
- **Test the speaker**, and **Repeat the last announcement**;
- the confirmation that Windows' default output is the voter's headphones.

The bar at the bottom shows, all day, whether announcements are on and the
hall speaker is connected. The officer controls add when the last
announcement played, whether it failed, and whether the fallback voice had
to step in.

## Privacy review

**The hall speaker.** It plays one of the 21 phrases or nothing.
`announce()` takes a key, not text, and refuses anything not on the list
(tested in `test/voice.test.mjs`). There is no path by which a candidate's
name, a choice or a voter's name can reach it. A refusal to vote is
announced in general terms: unpaid dues are *"Please contact the election
officer for assistance"*, because the hall can see who is standing there.

**The voter's headphones.** Candidates, choices and the ballot read back are
spoken only to Windows' default output. A browser's speech cannot be sent
anywhere else, so that speech stays off until an officer confirms the
default is the voter's headphones, and goes off by itself if the hall
speaker turns out to be that default or is unplugged. The voter's own screen
reader is theirs and separate; ASSN Ballot neither drives nor silences it.

**Logs.** The terminal logs failures to read its own settings or prepare its
fallback voice, and a refused announcement key. It never logs an index
number, a name or a choice.

**On the disk.** `announcements.json` holds the speaker settings. The voice
cache holds the 21 phrases. The offline queue holds a voting slip and a list
of choices — no name — and only until the line returns.

**Notifications.** None is sent when somebody votes. A member's own
dashboard tells them when their vote was recorded, and says that which way
they voted is recorded nowhere.

**Dashboards.** The commission sees how many have voted and how many papers
each terminal has sent. It does not see who voted where on any public page.

**The database.** The roll of who voted and the box of papers are kept
apart, and a paper's time is rounded to the hour. One leak was found and
closed in this review: papers and their marks had ids beginning with the
millisecond they were written, the same millisecond as the voter's row on
the roll, so the two could be paired exactly. New papers now get random ids
(no database change was needed). Two things remain, for the association to
decide:

1. Papers recorded before this change still carry those ids. Replacing them
   means rewriting election records, so it has not been done without the
   association's say-so.
2. A terminal that takes a single vote in an hour has, in effect, a paper
   that can be matched to the roll by station and hour. Coarser hours, or
   recording the station on only one side, would close it at the cost of
   turnout detail.
