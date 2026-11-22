# Setting up a polling terminal

What to do on the workstation you are running the vote from. It takes
about two minutes and needs nothing installed beforehand.

## 1. Install it

Run **ASSN-Ballot-Setup-1.3.0.exe** and follow the wizard.

Windows will probably say *"Windows protected your PC"*. That is because
the installer is not signed with a paid certificate, not because anything
is wrong with it. Click **More info**, then **Run anyway**.

There is also **ASSN-Ballot-Portable-1.3.0.exe**, which is the whole
application in one file. Double-click it and it runs — nothing is
installed. Use it on a machine you are not allowed to install software on.

## 2. Start it

Open **ASSN Ballot** from the desktop or the Start menu. It fills the
screen. You will be asked for three things:

| | |
| --- | --- |
| **Portal address** | `https://www.assnuew.com` |
| **Station ID** | The code the Electoral Commission gave you for *this* workstation, e.g. `LIB-1` |
| **Officer key** | The key that came with that code |

Every workstation has its own code and its own key. Do not use one
machine's key on another — the commission can see which terminal each
ballot came from, and two machines sharing a code makes that meaningless.

Type them in and press **Connect this terminal**. That is the last time
anyone has to type anything: the terminal follows the commission from then
on — opening time, extra time, a postponement, the candidates themselves.

## 3. The speaker and the headphones — before the doors open

A terminal can speak in two places, and they must never be the same one.

| | What it says | Where it goes |
| --- | --- | --- |
| **The hall speaker** | General status only: "Member verification successful", "You are eligible to vote", "Voting is currently closed", the countdown | The external speaker you choose |
| **The voter's headphones** | The candidates' names, what the voter has chosen, their ballot read back | Windows' default sound output |

The hall never hears a candidate's name, a choice, or who is voting. That is
built in — the hall speaker can only play a fixed list of sentences — but it
depends on the cables being the right way round, so:

1. **Plug the voter's headphones in and make them Windows' default
   output.** Click the speaker icon by the clock, then the arrow, and pick
   the headphones. A screen reader the voter uses speaks there too.
2. **Plug the hall speaker in.**
3. Open the **Officer** controls (bottom right, or **Ctrl+Shift+Q**), enter
   this terminal's key, and under **Announcement speaker**:
   - choose the hall speaker under **Hall speaker** (press **Look again**
     if you plugged it in after opening the controls);
   - set the **Volume**;
   - tick **Windows' default sound output on this terminal is the voter's
     headphones** — only once you have checked;
   - press **Test the speaker**. The hall should hear *"This is a test of
     the ASSN Ballot announcement speaker"*, and the headphones nothing.

Until that box is ticked, the terminal does **not** read the ballot to the
voter at all — it would rather say nothing than risk saying somebody's vote
to the room. The ballot is still on screen for a screen reader. And if the
terminal notices that the hall speaker *is* the default output, it switches
the voter's speech off by itself, whatever was ticked, and says why.

The bar along the bottom always shows the speaker's state. **"Hall speaker
not connected"** means it has been unplugged: announcements stop, and so
does the voter's speech, until it is back or another is chosen.

**Repeat the last announcement** plays the last status message again — for
when a hall was too loud to hear it.

## 4. During voting

- A voter types their index number and presses **Begin**.
- The hall speaker says whether they may vote — never why not, if the
  reason is personal: unpaid dues, for example, are announced only as
  *"Please contact the election officer for assistance"*, and the reason is
  on the screen for you. Let it finish speaking before you say anything
  over it.
- **You then check the screen against the person standing there.** Their
  photograph, name, index number, programme, level and campus come up. If
  it is not them, press **Not this person** — nothing is cast and the
  terminal goes back to the keypad. If it is, press **Yes — open the
  ballot**. This is the only point in the day where somebody voting on
  another member's index number can be caught.
- They choose one candidate per post, or skip a post, and read their
  ballot back before confirming.
- After they confirm, the terminal resets itself for the next person.

Where a member has no photograph on file the screen says so plainly. Check
the name and index number against their student ID instead — an absent
photograph is not a reason to turn somebody away.

**If the internet drops**, the banner at the top says so and the terminal
keeps taking votes — they are held on the machine and sent the moment the
line returns. Nobody loses their vote. What it *cannot* do while offline is
check a new voter in, because only the portal knows who has already voted;
it will say so plainly. Wait for the line and try again.

## 5. Closing

The terminal announces the time left at two hours, one hour, forty, thirty,
twenty, ten, five and two minutes. At closing time it says so, sends
anything still waiting, and locks itself.

## 6. Running more than one terminal

The **Officer** button at the bottom right — or **Ctrl+Shift+Q** — opens
the officer's controls. They need this terminal's key, so a voter cannot
get out of the ballot and into the desktop, or change what the hall hears.

- **Change station** hands the machine back to the setup screen, ready for
  a different station ID and key. Use this when one machine has to take
  over another centre's slot. It refuses while votes are still waiting to
  be sent, so nothing is lost in the move.
- **Close ASSN Ballot** sends anything queued and shuts the terminal down.

## If something is wrong

- **"This terminal is not registered"** — the code or the key was mistyped,
  or the commission has suspended this terminal. Check both with them.
- **"Voting is currently closed"** — the commission has not opened it yet,
  or it is over. The screen says which.
- **A voter is sure their dues are paid** — send them to the association
  office. The terminal only reports what the portal holds; it cannot
  overrule it, and neither can you.
