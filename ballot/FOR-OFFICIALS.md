# Setting up a polling terminal

What to do on the workstation you are running the vote from. It takes
about two minutes and needs nothing installed beforehand.

## 1. Install it

Run **ASSN-Ballot-Setup-1.2.0.exe** and follow the wizard.

Windows will probably say *"Windows protected your PC"*. That is because
the installer is not signed with a paid certificate, not because anything
is wrong with it. Click **More info**, then **Run anyway**.

There is also **ASSN-Ballot-Portable-1.2.0.exe**, which is the whole
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

## 3. During voting

- A voter types their index number and presses **Begin**.
- The terminal says out loud whether they may vote, and why not if they
  may not. Let it finish speaking before you say anything over it.
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

## 4. Closing

The terminal announces the time left at two hours, one hour, forty, thirty,
twenty, ten, five and two minutes. At closing time it says so, sends
anything still waiting, and locks itself.

## 5. Running more than one terminal

The **Officer** button at the bottom right — or **Ctrl+Shift+Q** — opens
the officer's controls. Both need this terminal's key, so a voter cannot
get out of the ballot and into the desktop.

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
