import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  _id: string;
  isAdmin: boolean;
  name: string;
  username: string;
  iat: number;
  exp: number;
}

export const clearAuthData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem('token'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('userId')
    ]);
    console.log('Auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

export const storeAuthData = async (token: string, userData: any): Promise<void> => {
  try {
    // Validate token before storing
    const decoded = jwtDecode<TokenPayload>(token);
    const currentTime = Date.now() / 1000;
    
    if (decoded.exp <= currentTime) {
      console.error('Token is already expired, not storing');
      throw new Error('Token is already expired');
    }
    
    await Promise.all([
      AsyncStorage.setItem('token', token),
      AsyncStorage.setItem('user', JSON.stringify(userData)),
      AsyncStorage.setItem('userId', userData._id)
    ]);
    
    console.log('Auth data stored successfully');
  } catch (error) {
    console.error('Error storing auth data:', error);
    await clearAuthData();
    throw error;
  }
};

export const getValidToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;
    
    const decoded = jwtDecode<TokenPayload>(token);
    const currentTime = Date.now() / 1000;
    
    if (decoded.exp <= currentTime) {
      console.log('Token expired, clearing auth data');
      await clearAuthData();
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Error validating token:', error);
    await clearAuthData();
    return null;
  }
};
