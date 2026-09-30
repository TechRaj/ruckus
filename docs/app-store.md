# App Store submission

What's built for review, what's still manual, and the answers App Store Connect
asks for. Dev account: individual, enrolled 30 Sept 2026.

## Built (step 2)

| Apple asks for | Where it is |
| --- | --- |
| In-app account deletion (5.1.1(v)) | People → Delete account. `delete_my_account()` in `20260930120000_safety_and_deletion.sql` |
| Report content and users (1.2) | "Report" on a friend's comment or note; tap a friend's head on People |
| Block users (1.2) | Same menus. Hides their comments from you, enforced by RLS. Unblock from People → Blocked |
| Agree to terms before posting (1.2) | Line under the email field on sign-in |
| Published contact info (1.2) | support.ruckus@gmail.com on `/terms`, `/privacy` and `/support` |
| Support URL (App Store Connect) | `https://<proxy>/support` |
| Privacy policy in the app (5.1.1(i)) | People → Privacy, and sign-in |
| Reviewer can sign in | `REVIEW_EMAIL` + `REVIEW_CODE` on the proxy (`POST /auth/review`) |
| iPhone only | `supportsTablet: false`, so no iPad screenshots or iPad review |

## Before submitting

1. `npm run db:push`, then `npm run e2e:db`. The migration has to be live.
2. On Railway, set `REVIEW_EMAIL` and `REVIEW_CODE`, then deploy the proxy.
   Check `/health` shows `"reviewLogin": true`, and open `/privacy`.
3. Demo account: sign in once with `REVIEW_EMAIL` from the app (a `+review`
   address on your own inbox works), then `npm run seed:demo -- <REVIEW_EMAIL>`.
   Sign out, then sign back in with `REVIEW_CODE` to prove the review path works.
4. **Reports:** check the open-reports query in `supabase/README.md` every day. The terms
   promise 24 hours.
5. RevenueCat paywall: turn on the footer links to Terms and Privacy
   (Guideline 3.1.2 wants both, plus price and period, on the paywall).

## App Privacy answers (App Store Connect → App Privacy)

Tracking: **No**. Nothing is used to track people across other companies' apps or sites.

| Data type | Collected | Linked to user | Purpose |
| --- | --- | --- | --- |
| Contact Info → Email Address | Yes | Yes | App Functionality |
| User Content → Other User Content (notes, comments, Den names) | Yes | Yes | App Functionality |
| Identifiers → User ID | Yes | Yes | App Functionality |
| Purchases → Purchase History | Yes | Yes | App Functionality |
| Usage Data → Product Interaction (which suggestion was picked) | Yes | Yes | Analytics, App Functionality |
| Location | **No**: sent to sort by distance, not stored | | |
| Diagnostics, Browsing History, Contacts, and everything else | No | | |

Apple counts data as collected only if it is kept longer than it takes to answer the
request. Location and captions aren't kept, which is why they are "No". If that ever
changes, these answers must change too.

## Review notes (paste into App Review Information → Notes)

> Ruckus is a places app for small, invite-only friend groups ("Dens"). People
> save restaurants, bars and trails to a shared map by pasting an address,
> searching by name, or sharing a link from any app. When a link is shared,
> the app reads only the public link-preview metadata any messaging app shows,
> without logging in to any third-party service. The user confirms the place,
> and only a map place ID and the link are stored. No media is downloaded.
>
> Sign in: enter the demo email below, tap Send a code, then enter the code
> below. The account is already in a Den with saved places.
>
> Moderation: tap Report on any comment, or tap a person on the People tab,
> to report or block them. Delete account is on the People tab.

Demo account: `REVIEW_EMAIL` / `REVIEW_CODE` from Railway. Enter them in the
sign-in fields in App Store Connect, not in the notes.

## Still open

- **Record who accepted which terms.** Not needed for review: the sign-in line
  covers 1.2. Needed before the terms first change, because a signed-in user
  never sees sign-in again. Plan: `terms_version` + `terms_accepted_at` on
  `profiles`, set at sign-in; a `TERMS_VERSION` constant in the app; an
  "Updated terms, Agree" sheet when the stored version is older.

- **A content filter.** Guideline 1.2 also asks for a way to filter objectionable
  material. Dens are invite-only, so report + block + terms usually pass. If
  review asks for a filter, add a word list check in `set_take` and `create_den`.
- **Listing:** name, subtitle, keywords and screenshots. Keep "Instagram" out of all of them.
