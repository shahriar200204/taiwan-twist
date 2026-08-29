import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onIdTokenChanged,
  getIdToken,
  getIdTokenResult,
  FirebaseUser
} from '../services/firebase';
import { store } from '../services/store';
import { UserProfile, UserRole, Branch, BusinessSettings } from '../types';
import { INITIAL_SETTINGS } from '../services/demoData';

export interface AuthSessionToken {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  branchId?: string;
  issuedAt: number;
  lastHeartbeat: number;
  expiresAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  activeBranchId: string; // 'all' or specific branchId
  activeBranch: Branch | null;
  branches: Branch[];
  settings: BusinessSettings;
  loading: boolean;
  sessionToken: AuthSessionToken | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setActiveBranchId: (branchId: string) => void;
  refreshState: () => Promise<void>;
  updateSettings: (newSettings: BusinessSettings) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_TOKEN_KEY = 'txf_auth_session_token_v3';
const ACTIVE_BRANCH_STORAGE_KEY = 'txf_active_branch_filter_v3';

// 24 hours session validity default
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string>('all');
  const [settings, setSettings] = useState<BusinessSettings>(INITIAL_SETTINGS);
  const [sessionToken, setSessionToken] = useState<AuthSessionToken | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync state from Store
  const refreshState = async () => {
    const loadedBranches = await store.getBranches();
    const loadedSettings = await store.getSettings();
    setBranches(loadedBranches);
    setSettings(loadedSettings);
  };

  // Heartbeat updater for automatic session token renewal
  const updateSessionHeartbeat = useCallback((currentToken: AuthSessionToken) => {
    const now = Date.now();
    const updated: AuthSessionToken = {
      ...currentToken,
      lastHeartbeat: now,
      expiresAt: Math.max(currentToken.expiresAt, now + SESSION_TTL_MS)
    };
    setSessionToken(updated);
    localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(updated));
  }, []);

  // Sync Firebase User with Application Profile & Claims
  const syncFirebaseUser = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const tokenResult = await getIdTokenResult(fbUser, true);
      const claims = tokenResult.claims || {};
      const loadedBranches = await store.getBranches();
      const loadedUsers = await store.getUsers();

      // Determine role from custom claims or email
      let assignedRole: UserRole = 'cashier';
      const userEmail = (fbUser.email || '').toLowerCase();

      if (
        userEmail === 'shahriar2002hossain@gmail.com' ||
        userEmail === 'shahriarhossainforpc@gmail.com' ||
        claims.role === 'super_admin' ||
        claims.admin === true
      ) {
        assignedRole = 'super_admin';
      } else if (claims.role === 'branch_admin') {
        assignedRole = 'branch_admin';
      } else if (claims.role === 'cashier') {
        assignedRole = 'cashier';
      }

      // Check existing user profile
      let userProf = loadedUsers.find(
        u => u.id === fbUser.uid || u.email.toLowerCase() === userEmail
      );

      if (!userProf) {
        userProf = {
          id: fbUser.uid,
          email: userEmail,
          displayName: fbUser.displayName || (assignedRole === 'super_admin' ? 'Shahriar Hossain' : userEmail.split('@')[0]),
          role: assignedRole,
          branchId: (claims.branchId as string) || (assignedRole === 'super_admin' ? undefined : loadedBranches[0]?.id),
          branchName: (claims.branchName as string) || (assignedRole === 'super_admin' ? undefined : loadedBranches[0]?.name),
          status: 'active',
          isActive: true,
          createdAt: new Date().toISOString()
        };
        await store.saveUser(userProf);
      } else {
        // If role was updated in claims or is admin email, keep in sync
        if (assignedRole === 'super_admin' && userProf.role !== 'super_admin') {
          userProf.role = 'super_admin';
          await store.saveUser(userProf);
        }
      }

      const now = Date.now();
      const expiresAt = tokenResult.expirationTime 
        ? new Date(tokenResult.expirationTime).getTime() 
        : now + SESSION_TTL_MS;

      const tokenData: AuthSessionToken = {
        token: tokenResult.token,
        userId: userProf.id,
        email: userProf.email,
        role: userProf.role,
        branchId: userProf.branchId,
        issuedAt: now,
        lastHeartbeat: now,
        expiresAt
      };

      localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(tokenData));
      setSessionToken(tokenData);
      setUser(userProf);

      const savedBranchId = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
      if (userProf.role === 'super_admin') {
        setActiveBranchIdState(savedBranchId || 'all');
      } else {
        setActiveBranchIdState(userProf.branchId || (loadedBranches[0]?.id ?? 'branch-main'));
      }
    } catch (err) {
      console.warn('Firebase user sync note:', err);
    }
  }, []);

  // Main Authentication Listener & Initializer
  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;

    const init = async () => {
      setLoading(true);
      await store.initialize();
      
      const loadedBranches = await store.getBranches();
      const loadedSettings = await store.getSettings();
      const loadedUsers = await store.getUsers();
      
      setBranches(loadedBranches);
      setSettings(loadedSettings);

      // Listen for Firebase token state changes and auto-refresh
      unsubscribeAuth = onIdTokenChanged(auth, async (fbUser) => {
        if (fbUser) {
          await syncFirebaseUser(fbUser);
          setLoading(false);
        } else {
          // If no active Firebase auth user, verify local persistent session token
          const rawToken = localStorage.getItem(SESSION_TOKEN_KEY);
          const savedBranchId = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);

          if (rawToken) {
            try {
              const parsedToken: AuthSessionToken = JSON.parse(rawToken);
              const now = Date.now();

              if (parsedToken && parsedToken.expiresAt > now) {
                const foundUser = loadedUsers.find(
                  u => u.id === parsedToken.userId || u.email.toLowerCase() === parsedToken.email.toLowerCase()
                );

                if (foundUser && foundUser.status !== 'inactive' && foundUser.isActive !== false) {
                  setUser(foundUser);
                  setSessionToken(parsedToken);
                  updateSessionHeartbeat(parsedToken);

                  // Ensure underlying Firebase auth is connected
                  if (!auth.currentUser) {
                    try {
                      await signInAnonymously(auth);
                    } catch {
                      // offline fallback
                    }
                  }

                  if (foundUser.role === 'super_admin') {
                    setActiveBranchIdState(savedBranchId || 'all');
                  } else {
                    setActiveBranchIdState(foundUser.branchId || (loadedBranches[0]?.id ?? 'branch-main'));
                  }
                } else {
                  localStorage.removeItem(SESSION_TOKEN_KEY);
                  setUser(null);
                  setSessionToken(null);
                }
              } else {
                localStorage.removeItem(SESSION_TOKEN_KEY);
                setUser(null);
                setSessionToken(null);
              }
            } catch {
              localStorage.removeItem(SESSION_TOKEN_KEY);
              setUser(null);
              setSessionToken(null);
            }
          } else {
            setUser(null);
            setSessionToken(null);
          }
          setLoading(false);
        }
      });
    };

    init();

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [syncFirebaseUser, updateSessionHeartbeat]);

  // Periodic automatic token renewal & refresh (every 4 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        if (auth.currentUser) {
          // Force refresh Firebase token
          const newToken = await getIdToken(auth.currentUser, true);
          const tokenResult = await getIdTokenResult(auth.currentUser);
          const now = Date.now();
          const expiresAt = tokenResult.expirationTime 
            ? new Date(tokenResult.expirationTime).getTime() 
            : now + SESSION_TTL_MS;

          const updated: AuthSessionToken = {
            token: newToken,
            userId: user.id,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
            issuedAt: now,
            lastHeartbeat: now,
            expiresAt
          };
          setSessionToken(updated);
          localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(updated));
        } else {
          const rawToken = localStorage.getItem(SESSION_TOKEN_KEY);
          if (rawToken) {
            const parsed: AuthSessionToken = JSON.parse(rawToken);
            updateSessionHeartbeat(parsed);
          }
        }
      } catch (err) {
        console.warn('Auto token refresh error:', err);
      }
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, updateSessionHeartbeat]);

  const updateSettings = async (newSettings: BusinessSettings) => {
    await store.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const setActiveBranchId = (branchId: string) => {
    if (user && user.role !== 'super_admin') {
      return;
    }
    setActiveBranchIdState(branchId);
    localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, branchId);
  };

  // Secure Login Handler
  const login = async (emailOrPhone: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const query = emailOrPhone.trim().toLowerCase();
      const rawPassword = passwordInput.trim();

      if (!query || !rawPassword) {
        setLoading(false);
        return { success: false, error: 'Please enter your email and password.' };
      }

      const users = await store.getUsers();
      const isMasterAdminEmail = query === 'shahriar2002hossain@gmail.com' || query === 'shahriarhossainforpc@gmail.com';
      const isMasterAdminPass = rawPassword === 'Shahriar1122@' || rawPassword === '1122';

      // 1. Try Firebase Auth login first
      try {
        const userCred = await signInWithEmailAndPassword(auth, query, rawPassword);
        if (userCred.user) {
          await syncFirebaseUser(userCred.user);
          setLoading(false);
          return { success: true };
        }
      } catch (fbErr: any) {
        // If master admin doesn't exist yet in Firebase Auth, automatically create and log in!
        if (isMasterAdminEmail && isMasterAdminPass) {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, query, 'Shahriar1122@');
            if (newCred.user) {
              await syncFirebaseUser(newCred.user);
              setLoading(false);
              return { success: true };
            }
          } catch {
            // Creation error, proceed to database fallback
          }
        }
      }

      // 2. Validate against provisioned database users
      const matchedUser = users.find(u => 
        u.email.toLowerCase() === query ||
        u.displayName.toLowerCase() === query ||
        (u.phone && u.phone.replace(/[^0-9]/g, '') === query.replace(/[^0-9]/g, ''))
      );

      if (matchedUser) {
        if (matchedUser.status === 'inactive' || matchedUser.isActive === false) {
          setLoading(false);
          return { success: false, error: 'This user account is deactivated. Please contact your Super Admin.' };
        }

        // Master admin credential match
        if (
          (matchedUser.email.toLowerCase() === 'shahriar2002hossain@gmail.com' || matchedUser.role === 'super_admin') &&
          isMasterAdminPass
        ) {
          const now = Date.now();
          const tokenData: AuthSessionToken = {
            token: `txf_tok_${now}_${Math.random().toString(36).substring(2, 10)}`,
            userId: matchedUser.id,
            email: matchedUser.email,
            role: 'super_admin',
            branchId: matchedUser.branchId,
            issuedAt: now,
            lastHeartbeat: now,
            expiresAt: now + SESSION_TTL_MS
          };

          localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(tokenData));
          setSessionToken(tokenData);
          setUser(matchedUser);
          setActiveBranchIdState('all');
          setLoading(false);
          return { success: true };
        }

        // Standard user password & PIN verification
        const expectedPassword = matchedUser.password;
        const expectedPin = matchedUser.pinCode;

        const isPasswordValid = 
          (expectedPassword && rawPassword === expectedPassword) || 
          (expectedPin && rawPassword === expectedPin);

        if (!isPasswordValid) {
          setLoading(false);
          return { 
            success: false, 
            error: 'Incorrect password or PIN code. Please verify your credentials.' 
          };
        }

        // Issue active session token
        const now = Date.now();
        const tokenData: AuthSessionToken = {
          token: `txf_tok_${now}_${Math.random().toString(36).substring(2, 10)}`,
          userId: matchedUser.id,
          email: matchedUser.email,
          role: matchedUser.role,
          branchId: matchedUser.branchId,
          issuedAt: now,
          lastHeartbeat: now,
          expiresAt: now + SESSION_TTL_MS
        };

        localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(tokenData));
        setSessionToken(tokenData);
        setUser(matchedUser);

        if (matchedUser.role === 'super_admin') {
          setActiveBranchIdState('all');
        } else {
          setActiveBranchIdState(matchedUser.branchId || 'branch-main');
        }

        setLoading(false);
        return { success: true };
      }

      // 3. Fallback check for new master admin if not yet seeded
      if (isMasterAdminEmail && isMasterAdminPass) {
        const defaultAdmin: UserProfile = {
          id: 'user-super-admin',
          email: query,
          displayName: 'Shahriar Hossain',
          role: 'super_admin',
          password: 'Shahriar1122@',
          pinCode: '1122',
          phone: '+880 1711-000001',
          status: 'active',
          isActive: true,
          createdAt: new Date().toISOString()
        };
        await store.saveUser(defaultAdmin);

        const now = Date.now();
        const tokenData: AuthSessionToken = {
          token: `txf_tok_${now}_${Math.random().toString(36).substring(2, 10)}`,
          userId: defaultAdmin.id,
          email: defaultAdmin.email,
          role: 'super_admin',
          issuedAt: now,
          lastHeartbeat: now,
          expiresAt: now + SESSION_TTL_MS
        };

        localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(tokenData));
        setSessionToken(tokenData);
        setUser(defaultAdmin);
        setActiveBranchIdState('all');
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { 
        success: false, 
        error: 'Invalid email/username or password. Please verify and retry.' 
      };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Login failed. Please retry.' };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
  };

  const activeBranch = branches.find(b => b.id === activeBranchId) || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'cashier',
        activeBranchId,
        activeBranch,
        branches,
        settings,
        loading,
        sessionToken,
        login,
        logout,
        setActiveBranchId,
        refreshState,
        updateSettings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
