import { Service } from '@angular/core';

export interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  status: string;
}

const AUTHENTICATED_USER_KEY = 'kmchat.authenticated-user';

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'firstName' in value &&
    typeof value.firstName === 'string' &&
    'lastName' in value &&
    typeof value.lastName === 'string' &&
    'username' in value &&
    typeof value.username === 'string' &&
    'status' in value &&
    typeof value.status === 'string'
  );
}

@Service()
export class StorageServices {
  saveUser(user: AuthenticatedUser): void {
    const storage = this.getStorage();
    if (!storage) {
      throw new Error('No se puede guardar la sesión fuera del navegador.');
    }

    storage.setItem(AUTHENTICATED_USER_KEY, JSON.stringify(user));
  }

  getUser(): AuthenticatedUser | null {
    const storedUser = this.getStorage()?.getItem(AUTHENTICATED_USER_KEY);
    if (!storedUser) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (isAuthenticatedUser(user)) {
        return user;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }

    this.clearUser();
    return null;
  }

  clearUser(): void {
    this.getStorage()?.removeItem(AUTHENTICATED_USER_KEY);
  }

  private getStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}
