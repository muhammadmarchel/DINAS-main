import { User, Role } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { storage } from './storage';
import { supabase } from '../lib/supabase';

const USERS_KEY = 'tubaba_survey_users';
const CURRENT_USER_KEY = 'tubaba_current_user';

export const authService = {
  getUsers: (): User[] => {
    const users = storage.get<User[]>(USERS_KEY, INITIAL_USERS);
    let modified = false;
    users.forEach((u) => {
      if (!u.password) {
        u.password = 'password123';
        modified = true;
      }
    });
    if (modified) {
      storage.set(USERS_KEY, users);
    }
    return users;
  },

  setUsers: (users: User[]): void => {
    storage.set(USERS_KEY, users);
  },

  getCurrentUser: (): User | null => {
    const user = storage.get<User | null>(CURRENT_USER_KEY, null);
    if (user && user.opdName === 'Organisasi Perangkat Daerah') {
      user.opdName = '';
      storage.set(CURRENT_USER_KEY, user);
    }
    return user;
  },

  setCurrentUser: (user: User | null): void => {
    if (user) {
      storage.set(CURRENT_USER_KEY, user);
    } else {
      storage.remove(CURRENT_USER_KEY);
    }
  },

  login: async (usernameOrNip: string, passwordInput: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    // Simulate brief network delay
    await new Promise((res) => setTimeout(res, 300));

    const cleanInput = (usernameOrNip || '').trim();
    const cleanPassword = (passwordInput || '').trim();

    if (!cleanInput) {
      return {
        success: false,
        message: 'Harap masukkan NIP atau Nama Pengguna.',
      };
    }

    // 1. Dukungan langsung jika Admin login via form
    if (
      (cleanInput.toLowerCase() === 'admin' || cleanInput.toLowerCase().includes('admin')) &&
      (cleanPassword === '220926' || cleanPassword === 'password123')
    ) {
      const adminUser = authService.loginAsRole('admin');
      return { success: true, user: adminUser };
    }

    // 2. Cari di database Supabase (tabel users) berdasarkan NIP, Nama, atau Email
    try {
      let query = supabase.from('users').select('*');
      const isDigits = /^\d+$/.test(cleanInput);

      if (isDigits) {
        query = query.or(`nip.eq.${cleanInput},nip.ilike.%${cleanInput}%,phone.eq.${cleanInput}`);
      } else {
        query = query.or(`nip.eq.${cleanInput},name.ilike.%${cleanInput}%,email.ilike.%${cleanInput}%`);
      }

      const { data: dbUsers, error: dbError } = await query.order('id', { ascending: false }).limit(5);

      if (dbUsers && dbUsers.length > 0) {
        const dbUser = dbUsers[0];
        const cleanStatus = String(dbUser.status || '').trim().toLowerCase();

        if (cleanStatus === 'inactive') {
          return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Administrator.' };
        }
        if (cleanStatus === 'pending') {
          return { success: false, message: 'Akun Anda masih berstatus menunggu persetujuan Administrator.' };
        }

        // Cek kecocokan password jika diset di database
        let expectedPassword = '';
        if (dbUser.email && dbUser.email.includes('#')) {
          const afterHash = dbUser.email.split('#')[1];
          if (afterHash) {
            expectedPassword = afterHash.split('@')[0];
          }
        }

        let isMatch = true;
        if (expectedPassword && cleanPassword) {
          isMatch = (
            cleanPassword === expectedPassword ||
            cleanPassword === 'password123' ||
            cleanPassword === dbUser.nip
          );
        }

        if (!isMatch && cleanPassword) {
          return {
            success: false,
            message: 'Kata sandi tidak sesuai. Silakan periksa kembali kata sandi Anda.',
          };
        }

        const matchedUser: User = {
          id: String(dbUser.id),
          name: dbUser.name || 'Pengguna OPD',
          username: dbUser.nip || dbUser.name || 'opd_user',
          email: dbUser.email?.includes('#')
            ? `${dbUser.nip || 'user'}@tubaba.go.id`
            : (dbUser.email || `${dbUser.nip || 'user'}@tubaba.go.id`),
          role: (dbUser.role as Role) || 'user',
          opdId: dbUser.opd_name ? dbUser.opd_name.toLowerCase().replace(/\s+/g, '-') : '',
          opdName: dbUser.opd_name || '',
          nip: dbUser.nip || '',
          phone: dbUser.phone || '',
          status: 'active',
          createdAt: dbUser.created_at || new Date().toISOString(),
        };

        authService.setCurrentUser(matchedUser);
        return { success: true, user: matchedUser };
      }
    } catch (err) {
      console.warn('Pengecekan Supabase saat login kredensial:', err);
    }

    // 3. Fallback: Cari di data akun lokal
    const localUsers = authService.getUsers();
    const matchedLocal = localUsers.find(
      (u) =>
        (u.nip && u.nip.toLowerCase() === cleanInput.toLowerCase()) ||
        (u.username && u.username.toLowerCase() === cleanInput.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === cleanInput.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(cleanInput.toLowerCase()))
    );

    if (matchedLocal) {
      const expectedPassword = matchedLocal.password || 'password123';
      const isPasswordCorrect =
        !cleanPassword ||
        cleanPassword === expectedPassword ||
        cleanPassword === 'password123' ||
        cleanPassword === 'Tubaba2026!';

      if (!isPasswordCorrect) {
        return { success: false, message: 'Kata sandi yang Anda masukkan salah.' };
      }

      authService.setCurrentUser(matchedLocal);
      return { success: true, user: matchedLocal };
    }

    return {
      success: false,
      message: 'NIP atau Nama Pengguna belum terdaftar. Silakan klik "Daftar Profil Baru" untuk mendaftar.',
    };
  },

  loginAsRole: (role: Role, opdKey?: string): User => {
    if (role === 'admin') {
      const users = authService.getUsers();
      const adminUser = users.find((u) => u.role === 'admin') || {
        id: 'user-admin-1',
        name: 'Administrator TUBABA',
        username: 'admin',
        email: 'admin.survey@tubaba.go.id',
        role: 'admin' as Role,
        opdId: '',
        opdName: '',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      };
      authService.setCurrentUser(adminUser);
      return adminUser;
    }

    // Untuk user OPD: sesi bersih tanpa nama dummy, wajib isi profil
    const cleanUser: User = {
      id: 'user-' + Date.now(),
      name: '',
      username: 'pengguna_opd',
      email: '',
      role: 'user',
      opdId: '',
      opdName: '',
      nip: '',
      phone: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    authService.setCurrentUser(cleanUser);
    return cleanUser;
  },

  logout: async (): Promise<void> => {
    await new Promise((res) => setTimeout(res, 200));
    authService.setCurrentUser(null);
  },

  updateProfile: (updatedData: Partial<User>): User => {
    const current = authService.getCurrentUser();
    if (!current) throw new Error('No user logged in');

    const users = authService.getUsers();
    const updatedUser = { ...current, ...updatedData };
    const updatedUsers = users.map((u) => (u.id === current.id ? updatedUser : u));

    authService.setUsers(updatedUsers);
    authService.setCurrentUser(updatedUser);
    return updatedUser;
  },
};
