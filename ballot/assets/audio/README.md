# The association's own recordings

Optional. ASSN Ballot already has a voice for every hall announcement — see
`../voices/` and `../../VOICE.md`. This folder is for the association to put
**a person** reading them instead, if it wants one.

If any recordings are here, **"The association's own recordings"** appears
as a voice in the officer controls. A phrase without a recording is said by
the fallback voice, so a partial set still works.

## How to record them

A quiet room, a steady pace, about half a second of silence at each end,
one voice for all of them. Save each as `.wav` or `.mp3`, named exactly as
below. Say the words as written: a voter who has heard "Access denied" at
three terminals should hear the same sentence each time.

The sentences themselves live in `src/renderer/voice-policy.js`
(`PUBLIC_ANNOUNCEMENTS`) — that file is the one list of everything the hall
can ever hear. If it changes, these change with it.

| File | Say |
| --- | --- |
| `welcome` | Welcome to ASSN Ballot. Please enter your index number to begin. |
| `complete_verification` | Please complete member verification. |
| `member_verified` | Member verification successful. |
| `eligible` | You are eligible to vote. |
| `voter_denied` | Access denied. This index number is not on the register. |
| `already_voted` | Access denied. Your vote has already been cast. |
| `contact_officer` | Access denied. Please contact the election officer for assistance. |
| `assistance` | Please contact the election officer for assistance. |
| `vote_confirmed` | Your vote has been recorded successfully. Thank you for voting. |
| `election_closed` | Voting is currently closed. |
| `election_postponed` | Notice: the election has been postponed by the Electoral Commission. |
| `election_ended` | Voting has officially ended. Thank you for your participation. |
| `time_2hours` | Attention: two hours remaining until voting closes. |
| `time_1hour` | Attention: one hour remaining until voting closes. |
| `time_40min` | Attention: forty minutes remaining until voting closes. |
| `time_30min` | Attention: thirty minutes remaining until voting closes. |
| `time_20min` | Attention: twenty minutes remaining until voting closes. |
| `time_10min` | Attention: ten minutes remaining until voting closes. |
| `time_5min` | Attention: five minutes remaining until voting closes. |
| `time_2min` | Attention: two minutes remaining until voting closes. Please complete your ballot. |
| `test` | This is a test of the ASSN Ballot announcement speaker. |

## What is never recorded, or announced

Candidates' names, the posts they stand for, what a voter has chosen, and
who is voting. None of it is in the list above, and the hall speaker cannot
play anything that isn't. The voter hears those privately, in headphones.
