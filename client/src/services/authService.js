// Auth API service layer
import { setAccessToken } from './api';
import {
  loginUser as apiLogin,
  logoutUser as apiLogout,
  registerUser as apiRegister,
  updateMyProfile as apiUpdateProfile,
  getMySubscription,
} from './api';

export const login = async (email, password) => {
  const data = await apiLogin(email, password);
  setAccessToken(data.token);
  return data;
};

export const register = async (name, email, password, role) => {
  const data = await apiRegister(name, email, password, role);
  setAccessToken(data.token);
  return data;
};

export const logout = async () => {
  await apiLogout();
  setAccessToken(null);
};

export const updateProfile = async (payload) => {
  const updated = await apiUpdateProfile(payload);
  return updated;
};

export const fetchSubscription = async () => {
  const data = await getMySubscription();
  return data;
};
