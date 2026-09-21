import { User } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { storage } from './storage';

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

  getById: (id: string): User | undefined => {
    const all = userService.getAll();
    return all.find((u) => u.id === id);
  },

  create: (data: Omit<User, 'id' | 'createdAt'>): User => {
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
    return newUser;
  },

  update: (id: string, updates: Partial<User>): User => {
    const all = userService.getAll();
    const index = all.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Pengguna tidak ditemukan');
    const updated = { ...all[index], ...updates };
    all[index] = updated;
    userService.setAll(all);
    return updated;
  },

  toggleStatus: (id: string): User => {
    const user = userService.getById(id);
    if (!user) throw new Error('Pengguna tidak ditemukan');
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    return userService.update(id, { status: newStatus });
  },

  delete: (id: string): boolean => {
    const all = userService.getAll();
    const filtered = all.filter((u) => u.id !== id);
    if (filtered.length === all.length) return false;
    userService.setAll(filtered);
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
