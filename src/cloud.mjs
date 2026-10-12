import { createClient } from '@supabase/supabase-js';
import { lecturePayload } from './cloud-data.mjs';

const url = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
export const cloudConfigured = Boolean(url && key);
export const supabase = cloudConfigured ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

const fail = message => { throw new Error(message); };
const check = ({ data, error }) => error ? fail(error.message) : data;

export async function currentUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  return data?.user || null;
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session?.user || null));
  return () => data.subscription.unsubscribe();
}

export async function signUp({ email, password, displayName }) {
  if (!supabase) fail('Cloud database is not configured yet.');
  return check(await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } }));
}

export async function signIn({ email, password }) {
  if (!supabase) fail('Cloud database is not configured yet.');
  return check(await supabase.auth.signInWithPassword({ email, password }));
}

export async function signOut() {
  if (!supabase) return;
  check(await supabase.auth.signOut());
}

export async function profile() {
  if (!supabase) return null;
  return check(await supabase.from('profiles').select('*').single());
}

export async function enableCloudSync(enabled = true) {
  if (!supabase) fail('Cloud database is not configured yet.');
  const user = await currentUser();
  if (!user) fail('Sign in to enable cloud sync.');
  return check(await supabase.from('profiles').update({ cloud_sync_enabled: enabled }).eq('id', user.id).select().single());
}

export async function saveLectureCloud(lecture, reminders = []) {
  if (!supabase) fail('Cloud database is not configured yet.');
  const data = check(await supabase.rpc('save_lecture_graph', { payload: lecturePayload(lecture, reminders) }));
  return data;
}

export async function listCloudHistory() {
  if (!supabase) return [];
  return check(await supabase.rpc('list_lecture_history')) || [];
}

export async function getCloudLecture(id) {
  if (!supabase) fail('Cloud database is not configured yet.');
  return check(await supabase.rpc('get_lecture_graph', { p_lecture_id: id }));
}

export async function deleteCloudLecture(id) {
  if (!supabase) fail('Cloud database is not configured yet.');
  check(await supabase.from('lectures').delete().eq('id', id));
}

export async function databaseStatus() {
  if (!supabase) return { connected: false, table_count: 12 };
  const rows = check(await supabase.rpc('database_demo_status'));
  return rows?.[0] || { connected: false, table_count: 12 };
}

