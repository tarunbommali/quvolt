import api from '../../../services/apiClient';

export const loginUser = (email, password) =>
    api.post('auth/login', { email, password }, { withCredentials: true }).then(r => r.data);
 
export const registerUser = (name, email, password, role) =>
    api.post('auth/register', { name, email, password, role }, { withCredentials: true }).then(r => r.data);
 
export const logoutUser = () =>
    api.post('auth/logout', {}, { withCredentials: true }).then(() => {
        localStorage.removeItem('Quvolt_user');
    });

export const getMyProfile = () =>
    api.get('auth/me').then(r => r.data);
 
export const updateMyProfile = (payload) =>
    api.put('auth/me', payload).then(r => r.data);

