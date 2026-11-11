# Bookmark Reference

Tripwire can import signatures and wormhole connections from bookmarks copied out of EVE. Open the **system the bookmarks belong to** in Tripwire, then paste with **Ctrl+V / Cmd+V** or the clipboard button. Multiple bookmark rows can be pasted together.

Bookmark codes, signature letters, destination matching, and recognized site names are **case-insensitive**. Folder and timestamp columns are ignored. Only the bookmark title is used.

## Choose your bookmark conventions

Open **Settings → Signatures → Bookmark imports**. Rules are saved to your
Tripwire account; they do not change another user's import settings. Signatures
and connections you import are still shared with your active map.

Bookmark imports start **on with standard codes only**. Normal scanner-result
pasting continues to work. To change conventions, choose a preset, review the
rules, and click **Save**. You can also turn bookmark imports off entirely:

- **Standard codes** enables bookmark imports with the destination/site codes
  below, recognized site names, J-number suffixes, and life/mass markers. It has
  no custom faction aliases, camp markers, or ignored home markers.
- **Training conventions** restores the conventions used in this reference,
  including SQUID/RUST/FRANCE/CHINA, `---`/`-*-`, and `*`.

**The examples below use Training conventions.** You can customize either preset
under **Edit bookmark rules**. Selecting a preset fills the form; Cancel leaves
your saved settings unchanged.

| Setting | How to customize it |
|---|---|
| Bookmark codes | One `YOUR-CODE=TYPE` per line. For example, `GAS=GS` or `HIGH=HS`. Remove a line to stop recognizing that code. |
| Faction aliases | One `ALIAS=FACTION` per line. Factions are CALDARI, MINMATAR, GALLENTE, AMARR. For example, `CAL=CALDARI`. Leave empty for none. |
| Life and mass markers | One `MARKER=STATE` per line. States are LIFE4, LIFE1, MASS50, MASS10. For example, `EOL=LIFE4` or `CRIT=MASS10`. Markers go after the signature ID, separated by spaces, in either order. |
| Camp markers | Comma-separated markers for site bookmarks. Leave empty to disable them. |
| Ignored wormhole markers | Comma-separated markers to remove from destination text. Leave empty to disable them. |
| Extra site names | One `EXACT SITE NAME=CATEGORY` per line. Categories are Combat, Data, Relic, Gas, Ore, Other. These rules take priority over standard name recognition. |

You can also turn off unprefixed bookmarks, standard site-name recognition,
three-digit J-number suffixes, or automatic matching of existing wormhole
connections. Choose **Other** or **Unknown** for unrecognized site names.

Blank rule lists stay blank. Matching remains case-insensitive. Unsupported
values and duplicate aliases are reported when you Save; the dialog stays open
so you can correct them. Changing settings affects future pastes, not previously
imported connections. The auto-mapper retains the meaning of saved faction and
J-number hints even when users have different aliases.

## Quick examples

| Bookmark title | Meaning |
|---|---|
| `HS NHF FRANCE` | Signature NHF leads to highsec in Gallente space. |
| `HS RVH RUST FREDAGOD` | Signature RVH leads to highsec; Minmatar and Fredagod identify the destination. |
| `C3 SHX 658` | Signature SHX leads to a C3 whose J-number ends in 658. |
| `C3 ??? 658 *` | Local signature ID unknown; destination is a C3 ending in 658. Ignore the home marker. |
| `DR GCG ???` | Signature GCG leads to Drifter space; exact destination unknown. |
| `C2 HGX ??? <4H <10%` | Signature HGX leads to a C2, with under four hours and under 10% mass remaining. |
| `GS KSY ---` | Camp bookmark for gas signature KSY; the marker is not the site name. |
| `Z KSY-988 Sizeable Perimeter Reservoir` | Signature KSY-988 is the named gas site. |
| `Z LGD-429 Unsecured Perimeter Transponder Farm` | Signature LGD-429 is the named data site. |
| `ZYP-952 Rampant Drone Fabricator` | Signature ZYP-952 is the named combat site. |

A normal EVE clipboard row works without removing its extra columns:

```text
C2 HGX ??? <4H <10%	MC Deputy Training / Wormholes	2026.11.10 21:44
HS NHF FRANCE	MC Deputy Training / Wormholes	2026.11.10 21:42
```

## Wormhole bookmark format

```text
DESTINATION-TYPE SIGNATURE DESTINATION [LIFE] [MASS] [*]
```

The first code describes the **destination system**, not the system you are currently viewing and not a wormhole identifier such as K162.

### Destination codes

| Code | Destination |
|---|---|
| `HS` | Highsec |
| `LS` | Lowsec |
| `NS` | Nullsec |
| `C1`–`C6` | The corresponding wormhole class |
| `C13` | Class 13 |
| `C14`–`C18` | The corresponding numbered Drifter class |
| `C?` | Wormhole space, class unspecified |
| `DR` | Drifter space, specific Drifter class unspecified |
| `TR` or `PC` | Pochven / Triglavian space |

### Signature IDs

Use the first three letters, such as `HGX`, or a full ID such as `HGX-123`. A full ID without the hyphen, `HGX123`, also works after a bookmark code.

- A three-letter prefix updates the matching signature in the current system.
- If the prefix matches multiple full signature IDs, that abbreviated row is skipped. Use the full ID to distinguish them.
- If no full ID is known, Tripwire can retain the prefix until a later scan supplies a unique full ID. If a scan supplies multiple full IDs sharing that prefix, those full IDs are imported separately and the abbreviated row remains unresolved.
- `???` in the signature position means the local ID is unknown. Tripwire uses destination information to match the connection and preserves an existing known ID when matched.

### Destinations and faction hints

Use an exact system name, a partial system or region name, a J-number suffix, or `???` for an unknown destination.

A three-digit number is the **last three digits of the destination's J-number**, not a map nickname. Tripwire combines it with the destination class. For example, `C3 SHX 658` searches for a C3 ending in 658; it does not assume that suffix identifies a unique system.

| Hint | Space |
|---|---|
| `SQUID` | Caldari |
| `RUST` | Minmatar |
| `FRANCE` | Gallente |
| `CHINA` | Amarr |

Faction hints can appear before or after system/region fragments:

```text
HS RVH RUST FREDAGOD
HS WLH UNEL FRANCE
HS ESM SQUID
```

Tripwire resolves a destination when the supplied information identifies one system. Otherwise, it retains the destination type and hints. The auto-mappers use faction and J-number suffix hints to narrow possible connections during jumps.

Hints are separate from system display names. `SQUID`, for example, is a Caldari hint and should not replace the mapped system's name.

### Remaining life and mass

| Marker | Meaning | Tripwire display/state |
|---|---|---|
| `<4H` | Under four hours remaining | `<4h` |
| `<1H` | Under one hour remaining | Expiring |
| `<50%` | Under 50% mass remaining | Reduced mass / `<50%` |
| `<10%` | Under 10% mass remaining | Critical mass / `<10%` |

Markers go after the signature ID and can appear before or after the destination text. They are removed from the destination hints.

```text
C2 HGX ??? <4H <10%
HS NHF <1h FRANCE <50%
```

Life markers set a countdown from import time; the bookmark's timestamp column is not used to calculate expiry. They represent an upper limit, not a guaranteed collapse time. Re-pasting does not extend an existing shorter critical-life countdown or loosen a stricter mass state. If both limits are present, the tighter one wins. Omitting markers preserves an existing connection's state.

### Home marker

`*` is ignored in wormhole bookmark destination text. It does not change Tripwire's home system or create a custom system name.

Destination matching also tolerates a standalone `*` with Standard codes, so a home marker does not prevent reuse of an existing mapped connection. The destination class and J-number suffix must still match.

```text
C3 ??? 658 *
```

## Site bookmark formats

Use an explicit site code:

```text
GS KSY Sizeable Perimeter Reservoir
DC LGD Unsecured Perimeter Transponder Farm
RC ABC Forgotten Perimeter Gateway
```

| Code | Category |
|---|---|
| `GS` | Gas |
| `DC` | Data |
| `RC` | Relic |
| `Z` | Determine the category from the site name |

With `Z`, supply the signature and site name:

```text
Z LGD-429 Unsecured Perimeter Transponder Farm
```

A full hyphenated signature ID followed by a name also works without `Z`:

```text
LGD-429 Unsecured Perimeter Transponder Farm
```

### Camp bookmarks

Both markers refer to **the camp for that signature**, with different meanings:

| Marker after `GS`, `DC`, or `RC` and the signature | Meaning |
|---|---|
| `---` | Camp for this signature. |
| `-*-` | Camp for this signature, with boxes missing or gas clouds consumed. |

```text
GS KSY ---
RC ABC -*-
DC LGD ---
```

Tripwire associates these with the same signature as the site bookmark. The
marker does not become a site name, create a separate camp signature, or replace
an existing site name. You can paste a camp bookmark and a named site bookmark
together in either order; they combine into one signature. Currently, Tripwire
imports both markers the same way; it does not display a separate depleted-site
status or delete a signature because its bookmark contains `-*-`.

### Automatic site classification

These rules apply to `Z` bookmarks and unprefixed `ABC-123 Site name` bookmarks. Matching ignores case and repeated spaces; Tripwire retains the supplied site name.

| Site-name pattern | Category |
|---|---|
| Starts with `Unsecured` | Data |
| Starts with `Forgotten` | Relic |
| `Local`, `Regional`, or `Central`, followed by a recognized pirate faction and a site name | Data |
| `Crumbling`, `Decayed`, or `Ruined`, followed by a recognized pirate faction and a site name | Relic |
| `Limited Sleeper Cache`, `Standard Sleeper Cache`, `Superior Sleeper Cache` | Data |
| Exact gas, combat, or ore names listed below | Corresponding category |
| Unrecognized name | Other, unless the signature already has a known classification |

Recognized pirate faction names in these patterns are **Angel, Blood, Guristas, Sansha, and Serpentis**. A title such as `Local staging` is not classified as Data merely because it starts with `Local`.

Hover over a signature's **type/category** to see its retained site name, including sites categorized as Other.

### Exact gas-site names

| Area | Recognized names |
|---|---|
| Perimeter | Barren Perimeter Reservoir; Minor Perimeter Reservoir; Ordinary Perimeter Reservoir; Sizeable Perimeter Reservoir; Token Perimeter Reservoir |
| Frontier | Bountiful Frontier Reservoir; Vast Frontier Reservoir |
| Core | Instrumental Core Reservoir; Vital Core Reservoir |

`Sizable Perimeter Reservoir` is also accepted. Other names containing `Reservoir` do not automatically become Gas.

### Exact combat-site names

| Group | Recognized names |
|---|---|
| Additional sites | Rampant Drone Fabricator; Besieged Covert Research Facility |
| C1 anomalies | Perimeter Ambush Point; Perimeter Camp; Phase Catalyst Node; The Line |
| C2 anomalies | Perimeter Checkpoint; Perimeter Hangar; The Ruins of Enclave Cohort 27; Sleeper Data Sanctuary |
| C3 anomalies | Fortification Frontier Stronghold; Outpost Frontier Stronghold; Solar Cell; The Oruze Construct |
| C4 anomalies | Frontier Barracks; Frontier Command Post; Integrated Terminus; Sleeper Information Sanctum |
| C5 anomalies | Core Garrison; Core Stronghold; Oruze Osobnyk; Quarantine Area |
| C6 anomalies | Core Citadel; Core Bastion; Strange Energy Readings; The Mirror |

The class groupings organize this list; classification uses the exact site name. There is **no general “Covert Research Facility → Data” rule**.

### Exact ore-site names

| Area | Recognized names |
|---|---|
| Perimeter | Common Perimeter Deposit; Ordinary Perimeter Deposit |
| Frontier | Average Frontier Deposit; Unexceptional Frontier Deposit |
| Core | Exceptional Core Deposit; Infrequent Core Deposit; Isolated Core Deposit; Rarified Core Deposit; Uncommon Core Deposit; Unusual Core Deposit |

Exact-name matches do not accept extra notes appended to the name. For example, `Solar Cell staging` is not an exact match for `Solar Cell`.

## Updating existing signatures and connections

Pasting adds new information to matching signatures in the currently viewed system. Rows for the same signature are combined before import. For example, these describe one gas site:

```text
GS KSY ---
Z KSY-988 Sizeable Perimeter Reservoir
```

A bookmark can identify an existing mapped wormhole whose local signature ID is unknown. Tripwire reuses that connection when there is one compatible connection and one pasted bookmark claiming it. For example, `HS NHF ???` can assign NHF to an existing unidentified highsec connection, preserving its actual destination and wormhole details.

If several connections or bookmarks could match, Tripwire does not automatically choose between them. A known-ID bookmark may remain a separate connection for manual mapping; an unknown-ID bookmark with multiple matches is skipped. Use a fuller destination or the Map action to resolve ambiguity.

Re-pasting can also merge a previously created generic duplicate into a uniquely matching mapped connection. Known system destinations are retained when a bookmark supplies only a broad type such as HS.

## Deleting signatures missing from the paste

After pasting, the notification offers **Delete signatures missing from this scan**. This works for bookmarks as well as scanner results and is an explicit action—pasting alone does not remove unrelated signatures.

Use it when the pasted list is the list you want to keep for the currently viewed system. It can remove signatures and wormhole connections absent from that list. If you pasted only a few bookmarks, the action can remove other signatures you did not include.

- Full IDs retain their matching signatures.
- Abbreviated IDs retain all signatures sharing that prefix.
- Unknown-ID bookmarks retain compatible destination connections.
- Unidentified signature rows and stargate connections are preserved.
- The action does not run against a different system if you navigate away from the system where you pasted.
- Changes can be reversed with Tripwire's Undo action.

## If a paste does not do what you expect

| Symptom | Check |
|---|---|
| A site appears as Other | Check its spelling against the supported patterns or exact names. Use `GS`, `DC`, or `RC` when you know the category. |
| A three-letter signature does not update | More than one signature may share the prefix. Paste the full ID. |
| A destination stays generic | The name fragments or J-number suffix may be ambiguous or inconsistent with the destination class. Supply the full system name. |
| A separate wormhole connection appears | More than one bookmark or connection may match. Use the Map action or provide a more specific destination. |
| A life or mass marker is not applied | Put it after the signature ID in a wormhole bookmark. Use `<4H`, `<1H`, `<50%`, or `<10%`. A tighter existing limit is preserved. |
| New behavior is missing after an application update | Reload Tripwire, then paste again. |
