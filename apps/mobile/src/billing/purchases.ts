/**
 * Ruckus Pro billing through RevenueCat. The entitlement here controls what
 * the app shows. The server enforces the Den limit from `profiles.is_pro`,
 * which the proxy's webhook sets, so `identify()` must log in with the
 * Supabase user id. With no EXPO_PUBLIC_REVENUECAT_KEY every function is a no-op.
 */
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

const KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? '';

export const PRO_ENTITLEMENT = 'ruckus_pro';
export const BILLING_ON = KEY.length > 0;

/** Required lazily so a build with no key never touches the native module. */
const rc = () => (require('react-native-purchases') as typeof import('react-native-purchases'));
const ui = () => (require('react-native-purchases-ui') as typeof import('react-native-purchases-ui'));

let configured = false;

/** Safe to call more than once. App.tsx calls it before the first render. */
export function configureBilling() {
  if (!BILLING_ON || configured) return;
  const { default: Purchases, LOG_LEVEL } = rc();
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: KEY });
  configured = true;
}

export const isPro = (info: CustomerInfo) => info.entitlements.active[PRO_ENTITLEMENT] !== undefined;

/**
 * Links purchases to the signed-in user, or logs out of RevenueCat when
 * `userId` is null. Resolves to whether the user is Pro. Never throws, so a
 * billing failure cannot block sign-in.
 */
export async function identify(userId: string | null): Promise<boolean> {
  if (!BILLING_ON) return false;
  try {
    configureBilling();
    const { default: Purchases } = rc();
    if (!userId) {
      // logOut() throws for an anonymous user.
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

/**
 * Calls `cb` when the entitlement changes, including renewals, expiries and
 * purchases on another device. Returns an unsubscribe function.
 */
export function onProChange(cb: (pro: boolean) => void): () => void {
  if (!BILLING_ON) return () => {};
  configureBilling();
  const { default: Purchases } = rc();
  const listener = (info: CustomerInfo) => cb(isPro(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
}

/** Shows the RevenueCat paywall for the current offering. Resolves true if the user purchased or restored. */
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
 * For a gated action such as the Den limit. Shows the paywall only if the
 * user is not Pro. Resolves true when the user is Pro afterwards, so the
 * caller can retry the action.
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

/** Shows the RevenueCat Customer Center, where a Pro user can cancel, restore, refund or change plan. */
export async function showCustomerCenter(): Promise<void> {
  if (!BILLING_ON) return;
  try {
    configureBilling();
    await ui().default.presentCustomerCenter();
  } catch (err) {
    console.warn('[billing] customer center', message(err));
  }
}

/* The functions below are for a screen that draws its own prices. */
/* The RevenueCat paywall does not need them.                       */

export interface ProPackages {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
}

/** The three packages from the current offering. A package that is not configured is null. */
export async function getPackages(): Promise<ProPackages> {
  const none = { monthly: null, yearly: null, lifetime: null };
  if (!BILLING_ON) return none;
  configureBilling();
  const current = (await rc().default.getOfferings()).current;
  if (!current) return none;
  return { monthly: current.monthly, yearly: current.annual, lifetime: current.lifetime };
}

/**
 * Resolves true if the user is now Pro and false if they cancelled. Any
 * other failure throws an Error whose message can be shown to the user.
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

/** Resolves true if a previous purchase was found. */
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
