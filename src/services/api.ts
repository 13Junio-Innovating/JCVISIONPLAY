export const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
console.log(`JVision: API Service Initialized. Mode=${import.meta.env.MODE}, API_URL='${API_URL}'`);

export const api = {
  auth: {
    login: async (email, password) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      const data = await response.json();
      localStorage.setItem('session', JSON.stringify(data.session));
      return data;
    },
    signUp: async (email, password, fullName) => {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Signup failed');
        }
        return await response.json();
    },
    getSession: () => {
      const sessionStr = localStorage.getItem('session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    },
    signOut: async () => {
      localStorage.removeItem('session');
    },
    getUser: async () => {
        const session = api.auth.getSession();
        return session ? { data: { user: session.user } } : { data: { user: null } };
    },
    resetPasswordForEmail: async (email) => {
      console.log("Reset password requested for:", email);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { error: null };
    },
    updateUser: async (attributes) => {
        const session = api.auth.getSession();
        if (!session?.user?.id) throw new Error("Not logged in");
        
        const response = await fetch(`${API_URL}/auth/user`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
               id: session.user.id,
               ...attributes 
           }),
       });
       if (!response.ok) {
           const error = await response.json();
           throw new Error(error.error || 'Update failed');
       }
       return { data: await response.json(), error: null };
   }
  },
  screens: {
    list: async () => {
      const response = await fetch(`${API_URL}/api/screens`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to fetch screens' }));
        throw new Error(err.error || 'Failed to fetch screens');
      }
      return { data: await response.json(), error: null };
    },
    create: async (data) => {
      const response = await fetch(`${API_URL}/api/screens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to create screen' }));
        throw new Error(err.error || 'Failed to create screen');
      }
      return { data: await response.json(), error: null };
    },
    update: async (id, data) => {
      const response = await fetch(`${API_URL}/api/screens/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update screen');
      return { error: null };
    },
    delete: async (id) => {
      const response = await fetch(`${API_URL}/api/screens/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete screen');
      return { error: null };
    }
  },
  playlists: {
    list: async () => {
      const response = await fetch(`${API_URL}/api/playlists`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to fetch playlists' }));
        throw new Error(err.error || 'Failed to fetch playlists');
      }
      return { data: await response.json(), error: null };
    },
    get: async (id) => {
      const response = await fetch(`${API_URL}/api/playlists/${id}`);
      if (!response.ok) throw new Error('Failed to fetch playlist');
      return { data: await response.json(), error: null };
    },
    create: async (data) => {
      const response = await fetch(`${API_URL}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create playlist');
      return { data: await response.json(), error: null };
    },
    update: async (id, data) => {
      const response = await fetch(`${API_URL}/api/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update playlist');
      return { error: null };
    },
    delete: async (id) => {
      const response = await fetch(`${API_URL}/api/playlists/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete playlist');
      return { error: null };
    }
  },
  media: {
    list: async () => {
      const response = await fetch(`${API_URL}/api/media`);
      if (!response.ok) throw new Error('Failed to fetch media');
      return { data: await response.json(), error: null };
    },
    upload: async (formData) => {
      // Don't set Content-Type header manually for FormData, let browser set it with boundary
      const response = await fetch(`${API_URL}/api/media`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload media');
      }
      return { data: await response.json(), error: null };
    },
    delete: async (id) => {
      const response = await fetch(`${API_URL}/api/media/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete media');
      return { error: null };
    }
  },
  logs: {
    logActivity: async (data) => {
      const response = await fetch(`${API_URL}/api/logs/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to log activity');
      return await response.json();
    },
    logError: async (data) => {
      const response = await fetch(`${API_URL}/api/logs/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to log error');
      return await response.json();
    },
    getActivity: async (limit = 50, offset = 0, userId) => {
        let url = `${API_URL}/api/logs/activity?limit=${limit}&offset=${offset}`;
        if (userId) url += `&user_id=${userId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch activity logs');
        return { data: await response.json(), error: null };
    },
    getErrors: async (limit = 50, offset = 0, userId) => {
        let url = `${API_URL}/api/logs/error?limit=${limit}&offset=${offset}`;
        if (userId) url += `&user_id=${userId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch error logs');
        return { data: await response.json(), error: null };
    },
    resolveError: async (id) => {
        const response = await fetch(`${API_URL}/api/logs/error/${id}/resolve`, {
            method: 'PUT'
        });
        if (!response.ok) throw new Error('Failed to resolve error');
        return { error: null };
    },
    getStats: async () => {
        const response = await fetch(`${API_URL}/api/logs/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return { data: await response.json(), error: null };
    }
  }
};
