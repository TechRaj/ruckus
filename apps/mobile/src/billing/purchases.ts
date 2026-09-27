/**
 * Ruckus Pro — the only file in the app that knows RevenueCat exists.
 *
 * Two sources of truth, on purpose. The entitlement here is instant and
 * decides what the app *shows* (the Pro row, ads). `profiles.is_pro` is set
 * by the proxy's webhook a few seconds later and decides what the database
 * *allows* (the Den limit). `identify()` is what joins them: without
 * Purchases.logIn(supabaseUserId) the webhook gets an anonymous id and Pro
 * never unlocks server-side.
 *
 * With no EXPO_PUBLIC_REVENUECAT_KEY everything here is inert — nobody is
 * Pro and the paywall doesn't open — so the keyless mock path still runs.
 * In Expo Go the SDK swaps itself for a preview mock; real purchases need
 * the dev build (`npm run ios`).
 *
 * Products live in the RevenueCat dashboard, not here: one offering with
 * the three default packages (monthly, yearly, lifetime), all attached to
 * the `ruckus_pro` entitlement. The paywall is drawn from that offering.
 */
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

const KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? '';

export const PRO_ENTITLEMENT = 'ruckus_pro';
export const BILLING_ON = KEY.length > 0;

/** Required lazily so a build with no key never touches the native module. */
const rc = () => (require('react-native-purchases') as typeof import('react-native-purchases'));
const ui = () => (require('react-native-purchases-ui') as typeof import('react-native-purchases-ui'));

let configured = false;

/** Safe to call more than once; App.tsx calls it before the first render. */
export function configureBilling() {
  if (!BILLING_ON || configured) return;
  const { default: Purchases, LOG_LEVEL } = rc();
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: KEY });
  configured = true;
}

export const isPro = (info: CustomerInfo) => info.entitlements.active[PRO_ENTITLEMENT] !== undefined;

/**
 * Tie purchases to the signed-in user, or back to anonymous on sign-out.
 * Resolves to whether they're Pro. Never throws: billing being down must
 * not keep anyone out of the app.
 */
export async function identify(userId: string | null): Promise<boolean> {
  if (!BILLING_ON) return false;
  try {
    configureBilling();
    const { default: Purchases } = rc();
    if (!userId) {
      // logOut() throws on an anonymous user
      if (!(await Purchases.isAnonymous())) await Purchases.logOut();
      return false;
    }
    const { customerInfo } = await Purchases.logIn(userId);
    return isPro(customerInfo);
  } catch (err) {
    console.warn('[billing] identify', message(err));
    return false;
  }
}

/** Renewals, expiries and purchases on another device arrive here. Returns unsubscribe. */
export function onProChange(cb: (pro: boolean) => void): () => void {
  if (!BILLING_ON) return () => {};
  configureBilling();
  const { default: Purchases } = rc();
  const listener = (info: CustomerInfo) => cb(isPro(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
}

/** The RevenueCat paywall for the current offering. True when they came out Pro. */
export async function showPaywall(): Promise<boolean> {
  if (!BILLING_ON) return false;
  try {
    configureBilling();
    const { default: RevenueCatUI, PAYWALL_RESULT } = ui();
    const result = await RevenueCatUI.presentPaywall();
    return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
  } catch (err) {
    console.warn('[billing] paywall', message(err));
    return false;
  }
}

/**
 * For a gate — the Den limit. Shows nothing if they're already Pro and
 * resolves true either way, so the caller can just retry what was refused.
 */
export async function showPaywallIfNeeded(): Promise<boolean> {
  if (!BILLING_ON) return false;
  try {
    configureBilling();
    const { default: RevenueCatUI, PAYWALL_RESULT } = ui();
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT,
    });
    return result === PAYWALL_RESULT.NOT_PRESENTED
      || result === PAYWALL_RESULT.PURCHASED
      || result === PAYWALL_RESULT.RESTORED;
  } catch (err) {
    console.warn('[billing] paywall', message(err));
    return false;
  }
}

/** Customer Center: cancel, restore, refund, change plan. For people who are already Pro. */
export async function showCustomerCenter(): Promise<void> {
  if (!BILLING_ON) return;
  try {
    configureBilling();
    await ui().default.presentCustomerCenter();
  } catch (err) {
    console.warn('[billing] customer center', message(err));
  }
}

/* ------------------------------------------------ without the paywall -- */
/* The RevenueCat paywall does all of this itself. These are for a screen  */
/* that draws its own prices.                                              */

export interface ProPackages {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
}

/** The three products from the current offering; null where one isn't configured. */
export async function getPackages(): Promise<ProPackages> {
  const none = { monthly: null, yearly: null, lifetime: null };
  if (!BILLING_ON) return none;
  configureBilling();
  const current = (await rc().default.getOfferings()).current;
  if (!current) return none;
  return { monthly: current.monthly, yearly: current.annual, lifetime: current.lifetime };
}

/**
 * True when they're now Pro, false when they backed out of the sheet.
 * Anything else throws an Error with a line that's safe to show.
 */
export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  configureBilling();
  const { default: Purchases, PURCHASES_ERROR_CODE } = rc();
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return isPro(customerInfo);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
    if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) return restore();
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      throw new Error('That payment is waiting on approval. Pro unlocks when it clears.');
    }
    if (code === PURCHASES_ERROR_CODE.NETWORK_ERROR || code === PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR) {
      throw new Error("Couldn't reach the store. Check your connection and try again.");
    }
    if (code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
      throw new Error("Purchases aren't allowed on this device.");
    }
    console.warn('[billing] purchase', message(err));
    throw new Error("That didn't go through. You haven't been charged.");
  }
}

/** True when a previous purchase was found. */
export async function restore(): Promise<boolean> {
  if (!BILLING_ON) return false;
  configureBilling();
  try {
    return isPro(await rc().default.restorePurchases());
  } catch (err) {
    console.warn('[billing] restore', message(err));
    throw new Error("Couldn't restore purchases. Try again in a moment.");
  }
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
