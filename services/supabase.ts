import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseMock } from "./supabaseMock";

const getEnv = (key: string): string => {
  const v =
    (typeof import.meta !== "undefined" ? (import.meta as any).env?.[key] : "") ||
    (typeof window !== "undefined" ? (window as any)?.process?.env?.[key] : "");
  return (v ?? "").toString().trim();
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY");

const isValidConfig =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  supabaseUrl !== "YOUR_SUPABASE_URL" &&
  supabaseUrl !== "undefined";

let client: SupabaseClient | null = null;
if (isValidConfig) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (e) {
    console.error("Errore critico inizializzazione Supabase:", e);
  }
}

export const useMock = !client;

const authListeners: Set<(event: string, session: any) => void> = new Set();

const mockAuth = {
  getSession: async () => ({
    data: { session: supabaseMock.auth.getUser() ? { user: supabaseMock.auth.getUser() } : null },
    error: null,
  }),
  onAuthStateChange: (cb: any) => {
    authListeners.add(cb);
    const user = supabaseMock.auth.getUser();
    if (user) cb("SIGNED_IN", { user, session: { user } });
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
  },
  signInWithPassword: async ({ email }: any) => {
    const role =
      email === "serop.serop@outlook.com"
        ? "admin"
        : email === "sirop.sirop@outlook.sa"
        ? "collaborator"
        : "client";
    const user = {
      id: "mock-user-" + Date.now(),
      email,
      fullName: role === "admin" ? "Direzione Kristal" : role === "collaborator" ? "Maurizio Stylist" : "Ospite Kristal",
      role,
    };
    supabaseMock.auth.signIn(user as any);
    const session = { user };
    authListeners.forEach((cb) => cb("SIGNED_IN", session));
    return { data: { user, session }, error: null };
  },
  signUp: async (data: any) => {
    const user = {
      id: "mock-user-" + Date.now(),
      email: data.email,
      fullName: data.options.data.full_name,
      role: data.options.data.role || "client",
    };
    supabaseMock.auth.signIn(user as any);
    const session = { user };
    authListeners.forEach((cb) => cb("SIGNED_IN", session));
    return { data: { user, session }, error: null };
  },
  signOut: async () => {
    supabaseMock.auth.signOut();
    authListeners.forEach((cb) => cb("SIGNED_OUT", null));
    return { error: null };
  },
};

export const supabase = client || {
  auth: mockAuth,
  from: (_table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        order: () => ({ data: [], error: null }),
      }),
      order: () => ({ data: [], error: null }),
    }),
  }),
};

const normalizeWeekly = (w: any) => (Array.isArray(w) ? w.map((n) => Number(n)) : []);

export const db = {
  profiles: {
    getAll: async () => {
      if (useMock) return supabaseMock.profiles.getAll();
      try {
        const { data, error } = await client!.from("profiles").select("*").order("full_name");
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Supabase profiles.getAll fallback to mock:", e);
        return supabaseMock.profiles.getAll();
      }
    },
    get: async (id: string) => {
      if (useMock) return (supabaseMock.profiles.getAll() as any[]).find((p) => p.id === id) || null;
      try {
        const { data, error } = await client!.from("profiles").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Supabase profiles.get fallback to mock:", e);
        return (supabaseMock.profiles.getAll() as any[]).find((p) => p.id === id) || null;
      }
    },
    upsert: async (p: any) => {
      if (useMock) return supabaseMock.profiles.upsert(p);
      try {
        const { data, error } = await client!.from("profiles").upsert(p).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Supabase profiles.upsert fallback to mock:", e);
        return supabaseMock.profiles.upsert(p);
      }
    },
  },
  services: {
    getAll: async () => {
      if (useMock) return supabaseMock.services.getAll();
      try {
        const { data, error } = await client!.from("services").select("*").order("name");
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Supabase services.getAll fallback to mock:", e);
        return supabaseMock.services.getAll();
      }
    },
    upsert: async (s: any) => {
      if (useMock) return supabaseMock.services.upsert(s);
      try {
        const { data, error } = await client!.from("services").upsert(s).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Supabase services.upsert fallback to mock:", e);
        return supabaseMock.services.upsert(s);
      }
    },
  },
  team: {
    getAll: async () => {
      if (useMock) return supabaseMock.team.getAll();
      try {
        const { data, error } = await client!.from("team_members").select("*");
        if (error) throw error;
        return (data || []).map((m: any) => ({
          ...m,
          weekly_closures: normalizeWeekly(m.weekly_closures),
        }));
      } catch (e) {
        console.error("Supabase team.getAll fallback to mock:", e);
        return supabaseMock.team.getAll();
      }
    },
    upsert: async (m: any) => {
      if (useMock) return supabaseMock.team.upsert(m);
      const payload = { ...m, weekly_closures: normalizeWeekly(m.weekly_closures) };
      try {
        const { data, error } = await client!.from("team_members").upsert(payload).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Supabase team.upsert fallback to mock:", e);
        return supabaseMock.team.upsert(payload);
      }
    },
  },
  appointments: {
    getAll: async () => {
      try {
        if (useMock) {
          return supabaseMock.appointments.getAll();
        }
        let appts: any[] = [];
        const { data, error } = await client!.from("appointments").select("*, services(*), profiles(*)").order("date");
        if (error) throw error;
        appts = data || [];

        const svcs = await db.services.getAll();
        const profs = await db.profiles.getAll();

        return appts.map((a: any) => ({
          ...a,
          services: a.services || svcs.find((s: any) => s.id === a.service_id),
          profiles: a.profiles || profs.find((p: any) => p.id === a.client_id),
        }));
      } catch (e) {
        console.error("Supabase appointments.getAll fallback to mock:", e);
        return supabaseMock.appointments.getAll();
      }
    },
    upsert: async (a: any) => {
      if (useMock) {
        const data = supabaseMock.appointments.upsert(a);
        return { data, error: null };
      }
      try {
        const { services, profiles, ...clean } = a;
        const { data, error } = await client!.from("appointments").upsert(clean).select().single();
        if (error || !data) throw error || new Error("No data returned from insert");
        return { data, error: null };
      } catch (e) {
        console.error("Supabase appointments.upsert fallback to mock:", e);
        const data = supabaseMock.appointments.upsert(a);
        return { data, error: null };
      }
    },
  },
  requests: {
    getAll: async () => {
      if (useMock) return supabaseMock.requests.getAll();
      try {
        const { data, error } = await client!.from("leave_requests").select("*");
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Supabase requests.getAll fallback to mock:", e);
        return supabaseMock.requests.getAll();
      }
    },
    create: async (r: any) => {
      if (useMock) return supabaseMock.requests.create(r);
      try {
        const { data, error } = await client!.from("leave_requests").insert(r).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Supabase requests.create fallback to mock:", e);
        return supabaseMock.requests.create(r);
      }
    },
    update: async (id: string, u: any) => {
      if (useMock) return supabaseMock.requests.update(id, u);
      try {
        const { data, error } = await client!.from("leave_requests").update(u).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Supabase requests.update fallback to mock:", e);
        return supabaseMock.requests.update(id, u);
      }
    },
    delete: async (id: string) => {
      if (useMock) return supabaseMock.requests.delete(id);
      try {
        const { error } = await client!.from("leave_requests").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (e) {
        console.error("Supabase requests.delete fallback to mock:", e);
        supabaseMock.requests.delete(id);
        return true;
      }
    },
  },
};
