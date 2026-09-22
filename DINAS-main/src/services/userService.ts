import { User, Role } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { storage } from './storage';
import { supabase } from '../lib/supabase';

const USERS_KEY = 'tubaba_survey_users';

export const userService = {
  getAll: (): User[] => {
    const users = storage.get<User[]>(USERS_KEY, INITIAL_USERS);
    let modified = false;
    users.forEach((u) => {
      if (!u.password) {
        u.password = 'password123';
        modified = true;
      }
      if (u.username === 'admin' && (u.name.includes('Ahmad Syarifudin') || u.name === 'Umar Ali Ahmad')) {
        u.name = 'Umar Ali Ahmad, Ph.D.';
        u.opdName = '';
        u.opdId = '';
        u.nip = '';
        modified = true;
      }
    });
    if (modified) {
      storage.set(USERS_KEY, users);
    }
    return users;
  },

  setAll: (users: User[]): void => {
    storage.set(USERS_KEY, users);
  },

  // Sinkronisasi data pengguna dari Supabase database
  syncRemote: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.warn('Gagal mengambil data user dari Supabase:', error.message);
        return userService.getAll();
      }

      if (data && Array.isArray(data)) {
        // 1. Deduplikasi data user berdasarkan email
        const emailMap = new Map<string, any>();
        data.forEach((row: any) => {
          const emailKey = String(row.email || '').toLowerCase().trim();
          if (!emailKey) return;

          const existing = emailMap.get(emailKey);
          if (!existing) {
            emailMap.set(emailKey, row);
          } else {
            // Prioritaskan baris dengan status active
            const currentStatus = String(row.status || '').toLowerCase().trim();
            const existingStatus = String(existing.status || '').toLowerCase().trim();
            if ((currentStatus === 'active' || currentStatus === 'aktif') && existingStatus !== 'active') {
              emailMap.set(emailKey, row);
            } else if (Number(row.id) > Number(existing.id) && currentStatus === existingStatus) {
              emailMap.set(emailKey, row);
            }
          }
        });

        // 2. Format menjadi array User
        const remoteUsers: User[] = Array.from(emailMap.values()).map((row: any) => {
          const email = String(row.email || '').trim();
          const emailPrefix = email.split('@')[0] || `user_${row.id}`;
          const formattedName = emailPrefix
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());

          const cleanStatus = String(row.status || '').trim().toLowerCase();
          let status: 'active' | 'inactive' | 'pending' = 'pending';
          if (cleanStatus === 'active' || cleanStatus === 'aktif' || cleanStatus === 'approved') {
            status = 'active';
          } else if (cleanStatus === 'inactive' || cleanStatus === 'nonaktif') {
            status = 'inactive';
          } else {
            status = 'pending';
          }

          return {
            id: `sb-${row.id}`,
            name: row.name || formattedName,
            username: row.username || emailPrefix,
            email: email,
            role: (row.role as Role) || 'user',
            opdId: row.opd_name ? row.opd_name.toLowerCase().replace(/\s+/g, '-') : '',
            opdName: row.opd_name || '',
            nip: row.nip || '',
            phone: row.phone || '',
            avatarUrl: row.avatar_url || '',
            status: status,
            createdAt: row.created_at || new Date().toISOString(),
          };
        });

        // 3. Gabungkan dengan data lokal (local cache)
        const localList = userService.getAll();
        const mergedMap = new Map<string, User>();

        // Masukkan data lokal demo terlebih dahulu
        localList.forEach((u) => {
          mergedMap.set(u.email.toLowerCase(), u);
        });

        // Tumpuk dengan data remote Supabase (prioritas data cloud)
        remoteUsers.forEach((ru) => {
          const key = ru.email.toLowerCase();
          const existingLocal = mergedMap.get(key);
          if (existingLocal) {
            mergedMap.set(key, {
              ...existingLocal,
              ...ru,
              // Jaga ID lokal jika ada
              id: existingLocal.id,
            });
          } else {
            mergedMap.set(key, ru);
          }
        });

        const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
          // Prioritaskan user yang berstatus pending di paling atas agar admin mudah melihat
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (b.status === 'pending' && a.status !== 'pending') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        userService.setAll(mergedList);
        return mergedList;
      }
    } catch (err) {
      console.warn('Error sinkronisasi user Supabase:', err);
    }

    return userService.getAll();
  },

  getById: (id: string): User | undefined => {
    const all = userService.getAll();
    return all.find((u) => u.id === id);
  },

  create: async (data: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const all = userService.getAll();
    const newId = `user-${Date.now()}`;
    const newUser: User = {
      ...data,
      password: data.password || 'password123',
      id: newId,
      createdAt: new Date().toISOString(),
    };
    all.push(newUser);
    userService.setAll(all);

    // Simpan juga ke cloud database Supabase
    try {
      await supabase.from('users').insert([
        {
          email: newUser.email,
          name: newUser.name,
          username: newUser.username,
          role: newUser.role,
          status: newUser.status,
          opd_name: newUser.opdName || null,
          nip: newUser.nip || null,
          phone: newUser.phone || null,
        },
      ]);
    } catch (err) {
      console.warn('Gagal menambahkan user ke Supabase:', err);
    }

    return newUser;
  },

  update: async (id: string, updates: Partial<User>): Promise<User> => {
    const all = userService.getAll();
    const index = all.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Pengguna tidak ditemukan');
    const updated = { ...all[index], ...updates };
    all[index] = updated;
    userService.setAll(all);

    // Perbarui juga di cloud database Supabase jika memiliki email
    try {
      const dbPayload: any = {};
      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.role !== undefined) dbPayload.role = updates.role;
      if (updates.opdName !== undefined) dbPayload.opd_name = updates.opdName;
      if (updates.status !== undefined) dbPayload.status = updates.status;
      if (updates.nip !== undefined) dbPayload.nip = updates.nip;
      if (updates.phone !== undefined) dbPayload.phone = updates.phone;

      const targetEmail = updates.email || updated.email;
      if (targetEmail) {
        await supabase.from('users').update(dbPayload).ilike('email', targetEmail);
      }
    } catch (err) {
      console.warn('Gagal memperbarui user di Supabase:', err);
    }

    return updated;
  },

  toggleStatus: async (id: string): Promise<User> => {
    const user = userService.getById(id);
    if (!user) throw new Error('Pengguna tidak ditemukan');
    // Jika pending atau inactive, ubah jadi active. Jika active, ubah jadi inactive
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    return await userService.update(id, { status: newStatus });
  },

  delete: async (id: string): Promise<boolean> => {
    const all = userService.getAll();
    const target = all.find((u) => u.id === id);
    const filtered = all.filter((u) => u.id !== id);
    if (filtered.length === all.length) return false;
    userService.setAll(filtered);

    // Hapus juga dari Supabase jika ada
    if (target && target.email) {
      try {
        await supabase.from('users').delete().ilike('email', target.email);
      } catch (err) {
        console.warn('Gagal menghapus user dari Supabase:', err);
      }
    }

    return true;
  },

  resetPassword: (id: string): { success: boolean; defaultPass: string } => {
    const user = userService.getById(id);
    if (!user) throw new Error('User not found');
    const defaultPass = 'Tubaba2026!';
    userService.update(id, { password: defaultPass });
    return {
      success: true,
      defaultPass,
    };
  },
};
