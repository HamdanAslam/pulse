import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "@/services/auth.service";

const Ctx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const currentUser = await authService.login(email, password);
    setUser(currentUser);
  };

  const signup = async (email, username, password) => {
    const currentUser = await authService.signup(email, username, password);
    setUser(currentUser);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const resetPassword = (email) => authService.resetPassword(email);

  const updateProfile = async (patch) => {
    const next = await authService.updateProfile(patch);
    setUser(next);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout, resetPassword, updateProfile, syncUser: setUser }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
};
