import { Redirect, router } from 'expo-router';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { DjazziSignInView } from '@/components/djazzi-sign-in-view';
import { useSpacesAccount } from '@/lib/spaces/account';
import { connectInstance, sendCode, signInWithPassword, SignInError, verifyCode, type SignInProblem } from '@/lib/djazzi-sign-in';
import { useConnection } from '@/lib/connection';
import { useColors } from '@/theme/colors';

// DJAZZI: the account's sign-in, its own screen since the 2026-11-23 sync.
// It lived on the Spaces tab's first screen until then (07/10/2026); the
// upstream made Spaces a section with its own tabs (spaces-home.tsx), so the
// one way into Djazzi now stands apart from it. The email, then the code it
// receives, or the password; the browser stays for Google and Apple. Signing
// in also links the person's cloud instance, then opens the home.
export default function SignInScreen() {
  const account = useSpacesAccount();
  const { pairing } = useConnection();
  const colors = useColors();
  if (account.status === 'loading' || pairing === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }
  // Signed in: the home, which says so if the instance is not linked yet.
  if (account.status === 'signedIn') return <Redirect href="/home" />;
  return <SignIn />;
}

function SignIn() {
  const account = useSpacesAccount();
  const { pair } = useConnection();
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Djazzi (07/10/2026): signing in happens here, with no web page: the
  // email, then the code it receives. The browser stays for Google and Apple.
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const say = (err: unknown) => setError(err instanceof SignInError ? problemText(err.reason) : err instanceof Error ? err.message : String(err));

  const askCode = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your email address.');
      return;
    }
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
      setCode('');
      setStep('code');
    } catch (err) {
      say(err);
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (typed = code) => {
    if (busy || !/^\d{6}$/.test(typed.trim())) return;
    setBusy(true);
    setError(null);
    try {
      await finish(await verifyCode(email, typed));
    } catch (err) {
      say(err);
      if (err instanceof SignInError && err.reason === 'bad_code') setCode('');
    } finally {
      setBusy(false);
    }
  };

  // The same end for a code and a password: the account, then the instance.
  const finish = async (session: string) => {
    await account.signInWithSession(session);
    // The same cloud instance as the person's Mac: their chats, here.
    try {
      const server = await connectInstance(session, Device.deviceName ?? (Platform.OS === 'web' ? 'Navigateur' : 'iPhone'));
      await pair({ url: server.url, token: server.key, name: 'Djazzi' });
      if (process.env.EXPO_OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/home');
    } catch (err) {
      // Signed in to Spaces all the same; the chats wait for the instance.
      // DJAZZI(09/11/2026): the home says why and offers to link again (the
      // sign-in screen gave way to Spaces at once, and the reason was lost).
      say(err);
      router.replace('/home');
    }
  };

  const passwordSignIn = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter your email address.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setBusy(true);
    setError(null);
    try {
      await finish(await signInWithPassword(email, password));
    } catch (err) {
      say(err);
    } finally {
      setBusy(false);
    }
  };

  const go = async () => {
    if (busy) return;
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    setBusy(true);
    setError(null);
    try {
      await account.signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DjazziSignInView
      step={step} email={email} code={code} busy={busy} error={error}
      onEmail={value => { setEmail(value); setError(null); }}
      onCode={value => { setCode(value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
      onSend={() => void askCode()} onConfirm={() => void checkCode()}
      onChange={() => { setStep('email'); setCode(''); setError(null); }}
      onOther={() => void go()} onPair={() => router.push('/pairing')}
      password={password} onPassword={value => { setPassword(value); setError(null); }} onPasswordSignIn={() => void passwordSignIn()}
    />
  );
}


/** What went wrong, for the person. */
function problemText(problem: SignInProblem): string {
  switch (problem) {
    case 'bad_password':
      return 'Wrong email or password.';
    case 'bad_code':
      return 'That code isn’t right. Check it and try again.';
    case 'expired_code':
      return 'That code has expired. Send a new one.';
    case 'too_many':
      return 'Too many tries. Wait a minute, then send a new code.';
    case 'instances_full':
      return 'Early access is full for now: your chats will open as soon as a place frees up. Spaces already work.';
    case 'too_many_devices':
      return 'Too many devices on this account. Remove one in the Mac app’s settings, then sign in again.';
    case 'no_instance':
      return 'Your assistant can’t be reached right now. Spaces work; try again in a moment for your chats.';
    case 'network':
      return 'No connection. Check your internet and try again.';
    default:
      return 'Sign-in didn’t work. Try again.';
  }
}

