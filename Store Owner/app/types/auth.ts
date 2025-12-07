export interface Admin {
  _id: string;
  name: string;
  username: string;
  shopName: string;
  phone: string;
}

export interface AuthState {
  token: string | null;
  admin: Admin | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: Admin;
} 